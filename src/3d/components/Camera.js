/**
 * Camera Component
 * Manages 3D camera with mobile-first responsive positioning
 */

import { CAMERA_POSITIONS, CAMERA_CONFIG, ARC_TRANSITION_CONFIG, ARC_DETECTION } from '../constants/cameraSettings.js';
import { DeviceDetection } from '../utils/deviceDetection.js';
import { DOMHelpers } from '../utils/domHelpers.js';
import { ErrorHandler } from '../utils/errorHandling.js';

export class Camera {
  constructor() {
    this.camera = null;
    this.currentDevice = DeviceDetection.getDeviceType();
    this.selectedProcess = 'overview'; // Ensure we start in overview
    
    // Arc transition state tracking
    this.transitionState = {
      active: false,
      id: null,
      step: null,        // 'direct', 'arc-step1', 'arc-step2'
      startTime: null,
      processId: null
    };
    
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
    
    // Set initial position to overview (mobile-first)
    const overviewPos = CAMERA_POSITIONS.overview;
    this.camera.position.set(overviewPos.x, overviewPos.y, overviewPos.z);
    this.camera.lookAt(overviewPos.lookAt.x, overviewPos.lookAt.y, overviewPos.lookAt.z);
    
    if (ARC_DETECTION.debugMode) {
      console.log('Camera initialized at overview position:', this.camera.position);
    }
  }

  getCurrentConfig() {
    return DeviceDetection.isMobile() ? CAMERA_CONFIG.mobile : CAMERA_CONFIG.desktop;
  }

  getCurrentArcConfig() {
    return DeviceDetection.isMobile() ? ARC_TRANSITION_CONFIG.mobile : ARC_TRANSITION_CONFIG.desktop;
  }

  animateToProcess(processId, duration = 2) {
    try {
      // Validate transition
      if (!this.validateTransition(processId)) {
        return false;
      }

      // Interrupt any existing transition
      if (this.transitionState.active) {
        this.interruptCurrentTransition();
      }

      // Generate new transition ID and update state
      this.transitionState = {
        active: true,
        id: Date.now() + Math.random(),
        step: null,
        startTime: performance.now(),
        processId: processId
      };

      const previousProcess = this.selectedProcess; // Track where we're coming FROM
      this.selectedProcess = processId; // Update where we're going TO
      const targetPos = CAMERA_POSITIONS[processId];
      
      // Validate transition parameters
      ErrorHandler.validateTransitionParameters(processId, targetPos, this.camera);
      
      if (ARC_DETECTION.debugMode) {
        console.log(`Camera transition ${this.transitionState.id}: ${previousProcess} → ${processId}`);
        console.log(`Current camera position:`, this.camera.position);
        console.log(`Target position:`, targetPos);
      }

      // Detect if this needs an arc transition
      if (this.shouldUseArcTransition(targetPos)) {
        if (ARC_DETECTION.debugMode) {
          console.log(`Using arc transition for ${previousProcess} → ${processId}`);
        }
        return this.executeArcTransition(processId, targetPos);
      } else {
        if (ARC_DETECTION.debugMode) {
          console.log(`Using direct transition for ${previousProcess} → ${processId}`);
        }
        return this.executeDirectTransition(processId, targetPos, duration);
      }
    } catch (error) {
      ErrorHandler.handleCameraTransitionError(error, 'animateToProcess', processId, this);
      this.resetTransitionState();
      return false;
    }
  }

  shouldUseArcTransition(targetPos) {
    try {
      if (!ARC_DETECTION.enabled) return false;
      
      const arcConfig = this.getCurrentArcConfig();
      if (!arcConfig.enabled) return false;
      
      // Use ACTUAL current camera position, not selectedProcess position
      const currentZ = this.camera.position.z;
      const currentX = this.camera.position.x;
      
      const isCurrentCloseUp = currentZ < ARC_DETECTION.closeUpThreshold;
      const isTargetCloseUp = targetPos.z < ARC_DETECTION.closeUpThreshold;
      const hasSignificantHorizontalDistance = Math.abs(currentX - targetPos.x) >= ARC_DETECTION.minHorizontalDistance;
      
      // CRITICAL: Overview transitions should NEVER use arc transitions
      // Overview is at z: 13 (far away), sections are at z: 2 (close)
      const isOverviewTransition = currentZ > 10 || targetPos.z > 10;
      
      if (ARC_DETECTION.debugMode) {
        console.log(`Arc detection: currentZ=${currentZ.toFixed(1)}, targetZ=${targetPos.z}, currentX=${currentX.toFixed(1)}, targetX=${targetPos.x}`);
        console.log(`Is current close-up: ${isCurrentCloseUp}, Is target close-up: ${isTargetCloseUp}, Has horizontal distance: ${hasSignificantHorizontalDistance}`);
        console.log(`Is overview transition: ${isOverviewTransition}`);
      }
      
      // Only use arc transition for close-up to close-up movements (NOT overview transitions)
      return !isOverviewTransition && isCurrentCloseUp && isTargetCloseUp && hasSignificantHorizontalDistance;
    } catch (error) {
      console.warn('Error in shouldUseArcTransition, defaulting to direct:', error);
      return false;
    }
  }

