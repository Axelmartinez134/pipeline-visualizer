/**
 * TransitionGuard
 * Centralizes transition throttling, in-progress state, and duration estimation
 */

export class TransitionGuard {
  constructor(camera, minTransitionInterval = 500) {
    this.camera = camera;
    this.isTransitionInProgress = false;
    this.lastTransitionTime = 0;
    this.minTransitionInterval = minTransitionInterval;
  }

  canStart() {
    const now = Date.now();
    if (this.isTransitionInProgress) return false;
    if (now - this.lastTransitionTime < this.minTransitionInterval) return false;
    if (this.camera?.isTransitioning && this.camera.isTransitioning()) return false;
    return true;
  }

  markStart() {
    this.isTransitionInProgress = true;
    this.lastTransitionTime = Date.now();
  }

  markEndAfter(ms, onEnd) {
    setTimeout(() => {
      this.isTransitionInProgress = false;
      if (typeof onEnd === 'function') onEnd();
    }, Math.max(0, ms));
  }

  estimateDuration(processId) {
    const camera = this.camera;
    if (!camera) return 2000;
    try {
      const targetPos = camera.camera ? camera.constructor.CAMERA_POSITIONS?.[processId] : null;
      if (!targetPos) return 2000;

      const currentZ = camera.camera.position.z;
      const isCurrentCloseUp = currentZ < 5;
      const isTargetCloseUp = targetPos.z < 5;
      const hasHorizontalDistance = Math.abs(camera.camera.position.x - targetPos.x) >= 1.5;

      if (isCurrentCloseUp && isTargetCloseUp && hasHorizontalDistance) {
        const arcConfig = camera.getCurrentArcConfig ? camera.getCurrentArcConfig() : { totalDuration: 2400 };
        return arcConfig.totalDuration || 2400;
      } else {
        const config = camera.getCurrentConfig ? camera.getCurrentConfig() : { animation: { duration: 2 } };
        return (config.animation?.duration || 2) * 1000;
      }
    } catch {
      return 2000;
    }
  }
}





