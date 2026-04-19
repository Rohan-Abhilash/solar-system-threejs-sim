import * as THREE from 'three';

export class SpaceshipControls {
  private spaceship: THREE.Object3D;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private acceleration: THREE.Vector3 = new THREE.Vector3();
  private keys: Record<string, boolean> = {};
  private mouse: { x: number; y: number } = { x: 0, y: 0 };
  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private PI_2 = Math.PI / 2;
  private isPointerLocked = false;
  private followCamera: THREE.Object3D;
  private engineGlow: THREE.Mesh | null = null;

  private readonly maxSpeed = 320;
  private readonly accelerationFactor = 140;
  private readonly friction = 0.88;
  private readonly rotationSpeed = 0.0022;
  private readonly boostMultiplier = 2.5;
  private readonly followOffset = new THREE.Vector3(0, 1.5, -6);
  private readonly cameraLerp = 0.12;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    this.keys[event.code] = true;
    if (event.code === 'KeyC') {
      this.requestPointerLock();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys[event.code] = false;
  };

  private readonly onMouseMove = (event: MouseEvent) => {
    if (this.isPointerLocked) {
      this.mouse.x += event.movementX;
      this.mouse.y += event.movementY;
    }
  };

  private readonly onPointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement !== null;
  };

  private readonly onClick = () => {
    if (!this.isPointerLocked) {
      this.requestPointerLock();
    }
  };

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.createSpaceship();
    this.setupFollowCamera();
    this.setupEventListeners();
  }

  private createSpaceship() {
    const group = new THREE.Group();

    const hullMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9fb6ff,
      metalness: 0.75,
      roughness: 0.25,
      clearcoat: 0.9,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.5
    });

    const accentMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1f6feb,
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1.2
    });

    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.35, 1.4, 12, 1, true);
    const body = new THREE.Mesh(bodyGeometry, hullMaterial);
    body.rotation.z = Math.PI / 2;
    group.add(body);

    const noseGeometry = new THREE.ConeGeometry(0.2, 0.6, 12);
    const nose = new THREE.Mesh(noseGeometry, accentMaterial);
    nose.position.set(0.8, 0, 0);
    nose.rotation.z = Math.PI / 2;
    group.add(nose);

    const finGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.3);
    const leftFin = new THREE.Mesh(finGeometry, hullMaterial);
    leftFin.position.set(-0.25, 0, 0.3);
    group.add(leftFin);

    const rightFin = leftFin.clone();
    rightFin.position.z = -0.3;
    group.add(rightFin);

    const cockpitGeometry = new THREE.SphereGeometry(0.18, 18, 18);
    const cockpitMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88c9ff,
      metalness: 0.4,
      roughness: 0.05,
      transmission: 0.35,
      thickness: 0.4,
      envMapIntensity: 1.4
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0.2, 0, 0);
    group.add(cockpit);

    const glowGeometry = new THREE.SphereGeometry(0.18, 12, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x7fffff,
      transparent: true,
      opacity: 0.65
    });
    this.engineGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.engineGlow.position.set(-0.9, 0, 0);
    group.add(this.engineGlow);

    group.position.set(0, 6, 170);
    group.lookAt(0, 0, 0);
    this.spaceship = group;
    this.scene.add(this.spaceship);
  }

  private setupFollowCamera() {
    this.followCamera = new THREE.Object3D();
    this.followCamera.position.copy(this.followOffset);
    this.spaceship.add(this.followCamera);
  }

  private setupEventListeners() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('click', this.onClick);
  }

  private requestPointerLock() {
    document.body.requestPointerLock();
  }

  public update(deltaTime: number) {
    const dt = Math.min(deltaTime, 0.05);

    this.acceleration.set(0, 0, 0);

    const isBoost = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speedMultiplier = isBoost ? this.boostMultiplier : 1;
    const accelStrength = this.accelerationFactor * speedMultiplier;

    if (this.keys['KeyW']) this.acceleration.z += accelStrength;
    if (this.keys['KeyS']) this.acceleration.z -= accelStrength;
    if (this.keys['KeyA']) this.acceleration.x += accelStrength;
    if (this.keys['KeyD']) this.acceleration.x -= accelStrength;
    if (this.keys['Space']) this.acceleration.y += accelStrength;
    if (this.keys['KeyQ']) this.acceleration.y -= accelStrength;

    this.acceleration.applyQuaternion(this.spaceship.quaternion);

    const damping = Math.pow(this.friction, dt * 60);
    this.velocity.addScaledVector(this.acceleration, dt);
    this.velocity.multiplyScalar(damping);

    const maxSpeed = this.maxSpeed * speedMultiplier;
    if (this.velocity.length() > maxSpeed) {
      this.velocity.normalize().multiplyScalar(maxSpeed);
    }

    this.spaceship.position.addScaledVector(this.velocity, dt);

    if (this.isPointerLocked) {
      this.euler.setFromQuaternion(this.spaceship.quaternion);
      this.euler.y += this.mouse.x * this.rotationSpeed;
      this.euler.x += this.mouse.y * this.rotationSpeed;
      this.euler.x = Math.max(-this.PI_2 + 0.05, Math.min(this.PI_2 - 0.05, this.euler.x));
      this.spaceship.quaternion.setFromEuler(this.euler);
      this.mouse.x = 0;
      this.mouse.y = 0;
    }

    this.updateFollowCamera(dt);
    this.updateEngineGlow(maxSpeed);
  }

  private updateFollowCamera(deltaTime: number) {
    const worldPosition = new THREE.Vector3();
    this.followCamera.getWorldPosition(worldPosition);
    this.camera.position.lerp(worldPosition, this.cameraLerp);
    this.camera.lookAt(this.spaceship.position);
  }

  private updateEngineGlow(maxSpeed: number) {
    if (!this.engineGlow) return;
    const speedRatio = THREE.MathUtils.clamp(this.velocity.length() / maxSpeed, 0, 1);
    const material = this.engineGlow.material as THREE.MeshBasicMaterial;
    material.opacity = 0.45 + speedRatio * 0.4;
    material.color.setHSL(0.55, 1, 0.6 + speedRatio * 0.2);
    this.engineGlow.scale.setScalar(1 + speedRatio * 0.6);
  }

  public getSpaceship(): THREE.Object3D {
    return this.spaceship;
  }

  public getPosition(): THREE.Vector3 {
    return this.spaceship.position.clone();
  }

  public getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  public getSpeed(): number {
    return this.velocity.length();
  }

  public isMoving(): boolean {
    return this.velocity.length() > 0.001;
  }

  public pointerLocked(): boolean {
    return this.isPointerLocked;
  }

  public getControlsInfo(): string {
    return `
      W/A/S/D - Thrust forward/strafe
      Space / Q - Up / Down
      Shift - Boost
      Click or C - Lock cursor and fly first-person
    `;
  }

  public dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('click', this.onClick);

    if (this.spaceship && this.scene) {
      this.scene.remove(this.spaceship);
    }
  }
}