  executeDirectTransition(processId, targetPos, duration) {
    try {
      this.transitionState.step = 'direct';
      
      const config = this.getCurrentConfig();
      const actualDuration = duration || config.animation.duration;
      
      // SPECIAL HANDLING for section → overview transitions
      const isGoingToOverview = processId === 'overview';
      const isComingFromSection = this.camera.position.z < ARC_DETECTION.closeUpThreshold;
      
      if (isGoingToOverview && isComingFromSection) {
        // Use smooth overview transition (maintain current viewing direction)
        return this.executeOverviewTransition(targetPos, actualDuration, config);
      }
      
      // CRITICAL FIX: For overview → section transitions, ensure we start from EXACT current position
      const isComingFromOverview = this.camera.position.z > 10;
      const isGoingToSection = targetPos.z < ARC_DETECTION.closeUpThreshold;
      
      if (isComingFromOverview && isGoingToSection) {
        if (ARC_DETECTION.debugMode) {
          console.log('Overview → Section transition');
          console.log('Current camera position:', this.camera.position);
          console.log('Current camera lookAt direction:', this.getCurrentLookAtDirection());
          console.log('Target position:', targetPos);
        }
        
        // Get current look-at direction to maintain during initial part of zoom
        const currentLookAt = this.getCurrentLookAtDirection();
        
        // Create look-at transition object starting from current direction
        const lookAtTransition = {
          x: currentLookAt.x,
          y: currentLookAt.y,
          z: currentLookAt.z
        };
        
        // Animate camera position (this should start from EXACT current position)
        gsap.to(this.camera.position, {
          x: targetPos.x,
          y: targetPos.y, 
          z: targetPos.z,
          duration: actualDuration,
          ease: config.animation.easing,
          onComplete: () => {
            try {
              this.resetTransitionState();
            } catch (error) {
              console.warn('Error in overview→section transition completion:', error);
            }
          }
        });
        
        // Gradually rotate from current viewing direction to target
        gsap.to(lookAtTransition, {
          x: targetPos.lookAt.x,
          y: targetPos.lookAt.y,
          z: targetPos.lookAt.z,
          duration: actualDuration,
          ease: config.animation.easing,
          onUpdate: () => {
            try {
              if (this.transitionState.id && this.camera) {
                this.camera.lookAt(lookAtTransition.x, lookAtTransition.y, lookAtTransition.z);
              }
            } catch (error) {
              console.warn('Error in overview→section lookAt update:', error);
            }
          }
        });

        return true;
      }
      
      // Standard direct transition for other cases
      // Animate camera position with error handling
      gsap.to(this.camera.position, {
        x: targetPos.x,
        y: targetPos.y, 
        z: targetPos.z,
        duration: actualDuration,
        ease: config.animation.easing,
        onComplete: () => {
          try {
            this.resetTransitionState();
          } catch (error) {
            console.warn('Error in direct transition completion:', error);
          }
        }
      });
      
      // Animate camera look-at with error handling
      gsap.to(targetPos.lookAt, {
        duration: actualDuration,
        ease: config.animation.easing,
        onUpdate: () => {
          try {
            if (this.transitionState.id && this.camera) {
              this.camera.lookAt(targetPos.lookAt.x, targetPos.lookAt.y, targetPos.lookAt.z);
            }
          } catch (error) {
            console.warn('Error in direct transition lookAt update:', error);
          }
        }
      });

      return true;
    } catch (error) {
      ErrorHandler.handleCameraTransitionError(error, 'executeDirectTransition', processId, this);
      return false;
    }
  }

