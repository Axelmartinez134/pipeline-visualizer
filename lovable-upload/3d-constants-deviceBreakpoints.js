/**
 * Device Breakpoints Configuration
 * Mobile-first responsive design constants
 */

export const DEVICE_BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200
};

export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet', 
  DESKTOP: 'desktop'
};

// Fixed canvas dimensions for consistent 3D rendering
export const CANVAS_CONFIG = {
  WIDTH: 'auto', // Use container width
  HEIGHT: 400,   // Fixed height for predictable aspect ratio
  ASPECT_RATIO: 16/10  // Default aspect ratio
}; 