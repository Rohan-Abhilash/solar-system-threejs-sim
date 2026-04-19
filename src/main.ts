import './styles.css';
import { SolarSystemScene } from './three/scene';

// Initialize the solar system simulation
class SolarSystemApp {
  private scene: SolarSystemScene;
  private animationId: number = 0;

  constructor() {
    this.scene = new SolarSystemScene();
    this.init();
  }

  private init(): void {
    this.createHud();
    // Start the animation loop
    this.animate();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private createHud(): void {
    const hud = document.createElement('div');
    hud.className = 'flight-hud';
    hud.innerHTML = `
      <div class="flight-hud-title">Spacecraft Flight Controls</div>
      <div>W/S: Forward/Reverse</div>
      <div>A/D: Strafe Left/Right</div>
      <div>Space/Q: Up/Down</div>
      <div>Shift: Boost</div>
      <div>Mouse + Click: Look Around</div>
    `;
    document.body.appendChild(hud);
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