  executeOverviewTransition(targetPos, duration, config) {
    try {
      if (ARC_DETECTION.debugMode) {
        console.log('Executing smooth overview transition');
      }
      
      // CRITICAL: Capture current look-at direction to prevent jarring (same as arc transitions)
      const currentLookAt = new THREE.Vector3();
      this.camera.getWorldDirection(currentLookAt);
      currentLookAt.multiplyScalar(10); // Extend the direction vector
      currentLookAt.add(this.camera.position); // Convert to world position
      
      // Create look-at transition object
      const lookAtTransition = {
        x: currentLookAt.x,
        y: currentLookAt.y,
        z: currentLookAt.z
      };
      
      // Animate camera position to overview
      gsap.to(this.camera.position, {
        x: targetPos.x,
        y: targetPos.y, 
        z: targetPos.z,
        duration: duration,
        ease: config.animation.easing,
        onComplete: () => {
          try {
            this.resetTransitionState();
          } catch (error) {
            console.warn('Error in overview transition completion:', error);
          }
        }
      });
      
      // Gradually rotate view from current direction to overview center
      gsap.to(lookAtTransition, {
        x: targetPos.lookAt.x,
        y: targetPos.lookAt.y,
        z: targetPos.lookAt.z,
        duration: duration,
        ease: config.animation.easing,
        onUpdate: () => {
          try {
            if (this.transitionState.id && this.camera) {
              this.camera.lookAt(lookAtTransition.x, lookAtTransition.y, lookAtTransition.z);
            }
          } catch (error) {
            console.warn('Error in overview transition lookAt update:', error);
          }
        }
      });

      return true;
    } catch (error) {
      ErrorHandler.handleCameraTransitionError(error, 'executeOverviewTransition', 'overview', this);
      return false;
    }
  }

  executeArcTransition(processId, targetPos) {
    try {
      const arcConfig = this.getCurrentArcConfig();
      const waypoint = this.calculateArcWaypoint(this.camera.position, targetPos);
      
      // CRITICAL FIX: Capture current look-at direction to prevent jarring
      const currentLookAt = new THREE.Vector3();
      this.camera.getWorldDirection(currentLookAt);
      currentLookAt.multiplyScalar(10); // Extend the direction vector
      currentLookAt.add(this.camera.position); // Convert to world position
      
      // Create intermediate look-at that maintains current direction during zoom-out
      const intermediateLookAt = {
        x: currentLookAt.x,
        y: currentLookAt.y, 
        z: currentLookAt.z
      };
      
      this.transitionState.step = 'arc-step1';
      
      if (ARC_DETECTION.debugMode) {
        console.log(`Arc transition ${this.transitionState.id}: Step 1 - Moving to waypoint`, waypoint);
        console.log(`Current look-at direction:`, intermediateLookAt);
        console.log(`Target look-at:`, targetPos.lookAt);
      }

      // Step 1: Move to waypoint while MAINTAINING current look-at direction
      gsap.to(this.camera.position, {
        x: waypoint.x,
        y: waypoint.y,
        z: waypoint.z,
        duration: arcConfig.step1Duration,
        ease: arcConfig.easing,
        onComplete: () => {
          try {
            // Check if this transition was interrupted
            if (!this.transitionState.active || this.transitionState.processId !== processId) {
              if (ARC_DETECTION.debugMode) {
                console.log('Arc transition step 1 completed but transition was interrupted');
              }
              return;
            }
            
            this.executeArcStep2(processId, targetPos, arcConfig);
          } catch (error) {
            ErrorHandler.handleCameraTransitionError(error, 'arcStep1Complete', processId, this);
          }
        }
      });

      // Step 1: Keep looking in the SAME direction during zoom-out (no jarring)
      gsap.to(intermediateLookAt, {
        duration: arcConfig.step1Duration,
        ease: arcConfig.easing,
        onUpdate: () => {
          try {
            if (this.transitionState.id && this.camera) {
              this.camera.lookAt(intermediateLookAt.x, intermediateLookAt.y, intermediateLookAt.z);
            }
          } catch (error) {
            console.warn('Error in arc step 1 lookAt update:', error);
          }
        }
      });

      return true;
    } catch (error) {
      ErrorHandler.handleCameraTransitionError(error, 'executeArcTransition', processId, this);
      return false;
    }
  }

