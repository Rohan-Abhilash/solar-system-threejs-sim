import * as THREE from 'three';

export interface PlanetData {
  name: string;
  radius: number;
  distance: number;
  orbitalPeriod: number;
  rotationPeriod: number;
  color: number;
  texture?: string;
  hasRings?: boolean;
  moons?: MoonData[];
}

export interface MoonData {
  name: string;
  radius: number;
  distance: number;
  orbitalPeriod: number;
  color: number;
}

export class Planet {
  public mesh: THREE.Mesh;
  public orbitLine: THREE.Line;
  public moons: Moon[] = [];
  private material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  private rings?: THREE.Mesh;
  private orbitSpeed: number;
  private rotationSpeed: number;
  private angle: number = 0;
  private orbitCenter: THREE.Vector3;

  constructor(public data: PlanetData, private scene: THREE.Scene) {
    this.orbitCenter = new THREE.Vector3(0, 0, 0);
    this.orbitSpeed = (Math.PI * 2) / data.orbitalPeriod;
    this.rotationSpeed = (Math.PI * 2) / data.rotationPeriod;
    
    this.createPlanet();
    this.createOrbitLine();
    this.createMoons();
  }

  private createPlanet(): void {
    const geometry = new THREE.SphereGeometry(this.data.radius, 64, 64);
    
    if (this.data.name === 'Sun') {
      this.material = new THREE.MeshPhysicalMaterial({
        color: this.data.color,
        emissive: new THREE.Color(this.data.color),
        emissiveIntensity: 1.6,
        transmission: 0.1,
        roughness: 0.2,
        metalness: 0.2,
        transparent: true,
        opacity: 0.95
      });
    } else {
      this.material = new THREE.MeshPhysicalMaterial({
        color: this.data.color,
        roughness: 0.55,
        metalness: 0.08,
        clearcoat: 0.35,
        clearcoatRoughness: 0.65,
        sheen: 0.15,
        sheenRoughness: 0.75
      });
    }

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(this.data.distance, 0, 0);
    this.mesh.castShadow = this.data.name !== 'Sun';
    this.mesh.receiveShadow = this.data.name !== 'Sun';
    this.mesh.userData = { planet: this.data.name };
    
    this.scene.add(this.mesh);

    // Add rings for Saturn
    if (this.data.hasRings) {
      this.addRings();
    }
  }

  private addRings(): void {
    const ringGeometry = new THREE.RingGeometry(
      this.data.radius * 1.2,
      this.data.radius * 2.0,
      64
    );
    
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    
    this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
    this.rings.rotation.x = Math.PI / 2;
    this.mesh.add(this.rings);
  }

