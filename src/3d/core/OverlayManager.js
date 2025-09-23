/**
 * OverlayManager
 * Handles educational overlay DOM updates and visibility
 */

export class OverlayManager {
  constructor(sceneManager, businessData) {
    this.sceneManager = sceneManager;
    this.businessData = businessData;
    this._pendingTimeout = null;
  }

  updateEducationalOverlays() {
    try {
      // Update business type from dropdown
      const industrySelect = document.getElementById('industrySelect');
      const businessTypeText = document.getElementById('businessTypeText');
      if (industrySelect && businessTypeText) {
        const selectedOption = industrySelect.options[industrySelect.selectedIndex];
        const businessType = selectedOption ? selectedOption.text.replace(' Business', '') : 'Coaching';
        businessTypeText.textContent = businessType;
      }

      // Update constraint stage and triangle position
      const constraintStageText = document.getElementById('constraintStageText');
      const bottomOverlay = document.getElementById('educationalBottomOverlay');
      if (constraintStageText && bottomOverlay && this.sceneManager?.pipeline) {
        const bottleneckStage = this.sceneManager.pipeline.getBottleneckStage();
        const stageNames = {
          leadGen: 'Marketing',
          qualification: 'Sales',
          onboarding: 'Onboarding',
          delivery: 'Fulfillment',
          retention: 'Retention',
        };

        const triangleStageMap = {
          leadGen: 'marketing',
          qualification: 'sales',
          onboarding: 'onboarding',
          delivery: 'fulfillment',
          retention: 'retention',
        };

        constraintStageText.textContent = stageNames[bottleneckStage] || 'Onboarding';

        bottomOverlay.classList.remove(
          'triangle-marketing',
          'triangle-sales',
          'triangle-onboarding',
          'triangle-fulfillment',
          'triangle-retention',
        );

        const triangleStage = triangleStageMap[bottleneckStage] || 'onboarding';
        bottomOverlay.classList.add(`triangle-${triangleStage}`);
      }
    } catch (error) {
      console.error('OverlayManager.updateEducationalOverlays error:', error);
    }
  }

  showEducationalOverlays() {
    const topOverlay = document.getElementById('educationalTopOverlay');
    const bottomOverlay = document.getElementById('educationalBottomOverlay');
    if (topOverlay) topOverlay.classList.remove('hidden');
    if (bottomOverlay) bottomOverlay.classList.remove('hidden');
  }

  hideEducationalOverlays() {
    const topOverlay = document.getElementById('educationalTopOverlay');
    const bottomOverlay = document.getElementById('educationalBottomOverlay');
    if (topOverlay) topOverlay.classList.add('hidden');
    if (bottomOverlay) bottomOverlay.classList.add('hidden');
  }

  /**
   * Handle overlay visibility around process transitions.
   * The caller must provide: currentSelectedProcess, previousProcess, and a duration function.
   */
  handleEducationalOverlays(processId, previousProcess, getEstimatedDuration, isTutorialActive) {
    if (isTutorialActive) return;
    if (this._pendingTimeout) {
      clearTimeout(this._pendingTimeout);
      this._pendingTimeout = null;
    }
    if (processId === 'overview') {
      const wasOnSpecificStage = previousProcess && previousProcess !== 'overview';
      if (wasOnSpecificStage) {
        this.hideEducationalOverlays();
        const totalDuration = typeof getEstimatedDuration === 'function' ? getEstimatedDuration(processId) : 2000;
        const delayTime = totalDuration * 0.8;
        this._pendingTimeout = setTimeout(() => {
          this.updateEducationalOverlays();
          this.showEducationalOverlays();
          this._pendingTimeout = null;
        }, delayTime);
      } else {
        this.updateEducationalOverlays();
        this.showEducationalOverlays();
      }
    } else {
      this.hideEducationalOverlays();
    }
  }
}


