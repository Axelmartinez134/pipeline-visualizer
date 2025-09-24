/**
 * OverlayManager
 * Handles educational overlay DOM updates and visibility
 */

import { STAGE_CONFIG } from '../constants/businessData.js';
import { DeviceDetection } from '../utils/deviceDetection.js';

export class OverlayManager {
  constructor(sceneManager, businessData) {
    this.sceneManager = sceneManager;
    this.businessData = businessData;
    this._pendingTimeout = null;
    this._lastTriangleClass = null;
    this._roadmapStages = [];
    try {
      window.addEventListener('optimization:step', (e) => {
        const stage = e.detail?.stage;
        if (!stage) return;
        if (!this._roadmapStages.includes(stage)) {
          this._roadmapStages.push(stage);
          this._roadmapStages = this._roadmapStages.slice(0,3);
          this.updateRoadmapOverlay();
        }
      });
      window.addEventListener('scenario:changed', (e) => {
        const sc = e.detail?.scenario || 'current';
        if (sc !== 'optimized') {
          this._roadmapStages = [];
          this.hideRoadmapOverlay();
        }
      });
      const btn = document.getElementById('roadmapCTAButton');
      if (btn) {
        btn.addEventListener('click', () => {
          const form = document.querySelector('.lead-capture');
          if (form) form.scrollIntoView({ behavior: 'smooth' });
          try { window.dispatchEvent(new CustomEvent('rowmap:cta_clicked')); } catch {}
        });
      }
    } catch {}
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

      // Update constraint stage text and triangle position; add capacity line
      const constraintStageText = document.getElementById('constraintStageText');
      const capacitySmall = document.getElementById('constraintCapacitySmall');
      const constraintCTA = document.getElementById('constraintCTA');
      const bottomOverlay = document.getElementById('educationalBottomOverlay');
      const constraintIndicator = document.getElementById('constraintIndicator');
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

        const isOptimized = this.sceneManager.pipeline.currentScenario === 'optimized';
        constraintStageText.textContent = stageNames[bottleneckStage] || 'Onboarding';
        if (capacitySmall && constraintIndicator) {
          // Default styles
          capacitySmall.style.marginTop = '6px';
          // Optimized: show improvement line first (green), then red bottleneck line
          if (isOptimized && this.sceneManager.pipeline.lastImprovement) {
            const { stage, from, to } = this.sceneManager.pipeline.lastImprovement;
            const overlap = stage === bottleneckStage;
            if (!overlap) {
              const fromDisplay = Math.max(0, (from ?? 0) - 10);
              const toDisplay = Math.max(0, (to ?? 0) - 10);
              capacitySmall.innerHTML = `If you automate <strong><u>${stageNames[stage]}</u></strong>, capacity could grow from ${fromDisplay}/mo to ${toDisplay}/mo`;
              capacitySmall.style.color = '#40c057';
              capacitySmall.style.fontWeight = 'normal';
              capacitySmall.style.fontSize = '';
            } else {
              capacitySmall.textContent = '';
            }
            // Red bottleneck line below
            constraintIndicator.innerHTML = `👆 <strong id="constraintStageText"><u>${stageNames[bottleneckStage]}</u></strong> becomes your new bottleneck limiting your growth`;
            constraintIndicator.style.color = '#DC2626';
            constraintIndicator.style.fontWeight = 'normal';
          } else {
            // Current state: only red bottleneck line; no improvement line
            capacitySmall.textContent = '';
            constraintIndicator.innerHTML = `👆 <strong id="constraintStageText"><u>${stageNames[bottleneckStage]}</u></strong> is your bottleneck limiting your current growth`;
            constraintIndicator.style.color = '';
            constraintIndicator.style.fontWeight = 'normal';
          }
        }
        if (constraintCTA) {
          const isOptimized = this.sceneManager.pipeline.currentScenario === 'optimized';
          constraintCTA.style.display = isOptimized ? 'none' : 'block';
        }

        // Roadmap overlay visibility (optimized only)
        if (this.sceneManager.pipeline.currentScenario === 'optimized') {
          this.showRoadmapOverlay();
          this.updateRoadmapOverlay();
        } else {
          this.hideRoadmapOverlay();
        }

        const nextClass = `triangle-${triangleStageMap[bottleneckStage] || 'onboarding'}`;
        // Subtle triangle transition: remove old then add new with a reflow
        bottomOverlay.classList.remove(
          'triangle-marketing',
          'triangle-sales',
          'triangle-onboarding',
          'triangle-fulfillment',
          'triangle-retention',
          'green-triangle-marketing',
          'green-triangle-sales',
          'green-triangle-onboarding',
          'green-triangle-fulfillment',
          'green-triangle-retention',
          'green-pointer'
        );
        void bottomOverlay.offsetWidth;
        bottomOverlay.classList.add(nextClass);
        this._lastTriangleClass = nextClass;

        // Mobile-only: compute precise red triangle position from projected stage x
        if (DeviceDetection.isMobile()) {
          try {
            const stageOrder = { leadGen: 0, qualification: 1, onboarding: 2, delivery: 3, retention: 4 };
            const idx = stageOrder[bottleneckStage] ?? 2;
            const worldX = STAGE_CONFIG.STAGE_POSITIONS[idx];
            const camera = this.sceneManager?.camera?.getCamera ? this.sceneManager.camera.getCamera() : null;
            const canvas = document.getElementById('pipelineCanvas');
            if (camera && canvas && typeof window.THREE !== 'undefined') {
              const rect = canvas.getBoundingClientRect();
              const overlayRect = bottomOverlay.getBoundingClientRect();
              const vec = new window.THREE.Vector3(worldX, 0, 0);
              vec.project(camera);
              const px = (vec.x * 0.5 + 0.5) * rect.width + rect.left;
              let leftPx = px - overlayRect.left;
              leftPx = Math.max(15, Math.min(overlayRect.width - 15, leftPx));
              bottomOverlay.style.setProperty('--triangle-left', `${leftPx}px`);
            }
          } catch (e) {}
        }

        // Green triangle logic (optimized only, not when improved stage equals bottleneck)
        const last = this.sceneManager.pipeline.lastImprovement;
        if (isOptimized && last && last.stage !== bottleneckStage) {
          bottomOverlay.classList.add('green-pointer');
          const greenClass = `green-triangle-${triangleStageMap[last.stage] || 'onboarding'}`;
          bottomOverlay.classList.add(greenClass);
          // Mobile: compute precise green triangle position
          if (DeviceDetection.isMobile()) {
            try {
              const stageOrder = { leadGen: 0, qualification: 1, onboarding: 2, delivery: 3, retention: 4 };
              const idxG = stageOrder[last.stage] ?? 2;
              const worldXg = STAGE_CONFIG.STAGE_POSITIONS[idxG];
              const camera = this.sceneManager?.camera?.getCamera ? this.sceneManager.camera.getCamera() : null;
              const canvas = document.getElementById('pipelineCanvas');
              if (camera && canvas && typeof window.THREE !== 'undefined') {
                const rect = canvas.getBoundingClientRect();
                const overlayRect = bottomOverlay.getBoundingClientRect();
                const vec = new window.THREE.Vector3(worldXg, 0, 0);
                vec.project(camera);
                const pxg = (vec.x * 0.5 + 0.5) * rect.width + rect.left;
                let leftPxG = pxg - overlayRect.left;
                leftPxG = Math.max(15, Math.min(overlayRect.width - 15, leftPxG));
                bottomOverlay.style.setProperty('--triangle-green-left', `${leftPxG}px`);
              }
            } catch (e) {}
          }
        } else {
          // Hide green pointer in current state or overlap case
          bottomOverlay.classList.remove('green-pointer');
        }
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

  showRoadmapOverlay() {
    const el = document.getElementById('roadmapOverlay');
    if (el) el.classList.remove('hidden');
  }

  hideRoadmapOverlay() {
    const el = document.getElementById('roadmapOverlay');
    if (el) el.classList.add('hidden');
  }

  updateRoadmapOverlay() {
    const el = document.getElementById('roadmapOverlay');
    if (!el) return;
    const rows = [
      document.getElementById('roadmapRow1'),
      document.getElementById('roadmapRow2'),
      document.getElementById('roadmapRow3'),
    ];
    const labelMap = {
      leadGen: 'Marketing', qualification: 'Sales', onboarding: 'Onboarding', delivery: 'Fulfillment', retention: 'Retention'
    };
    rows.forEach((r, i) => { if (r) r.textContent = `${i+1}. ${this._roadmapStages[i] ? labelMap[this._roadmapStages[i]] : ''}`; });
    const cta = document.getElementById('roadmapCTA');
    if (cta) {
      if (this._roadmapStages.length === 3) {
        cta.classList.remove('hidden');
        const btn = document.getElementById('roadmapCTAButton');
        if (btn) {
          btn.classList.add('tutorial-glow');
          setTimeout(() => btn.classList.remove('tutorial-glow'), 1700);
        }
      } else {
        cta.classList.add('hidden');
      }
    }
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