  executeArcStep2(processId, targetPos, arcConfig) {
    try {
      this.transitionState.step = 'arc-step2';
      
      if (ARC_DETECTION.debugMode) {
        console.log(`Arc transition ${this.transitionState.id}: Step 2 - Moving to target`, targetPos);
      }

      // Capture the current look-at direction at the start of step 2
      const currentLookAt = new THREE.Vector3();
      this.camera.getWorldDirection(currentLookAt);
      currentLookAt.multiplyScalar(10);
      currentLookAt.add(this.camera.position);

      // Create an object to animate the look-at transition
      const lookAtTransition = {
        x: currentLookAt.x,
        y: currentLookAt.y,
        z: currentLookAt.z
      };

      // Step 2: Move from waypoint to final target (zoom in)
      gsap.to(this.camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: arcConfig.step2Duration,
        ease: arcConfig.easing,
        onComplete: () => {
          try {
            if (ARC_DETECTION.debugMode) {
              const totalTime = performance.now() - this.transitionState.startTime;
              console.log(`Arc transition ${this.transitionState.id} completed in ${totalTime.toFixed(1)}ms`);
            }
            this.resetTransitionState();
          } catch (error) {
            console.warn('Error in arc step 2 completion:', error);
          }
        }
      });

      // Step 2: Smoothly rotate look-at from current direction to target direction
      gsap.to(lookAtTransition, {
        x: targetPos.lookAt.x,
        y: targetPos.lookAt.y,
        z: targetPos.lookAt.z,
        duration: arcConfig.step2Duration,
        ease: arcConfig.easing,
        onUpdate: () => {
          try {
            if (this.transitionState.id && this.camera) {
              this.camera.lookAt(lookAtTransition.x, lookAtTransition.y, lookAtTransition.z);
            }
          } catch (error) {
            console.warn('Error in arc step 2 lookAt update:', error);
          }
        }
      });
    } catch (error) {
      ErrorHandler.handleCameraTransitionError(error, 'executeArcStep2', processId, this);
    }
  }

  calculateArcWaypoint(currentPos, targetPos) {
    try {
      const arcConfig = this.getCurrentArcConfig();
      
      if (ARC_DETECTION.debugMode) {
        console.log(`Calculating arc waypoint from:`, currentPos, `to:`, targetPos);
      }
      
      const waypoint = {
        x: targetPos.x,                                           // Move to target X position
        y: Math.max(currentPos.y, targetPos.y),                  // Keep higher Y position
        z: Math.max(currentPos.z, targetPos.z) + arcConfig.zoomOutDistance, // Zoom out for arc
        lookAt: targetPos.lookAt                                  // Look where we're going
      };
      
      if (ARC_DETECTION.debugMode) {
        console.log(`Arc waypoint calculated:`, waypoint);
      }
      
      return waypoint;
    } catch (error) {
      console.warn('Error calculating arc waypoint, using fallback:', error);
      // Fallback waypoint
      return {
        x: targetPos.x,
        y: targetPos.y + 1,
        z: targetPos.z + 3,
        lookAt: targetPos.lookAt
      };
    }
  }

  interruptCurrentTransition() {
    if (!this.transitionState.active) return;
    
    try {
      if (ARC_DETECTION.debugMode) {
        console.log(`Interrupting transition ${this.transitionState.id} at step ${this.transitionState.step}`);
      }

      // Log the interruption for monitoring
      ErrorHandler.handleArcTransitionInterruption(
        this.transitionState.id, 
        this.transitionState.step, 
        this.transitionState.processId
      );

      // Kill all GSAP animations on camera position and lookAt
      gsap.killTweensOf(this.camera.position);
      gsap.killTweensOf(CAMERA_POSITIONS[this.transitionState.processId]?.lookAt);
      
      // Kill animations on all potential lookAt objects
      Object.values(CAMERA_POSITIONS).forEach(pos => {
        if (pos.lookAt) {
          gsap.killTweensOf(pos.lookAt);
        }
      });

      this.resetTransitionState();
    } catch (error) {
      console.error('Error during transition interruption:', error);
      // Force reset even if there's an error
      this.resetTransitionState();
    }
  }

  resetTransitionState() {
    this.transitionState = {
      active: false,
      id: null,
      step: null,
      startTime: null,
      processId: null
    };
  }

  validateTransition(processId) {
    try {
      const targetPos = CAMERA_POSITIONS[processId];
      if (!targetPos) {
        console.error(`Invalid process ID: ${processId}`);
        return false;
      }
      
      if (!this.camera) {
        console.error('Camera not initialized');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in validateTransition:', error);
      return false;
    }
  }

  resetToOverview() {
    this.animateToProcess('overview');
  }

  // Check if camera is currently transitioning
  isTransitioning() {
    return this.transitionState.active;
  }

  // Get current transition info for debugging
  getTransitionInfo() {
    return { ...this.transitionState };
  }

  handleResize() {
    try {
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
    } catch (error) {
      console.warn('Error in handleResize:', error);
    }
  }

  adaptToDevice() {
    try {
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
    } catch (error) {
      console.warn('Error in adaptToDevice:', error);
    }
  }

  setupEventListeners() {
    try {
      window.addEventListener('resize', () => this.handleResize());
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.handleResize(), 100);
      });
    } catch (error) {
      console.warn('Error setting up camera event listeners:', error);
    }
  }

  getCamera() {
    return this.camera;
  }

  dispose() {
    try {
      // Interrupt any active transitions
      this.interruptCurrentTransition();
      
      // Remove event listeners
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('orientationchange', this.handleResize);
    } catch (error) {
      console.warn('Error in camera dispose:', error);
    }
  }

  getCurrentLookAtDirection() {
    const currentLookAt = new THREE.Vector3();
    this.camera.getWorldDirection(currentLookAt);
    currentLookAt.multiplyScalar(10); // Extend the direction vector
    currentLookAt.add(this.camera.position); // Convert to world position
    return currentLookAt;
  }
} 