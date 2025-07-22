/**
 * Camera Settings Configuration
 * Mobile-first responsive camera positioning
 */

// Base camera positions for different process views
export const CAMERA_POSITIONS = {
  overview: { x: 0, y: 3, z: 8, lookAt: { x: 0, y: 0, z: 0 } },
  leadGen: { x: -6, y: -1, z: 6, lookAt: { x: -6, y: 0.5, z: 0 } },
  qualification: { x: -3, y: -1, z: 6, lookAt: { x: -3, y: 0.5, z: 0 } },
  onboarding: { x: 0, y: -1, z: 6, lookAt: { x: 0, y: 0.5, z: 0 } },
  delivery: { x: 3, y: -1, z: 6, lookAt: { x: 3, y: 0.5, z: 0 } },
  retention: { x: 6, y: -1, z: 6, lookAt: { x: 6, y: 0.5, z: 0 } }
};

// Mobile-first camera configuration
export const CAMERA_CONFIG = {
  mobile: {
    fov: 75,                    // Field of view
    near: 0.1,                  // Near clipping plane
    far: 1000,                  // Far clipping plane
    position: { x: 0, y: 3, z: 8 }, // Further back to show full pipeline
    animation: {
      duration: 2,              // Animation duration in seconds
      easing: "power2.inOut"    // GSAP easing function
    }
  },
  desktop: {
    fov: 75,
    near: 0.1,
    far: 1000, 
    position: { x: 0, y: 3, z: 5 }, // Closer for detailed view
    animation: {
      duration: 2,
      easing: "power2.inOut"
    }
  }
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