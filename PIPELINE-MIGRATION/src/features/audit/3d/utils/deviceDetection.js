/**
 * Device Detection Utilities
 * Mobile-first responsive design helpers
 */

import { DEVICE_BREAKPOINTS, DEVICE_TYPES } from '../constants/deviceBreakpoints.js';

export class DeviceDetection {
  static isMobile() {
    return window.innerWidth < DEVICE_BREAKPOINTS.MOBILE;
  }

  static isTablet() {
    return window.innerWidth >= DEVICE_BREAKPOINTS.MOBILE && 
           window.innerWidth < DEVICE_BREAKPOINTS.TABLET;
  }

  static isDesktop() {
    return window.innerWidth >= DEVICE_BREAKPOINTS.TABLET;
  }

  static getDeviceType() {
    if (this.isMobile()) return DEVICE_TYPES.MOBILE;
    if (this.isTablet()) return DEVICE_TYPES.TABLET;
    return DEVICE_TYPES.DESKTOP;
  }

  static hasHighPerformance() {
    return navigator.hardwareConcurrency > 4 && 
           window.devicePixelRatio <= 2;
  }

  static isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  static getViewportDimensions() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  // Performance-based quality recommendations
  static getRecommendedQuality() {
    const device = this.getDeviceType();
    const highPerf = this.hasHighPerformance();
    
    if (device === DEVICE_TYPES.MOBILE) return 'low';
    if (device === DEVICE_TYPES.TABLET) return highPerf ? 'medium' : 'low';
    return highPerf ? 'high' : 'medium';
  }
} 