import * as THREE from 'three';

export class SpaceshipControls {
  private spaceship: THREE.Object3D;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private acceleration: THREE.Vector3 = new THREE.Vector3();
  private keys: { [key: string]: boolean } = {};
  private mouse: { x: number; y: number } = { x: 0, y: 0 };
  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private PI_2 = Math.PI / 2;
  private isPointerLocked = false;
  private followCamera: THREE.Object3D;
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
      this.mouse.x += event.movementX * this.rotationSpeed;
      this.mouse.y += event.movementY * this.rotationSpeed;
      this.mouse.y = Math.max(-this.PI_2, Math.min(this.PI_2, this.mouse.y));
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
  private rendererTarget: HTMLElement;

  // Physics constants
  private readonly maxSpeed = 0.5;
  private readonly acceleration_factor = 0.01;
  private readonly friction = 0.95;
  private readonly rotationSpeed = 0.002;
  private readonly boostMultiplier = 3;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.rendererTarget = document.body;
    
    // Create spaceship geometry
    this.createSpaceship();
    
    // Setup follow camera
    this.setupFollowCamera();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  private createSpaceship() {
    // Create a simple spaceship model
    const group = new THREE.Group();
    
    // Main body (fuselage)
    const bodyGeometry = new THREE.ConeGeometry(0.1, 0.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b9fb5, metalness: 0.85, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(0.3, 0.02, 0.1);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x748ca5, metalness: 0.8, roughness: 0.25 });
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.15, 0, -0.1);
    group.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.15, 0, -0.1);
    group.add(rightWing);
    
    // Engine glow effect
    const glowGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.7 
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0, -0.3);
    group.add(glow);
    
    // Position spaceship
    group.position.set(0, 0, 5);
    
    this.spaceship = group;
    this.scene.add(this.spaceship);
  }

  private setupFollowCamera() {
    // Create a cockpit mount so user feels inside the spacecraft
    this.followCamera = new THREE.Object3D();
    this.followCamera.position.set(0, 0.2, 0.1);
    this.spaceship.add(this.followCamera);
    this.followCamera.add(this.camera);
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(new THREE.Vector3(0, 0, 1));
  }

  private setupEventListeners() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('click', this.onClick);
  }

  private requestPointerLock() {
    this.rendererTarget.requestPointerLock();
  }

  public update(deltaTime: number) {
    // Reset acceleration
    this.acceleration.set(0, 0, 0);

    // Handle input
    const isBoost = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speedMultiplier = isBoost ? this.boostMultiplier : 1;

    // Forward/backward (W/S)
    if (this.keys['KeyW']) {
      this.acceleration.z += this.acceleration_factor * speedMultiplier;
    }
    if (this.keys['KeyS']) {
      this.acceleration.z -= this.acceleration_factor * speedMultiplier;
    }

    // Strafe left/right (A/D)
    if (this.keys['KeyA']) {
      this.acceleration.x += this.acceleration_factor * speedMultiplier;
    }
    if (this.keys['KeyD']) {
      this.acceleration.x -= this.acceleration_factor * speedMultiplier;
    }

    // Up/down (Space/Q)
    if (this.keys['Space']) {
      this.acceleration.y += this.acceleration_factor * speedMultiplier;
    }
    if (this.keys['KeyQ']) {
      this.acceleration.y -= this.acceleration_factor * speedMultiplier;
    }

    // Apply acceleration relative to spaceship orientation
    this.acceleration.applyQuaternion(this.spaceship.quaternion);

    // Update velocity
    this.velocity.add(this.acceleration);
    this.velocity.multiplyScalar(this.friction);

    // Clamp velocity to max speed
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }

    // Update spaceship position
    this.spaceship.position.add(this.velocity);

    // Handle mouse look (rotation)
    if (this.isPointerLocked) {
      this.euler.setFromQuaternion(this.spaceship.quaternion);
      this.euler.y = this.mouse.x;
      this.euler.x = this.mouse.y;
      this.spaceship.quaternion.setFromEuler(this.euler);
    }

    // Update camera to follow spaceship
    this.updateFollowCamera();
  }

  private updateFollowCamera() {
    // Camera inherits position and rotation directly from cockpit mount.
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

  public isMoving(): boolean {
    return this.velocity.length() > 0.001;
  }

  public getControlsInfo(): string {
    return `
      SPACESHIP CONTROLS:
      W/A/S/D - Move Forward/Left/Backward/Right
      Space/Q - Move Up/Down
      Shift - Boost
      Mouse - Look around (click to enable)
      C - Enable mouse look
    `;
  }

  public dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('click', this.onClick);
    
    // Remove spaceship from scene
    if (this.spaceship && this.scene) {
      this.scene.remove(this.spaceship);
    }
  }
}
