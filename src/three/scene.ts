import * as THREE from 'three';
import { PlanetSystem } from './planets';
import { assetManager, loadSceneAssets as fetchSceneAssets } from './assets';
import { PostProcessingManager, detectOptimalQuality } from './postprocessing';

export class SolarSystemScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public planetSystem: PlanetSystem;
  public postProcessing: PostProcessingManager;
  
  private clock: THREE.Clock;
  private lights: THREE.Light[] = [];
  private stars: THREE.Points | null = null;
  // Additional environment features
  private asteroidBelt: THREE.Points | null = null;
  private oortCloud: THREE.Points | null = null;
  private sunSprite: THREE.Sprite | null = null;
  private pmremGenerator: THREE.PMREMGenerator;
  private environmentMap: THREE.Texture | null = null;
  private assetsPromise: Promise<void>;
  private starTexture: THREE.Texture | null = null;
  private isAssetsLoaded: boolean = false;

  constructor() {
    this.clock = new THREE.Clock();
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.postProcessing = new PostProcessingManager(
      this.renderer,
      this.scene,
      this.camera,
      detectOptimalQuality()
    );
    this.initLights();
    this.initStars();
    this.initSunBillboard();
    this.initPlanets();
    this.initAsteroidBelt();
    this.initOortCloud();
    this.assetsPromise = this.loadSceneAssets();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050912);
    this.scene.fog = new THREE.FogExp2(0x02040b, 0.00018);
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 25, 180);
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.useLegacyLights = false;
    this.renderer.setClearColor(0x01030a, 1);
    
    // Append to body
    const app = document.getElementById('app') || document.body;
    app.appendChild(this.renderer.domElement);
  }

  private initLights(): void {
    // Sun light (central point light)
    const sunLight = new THREE.PointLight(0xffffff, 3.2, 2000, 2);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 1000;
    this.scene.add(sunLight);
    this.lights.push(sunLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x0f1a33, 0.25);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Directional light for subtle fill
    const directionalLight = new THREE.DirectionalLight(0x7fa7ff, 0.35);
    directionalLight.position.set(-120, 140, 80);
    this.scene.add(directionalLight);
    this.lights.push(directionalLight);
  }

  private initStars(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 8000;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      const radius = 4200 + Math.random() * 3800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const colorVariation = 0.7 + Math.random() * 0.3;
      colors[i3] = colorVariation;
      colors[i3 + 1] = colorVariation;
      colors[i3 + 2] = 0.9 + Math.random() * 0.1;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.starTexture = assetManager.createStarTexture();

    const starsMaterial = new THREE.PointsMaterial({
      size: 14,
      sizeAttenuation: true,
      vertexColors: true,
      map: this.starTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  private initPlanets(): void {
    this.planetSystem = new PlanetSystem(this.scene);
  }

  private async loadSceneAssets(): Promise<void> {
    try {
      const assets = await fetchSceneAssets();

      if (assets.environmentHDR) {
        const envRT = this.pmremGenerator.fromEquirectangular(assets.environmentHDR);
        this.environmentMap = envRT.texture;
        this.scene.environment = this.environmentMap;
        this.scene.background = this.environmentMap;
        assets.environmentHDR.dispose();
        this.pmremGenerator.dispose();
      }

      this.starTexture = assets.starTexture;

      this.planetSystem.applyAssets(
        this.environmentMap,
        assets.planetTextures,
        assets.ringTexture
      );

      if (this.stars && this.stars.material instanceof THREE.PointsMaterial && this.starTexture) {
        this.stars.material.map = this.starTexture;
        this.stars.material.needsUpdate = true;
      }

      this.isAssetsLoaded = true;
      console.log('Scene assets loaded successfully');
    } catch (error) {
      console.warn('Some assets failed to load:', error);
      this.isAssetsLoaded = true; // Continue anyway
    }
  }

  private initSunBillboard(): void {
    const texture = assetManager.createStarTexture();
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffe0b0,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    this.sunSprite = new THREE.Sprite(material);
    this.sunSprite.scale.set(60, 60, 1);
    this.scene.add(this.sunSprite);
  }

  private initAsteroidBelt(): void {
    const beltGeometry = new THREE.BufferGeometry();
    const count = 3500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = THREE.MathUtils.randFloat(65, 105);
      const angle = Math.random() * Math.PI * 2;
      const height = THREE.MathUtils.randFloatSpread(6);

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(angle) * radius;

      const tint = 0.5 + Math.random() * 0.2;
      colors[i3] = 0.72 * tint;
      colors[i3 + 1] = 0.65 * tint;
      colors[i3 + 2] = 0.55 * tint;
    }

    beltGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    beltGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.1,
      map: this.starTexture || assetManager.createStarTexture(),
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      vertexColors: true,
      depthWrite: false
    });

    this.asteroidBelt = new THREE.Points(beltGeometry, material);
    this.asteroidBelt.rotation.x = THREE.MathUtils.degToRad(1.5);
    this.scene.add(this.asteroidBelt);
  }

  private initOortCloud(): void {
    const cloudGeometry = new THREE.BufferGeometry();
    const count = 4500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = THREE.MathUtils.randFloat(900, 1500);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

      const rSinPhi = radius * Math.sin(phi);
      positions[i3] = rSinPhi * Math.cos(theta);
      positions[i3 + 1] = rSinPhi * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const tint = 0.35 + Math.random() * 0.3;
      colors[i3] = 0.6 * tint;
      colors[i3 + 1] = 0.75 * tint;
      colors[i3 + 2] = 0.9 * tint;
    }

    cloudGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    cloudGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      map: this.starTexture || assetManager.createStarTexture(),
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.oortCloud = new THREE.Points(cloudGeometry, material);
    this.scene.add(this.oortCloud);
  }

  public update(): number {
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.planetSystem.update(deltaTime, elapsedTime);

    if (this.stars) {
      this.stars.rotation.y += deltaTime * 0.01;
    }

    if (this.asteroidBelt) {
      this.asteroidBelt.rotation.y += deltaTime * 0.02;
    }

    if (this.oortCloud) {
      this.oortCloud.rotation.y += deltaTime * 0.005;
    }

    if (this.sunSprite) {
      const scale = 60 + Math.sin(elapsedTime * 0.6) * 2;
      this.sunSprite.scale.set(scale, scale, 1);
    }

    if (this.lights[0]) {
      const sunLight = this.lights[0] as THREE.PointLight;
      sunLight.intensity = 2.6 + Math.sin(elapsedTime * 0.35) * 0.35;
    }

    return deltaTime;
  }

  public render(deltaTime?: number): void {
    if (this.postProcessing) {
      this.postProcessing.render(deltaTime);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.postProcessing.onWindowResize(width, height);
  }

  public async whenReady(): Promise<void> {
    return this.assetsPromise;
  }

  public dispose(): void {
    // Cleanup resources
    this.planetSystem.dispose();
    if (this.postProcessing) {
      this.postProcessing.dispose();
    }

    if (this.asteroidBelt) {
      this.scene.remove(this.asteroidBelt);
      this.asteroidBelt.geometry.dispose();
      if (this.asteroidBelt.material instanceof THREE.Material) {
        this.asteroidBelt.material.dispose();
      }
    }

    if (this.oortCloud) {
      this.scene.remove(this.oortCloud);
      this.oortCloud.geometry.dispose();
      if (this.oortCloud.material instanceof THREE.Material) {
        this.oortCloud.material.dispose();
      }
    }

    if (this.sunSprite) {
      this.scene.remove(this.sunSprite);
      if (this.sunSprite.material instanceof THREE.Material) {
        this.sunSprite.material.dispose();
      }
    }
    
    // Dispose geometries and materials
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        } else if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        }
      }
    });

    // Remove renderer
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }

  // Helper methods for external controls
  public getCameraPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  public setCameraPosition(position: THREE.Vector3): void {
    this.camera.position.copy(position);
  }

  public focusOnPlanet(planetName: string): void {
    this.planetSystem.focusOnPlanet(planetName, this.camera);
  }

  public getElapsedTime(): number {
    return this.clock.getElapsedTime();
  }
}
