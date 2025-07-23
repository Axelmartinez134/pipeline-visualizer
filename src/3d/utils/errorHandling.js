/**
 * Error Handling Utilities
 * Centralized error management for the 3D pipeline system
 */

export class ErrorHandler {
  static init() {
    // Initialize error handling
    window.addEventListener('error', ErrorHandler.handleGlobalError);
    window.addEventListener('unhandledrejection', ErrorHandler.handlePromiseRejection);
  }

  static validateLibraries() {
    const requiredLibraries = [
      { name: 'THREE', obj: window.THREE },
      { name: 'gsap', obj: window.gsap }
    ];

    const missing = requiredLibraries.filter(lib => !lib.obj);
    
    if (missing.length > 0) {
      const missingNames = missing.map(lib => lib.name).join(', ');
      ErrorHandler.showUserError(`Required libraries not loaded: ${missingNames}. Please refresh the page.`);
      return false;
    }

    return true;
  }

  static validateDOMElements(elementIds) {
    const missing = elementIds.filter(id => !document.getElementById(id));
    
    if (missing.length > 0) {
      console.error('Missing DOM elements:', missing);
      return false;
    }

    return true;
  }

  static handleCameraTransitionError(error, transitionType, processId, camera) {
    console.error(`Camera transition error [${transitionType}] to ${processId}:`, error);
    
    try {
      // Attempt graceful recovery
      if (camera && camera.interruptCurrentTransition) {
        camera.interruptCurrentTransition();
      }
      
      // Try direct fallback transition
      if (camera && camera.executeDirectTransition) {
        console.log('Attempting fallback direct transition');
        const targetPos = camera.constructor.CAMERA_POSITIONS?.[processId];
        if (targetPos) {
          camera.executeDirectTransition(processId, targetPos, 1); // Fast 1-second fallback
        }
      }
      
      // Update UI to remove transition state
      ErrorHandler.clearTransitionFeedback();
      
      // Log recovery attempt
      ErrorHandler.logError('CameraTransitionRecovery', {
        originalError: error,
        transitionType,
        processId,
        recoveryAttempted: true
      });
      
    } catch (recoveryError) {
      console.error('Camera transition recovery failed:', recoveryError);
      ErrorHandler.showUserError('Navigation error occurred. Please refresh the page if issues persist.');
    }
  }

  static clearTransitionFeedback() {
    try {
      // Remove transitioning classes
      document.querySelectorAll('.tab.transitioning').forEach(tab => {
        tab.classList.remove('transitioning');
      });
      
      const container = document.querySelector('.pipeline-container');
      if (container) {
        container.classList.remove('arc-transitioning');
      }
    } catch (error) {
      console.warn('Error clearing transition feedback:', error);
    }
  }

  static handleArcTransitionInterruption(transitionId, step, processId) {
    console.log(`Arc transition ${transitionId} interrupted at ${step} while navigating to ${processId}`);
    
    // Clean up any pending animations
    try {
      // Kill all camera-related animations
      if (window.gsap) {
        gsap.killTweensOf('*'); // Nuclear option - kill all animations
      }
      
      ErrorHandler.clearTransitionFeedback();
      
    } catch (error) {
      console.error('Error during transition interruption cleanup:', error);
    }
  }

  static validateTransitionParameters(processId, targetPos, camera) {
    const errors = [];
    
    if (!processId || typeof processId !== 'string') {
      errors.push('Invalid processId');
    }
    
    if (!targetPos || typeof targetPos !== 'object') {
      errors.push('Invalid target position');
    }
    
    if (!camera || !camera.position) {
      errors.push('Invalid camera object');
    }
    
    if (targetPos) {
      if (typeof targetPos.x !== 'number' || typeof targetPos.y !== 'number' || typeof targetPos.z !== 'number') {
        errors.push('Invalid target coordinates');
      }
      
      if (!targetPos.lookAt || typeof targetPos.lookAt.x !== 'number') {
        errors.push('Invalid lookAt coordinates');
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Transition validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }

  static handleGSAPError(error, animationType, targetObject) {
    console.error(`GSAP animation error [${animationType}]:`, error);
    
    try {
      // Kill the problematic animation
      if (window.gsap && targetObject) {
        gsap.killTweensOf(targetObject);
      }
      
      ErrorHandler.logError('GSAPAnimation', {
        error: error.message,
        animationType,
        targetObject: targetObject?.constructor?.name || 'unknown'
      });
      
    } catch (cleanupError) {
      console.error('Error during GSAP cleanup:', cleanupError);
    }
  }

  static handleDeviceDetectionError(error) {
    console.warn('Device detection error:', error);
    
    // Fallback to desktop configuration
    return {
      type: 'desktop',
      isMobile: false,
      isTablet: false
    };
  }

  static handlePerformanceWarning(metric, threshold, actual) {
    console.warn(`Performance warning: ${metric} (${actual}) exceeded threshold (${threshold})`);
    
    // Could implement performance degradation logic here
    if (metric === 'transitionDuration' && actual > threshold * 2) {
      console.log('Switching to simplified transitions due to performance');
      // Could set a flag to disable arc transitions
    }
  }

  static logError(context, error) {
    const errorData = {
      context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error(`[${context}]`, errorData);
    
    // In production, you could send this to an error reporting service
    // ErrorReportingService.send(errorData);
  }

  static showUserError(message) {
    console.error('User error:', message);
    
    // Show error in loading overlay if available
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.textContent = message;
      overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      overlay.style.color = '#dc2626';
    }
    
    // Alternative: show alert as fallback
    setTimeout(() => {
      if (overlay && overlay.style.display === 'flex') {
        alert(message);
      }
    }, 5000);
  }

  static handleGlobalError(event) {
    ErrorHandler.logError('Global', event.error || event);
  }

  static handlePromiseRejection(event) {
    ErrorHandler.logError('UnhandledPromise', event.reason);
  }

  // Debug utilities
  static enableDebugMode() {
    window.PipelineDebug = {
      getTransitionState: () => {
        const uiController = window.PipelineVisualization?.renderer?.uiController;
        return uiController?.getTransitionState ? uiController.getTransitionState() : null;
      },
      getCameraInfo: () => {
        const camera = window.PipelineVisualization?.renderer?.sceneManager?.camera;
        return camera?.getTransitionInfo ? camera.getTransitionInfo() : null;
      },
      forceDirectTransition: (processId) => {
        const camera = window.PipelineVisualization?.renderer?.sceneManager?.camera;
        if (camera && camera.executeDirectTransition) {
          const targetPos = camera.constructor.CAMERA_POSITIONS?.[processId];
          if (targetPos) {
            camera.executeDirectTransition(processId, targetPos, 1);
          }
        }
      },
      clearAllTransitions: () => {
        if (window.gsap) {
          gsap.killTweensOf('*');
        }
        ErrorHandler.clearTransitionFeedback();
      }
    };
    
    console.log('Debug mode enabled. Use window.PipelineDebug for debugging tools.');
  }
} 