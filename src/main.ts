import './styles.css';
import { SolarSystemScene } from './three/scene';
import { SpaceshipControls } from './three/spaceship';

class SolarSystemApp {
  private scene: SolarSystemScene;
  private spaceship: SpaceshipControls;
  private animationId: number = 0;
  private hudSpeed?: HTMLElement | null;
  private hudMode?: HTMLElement | null;
  private loadingEl?: HTMLElement | null;

  constructor() {
    this.scene = new SolarSystemScene();
    this.spaceship = new SpaceshipControls(this.scene.scene, this.scene.camera);
    this.loadingEl = document.getElementById('loading');
    this.buildHUD();
    this.animate();
    this.scene.whenReady().then(() => this.hideLoading());
    window.addEventListener('resize', this.onWindowResize);
  }

  private buildHUD(): void {
    const hud = document.createElement('div');
    hud.className = 'hud-panel';
    hud.innerHTML = `
      <div class="hud-row">
        <span>Speed</span>
        <span id="hud-speed">0.0 u/s</span>
      </div>
      <div class="hud-row">
        <span>Flight</span>
        <span id="hud-mode">Click to lock cursor</span>
      </div>
      <div class="hud-help">
        W/A/S/D steer · Space/Q ascend/descend · Shift boost · Click or C to fly
      </div>
    `;
    document.body.appendChild(hud);
    this.hudSpeed = hud.querySelector('#hud-speed');
    this.hudMode = hud.querySelector('#hud-mode');
  }

  private hideLoading(): void {
    if (this.loadingEl) {
      this.loadingEl.classList.add('hidden');
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = this.scene.update();
    this.spaceship.update(delta);
    this.scene.render(delta);
    this.updateHUD();
  };

  private updateHUD(): void {
    if (this.hudSpeed) {
      const speed = this.spaceship.getSpeed();
      this.hudSpeed.textContent = `${speed.toFixed(1)} u/s`;
    }
    if (this.hudMode) {
      this.hudMode.textContent = this.spaceship.pointerLocked()
        ? 'In-flight (cursor locked)'
        : 'Explorer mode (click to fly)';
    }
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.scene.resize(width, height);
  };

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.spaceship.dispose();
    this.scene.dispose();
  }
}

const app = new SolarSystemApp();

window.addEventListener('beforeunload', () => {
  app.dispose();
});

export default app;
