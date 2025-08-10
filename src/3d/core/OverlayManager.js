/**
 * OverlayManager
 * Handles educational overlay DOM updates and visibility
 */

export class OverlayManager {
  constructor(sceneManager, businessData) {
    this.sceneManager = sceneManager;
    this.businessData = businessData;
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
}


