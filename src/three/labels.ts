import * as THREE from 'three';

export interface LabelInfo {
  name: string;
  position: THREE.Vector3;
  object: THREE.Object3D;
  distance?: number;
  additionalInfo?: string[];
}

export class LabelManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private labels: Map<string, LabelInfo> = new Map();
  private labelElements: Map<string, HTMLElement> = new Map();
  private container: HTMLElement;
  private enabled: boolean = true;
  private maxDistance: number = 100;
  private fadeDistance: number = 50;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, container?: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.container = container || document.body;
    this.createLabelContainer();
  }

  private createLabelContainer() {
    // Create a container for all labels if it doesn't exist
    let labelContainer = document.getElementById('label-container');
    if (!labelContainer) {
      labelContainer = document.createElement('div');
      labelContainer.id = 'label-container';
      labelContainer.style.position = 'absolute';
      labelContainer.style.top = '0';
      labelContainer.style.left = '0';
      labelContainer.style.width = '100%';
      labelContainer.style.height = '100%';
      labelContainer.style.pointerEvents = 'none';
      labelContainer.style.zIndex = '1000';
      this.container.appendChild(labelContainer);
    }
  }

  public addLabel(id: string, labelInfo: LabelInfo): void {
    this.labels.set(id, labelInfo);
    
    // Create HTML element for the label
    const labelElement = document.createElement('div');
    labelElement.className = 'object-label';
    labelElement.innerHTML = `
      <div class="label-name">${labelInfo.name}</div>
      ${labelInfo.additionalInfo ? labelInfo.additionalInfo.map(info => `<div class="label-info">${info}</div>`).join('') : ''}
    `;
    
    // Style the label
    Object.assign(labelElement.style, {
      position: 'absolute',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      transform: 'translate(-50%, -100%)',
      transformOrigin: 'center',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(4px)',
      transition: 'opacity 0.3s ease'
    });

    // Style the name part
    const nameElement = labelElement.querySelector('.label-name') as HTMLElement;
    if (nameElement) {
      nameElement.style.fontWeight = 'bold';
      nameElement.style.marginBottom = '2px';
    }

    // Style the info parts
    const infoElements = labelElement.querySelectorAll('.label-info');
    infoElements.forEach((info: Element) => {
      const infoElement = info as HTMLElement;
      infoElement.style.fontSize = '10px';
      infoElement.style.color = 'rgba(255, 255, 255, 0.8)';
    });

    document.getElementById('label-container')!.appendChild(labelElement);
    this.labelElements.set(id, labelElement);
  }

  public removeLabel(id: string): void {
    this.labels.delete(id);
    const element = this.labelElements.get(id);
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
    this.labelElements.delete(id);
  }

  public updateLabel(id: string, labelInfo: Partial<LabelInfo>): void {
    const existingLabel = this.labels.get(id);
    if (existingLabel) {
      const updatedLabel = { ...existingLabel, ...labelInfo };
      this.labels.set(id, updatedLabel);
      
      // Update the HTML content if needed
      const element = this.labelElements.get(id);
      if (element) {
        element.innerHTML = `
          <div class="label-name">${updatedLabel.name}</div>
          ${updatedLabel.additionalInfo ? updatedLabel.additionalInfo.map(info => `<div class="label-info">${info}</div>`).join('') : ''}
        `;
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const container = document.getElementById('label-container');
    if (container) {
      container.style.display = enabled ? 'block' : 'none';
    }
  }

  public setMaxDistance(distance: number): void {
    this.maxDistance = distance;
  }

  public setFadeDistance(distance: number): void {
    this.fadeDistance = distance;
  }

  public update(): void {
    if (!this.enabled) return;

    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);

    const canvas = this.renderer.domElement;
    const canvasRect = canvas.getBoundingClientRect();

    this.labels.forEach((labelInfo, id) => {
      const element = this.labelElements.get(id);
      if (!element) return;

      // Update position if the object has moved
      const worldPosition = new THREE.Vector3();
      labelInfo.object.getWorldPosition(worldPosition);
      labelInfo.position = worldPosition;

      // Calculate distance from camera
      const distance = cameraPosition.distanceTo(worldPosition);
      labelInfo.distance = distance;

      // Check if object is within visible range
      if (distance > this.maxDistance) {
        element.style.display = 'none';
        return;
      }

      // Check if object is in front of camera
      const objectDirection = worldPosition.clone().sub(cameraPosition).normalize();
      const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const dot = objectDirection.dot(cameraDirection);
      
      if (dot <= 0) {
        element.style.display = 'none';
        return;
      }

      // Convert world position to screen position
      const screenPosition = worldPosition.clone();
      screenPosition.project(this.camera);

      // Convert normalized device coordinates to screen coordinates
      const x = (screenPosition.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
      const y = (-screenPosition.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top;

      // Position the label
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.display = 'block';

      // Apply fade effect based on distance
      let opacity = 1;
      if (distance > this.fadeDistance) {
        opacity = Math.max(0, 1 - (distance - this.fadeDistance) / (this.maxDistance - this.fadeDistance));
      }
      element.style.opacity = opacity.toString();

      // Scale based on distance
      const scale = Math.max(0.5, Math.min(1, 20 / distance));
      element.style.transform = `translate(-50%, -100%) scale(${scale})`;
    });
  }

  public createPlanetLabels(planetSystem: any): void {
    if (!planetSystem || !planetSystem.planets) return;

    planetSystem.planets.forEach((planet: any, index: number) => {
      const labelInfo: LabelInfo = {
        name: planet.name || `Planet ${index + 1}`,
        position: planet.mesh.position.clone(),
        object: planet.mesh,
        additionalInfo: [
          `Distance: ${(planet.orbitRadius || 0).toFixed(1)} AU`,
          `Period: ${((planet.orbitSpeed || 0) * 365).toFixed(0)} days`,
          `Radius: ${((planet.size || 0) * 1000).toFixed(0)} km`
        ]
      };
      this.addLabel(`planet_${index}`, labelInfo);
    });

    // Add Sun label
    if (planetSystem.sun) {
      const sunInfo: LabelInfo = {
        name: 'Sun',
        position: planetSystem.sun.position.clone(),
        object: planetSystem.sun,
        additionalInfo: [
          'Type: G-type main-sequence star',
          'Temperature: ~5,778 K',
          'Radius: 696,000 km'
        ]
      };
      this.addLabel('sun', sunInfo);
    }
  }

  public createOrbitLabels(planetSystem: any): void {
    if (!planetSystem || !planetSystem.planets) return;

    planetSystem.planets.forEach((planet: any, index: number) => {
      if (planet.orbitRadius) {
        // Create orbit line visualization
        const orbitGeometry = new THREE.RingGeometry(
          planet.orbitRadius - 0.01,
          planet.orbitRadius + 0.01,
          64
        );
        const orbitMaterial = new THREE.MeshBasicMaterial({
          color: 0x444444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.3
        });
        const orbitMesh = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitMesh.rotation.x = Math.PI / 2;
        this.scene.add(orbitMesh);
        
        // Store reference for cleanup
        planet.orbitMesh = orbitMesh;
      }
    });
  }

  public toggleLabels(): void {
    this.setEnabled(!this.enabled);
  }

  public getVisibleLabels(): LabelInfo[] {
    return Array.from(this.labels.values()).filter(label => 
      label.distance !== undefined && label.distance <= this.maxDistance
    );
  }

  public dispose(): void {
    // Remove all label elements
    this.labelElements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    // Remove label container
    const container = document.getElementById('label-container');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }

    // Clear maps
    this.labels.clear();
    this.labelElements.clear();
  }

  public static createCSS(): void {
    // Inject CSS styles for labels
    const style = document.createElement('style');
    style.textContent = `
      .object-label {
        pointer-events: none;
        user-select: none;
        font-family: 'Courier New', monospace;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      }
      
      .object-label .label-name {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 2px;
        color: #ffffff;
      }
      
      .object-label .label-info {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 1px;
      }
      
      @media (max-width: 768px) {
        .object-label {
          font-size: 10px;
          padding: 4px 6px;
        }
        
        .object-label .label-name {
          font-size: 12px;
        }
        
        .object-label .label-info {
          font-size: 9px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
