import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export interface SceneAssets {
  environmentHDR: THREE.DataTexture | null;
  planetTextures: Partial<Record<string, THREE.Texture>>;
  ringTexture: THREE.Texture;
  starTexture: THREE.Texture;
}

// Asset manager for loading textures, models, and HDR environments
export class AssetManager {
  private textureLoader: THREE.TextureLoader;
  private rgbeLoader: RGBELoader;
  private loadedTextures: Map<string, THREE.Texture> = new Map();
  private loadedHDRs: Map<string, THREE.DataTexture> = new Map();

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.rgbeLoader = new RGBELoader();
  }

  // Load texture with caching
  async loadTexture(url: string): Promise<THREE.Texture> {
    if (this.loadedTextures.has(url)) {
      return this.loadedTextures.get(url)!;
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.loadedTextures.set(url, texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  // Load HDR environment map
  async loadHDR(url: string): Promise<THREE.DataTexture> {
    if (this.loadedHDRs.has(url)) {
      return this.loadedHDRs.get(url)!;
    }

    return new Promise((resolve, reject) => {
      this.rgbeLoader.load(
        url,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          this.loadedHDRs.set(url, texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  // Create procedural star texture
  createStarTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Create radial gradient for star
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // Create planet ring texture
  createRingTexture(innerRadius: number = 0.3, outerRadius: number = 1.0): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const centerX = 128;
    const centerY = 128;
    const maxRadius = 128;

    // Create ring pattern
    const imageData = ctx.createImageData(256, 256);
    const data = imageData.data;

    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy) / maxRadius;

        const index = (y * 256 + x) * 4;

        if (distance >= innerRadius && distance <= outerRadius) {
          // Ring opacity based on distance and noise
          const noise = Math.random() * 0.3;
          const alpha = (1 - Math.abs(distance - (innerRadius + outerRadius) / 2) / ((outerRadius - innerRadius) / 2)) * (0.7 + noise);
          
          data[index] = 200; // R
          data[index + 1] = 180; // G
          data[index + 2] = 150; // B
          data[index + 3] = Math.min(255, alpha * 255); // A
        } else {
          data[index + 3] = 0; // Transparent
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // Remote texture URLs (fallback to procedural if unavailable)
  static REMOTE_TEXTURES = {
    sun: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/sun.jpg',
    mercury: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/mercury.jpg',
    venus: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/venus_surface.jpg',
    earth: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
    mars: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/mars_1k_color.jpg',
    jupiter: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/jupiter_1024.jpg',
    saturn: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/saturn_1024.jpg',
    uranus: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/uranus_1024.jpg',
    neptune: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/neptune_1024.jpg',
    moon: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg'
  };

  // Remote HDR environments
  static REMOTE_HDRS = {
    space: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/starmap_2020_1k.hdr',
    nebula: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dancing_hall_1k.hdr'
  };

  // Load planet texture with fallback
  async loadPlanetTexture(planet: keyof typeof AssetManager.REMOTE_TEXTURES): Promise<THREE.Texture> {
    try {
      return await this.loadTexture(AssetManager.REMOTE_TEXTURES[planet]);
    } catch (error) {
      console.warn(`Failed to load ${planet} texture, using fallback:`, error);
      // Return procedural fallback texture
      return this.createPlanetFallbackTexture(planet);
    }
  }

  // Create fallback planet texture
  private createPlanetFallbackTexture(planet: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Planet-specific colors
    const colors: { [key: string]: string[] } = {
      sun: ['#FFA500', '#FF4500', '#FFD700'],
      mercury: ['#8C7853', '#9C8562', '#7B6838'],
      venus: ['#FFC649', '#FFB347', '#FFAA1D'],
      earth: ['#6B93D6', '#4F7942', '#C2B280'],
      mars: ['#CD5C5C', '#A0522D', '#B22222'],
      jupiter: ['#D8CA9D', '#B8860B', '#CD853F'],
      saturn: ['#FAD5A5', '#F4A460', '#DEB887'],
      uranus: ['#4FD0E7', '#40E0D0', '#00CED1'],
      neptune: ['#4B70DD', '#1E90FF', '#0000FF'],
      moon: ['#C0C0C0', '#A9A9A9', '#808080']
    };

    const planetColors = colors[planet] || colors.earth;

    // Create gradient
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, planetColors[0]);
    gradient.addColorStop(0.7, planetColors[1]);
    gradient.addColorStop(1, planetColors[2]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Add some surface detail
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = Math.random() * 20 + 5;
      const opacity = Math.random() * 0.3;
      
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // Load space HDR with fallback
  async loadSpaceHDR(): Promise<THREE.DataTexture | null> {
    try {
      return await this.loadHDR(AssetManager.REMOTE_HDRS.space);
    } catch (error) {
      console.warn('Failed to load space HDR, continuing without environment:', error);
      return null;
    }
  }

  // Cleanup resources
  dispose(): void {
    this.loadedTextures.forEach(texture => texture.dispose());
    this.loadedHDRs.forEach(texture => texture.dispose());
    this.loadedTextures.clear();
    this.loadedHDRs.clear();
  }
}

// Global asset manager instance
export const assetManager = new AssetManager();

// Preload key assets for the scene
export async function loadSceneAssets(): Promise<SceneAssets> {
  const textureKeys = Object.keys(AssetManager.REMOTE_TEXTURES) as Array<
    keyof typeof AssetManager.REMOTE_TEXTURES
  >;

  const planetTextures: Partial<Record<string, THREE.Texture>> = {};

  const texturePromises = textureKeys.map(async (key) => {
    const texture = await assetManager.loadPlanetTexture(key);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    planetTextures[key] = texture;
  });

  const environmentHDR = await assetManager.loadSpaceHDR().catch(() => null);
  const ringTexture = assetManager.createRingTexture(0.32, 1.25);
  const starTexture = assetManager.createStarTexture();

  await Promise.all(texturePromises);

  return {
    environmentHDR,
    planetTextures,
    ringTexture,
    starTexture
  };
}
