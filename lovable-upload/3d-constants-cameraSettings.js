/**
 * Camera Settings Configuration
 * Mobile-first responsive camera positioning
 */

// Base camera positions for different process views
export const CAMERA_POSITIONS = {
  overview: { x: 0, y: 3, z: 13, lookAt: { x: 0, y: 0, z: 0 } },
  leadGen: { x: -6, y: -2.4, z: 2, lookAt: { x: -6, y: 2.5, z: 0 } },
  qualification: { x: -3, y: -2.4, z: 2, lookAt: { x: -3, y: 2.5, z: 0 } },
  onboarding: { x: 0, y: -2.4, z: 2, lookAt: { x: 0, y: 2.5, z: 0 } },
  delivery: { x: 3, y: -2.4, z: 2, lookAt: { x: 3, y: 2.5, z: 0 } },
  retention: { x: 6, y: -2.4, z: 2, lookAt: { x: 6, y: 2.5, z: 0 } }
};

// Mobile-first camera configuration
export const CAMERA_CONFIG = {
  mobile: {
    fov: 75,                    // Field of view
    near: 0.1,                  // Near clipping plane
    far: 1000,                  // Far clipping plane
    position: { x: 0, y: 3, z: 13 }, // Match overview position exactly
    animation: {
      duration: 2,              // Animation duration in seconds
      easing: "power2.inOut"    // GSAP easing function
    }
  },
  desktop: {
    fov: 75,
    near: 0.1,
    far: 1000, 
    position: { x: 0, y: 3, z: 13 }, // Match overview position exactly
    animation: {
      duration: 2,
      easing: "power2.inOut"
    }
  }
};

// Arc transition configuration for smooth close-up to close-up transitions
export const ARC_TRANSITION_CONFIG = {
  mobile: {
    enabled: true,
    zoomOutDistance: 2,         // Less zoom-out on mobile for performance
    step1Duration: 0.8,         // Faster transitions on mobile
    step2Duration: 0.8,
    easing: "power1.inOut",     // Smoother easing for mobile
    totalDuration: 1.6          // Total arc transition time
  },
  desktop: {
    enabled: true,
    zoomOutDistance: 3,         // More dramatic zoom-out on desktop
    step1Duration: 1.2,         // Slower, more cinematic on desktop
    step2Duration: 1.2,
    easing: "power2.inOut",     // More pronounced easing
    totalDuration: 2.4          // Total arc transition time
  }
};

// Arc detection configuration
export const ARC_DETECTION = {
  enabled: true,
  closeUpThreshold: 5,          // Z distance that triggers arc transition
  minHorizontalDistance: 1.5,   // Minimum X distance to trigger arc
  debugMode: false              // Enable console logging for debugging
};

// Material colors
export const MATERIAL_COLORS = {
  BOTTLENECK: 0xff4444,     // Red for bottlenecks
  OPTIMIZED: 0x40c057,      // Green for optimized state
  NORMAL: 0xc0c0c0,         // Silver/gray for normal pipes
  CONNECTOR: 0x888888,      // Dark gray for connectors
  WATER_FLOW: 0x4a90e2,     // Blue for water animation
  BACKGROUND: 0xf8f9fa      // Light gray background
}; 