/**
 * Lighting Component
 * Manages scene lighting for the 3D pipeline
 */

export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.init();
  }

  init() {
    this.createAmbientLight();
    this.createDirectionalLight();
  }

  createAmbientLight() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);
  }

  createDirectionalLight() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    
    // Shadow configuration
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    
    this.scene.add(directionalLight);
    this.lights.push(directionalLight);
  }

  dispose() {
    this.lights.forEach(light => {
      this.scene.remove(light);
      if (light.dispose) {
        light.dispose();
      }
    });
    this.lights = [];
  }

  // Adjust lighting based on device performance
  setQuality(quality) {
    const directionalLight = this.lights.find(light => light.type === 'DirectionalLight');
    if (!directionalLight) return;

    switch (quality) {
      case 'low':
        directionalLight.shadow.mapSize.setScalar(512);
        break;
      case 'medium':
        directionalLight.shadow.mapSize.setScalar(1024);
        break;
      case 'high':
        directionalLight.shadow.mapSize.setScalar(2048);
        break;
    }
    
    directionalLight.shadow.needsUpdate = true;
  }
} 