/**
 * Camera Component
 * Manages 3D camera with mobile-first responsive positioning
 */

import { CAMERA_POSITIONS, CAMERA_CONFIG } from '../constants/cameraSettings.js';
import { DeviceDetection } from '../utils/deviceDetection.js';
import { DOMHelpers } from '../utils/domHelpers.js';

export class Camera {
  constructor() {
    this.camera = null;
    this.currentDevice = DeviceDetection.getDeviceType();
    this.selectedProcess = 'overview';
    this.init();
    this.setupEventListeners();
  }

  init() {
    const config = this.getCurrentConfig();
    const dimensions = DOMHelpers.getCanvasDimensions();
    
    this.camera = new THREE.PerspectiveCamera(
      config.fov,
      dimensions.width / dimensions.height,
      config.near,
      config.far
    );
    
    // Set initial position (mobile-first)
    const initialPos = config.position;
    this.camera.position.set(initialPos.x, initialPos.y, initialPos.z);
    this.camera.lookAt(0, 0, 0);
  }

  getCurrentConfig() {
    return DeviceDetection.isMobile() ? CAMERA_CONFIG.mobile : CAMERA_CONFIG.desktop;
  }

  animateToProcess(processId, duration = 2) {
    this.selectedProcess = processId;
    const targetPos = CAMERA_POSITIONS[processId];
    
    if (!targetPos) {
      console.error('No camera position found for:', processId);
      return;
    }

    const config = this.getCurrentConfig();
    
    // Animate camera position
    gsap.to(this.camera.position, {
      x: targetPos.x,
      y: targetPos.y, 
      z: targetPos.z,
      duration: duration,
      ease: config.animation.easing
    });
    
    // Animate camera look-at
    gsap.to(targetPos.lookAt, {
      duration: duration,
      ease: config.animation.easing,
      onUpdate: () => {
        this.camera.lookAt(targetPos.lookAt.x, targetPos.lookAt.y, targetPos.lookAt.z);
      }
    });
  }

  resetToOverview() {
    this.animateToProcess('overview');
  }

  handleResize() {
    const newDevice = DeviceDetection.getDeviceType();
    const dimensions = DOMHelpers.getCanvasDimensions();
    
    // Update aspect ratio
    this.camera.aspect = dimensions.width / dimensions.height;
    this.camera.updateProjectionMatrix();
    
    // Device type changed - reconfigure camera for mobile-first
    if (newDevice !== this.currentDevice) {
      this.currentDevice = newDevice;
      this.adaptToDevice();
    }
  }

  adaptToDevice() {
    const config = this.getCurrentConfig();
    const currentPos = CAMERA_POSITIONS[this.selectedProcess];
    
    if (!currentPos) return;
    
    // Adjust Z position based on device (mobile needs to be further back)
    const deviceAdjustedZ = DeviceDetection.isMobile() 
      ? currentPos.z + 3  // Move further back on mobile
      : currentPos.z;
    
    // Smooth transition to device-appropriate position
    gsap.to(this.camera.position, {
      duration: 1.5,
      z: deviceAdjustedZ,
      ease: config.animation.easing
    });
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 100);
    });
  }

  getCamera() {
    return this.camera;
  }

  dispose() {
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
  }
} 