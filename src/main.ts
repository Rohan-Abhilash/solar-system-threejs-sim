import './styles.css';
import { SolarSystemScene } from './three/scene';
import { setupControls } from './three/controls';
import { setupPostprocessing } from './three/postprocessing';

// Initialize the solar system simulation
class SolarSystemApp {
  private scene: SolarSystemScene;
  private animationId: number = 0;

  constructor() {
    this.scene = new SolarSystemScene();
    this.init();
  }

  private init(): void {
    // Setup controls
    setupControls(this.scene.camera, this.scene.renderer.domElement);
    
    // Setup postprocessing
    setupPostprocessing(this.scene.scene, this.scene.camera, this.scene.renderer);
    
    // Start the animation loop
    this.animate();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.scene.update();
    this.scene.render();
  }

  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.scene.camera.aspect = width / height;
    this.scene.camera.updateProjectionMatrix();
    this.scene.renderer.setSize(width, height);
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.scene.dispose();
  }
}

// Initialize the application when DOM is loaded
const app = new SolarSystemApp();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  app.dispose();
});

export default app;
