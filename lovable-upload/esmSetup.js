// ESM setup to unify library imports and provide globals expected by existing code
// This lets us remove CDN <script> tags while keeping current code paths working.

import * as THREE_NS from 'three';
import { gsap } from 'gsap';

// Assign globals for legacy modules that access window.THREE / window.gsap
if (typeof window !== 'undefined') {
  // Avoid clobbering if already set
  if (!window.THREE) window.THREE = THREE_NS;
  if (!window.gsap) window.gsap = gsap;
}

export const THREE = THREE_NS;
export { gsap };