  private createOrbitLine(): void {
    if (this.data.name === 'Sun') return;

    const points = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * this.data.distance,
        0,
        Math.sin(angle) * this.data.distance
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x444444, 
      transparent: true, 
      opacity: 0.3 
    });
    
    this.orbitLine = new THREE.Line(geometry, material);
    this.scene.add(this.orbitLine);
  }

  private createMoons(): void {
    if (!this.data.moons) return;

    this.data.moons.forEach(moonData => {
      const moon = new Moon(moonData, this.mesh);
      this.moons.push(moon);
    });
  }

  public applyAppearance(options: {
    texture?: THREE.Texture;
    envMap?: THREE.Texture | null;
    ringTexture?: THREE.Texture;
  }): void {
    if (options.texture) {
      this.material.map = options.texture;
      this.material.needsUpdate = true;
    }

    if (options.envMap) {
      this.material.envMap = options.envMap;
      this.material.envMapIntensity = this.data.name === 'Sun' ? 0 : 1.2;
      this.material.needsUpdate = true;
    }

    if (this.rings && options.ringTexture) {
      const ringMaterial = this.rings.material as THREE.MeshStandardMaterial;
      ringMaterial.map = options.ringTexture;
      ringMaterial.transparent = true;
      ringMaterial.opacity = 0.9;
      ringMaterial.needsUpdate = true;
    }
  }

  public update(deltaTime: number): void {
    if (this.data.name === 'Sun') {
      // Sun only rotates
      this.mesh.rotation.y += this.rotationSpeed * deltaTime;
      return;
    }

    // Update orbital position
    this.angle += this.orbitSpeed * deltaTime;
    const x = Math.cos(this.angle) * this.data.distance;
    const z = Math.sin(this.angle) * this.data.distance;
    this.mesh.position.set(x, 0, z);

    // Update rotation
    this.mesh.rotation.y += this.rotationSpeed * deltaTime;

    // Update moons
    this.moons.forEach(moon => moon.update(deltaTime));
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
    if (this.orbitLine) {
      this.scene.remove(this.orbitLine);
    }
    if (this.rings) {
      this.mesh.remove(this.rings);
      this.rings.geometry.dispose();
      if (this.rings.material instanceof THREE.Material) {
        this.rings.material.dispose();
      }
    }
    
    this.moons.forEach(moon => moon.dispose());
    
    if (this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
}

export class Moon {
  public mesh: THREE.Mesh;
  private orbitSpeed: number;
  private angle: number = Math.random() * Math.PI * 2;

  constructor(private data: MoonData, private parent: THREE.Object3D) {
    this.orbitSpeed = (Math.PI * 2) / data.orbitalPeriod;
    this.createMoon();
  }

  private createMoon(): void {
    const geometry = new THREE.SphereGeometry(this.data.radius, 16, 16);
    const material = new THREE.MeshPhongMaterial({ color: this.data.color });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.data.distance, 0, 0);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData = { moon: this.data.name };
    
    this.parent.add(this.mesh);
  }

  public update(deltaTime: number): void {
    this.angle += this.orbitSpeed * deltaTime;
    const x = Math.cos(this.angle) * this.data.distance;
    const z = Math.sin(this.angle) * this.data.distance;
    this.mesh.position.set(x, 0, z);
  }

  public dispose(): void {
    this.parent.remove(this.mesh);
    if (this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
}

export class PlanetSystem {
  private planets: Planet[] = [];
  private planetData: PlanetData[] = [
    {
      name: 'Sun',
      radius: 8,
      distance: 0,
      orbitalPeriod: 0,
      rotationPeriod: 25,
      color: 0xffff00
    },
    {
      name: 'Mercury',
      radius: 1.2,
      distance: 20,
      orbitalPeriod: 88,
      rotationPeriod: 59,
      color: 0x8c7853
    },
    {
      name: 'Venus',
      radius: 1.8,
      distance: 30,
      orbitalPeriod: 225,
      rotationPeriod: 243,
      color: 0xffc649
    },
    {
      name: 'Earth',
      radius: 2.0,
      distance: 40,
      orbitalPeriod: 365,
      rotationPeriod: 1,
      color: 0x6b93d6,
      moons: [{
        name: 'Moon',
        radius: 0.5,
        distance: 4,
        orbitalPeriod: 27,
        color: 0xcccccc
      }]
    },
    {
      name: 'Mars',
      radius: 1.6,
      distance: 55,
      orbitalPeriod: 687,
      rotationPeriod: 1.03,
      color: 0xcd5c5c
    },
    {
      name: 'Jupiter',
      radius: 4.0,
      distance: 80,
      orbitalPeriod: 4333,
      rotationPeriod: 0.41,
      color: 0xd8ca9d,
      moons: [
        { name: 'Io', radius: 0.3, distance: 8, orbitalPeriod: 1.77, color: 0xffff99 },
        { name: 'Europa', radius: 0.25, distance: 10, orbitalPeriod: 3.55, color: 0xccccff },
        { name: 'Ganymede', radius: 0.4, distance: 12, orbitalPeriod: 7.15, color: 0x999999 },
        { name: 'Callisto', radius: 0.35, distance: 15, orbitalPeriod: 16.69, color: 0x666666 }
      ]
    },
    {
      name: 'Saturn',
      radius: 3.5,
      distance: 110,
      orbitalPeriod: 10759,
      rotationPeriod: 0.45,
      color: 0xfad5a5,
      hasRings: true,
      moons: [
        { name: 'Titan', radius: 0.4, distance: 12, orbitalPeriod: 15.95, color: 0xffcc99 }
      ]
    },
    {
      name: 'Uranus',
      radius: 2.8,
      distance: 140,
      orbitalPeriod: 30687,
      rotationPeriod: 0.72,
      color: 0x4fd0e4
    },
    {
      name: 'Neptune',
      radius: 2.6,
      distance: 170,
      orbitalPeriod: 60190,
      rotationPeriod: 0.67,
      color: 0x4b70dd
    }
  ];

  constructor(private scene: THREE.Scene) {
    this.createPlanets();
  }

  private createPlanets(): void {
    this.planetData.forEach(data => {
      const planet = new Planet(data, this.scene);
      this.planets.push(planet);
    });
  }

  public update(deltaTime: number, elapsedTime: number): void {
    // Speed up time for better visualization (10x faster)
    const timeMultiplier = 10;
    this.planets.forEach(planet => {
      planet.update(deltaTime * timeMultiplier);
    });
  }

  public applyAssets(
    envMap: THREE.Texture | null,
    textures: Partial<Record<string, THREE.Texture>>,
    ringTexture?: THREE.Texture
  ): void {
    this.planets.forEach((planet) => {
      const key = planet.data.name.toLowerCase();
      const texture = textures[key];
      planet.applyAppearance({
        texture,
        envMap,
        ringTexture: planet.data.hasRings ? ringTexture : undefined
      });
    });
  }

  public focusOnPlanet(planetName: string, camera: THREE.PerspectiveCamera): void {
    const planet = this.planets.find(p => p.data.name === planetName);
    if (!planet) return;

    const planetPos = planet.getPosition();
    const offset = new THREE.Vector3(0, 10, 20);
    camera.position.copy(planetPos.clone().add(offset));
    camera.lookAt(planetPos);
  }

  public dispose(): void {
    this.planets.forEach(planet => planet.dispose());
    this.planets = [];
  }

  public getPlanetNames(): string[] {
    return this.planetData.map(p => p.name);
  }

  public getPlanet(name: string): Planet | undefined {
    return this.planets.find(p => p.data.name === name);
  }
}
