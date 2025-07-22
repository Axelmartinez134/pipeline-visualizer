/**
 * Error Handling Utilities
 * Centralized error management for 3D pipeline
 */

export class ErrorHandler {
  static init() {
    // Global error handler for better debugging
    window.addEventListener('error', function(event) {
      console.error('Global Error:', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
      });
      
      ErrorHandler.showUserError('An unexpected error occurred. Please refresh the page.');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
      console.error('Unhandled Promise Rejection:', event.reason);
      ErrorHandler.showUserError('A system error occurred. Please try again.');
    });
  }

  static showUserError(message) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.textContent = `Error: ${message}`;
      loadingOverlay.style.display = 'flex';
    } else {
      // Fallback if overlay doesn't exist
      console.error('User Error:', message);
    }
  }

  static logError(context, error, additionalInfo = {}) {
    console.error(`Error in ${context}:`, {
      message: error.message,
      stack: error.stack,
      ...additionalInfo
    });
  }

  static validateLibraries() {
    const missingLibraries = [];
    
    if (typeof THREE === 'undefined') {
      missingLibraries.push('Three.js');
    }
    
    if (typeof gsap === 'undefined') {
      missingLibraries.push('GSAP');
    }
    
    if (missingLibraries.length > 0) {
      const message = `Missing libraries: ${missingLibraries.join(', ')}. Check internet connection.`;
      this.showUserError(message);
      return false;
    }
    
    return true;
  }

  static validateDOMElements(requiredElements) {
    const missingElements = [];
    
    for (const elementId of requiredElements) {
      const element = document.getElementById(elementId);
      if (!element) {
        missingElements.push(elementId);
      }
    }
    
    if (missingElements.length > 0) {
      this.logError('DOM Validation', new Error(`Missing elements: ${missingElements.join(', ')}`));
      return false;
    }
    
    return true;
  }
} 