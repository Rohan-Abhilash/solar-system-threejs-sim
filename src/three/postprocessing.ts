import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

// Quality preset definitions
export interface QualityPreset {
  name: string;
  shadowMapSize: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  enableBloom: boolean;
  enableFXAA: boolean;
  pixelRatio: number;
  renderScale: number;
}

export const QUALITY_PRESETS: { [key: string]: QualityPreset } = {
  low: {
    name: 'Low',
    shadowMapSize: 512,
    bloomStrength: 0.8,
    bloomRadius: 0.3,
    bloomThreshold: 0.85,
    enableBloom: true,
    enableFXAA: false,
    pixelRatio: 1,
    renderScale: 0.7
  },
  medium: {
    name: 'Medium',
    shadowMapSize: 1024,
    bloomStrength: 1.2,
    bloomRadius: 0.4,
    bloomThreshold: 0.8,
    enableBloom: true,
    enableFXAA: true,
    pixelRatio: 1.5,
    renderScale: 0.85
  },
  high: {
    name: 'High',
    shadowMapSize: 2048,
    bloomStrength: 1.5,
    bloomRadius: 0.5,
    bloomThreshold: 0.7,
    enableBloom: true,
    enableFXAA: true,
    pixelRatio: 2,
    renderScale: 1.0
  },
  ultra: {
    name: 'Ultra',
    shadowMapSize: 4096,
    bloomStrength: 2.0,
    bloomRadius: 0.6,
    bloomThreshold: 0.6,
    enableBloom: true,
    enableFXAA: true,
    pixelRatio: 2,
    renderScale: 1.0
  }
};

// Post-processing manager class
export class PostProcessingManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private fxaaPass: ShaderPass;
  private currentPreset: QualityPreset;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    initialPreset: string = 'medium'
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.currentPreset = QUALITY_PRESETS[initialPreset] || QUALITY_PRESETS.medium;

    this.initializeComposer();
    this.applyQualityPreset(initialPreset);
  }

  private initializeComposer(): void {
    // Create effect composer
    this.composer = new EffectComposer(this.renderer);

    // Basic render pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Bloom pass for glowing effects
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.currentPreset.bloomStrength,
      this.currentPreset.bloomRadius,
      this.currentPreset.bloomThreshold
    );
    this.composer.addPass(this.bloomPass);

    // FXAA pass for anti-aliasing
    this.fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
    this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
    this.composer.addPass(this.fxaaPass);
  }

  // Apply quality preset
  applyQualityPreset(presetName: string): void {
    const preset = QUALITY_PRESETS[presetName];
    if (!preset) {
      console.warn(`Quality preset '${presetName}' not found, using medium`);
      return;
    }

    this.currentPreset = preset;

    // Update bloom settings
    this.bloomPass.strength = preset.bloomStrength;
    this.bloomPass.radius = preset.bloomRadius;
    this.bloomPass.threshold = preset.bloomThreshold;
    this.bloomPass.enabled = preset.enableBloom;

    // Update FXAA
    this.fxaaPass.enabled = preset.enableFXAA;

    // Update renderer settings
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio * preset.pixelRatio, 2)
    );
    
    // Update shadow map size
    if (this.renderer.shadowMap) {
      this.renderer.shadowMap.mapSize.setScalar(preset.shadowMapSize);
    }

    // Update composer size with render scale
    const width = window.innerWidth * preset.renderScale;
    const height = window.innerHeight * preset.renderScale;
    this.composer.setSize(width, height);

    console.log(`Applied quality preset: ${preset.name}`);
  }

  // Update bloom parameters individually
  updateBloom(strength?: number, radius?: number, threshold?: number): void {
    if (strength !== undefined) {
      this.bloomPass.strength = strength;
      this.currentPreset.bloomStrength = strength;
    }
    if (radius !== undefined) {
      this.bloomPass.radius = radius;
      this.currentPreset.bloomRadius = radius;
    }
    if (threshold !== undefined) {
      this.bloomPass.threshold = threshold;
      this.currentPreset.bloomThreshold = threshold;
    }
  }

  // Toggle bloom effect
  toggleBloom(enabled?: boolean): void {
    this.bloomPass.enabled = enabled !== undefined ? enabled : !this.bloomPass.enabled;
    this.currentPreset.enableBloom = this.bloomPass.enabled;
  }

  // Toggle FXAA
  toggleFXAA(enabled?: boolean): void {
    this.fxaaPass.enabled = enabled !== undefined ? enabled : !this.fxaaPass.enabled;
    this.currentPreset.enableFXAA = this.fxaaPass.enabled;
  }

  // Handle window resize
  onWindowResize(width: number, height: number): void {
    const scaledWidth = width * this.currentPreset.renderScale;
    const scaledHeight = height * this.currentPreset.renderScale;
    
    this.composer.setSize(scaledWidth, scaledHeight);
    
    // Update bloom pass size
    this.bloomPass.setSize(scaledWidth, scaledHeight);
    
    // Update FXAA resolution
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (scaledWidth * pixelRatio);
    this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (scaledHeight * pixelRatio);
  }

  // Render frame using post-processing
  render(deltaTime?: number): void {
    this.composer.render(deltaTime);
  }

  // Get current quality preset
  getCurrentPreset(): QualityPreset {
    return { ...this.currentPreset };
  }

  // Get available quality preset names
  getAvailablePresets(): string[] {
    return Object.keys(QUALITY_PRESETS);
  }

  // Get performance info
  getPerformanceInfo(): {
    renderCalls: number;
    triangles: number;
    points: number;
    lines: number;
    geometries: number;
    textures: number;
  } {
    return this.renderer.info.render;
  }

  // Enable/disable specific passes for debugging
  setPassEnabled(passName: 'bloom' | 'fxaa', enabled: boolean): void {
    switch (passName) {
      case 'bloom':
        this.toggleBloom(enabled);
        break;
      case 'fxaa':
        this.toggleFXAA(enabled);
        break;
    }
  }

  // Dispose resources
  dispose(): void {
    this.composer.dispose();
    this.bloomPass.dispose();
    this.fxaaPass.dispose();
  }
}

// Helper function to detect optimal quality preset based on device capabilities
export function detectOptimalQuality(): string {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) return 'low';

  // Check for WebGL capabilities
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  
  // Estimate device performance based on various factors
  const deviceMemory = (navigator as any).deviceMemory || 4; // GB
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  
  // Performance score calculation
  let score = 0;
  
  // GPU capability score
  if (maxTextureSize >= 8192) score += 3;
  else if (maxTextureSize >= 4096) score += 2;
  else if (maxTextureSize >= 2048) score += 1;
  
  // RAM score
  if (deviceMemory >= 8) score += 2;
  else if (deviceMemory >= 4) score += 1;
  
  // CPU score
  if (hardwareConcurrency >= 8) score += 2;
  else if (hardwareConcurrency >= 4) score += 1;
  
  // Mobile device detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  if (isMobile) score -= 2;
  
  // Determine quality based on score
  if (score >= 6) return 'ultra';
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}
