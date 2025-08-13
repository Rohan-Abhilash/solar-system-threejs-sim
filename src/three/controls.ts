import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls';

export interface ControlsConfig {
  enableDamping: boolean;
  dampingFactor: number;
  enableZoom: boolean;
  enableRotate: boolean;
  enablePan: boolean;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
}

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls | FlyControls | FirstPersonControls;
  private clock: THREE.Clock;
  private controlType: 'orbit' | 'fly' | 'first-person' = 'orbit';
  private keyStates: { [key: string]: boolean } = {};
  private moveSpeed = 50;
  private rotationSpeed = 0.002;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    config: Partial<ControlsConfig> = {}
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.clock = new THREE.Clock();

    const defaultConfig: ControlsConfig = {
      enableDamping: true,
      dampingFactor: 0.05,
      enableZoom: true,
      enableRotate: true,
      enablePan: true,
      minDistance: 10,
      maxDistance: 50000,
      minPolarAngle: 0,
      maxPolarAngle: Math.PI
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.setupControls(finalConfig);
    this.setupKeyboardControls();
  }

  private setupControls(config: ControlsConfig) {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // Apply configuration
    this.controls.enableDamping = config.enableDamping;
    this.controls.dampingFactor = config.dampingFactor;
    this.controls.enableZoom = config.enableZoom;
    this.controls.enableRotate = config.enableRotate;
    this.controls.enablePan = config.enablePan;
    this.controls.minDistance = config.minDistance;
    this.controls.maxDistance = config.maxDistance;
    this.controls.minPolarAngle = config.minPolarAngle;
    this.controls.maxPolarAngle = config.maxPolarAngle;

    // Smooth controls
    this.controls.screenSpacePanning = false;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
  }

  private setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
      this.keyStates[event.code] = true;
      this.handleKeyDown(event);
    });

    document.addEventListener('keyup', (event) => {
      this.keyStates[event.code] = false;
    });
  }

  private handleKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case 'Digit1':
        this.switchControlType('orbit');
        break;
      case 'Digit2':
        this.switchControlType('fly');
        break;
      case 'Digit3':
        this.switchControlType('first-person');
        break;
      case 'KeyR':
        this.resetCamera();
        break;
      case 'KeyF':
        this.focusOnOrigin();
        break;
    }
  }

  private switchControlType(type: 'orbit' | 'fly' | 'first-person') {
    if (this.controlType === type) return;

    // Dispose current controls
    this.controls.dispose();

    this.controlType = type;

    switch (type) {
      case 'orbit':
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.setupControls({
          enableDamping: true,
          dampingFactor: 0.05,
          enableZoom: true,
          enableRotate: true,
          enablePan: true,
          minDistance: 10,
          maxDistance: 50000,
          minPolarAngle: 0,
          maxPolarAngle: Math.PI
        });
        break;
      
      case 'fly':
        this.controls = new FlyControls(this.camera, this.renderer.domElement);
        (this.controls as FlyControls).movementSpeed = 1000;
        (this.controls as FlyControls).rollSpeed = Math.PI / 24;
        (this.controls as FlyControls).autoForward = false;
        (this.controls as FlyControls).dragToLook = false;
        break;
      
      case 'first-person':
        this.controls = new FirstPersonControls(this.camera, this.renderer.domElement);
        (this.controls as FirstPersonControls).movementSpeed = 1000;
        (this.controls as FirstPersonControls).lookSpeed = 0.1;
        (this.controls as FirstPersonControls).lookVertical = true;
        (this.controls as FirstPersonControls).constrainVertical = true;
        (this.controls as FirstPersonControls).verticalMin = 1.0;
        (this.controls as FirstPersonControls).verticalMax = 2.0;
        break;
    }
  }

  public update() {
    const delta = this.clock.getDelta();
    
    // Handle continuous keyboard input
    this.handleContinuousInput(delta);
    
    // Update controls
    if (this.controlType === 'fly' || this.controlType === 'first-person') {
      (this.controls as FlyControls | FirstPersonControls).update(delta);
    } else {
      this.controls.update();
    }
  }

  private handleContinuousInput(delta: number) {
    if (this.controlType !== 'orbit') return;

    const moveDistance = this.moveSpeed * delta;
    const rotateAngle = this.rotationSpeed * delta;

    // Movement keys (WASD)
    if (this.keyStates['KeyW']) {
      this.camera.position.add(
        this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(moveDistance)
      );
    }
    if (this.keyStates['KeyS']) {
      this.camera.position.add(
        this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(-moveDistance)
      );
    }
    if (this.keyStates['KeyA']) {
      this.camera.position.add(
        new THREE.Vector3().crossVectors(this.camera.up, this.camera.getWorldDirection(new THREE.Vector3())).normalize().multiplyScalar(moveDistance)
      );
    }
    if (this.keyStates['KeyD']) {
      this.camera.position.add(
        new THREE.Vector3().crossVectors(this.camera.up, this.camera.getWorldDirection(new THREE.Vector3())).normalize().multiplyScalar(-moveDistance)
      );
    }

    // Vertical movement (Q/E)
    if (this.keyStates['KeyQ']) {
      this.camera.position.y -= moveDistance;
    }
    if (this.keyStates['KeyE']) {
      this.camera.position.y += moveDistance;
    }

    // Rotation (Arrow keys)
    if (this.keyStates['ArrowLeft']) {
      this.camera.rotateY(rotateAngle);
    }
    if (this.keyStates['ArrowRight']) {
      this.camera.rotateY(-rotateAngle);
    }
    if (this.keyStates['ArrowUp']) {
      this.camera.rotateX(rotateAngle);
    }
    if (this.keyStates['ArrowDown']) {
      this.camera.rotateX(-rotateAngle);
    }
  }

  public resetCamera() {
    this.camera.position.set(0, 0, 1000);
    this.camera.lookAt(0, 0, 0);
    if (this.controlType === 'orbit') {
      (this.controls as OrbitControls).target.set(0, 0, 0);
      this.controls.update();
    }
  }

  public focusOnOrigin() {
    if (this.controlType === 'orbit') {
      (this.controls as OrbitControls).target.set(0, 0, 0);
      this.controls.update();
    }
  }

  public focusOnObject(object: THREE.Object3D, distance: number = 100) {
    const boundingBox = new THREE.Box3().setFromObject(object);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * distance / 100;

    this.camera.position.copy(center);
    this.camera.position.z += cameraDistance;
    this.camera.lookAt(center);

    if (this.controlType === 'orbit') {
      (this.controls as OrbitControls).target.copy(center);
      this.controls.update();
    }
  }

  public setMoveSpeed(speed: number) {
    this.moveSpeed = speed;
    if (this.controlType === 'fly') {
      (this.controls as FlyControls).movementSpeed = speed;
    } else if (this.controlType === 'first-person') {
      (this.controls as FirstPersonControls).movementSpeed = speed;
    }
  }

  public setRotationSpeed(speed: number) {
    this.rotationSpeed = speed;
  }

  public getControlType(): string {
    return this.controlType;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getControls(): OrbitControls | FlyControls | FirstPersonControls {
    return this.controls;
  }

  public dispose() {
    this.controls.dispose();
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyDown);
  }

  // Smooth camera transitions
  public animateToPosition(
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    duration: number = 2000
  ) {
    const startPosition = this.camera.position.clone();
    const startLookAt = this.controlType === 'orbit' 
      ? (this.controls as OrbitControls).target.clone()
      : new THREE.Vector3(0, 0, 0);
    
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate position
      this.camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
      
      // Interpolate look-at target
      if (this.controlType === 'orbit') {
        const currentTarget = new THREE.Vector3().lerpVectors(startLookAt, targetLookAt, easedProgress);
        (this.controls as OrbitControls).target.copy(currentTarget);
        this.controls.update();
      } else {
        const currentLookAt = new THREE.Vector3().lerpVectors(startLookAt, targetLookAt, easedProgress);
        this.camera.lookAt(currentLookAt);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
}

export default CameraControls;
