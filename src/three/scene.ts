import * as THREE from 'three';
import { PlanetSystem } from './planets';
import { assetManager } from './assets';
import { PostProcessingManager, detectOptimalQuality } from './postprocessing';
import { SpaceshipControls } from './spaceship';

export class SolarSystemScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public planetSystem: PlanetSystem;
  public spaceshipControls: SpaceshipControls;
  
  private clock: THREE.Clock;
  private lights: THREE.Light[] = [];
  private stars: THREE.Points | null = null;
  private postprocessing: PostProcessingManager | null = null;
  private isAssetsLoaded: boolean = false;

  constructor() {
    this.clock = new THREE.Clock();
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initStars();
    this.initPlanets();
    this.initSpaceship();
    this.initPostprocessing();
    this.loadSceneAssets();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);
    this.scene.fog = new THREE.Fog(0x000011, 1000, 10000);
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 50, 200);
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
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    
    // Append to body
    const app = document.getElementById('app') || document.body;
    app.appendChild(this.renderer.domElement);
  }

  private initLights(): void {
    // Sun light (central point light)
    const sunLight = new THREE.PointLight(0xffffff, 2, 1000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 1000;
    this.scene.add(sunLight);
    this.lights.push(sunLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x111122, 0.1);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Directional light for subtle fill
    const directionalLight = new THREE.DirectionalLight(0x4444ff, 0.2);
    directionalLight.position.set(-100, 100, 50);
    this.scene.add(directionalLight);
    this.lights.push(directionalLight);
  }

  private initStars(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 10000;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      // Random position in sphere
      const radius = 5000 + Math.random() * 5000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);

      // Random star colors (white to blue-white)
      const colorVariation = 0.7 + Math.random() * 0.3;
      colors[i] = colorVariation;
      colors[i + 1] = colorVariation;
      colors[i + 2] = 0.9 + Math.random() * 0.1;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  private initPlanets(): void {
    this.planetSystem = new PlanetSystem(this.scene);
  }

  private initSpaceship(): void {
    this.spaceshipControls = new SpaceshipControls(this.scene, this.camera, this.renderer.domElement);
  }

  private initPostprocessing(): void {
    this.postprocessing = new PostProcessingManager(
      this.renderer,
      this.scene,
      this.camera,
      detectOptimalQuality()
    );
  }

  private async loadSceneAssets(): void {
    try {
      const hdr = await assetManager.loadSpaceHDR();
      if (hdr) {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        const envMap = pmremGenerator.fromEquirectangular(hdr).texture;
        this.scene.environment = envMap;
        this.scene.background = envMap;
        pmremGenerator.dispose();
        hdr.dispose();
      }
      this.isAssetsLoaded = true;
      console.log('Scene assets loaded successfully');
    } catch (error) {
      console.warn('Some assets failed to load:', error);
      this.isAssetsLoaded = true; // Continue anyway
    }
  }

  public update(): void {
    if (!this.isAssetsLoaded) return;

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Update planet system
    this.planetSystem.update(deltaTime, elapsedTime);
    this.spaceshipControls.update(deltaTime);

    // Rotate stars slowly
    if (this.stars) {
      this.stars.rotation.y += deltaTime * 0.01;
    }

    // Animate sun light intensity
    if (this.lights[0]) {
      const sunLight = this.lights[0] as THREE.PointLight;
      sunLight.intensity = 1.8 + Math.sin(elapsedTime * 0.5) * 0.2;
    }
  }

  public render(): void {
    if (this.postprocessing) {
      this.postprocessing.render();
      return;
    }
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.postprocessing?.onWindowResize(width, height);
  }

  public dispose(): void {
    // Cleanup resources
    this.planetSystem.dispose();
    this.spaceshipControls.dispose();
    this.postprocessing?.dispose();
    assetManager.dispose();
    
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
