/**
 * UI Controller
 * Manages form interactions, content updates, and business logic
 */

import { PROCESS_AUTOMATIONS } from '../constants/processContent.js';
import { STAGE_CONFIG } from '../constants/businessData.js';
import { DOMHelpers } from '../utils/domHelpers.js';
import { FormController } from './FormController.js';
import { TutorialManager } from './TutorialManager.js';
import { OverlayManager } from './OverlayManager.js';
import { TransitionGuard } from './TransitionGuard.js';
import { MetricsService } from './MetricsService.js';
import { TabStateManager } from './TabStateManager.js';

export class UIController {
  constructor(sceneManager, businessData) {
    this.sceneManager = sceneManager;
    this.businessData = businessData;
    this.selectedProcess = 'overview';
    this.currentScenario = 'current';
    this.isTransitionInProgress = false;
    this.lastTransitionTime = 0;
    this.minTransitionInterval = 500; // Minimum time between transitions (ms)
    this.educationalOverlayTimeout = null; // Track delayed overlay timeout

    // Sequence run state
    this.isSequenceRunning = false;
    this.sequenceTimers = [];
    this.sequenceStepMs = 3000; // per step
    this.sequenceTotalMs = 9000; // 3 steps

    // Optimization step tracking (for manual presses)
    this.optimizationStepCount = 0;
    this.optimizationMaxSteps = 3;

    // Tutorial system
    this.tutorialState = {
      isActive: true,
      currentStep: 0,
      maxSteps: 4,
      completed: false
    };

    // Tutorial content
    this.TUTORIAL_STEPS = {
      0: {
        title: "🎯 Find Your Constraint",
        content: "START HERE",
        cta: "Start Tutorial",
        showClickMe: true
      },
      1: {
        title: "📊 Interactive Capacity Controls",
        content: "Move sliders (below) to adjust your pipeline.",
        cta: "Next: Explore Each Stage",
        showClickMe: true,
        highlightSliders: true
      },
      2: {
        title: "🚀 Press ‘See After Automation’",
        content: "Press \"See After Automation\".<br>We’ll map your top 3 constraints in order.",
        cta: "Next: Spot Your Constraint",
        showClickMe: true,
        highlightScenarioButton: true
      },
      3: {
        title: "🔎 Spotting Your Constraint",
        content: "The <strong style='color: #DC2626'>red section</strong> is your constraint.<br>It limits your entire business flow!",
        cta: "Next: Try the Controls",
        showClickMe: true,
        highlightBottomBox: true
      },
      4: {
        title: "🧭 Explore Each Stage",
        content: "Click any tab to zoom in and see stage‑specific automation previews.",
        cta: "End Tutorial",
        showClickMe: false,
        endTutorialButton: true,
        highlightTabs: true
      }
    };

    this.overlayManager = new OverlayManager(sceneManager, businessData);
    this.formController = new FormController();
    this.tutorialManager = new TutorialManager(this);
    this.transitionGuard = new TransitionGuard(sceneManager?.camera, this.minTransitionInterval);
    this.metricsService = new MetricsService(sceneManager, businessData);
    this.tabStateManager = new TabStateManager();
    this.init();
  }

  init() {
    this.initializeControlValues();
    this.updateProcessContent('overview');
    this.metricsService.updateBusinessMetrics();

    // CRITICAL FIX: Set Overview tab as active on app load
    this.updateTabStates('overview');

    // Initialize educational overlays with tutorial
    this.overlayManager.updateEducationalOverlays();
    this.tutorialManager.initializeTutorial();
  }

  // Revert scenario to current when user interacts during optimized view
  revertScenarioIfOptimized() {
    try {
      if (this.isSequenceRunning) return; // ignore during sequence
      if (this.currentScenario === 'optimized') {
        this.switchScenario('current');
      }
    } catch (e) {
      console.warn('Failed to revert scenario:', e);
    }
  }

  // Process tab selection with transition throttling
  selectProcess(processId) {
    // Any navigation should bring us back to current scenario for continuity
    this.revertScenarioIfOptimized();
    // Handle tutorial behavior based on step and selected process
    if (this.tutorialState.isActive && !this.tutorialState.completed) {
      if (this.tutorialState.currentStep >= this.tutorialState.maxSteps) {
        // Final step: Complete tutorial on any tab click
        console.log('🎉 TAB CLICKED ON FINAL STEP - COMPLETING TUTORIAL!');
        this.tutorialManager.completeTutorial();
      } else if (processId !== 'overview') {
        // Steps 1-4: Hide tutorial overlays when navigating away from overview
        console.log(`📖 Tutorial Step ${this.tutorialState.currentStep + 1}: Hiding overlays for ${processId} navigation`);
        this.overlayManager.hideEducationalOverlays();
             } else {
        // Returning to overview: Show tutorial overlays at same step
        console.log(`📖 Tutorial Step ${this.tutorialState.currentStep + 1}: Returning to overview, showing overlays`);
        this.tutorialManager.updateTutorialOverlays(); // Ensure tutorial content is displayed
        this.overlayManager.showEducationalOverlays();
      }
    }

    // Prevent rapid clicking and transition conflicts
    const now = Date.now();
    if (!this.transitionGuard.canStart()) {
      console.log('Transition in progress, ignoring click for:', processId);
      return false;
    }
    this.transitionGuard.markStart();

    // Capture previous state for educational overlays
    const previousProcess = this.selectedProcess;
    this.selectedProcess = processId;

    // Handle educational overlays with previous state
    this.overlayManager.handleEducationalOverlays(
      processId,
      previousProcess,
      (pid) => this.getEstimatedTransitionDuration(pid),
      this.tutorialState.isActive && !this.tutorialState.completed
    );

    // Add visual feedback
    this.tabStateManager.addTransitionFeedback(processId);

    // Update UI state - Fix tab selection logic
    this.tabStateManager.updateTabStates(processId);

    // Start 3D scene transition
    const transitionSuccess = this.sceneManager.selectProcess(processId);

    if (!transitionSuccess) {
      // Rollback if transition failed
      this.isTransitionInProgress = false;
      this.removeTransitionFeedback();
      return false;
    }

    // Update content
      this.updateProcessContent(processId);

    // Clear transition state after estimated completion time
    const estimatedDuration = this.getEstimatedTransitionDuration(processId);
    this.transitionGuard.markEndAfter(estimatedDuration + 200, () => {
      this.tabStateManager.removeTransitionFeedback();
    });

    return true;
  }

  updateTabStates(processId) {
    try {
      // Remove active class from all tabs
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });

      // Find and activate the correct tab
      // Try multiple approaches to find the tab
      let targetTab = null;

      // Approach 1: Look for tab containing process name
      const processNames = {
        'leadGen': 'Marketing',
        'qualification': 'Sales',
        'onboarding': 'Onboarding',
        'delivery': 'Fulfillment',
        'retention': 'Retention',
        'overview': 'Overview'
      };

      const processName = processNames[processId];
      if (processName) {
        targetTab = Array.from(document.querySelectorAll('.tab')).find(tab =>
          tab.textContent.trim() === processName
        );
      }

      // Approach 2: Try finding by data attribute if available
      if (!targetTab) {
        targetTab = document.querySelector(`.tab[data-process="${processId}"]`);
      }

      // Approach 3: Try finding by class name
      if (!targetTab) {
        targetTab = document.querySelector(`.tab-${processId}`);
      }

      if (targetTab) {
        targetTab.classList.add('active');
        console.log(`Activated tab for ${processId}:`, targetTab.textContent);
      } else {
        console.warn(`Could not find tab for process: ${processId}`);
      }
    } catch (error) {
      console.warn('Error updating tab states:', error);
    }
  }

  getEstimatedTransitionDuration(processId) {
    // Get camera to determine transition type
    const camera = this.sceneManager?.camera;
    if (!camera) return 2000; // Default fallback

    try {
      const targetPos = camera.camera ? camera.constructor.CAMERA_POSITIONS?.[processId] : null;
      if (!targetPos) return 2000;

      // Check if this would be an arc transition
      const currentZ = camera.camera.position.z;
      const isCurrentCloseUp = currentZ < 5;
      const isTargetCloseUp = targetPos.z < 5;
      const hasHorizontalDistance = Math.abs(camera.camera.position.x - targetPos.x) >= 1.5;

      if (isCurrentCloseUp && isTargetCloseUp && hasHorizontalDistance) {
        // Arc transition - use total duration from config
        const arcConfig = camera.getCurrentArcConfig ? camera.getCurrentArcConfig() : { totalDuration: 2400 };
        return arcConfig.totalDuration || 2400;
      } else {
        // Direct transition
        const config = camera.getCurrentConfig ? camera.getCurrentConfig() : { animation: { duration: 2 } };
        return (config.animation?.duration || 2) * 1000;
      }
    } catch (error) {
      console.warn('Error estimating transition duration:', error);
      return 2000; // Safe fallback
    }
  }

  addTransitionFeedback(processId) {
    // Add transitioning class to target tab
    const targetTab = document.querySelector(`.tab[onclick*="${processId}"]`);
    if (targetTab) {
      targetTab.classList.add('transitioning');
    }

    // Add transitioning class to pipeline container
    const container = document.querySelector('.pipeline-container');
    if (container) {
      container.classList.add('arc-transitioning');
    }
  }

  removeTransitionFeedback() {
    // Remove transitioning class from all tabs
    document.querySelectorAll('.tab.transitioning').forEach(tab => {
      tab.classList.remove('transitioning');
    });

    // Remove transitioning class from pipeline container
    const container = document.querySelector('.pipeline-container');
    if (container) {
      container.classList.remove('arc-transitioning');
    }
  }

  // Reset to overview with safety checks
  resetCamera() {
    if (this.isTransitionInProgress) {
      console.log('Transition in progress, deferring camera reset');
      setTimeout(() => this.resetCamera(), 100);
      return;
    }

    if (this.sceneManager?.camera?.getCurrentConfig) {
      console.log('Resetting camera to overview from:', this.selectedProcess);
    }

    this.selectedProcess = 'overview';

    // Use the normal selectProcess flow to ensure consistent behavior
    this.sceneManager.selectProcess('overview');
    this.updateProcessContent('overview');
    this.tabStateManager.updateTabStates('overview');
  }

  // Update stage capacity with transition state awareness
  updateStage(stage, value) {
    // Any slider change should bring us back to current scenario for continuity
    this.revertScenarioIfOptimized();
    this.businessData[stage] = parseInt(value);

    // Update UI
    DOMHelpers.updateSliderValue(stage, value);

    // Update 3D scene
    this.sceneManager.updateStage(stage, value);

    // Update metrics
      this.metricsService.updateBusinessMetrics();
      this.metricsService.updateBottleneckAlert();

    // Update educational overlays if on overview
    if (this.selectedProcess === 'overview') {
      this.overlayManager.updateEducationalOverlays();
    }
  }

  // Toggle water simulation
  toggleSimulation() {
    // Revert optimized view on simulation toggle
    this.revertScenarioIfOptimized();
    const button = document.querySelector('.play-button');
    const isSimulating = button.textContent === '⏸';
    button.textContent = isSimulating ? '▶' : '⏸';

    this.sceneManager.toggleSimulation();
  }

  // Switch between current and optimized scenarios
  switchScenario(scenario) {
    // Complete tutorial if on final step and tutorial is active
    if (this.tutorialState.isActive && this.tutorialState.currentStep >= this.tutorialState.maxSteps) {
      console.log('🎉 SCENARIO TOGGLE CLICKED ON FINAL STEP - COMPLETING TUTORIAL!');
      this.tutorialManager.completeTutorial();
      return;
    }

    const wasOptimized = this.currentScenario === 'optimized';
    this.currentScenario = scenario;

    // Update UI state
    DOMHelpers.updateToggleButtons(scenario);

    // Update 3D scene / handle manual step advances
    if (scenario === 'optimized') {
      if (!wasOptimized) {
        // First press from current → apply first improvement via switchScenario
        this.sceneManager.switchScenario('optimized');
        this.optimizationStepCount = 1;
        const firstStage = this.sceneManager?.pipeline?.lastImprovement?.stage || null;
        try { window.dispatchEvent(new CustomEvent('optimization:step', { detail: { step: this.optimizationStepCount, stage: firstStage } })); } catch {}
      } else {
        // Already optimized → advance step up to max
        if (this.optimizationStepCount < this.optimizationMaxSteps) {
          const stage = this.sceneManager.pipeline.applyOptimizedStep();
          if (stage) this.sceneManager.pipeline.flashStageHalo(stage);
          this.optimizationStepCount++;
          try { window.dispatchEvent(new CustomEvent('optimization:step', { detail: { step: this.optimizationStepCount, stage } })); } catch {}
        }
      }
    } else {
      // Back to current: restore
      this.sceneManager.switchScenario('current');
      this.optimizationStepCount = 0;
      try { window.dispatchEvent(new CustomEvent('optimization:step', { detail: { step: this.optimizationStepCount } })); } catch {}
    }

    // Sync sliders with current businessData
    const stages = ['leadGen', 'qualification', 'onboarding', 'delivery', 'retention'];
    stages.forEach(stage => {
      const value = this.businessData[stage];
      DOMHelpers.updateSliderValue(stage, value);
      const slider = document.querySelector(`input[data-stage="${stage}"]`);
      if (slider) slider.value = value - 10; // Convert to display value
    });

    // Update metrics and content
    this.metricsService.updateBusinessMetrics();
    this.metricsService.updateBottleneckAlert();

    // Overlays behavior per scenario
    if (scenario === 'optimized') {
      // Hide top; show bottom on overview
      this.overlayManager.hideEducationalOverlays();
      if (this.selectedProcess === 'overview') {
        this.overlayManager.updateEducationalOverlays();
        const bottomOverlay = document.getElementById('educationalBottomOverlay');
        if (bottomOverlay) bottomOverlay.classList.remove('hidden');
      }
    } else {
      // Current state: show/update overlays on overview
      if (this.selectedProcess === 'overview') {
        this.overlayManager.updateEducationalOverlays();
        this.overlayManager.showEducationalOverlays();
      } else {
        this.overlayManager.hideEducationalOverlays();
      }
    }

    if (this.selectedProcess !== 'overview') {
      this.updateProcessContent(this.selectedProcess);
    }

    // Notify listeners (React UI) of scenario change + step count
    try {
      window.dispatchEvent(new CustomEvent('scenario:changed', { detail: { scenario, stepCount: this.optimizationStepCount } }));
    } catch {}
  }

  // Industry selection (placeholder for future expansion)
  updateIndustry(industry) {
    if (industry !== 'coaching') {
      alert('Additional industries coming soon! Sign up below to be notified when SaaS, E-commerce, and Agency templates are available.');
      const industrySelect = document.getElementById('industrySelect');
      if (industrySelect) industrySelect.value = 'coaching';
    }
  }

  // Lead form submission
  async submitLeadForm() {
    return this.formController.submitLeadForm();
  }

  // Initialize control values
  initializeControlValues() {
    STAGE_CONFIG.STAGES.forEach(stage => {
      // Update display value (already handles conversion in DOMHelpers)
      DOMHelpers.updateSliderValue(stage, this.businessData[stage]);
      
      // Update slider position to match display value (use data-stage selector)
      const slider = document.querySelector(`input[data-stage="${stage}"]`);
      if (slider) {
        slider.value = this.businessData[stage] - 10; // Convert to display value
      }
    });
    this.metricsService.updateBottleneckAlert();
  }

  // Update business metrics display
  // Removed: metrics logic handled by MetricsService

  // Get current transition state for debugging
  getTransitionState() {
    return {
      isTransitionInProgress: this.isTransitionInProgress,
      lastTransitionTime: this.lastTransitionTime,
      selectedProcess: this.selectedProcess,
      cameraTransitionInfo: this.sceneManager?.camera?.getTransitionInfo ?
        this.sceneManager.camera.getTransitionInfo() : null
    };
  }

  // Tutorial System Methods
  initializeTutorial() {
    if (this.tutorialState.isActive) {
    this.updateTutorialOverlays();
    this.overlayManager.showEducationalOverlays();
      this.setupTutorialClickHandlers();

      // Apply highlighting for current step (same pattern as advanceTutorial)
      const currentStep = this.TUTORIAL_STEPS[this.tutorialState.currentStep];
      if (currentStep.highlightSliders) {
        this.highlightSliders();
      }
      if (currentStep.highlightBottomBox) {
        this.highlightBottomBox();
      }
      if (currentStep.highlightTabs) {
        this.highlightTabs();
      }
      if (currentStep.highlightPipeline) {
        this.highlightPipeline();
      }
    }
  }

  advanceTutorial() {
    // Revert optimized view when tutorial advances (e.g., Start Tutorial clicked)
    this.revertScenarioIfOptimized();
    if (!this.tutorialState.isActive || this.tutorialState.completed) return;

    console.log('=== ADVANCE TUTORIAL DEBUG START ===');
    console.log('Current tutorial state:', {
      isActive: this.tutorialState.isActive,
      currentStep: this.tutorialState.currentStep,
      maxSteps: this.tutorialState.maxSteps,
      completed: this.tutorialState.completed,
      timestamp: new Date().toISOString()
    });

    if (this.tutorialState.currentStep < this.tutorialState.maxSteps) {
      const previousStep = this.tutorialState.currentStep;

      // Clear any existing highlights before advancing
      console.log(`ADVANCE: Clearing highlights before advancing from step ${previousStep}`);
      this.removeTutorialHighlights();

      this.tutorialState.currentStep++;
      const newStep = this.tutorialState.currentStep;

      console.log(`ADVANCE: Stepped from ${previousStep} to ${newStep}`);
      console.log(`ADVANCE: This should be Step ${newStep} - "${this.TUTORIAL_STEPS[newStep]?.title}"`);

      this.updateTutorialOverlays();

      // Re-setup click handlers after clearing
      this.setupTutorialClickHandlers();

      // Handle special step behaviors
      const currentStep = this.TUTORIAL_STEPS[this.tutorialState.currentStep];
      console.log(`ADVANCE: Step ${this.tutorialState.currentStep} configuration:`, {
        title: currentStep.title,
        highlightSliders: currentStep.highlightSliders,
        highlightBottomBox: currentStep.highlightBottomBox,
        highlightTabs: currentStep.highlightTabs,
        highlightPipeline: currentStep.highlightPipeline,
        showClickMe: currentStep.showClickMe
      });

      // Check DOM readiness before highlighting
      const tabsExist = document.querySelectorAll('.tab').length > 0;
      console.log(`ADVANCE: DOM check - Found ${document.querySelectorAll('.tab').length} tab elements`);

      if (currentStep.highlightSliders) {
        console.log('ADVANCE: Calling highlightSliders()');
        this.highlightSliders();
      }
      if (currentStep.highlightBottomBox) {
        console.log('ADVANCE: Calling highlightBottomBox()');
        this.highlightBottomBox();
      }
      if (currentStep.highlightTabs) {
        console.log('ADVANCE: ⭐ FINAL STEP - HIGHLIGHTING TABS NOW ⭐');
        console.log('ADVANCE: Calling highlightTabs() for step', newStep, '(clicking any tab will complete tutorial)');
        this.highlightTabs();
      }
      if (currentStep.highlightPipeline) {
        console.log('ADVANCE: Calling highlightPipeline()');
        this.highlightPipeline();
      }
      if (currentStep.activateBottom) {
        console.log('ADVANCE: Calling activateBottomOverlay()');
        this.activateBottomOverlay();
      }

      // Special debugging for Step 4 (tab highlighting step)
      if (newStep === 4) {
        console.log('🎯 FINAL STEP 4 REACHED - TABS SHOULD BE HIGHLIGHTING NOW!');
        console.log('📋 Tutorial will complete when any tab is clicked');
        setTimeout(() => {
          const highlightedTabs = document.querySelectorAll('.tab.tutorial-highlight');
          console.log(`ADVANCE: Post-highlight check - Found ${highlightedTabs.length} highlighted tabs`);
          highlightedTabs.forEach((tab, index) => {
            console.log(`  Tab ${index}: ${tab.textContent} - classes:`, tab.className);
          });
        }, 100);
      }
    } else {
      console.log('ADVANCE: Completing tutorial');
      this.completeTutorial();
    }

    console.log('=== ADVANCE TUTORIAL DEBUG END ===\n');
  }

  completeTutorial() {
    console.log('🎓 Tutorial completed! Switching to normal mode...');
    this.tutorialState.completed = true;
    this.tutorialState.isActive = false;

    // First hide tutorial overlays
    this.overlayManager.hideEducationalOverlays();

    // Remove all tutorial styling and highlights
    this.removeTutorialHighlights();

    // Add a small delay then show normal overlays
    setTimeout(() => {
      this.overlayManager.updateEducationalOverlays(); // Switch to normal mode
      this.overlayManager.showEducationalOverlays();
      console.log('✅ Normal mode activated - explore the pipeline!');
    }, 300);
  }

  updateTutorialOverlays() {
    const step = this.TUTORIAL_STEPS[this.tutorialState.currentStep];
    if (!step) return;

    // Update top overlay with tutorial content while preserving bubble structure
    const topOverlay = document.getElementById('educationalTopOverlay');
    if (topOverlay) {
      const content = topOverlay.querySelector('.educational-content');
      if (content) {
        // Preserve the original bubble structure, just change the text content
        content.innerHTML = `
          <span class="educational-text">
            <div style="margin-bottom: 8px;">
              <span class="step-counter">Step ${this.tutorialState.currentStep + 1} of ${this.tutorialState.maxSteps + 1}</span>
            </div>
            <strong style="font-size: 1.1rem; color: #1E3A8A; display: block; margin-bottom: 8px;">${step.title}</strong>
            <span style="font-size: 0.95rem; line-height: 1.4;">${step.content}</span>
            ${step.showClickMe ? '<div class="click-me-indicator">👆 ' + step.cta + '</div>' : ''}
          </span>
        `;
      }

      // Add tutorial glow effect
      if (step.showClickMe) {
        topOverlay.classList.add('tutorial-glow');
      } else {
        topOverlay.classList.remove('tutorial-glow');
      }
    }
  }

  setupTutorialClickHandlers() {
    const topOverlay = document.getElementById('educationalTopOverlay');
    const bottomOverlay = document.getElementById('educationalBottomOverlay');

    const currentStep = this.TUTORIAL_STEPS[this.tutorialState.currentStep];

    if (topOverlay && currentStep.showClickMe) {
      topOverlay.style.cursor = 'pointer';
      topOverlay.onclick = () => {
        if (this.tutorialState.isActive && !this.tutorialState.completed) {
          // Check if we're on the final step
          if (this.tutorialState.currentStep === this.tutorialState.maxSteps) {
            this.completeTutorial();
          } else {
            this.advanceTutorial();
          }
        }
      };
    } else if (topOverlay) {
      // For steps where showClickMe is false (like step 5), remove clickability
      topOverlay.style.cursor = 'default';
      topOverlay.onclick = null;
    }

    if (bottomOverlay) {
      bottomOverlay.onclick = () => {
        if (this.tutorialState.currentStep === this.tutorialState.maxSteps && this.tutorialState.isActive) {
          this.completeTutorial();
        }
      };
    }
  }

  highlightSliders() {
    const sliderGroups = document.querySelectorAll('.slider-group');
    sliderGroups.forEach(group => {
      group.classList.add('tutorial-highlight');
    });

    setTimeout(() => {
      sliderGroups.forEach(group => {
        group.classList.remove('tutorial-highlight');
      });
    }, 3000);
  }

  highlightBottomBox() {
    const bottomOverlay = document.getElementById('educationalBottomOverlay');
    if (bottomOverlay) {
      bottomOverlay.classList.add('tutorial-highlight');

      setTimeout(() => {
        bottomOverlay.classList.remove('tutorial-highlight');
      }, 3000);
    }
  }

    highlightPipeline() {
    console.log('🔍 Adding radiant glow to 3D pipeline meshes...');

    if (!this.sceneManager || !this.sceneManager.pipeline) {
      console.error('❌ NO PIPELINE FOUND!');
      return;
    }

    const pipes = this.sceneManager.pipeline.pipes;
    console.log(`Found ${pipes.length} pipeline meshes to highlight`);

    if (pipes.length === 0) {
      console.error('❌ NO PIPELINE MESHES FOUND!');
      return;
    }

    // Store glow meshes for cleanup
    const glowMeshes = [];

    pipes.forEach((pipe, index) => {
      // Get pipe geometry info
      const pipeGeometry = pipe.geometry;
      const pipePosition = pipe.position.clone();
      const pipeRotation = pipe.rotation.clone();

      // Create larger geometry for glow effect (slightly bigger radius)
      const glowGeometry = new THREE.CylinderGeometry(
        pipeGeometry.parameters.radiusTop * 1.3,    // 30% larger radius
        pipeGeometry.parameters.radiusBottom * 1.3,
        pipeGeometry.parameters.height * 1.1,       // Slightly longer
        pipeGeometry.parameters.radialSegments
      );

      // Create glowing material - transparent with bright emission
      const glowMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFC107,           // Bright amber yellow
        transparent: true,
        opacity: 0.35,             // Semi-transparent for glow effect
        emissive: 0xFFC107,        // Bright amber emissive
        emissiveIntensity: 0.7,    // Strong glow
        side: THREE.DoubleSide     // Visible from all angles
      });

      // Create glow mesh
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.copy(pipePosition);
      glowMesh.rotation.copy(pipeRotation);

      // Add to pipeline group
      this.sceneManager.pipeline.pipelineGroup.add(glowMesh);
      glowMeshes.push(glowMesh);

      console.log(`✅ Added radiant glow to pipe ${index + 1}`);
    });

    console.log('✅ All 5 pipeline segments now have bright golden glow halos!');

    // Remove glow meshes after 3 seconds
    setTimeout(() => {
      console.log('⏰ Removing pipeline glow effects...');

      glowMeshes.forEach((glowMesh, index) => {
        // Remove from scene
        this.sceneManager.pipeline.pipelineGroup.remove(glowMesh);

        // Dispose geometry and material to prevent memory leaks
        glowMesh.geometry.dispose();
        glowMesh.material.dispose();

        console.log(`🔄 Removed glow from pipe ${index + 1}`);
      });

      console.log('🔄 All pipeline glow effects removed');
    }, 3000);
  }

  highlightTabs() {
    console.log('🔍 Highlighting all navigation tabs...');

    // Highlight ALL navigation tabs: Marketing, Sales, Onboarding, Fulfillment, Retention, Overview
    const tabButtons = document.querySelectorAll('.tab');
    console.log(`Found ${tabButtons.length} tabs to highlight`);

    if (tabButtons.length === 0) {
      console.error('❌ NO TABS FOUND! DOM might not be ready');
      return;
    }

    tabButtons.forEach((tab, index) => {
      tab.classList.add('tutorial-highlight');

      // FALLBACK: Direct style manipulation to ensure visibility
      const originalBackground = tab.style.background;
      const originalBoxShadow = tab.style.boxShadow;
      const originalBorder = tab.style.borderColor;
      const originalTransform = tab.style.transform;

      tab.style.background = 'rgba(255, 193, 7, 0.2)';
      tab.style.borderColor = '#FFC107';
      tab.style.boxShadow = '0 0 15px rgba(255, 193, 7, 0.6), 0 0 25px rgba(255, 193, 7, 0.4)';
      tab.style.transform = 'scale(1.02)';
      tab.style.zIndex = '10';
      tab.style.transition = 'all 0.3s ease';

      // Store original styles for cleanup
      tab.setAttribute('data-original-background', originalBackground);
      tab.setAttribute('data-original-boxshadow', originalBoxShadow);
      tab.setAttribute('data-original-border', originalBorder);
      tab.setAttribute('data-original-transform', originalTransform);

      console.log(`✅ Highlighted: ${tab.textContent.trim()}`);

      // Force style recalculation
      void tab.offsetHeight; // Trigger reflow
    });

    console.log('✅ All tabs should now be glowing golden - click any tab to complete tutorial!');

    setTimeout(() => {
      console.log('⏰ Removing tab highlights after 3 seconds...');
      tabButtons.forEach((tab, index) => {
        tab.classList.remove('tutorial-highlight');

        // Restore original styles
        const originalBackground = tab.getAttribute('data-original-background');
        const originalBoxShadow = tab.getAttribute('data-original-boxshadow');
        const originalBorder = tab.getAttribute('data-original-border');
        const originalTransform = tab.getAttribute('data-original-transform');

        tab.style.background = originalBackground || '';
        tab.style.boxShadow = originalBoxShadow || '';
        tab.style.borderColor = originalBorder || '';
        tab.style.transform = originalTransform || '';
        tab.style.zIndex = '';
        tab.style.transition = '';

        // Clean up data attributes
        tab.removeAttribute('data-original-background');
        tab.removeAttribute('data-original-boxshadow');
        tab.removeAttribute('data-original-border');
        tab.removeAttribute('data-original-transform');
      });
      console.log('🔄 Tab highlights removed');
    }, 3000);
  }

  activateBottomOverlay() {
    const bottomOverlay = document.getElementById('educationalBottomOverlay');
    if (bottomOverlay) {
      bottomOverlay.classList.add('tutorial-glow');
      bottomOverlay.style.cursor = 'pointer';

      // Add click me indicator to bottom
      const content = bottomOverlay.querySelector('.educational-content');
      if (content && !content.querySelector('.click-me-indicator')) {
        const clickMe = document.createElement('div');
        clickMe.className = 'click-me-indicator';
        clickMe.innerHTML = '👆 Click to See Your Results';
        content.appendChild(clickMe);
      }
    }
  }

  removeTutorialHighlights() {
    const allHighlighted = document.querySelectorAll('.tutorial-glow, .tutorial-highlight');
    allHighlighted.forEach(element => {
      element.classList.remove('tutorial-glow', 'tutorial-highlight');
      element.style.cursor = 'default';

      // Clean up direct styles if this is a tab element
      if (element.classList.contains('tab')) {
        const originalBackground = element.getAttribute('data-original-background');
        const originalBoxShadow = element.getAttribute('data-original-boxshadow');
        const originalBorder = element.getAttribute('data-original-border');
        const originalTransform = element.getAttribute('data-original-transform');

        if (originalBackground !== null) {
          element.style.background = originalBackground || '';
          element.style.boxShadow = originalBoxShadow || '';
          element.style.borderColor = originalBorder || '';
          element.style.transform = originalTransform || '';
          element.style.zIndex = '';
          element.style.transition = '';

          // Clean up data attributes
          element.removeAttribute('data-original-background');
          element.removeAttribute('data-original-boxshadow');
          element.removeAttribute('data-original-border');
          element.removeAttribute('data-original-transform');
        }
      }
    });

    // Remove click me indicators
    const clickMeElements = document.querySelectorAll('.click-me-indicator');
    clickMeElements.forEach(element => element.remove());

    // Reset overlay click handlers
    const topOverlay = document.getElementById('educationalTopOverlay');
    const bottomOverlay = document.getElementById('educationalBottomOverlay');

    if (topOverlay) {
      topOverlay.onclick = null;
      topOverlay.style.cursor = 'default';
    }

    if (bottomOverlay) {
      bottomOverlay.onclick = null;
      bottomOverlay.style.cursor = 'default';
    }
  }

  // Educational Overlays Management
  handleEducationalOverlays(processId, previousProcess) {
    console.log('handleEducationalOverlays called with:', { processId, previousProcess });

    // If tutorial is active, don't override with normal overlay behavior
    if (this.tutorialState.isActive && !this.tutorialState.completed) {
      return;
    }

    // Clear any existing delayed overlay timeout
    if (this.educationalOverlayTimeout) {
      console.log('Clearing existing overlay timeout');
      clearTimeout(this.educationalOverlayTimeout);
      this.educationalOverlayTimeout = null;
    }

    if (processId === 'overview') {
      // Check if we're transitioning FROM a specific stage TO overview
      const wasOnSpecificStage = previousProcess && previousProcess !== 'overview';
      console.log('Transitioning to overview. Was on specific stage:', wasOnSpecificStage);

      if (wasOnSpecificStage) {
        // Coming back to overview from a zoomed stage - delay overlay appearance
        console.log('Hiding overlays and setting up delayed appearance');
        this.overlayManager.hideEducationalOverlays();

        // Calculate 80% of animation duration for delayed appearance
        const totalDuration = this.getEstimatedTransitionDuration(processId);
        const delayTime = totalDuration * 0.8;
        console.log('Animation duration:', totalDuration, 'Delay time:', delayTime);

        // Show overlays after 80% of camera animation is complete
        this.educationalOverlayTimeout = setTimeout(() => {
          console.log('Delayed timeout fired, checking if still on overview');
          // Only show if we're still on overview (user didn't click away)
          if (this.selectedProcess === 'overview') {
            console.log('Still on overview, showing overlays');
            this.overlayManager.updateEducationalOverlays();
            this.overlayManager.showEducationalOverlays();
          } else {
            console.log('No longer on overview, not showing overlays');
          }
          this.educationalOverlayTimeout = null;
        }, delayTime);
      } else {
        // Direct access to overview or already on overview - show immediately
        console.log('Direct access to overview, showing immediately');
        this.overlayManager.updateEducationalOverlays();
        this.overlayManager.showEducationalOverlays();
      }
    } else {
      // Zooming into specific stage - hide overlays immediately
      console.log('Zooming into specific stage, hiding overlays');
      this.overlayManager.hideEducationalOverlays();
    }
  }

  // Removed: overlay updates/visibility handled by OverlayManager

  // Update process content panel
  updateProcessContent(processId) {
    try {
      // Keep React-driven Overview replacement intact
      if (processId === 'overview') {
        return;
      }
      const process = PROCESS_AUTOMATIONS[processId];
      if (!process) {
        console.error('No process automation found for:', processId);
        return;
      }

      const contentArea = document.getElementById('processAnalysis');
      if (!contentArea) {
        console.error('processAnalysis element not found');
        return;
      }

      let statusClass = '';
      let statusIcon = '';
      if (process.status === 'bottleneck') {
        statusClass = 'status-bottleneck';
        statusIcon = '🚨';
      } else if (process.status === 'optimization') {
        statusClass = 'status-optimization';
        statusIcon = '⚡';
      } else if (process.status === 'secondary') {
        statusClass = 'status-secondary';
        statusIcon = '📊';
      }

      let metricsHTML = '';
      if (process.capacity) {
        metricsHTML = `
          <div class="process-metrics">
            <div class="process-metric">
              <div class="process-metric-value">${process.capacity}</div>
              <div class="process-metric-label">${process.unit}</div>
            </div>
            <div class="process-metric">
              <div class="process-metric-value">${process.status === 'bottleneck' ? 'HIGH' : 'LOW'}</div>
              <div class="process-metric-label">Priority Level</div>
            </div>
            <div class="process-metric">
              <div class="process-metric-value">${process.status === 'bottleneck' ? '$150K+' : '$20-50K'}</div>
              <div class="process-metric-label">Revenue Impact</div>
            </div>
          </div>
        `;
      }

      const automationsHTML = process.automations.map(automation => `
        <div class="automation-item ${automation.priority ? 'priority' : ''}" onclick="showAutomationDetails('${automation.title}')">
          <div class="automation-title">
            ${automation.title}
            ${automation.priority ? '<span class="priority-badge">HIGHEST ROI</span>' : ''}
          </div>
          <div class="automation-description">${automation.description}</div>
          <div style="margin-top: 8px; color: #1E3A8A; font-weight: bold; font-size: 0.9rem;">
            💡 ${automation.impact}
          </div>
        </div>
      `).join('');

      contentArea.innerHTML = `
        <div class="process-header">
          <div class="process-title">${statusIcon} ${process.title}</div>
          ${process.statusText ? `<div class="process-status ${statusClass}">${process.statusText}</div>` : ''}
          <p style="color: #6B7280; max-width: 600px; margin: 0 auto; line-height: 1.5;">${process.description}</p>
        </div>

        ${metricsHTML}

        <div class="process-automations">
          <h4>${process.status === 'bottleneck' ? '🎯 Priority Automations - Start Here:' : '⚡ Available Automations:'}</h4>
          ${automationsHTML}
        </div>
      `;
    } catch (error) {
      console.error('Error in updateProcessContent:', error);
    }
  }

  // Sequence controls
  startAutoOptimizeSequence() {
    if (this.isSequenceRunning) return;
    if (this.currentScenario !== 'optimized') return; // only valid in optimized

    this.isSequenceRunning = true;

    // Disable UI (tabs/sliders), lock camera to overview, hide overlays
    this.setUIRunningState(true);
    this.sceneManager.selectProcess('overview');
    // Keep bottom overlay visible in optimized during sequence
    if (this.currentScenario === 'optimized') {
      this.overlayManager.updateEducationalOverlays();
      const bottomOverlay = document.getElementById('educationalBottomOverlay');
      if (bottomOverlay) bottomOverlay.classList.remove('hidden');
    } else {
      this.overlayManager.hideEducationalOverlays();
    }

    // Progress ticker
    const startTs = performance.now();
    const total = this.sequenceTotalMs;
    const progressInterval = setInterval(() => {
      const elapsed = Math.min(performance.now() - startTs, total);
      this.updateProgress(elapsed / total, Math.ceil(elapsed / this.sequenceStepMs));
      if (elapsed >= total) clearInterval(progressInterval);
    }, 100);
    this.sequenceTimers.push(progressInterval);

    // Steps at 3s, 6s, 9s
    for (let i = 1; i <= 3; i++) {
      const timer = setTimeout(() => {
        try {
          const stage = this.sceneManager.pipeline.applyOptimizedStep();
          if (stage) this.sceneManager.pipeline.flashStageHalo(stage);
          // Update metrics/overlays after step
          this.metricsService.updateBusinessMetrics();
          this.metricsService.updateBottleneckAlert();
          if (this.selectedProcess === 'overview') {
            this.overlayManager.updateEducationalOverlays();
          }
          // Analytics/event
          try { window.dispatchEvent(new CustomEvent('autoopt:step', { detail: { step: i } })); } catch {}
          // Complete
          if (i === 3) this.finishAutoOptimizeSequence();
        } catch (e) {
          console.warn('Auto-optimize step failed:', e);
          this.finishAutoOptimizeSequence();
        }
      }, i * this.sequenceStepMs);
      this.sequenceTimers.push(timer);
    }

    // Announce started
    try { window.dispatchEvent(new CustomEvent('autoopt:started')); } catch {}
  }

  stopAutoOptimizeSequence() {
    if (!this.isSequenceRunning) return;
    this.sequenceTimers.forEach(t => clearInterval(t) || clearTimeout(t));
    this.sequenceTimers = [];
    this.finishAutoOptimizeSequence(false);
    try { window.dispatchEvent(new CustomEvent('autoopt:stopped')); } catch {}
  }

  finishAutoOptimizeSequence(announceComplete = true) {
    this.isSequenceRunning = false;
    this.setUIRunningState(false);
    // Restore overlays if on overview
    if (this.selectedProcess === 'overview' && !this.tutorialState.isActive) {
      this.overlayManager.updateEducationalOverlays();
      this.overlayManager.showEducationalOverlays();
    }
    this.updateProgress(1, 3);
    if (announceComplete) {
      try { window.dispatchEvent(new CustomEvent('autoopt:completed')); } catch {}
    }
    // Notify state
    try { window.dispatchEvent(new CustomEvent('autoopt:state', { detail: { running: false } })); } catch {}
  }

  setUIRunningState(running) {
    const container = document.querySelector('.container');
    if (container) container.classList.toggle('sequence-running', running);
    // Disable sliders
    document.querySelectorAll('.slider').forEach(el => {
      if (running) el.setAttribute('disabled', 'true'); else el.removeAttribute('disabled');
    });
    // Disable tabs
    document.querySelectorAll('.tab').forEach(tab => {
      if (running) tab.classList.add('disabled'); else tab.classList.remove('disabled');
    });
    // Notify UI
    try { window.dispatchEvent(new CustomEvent('autoopt:state', { detail: { running } })); } catch {}
  }

  updateProgress(percent, step) {
    // Clamp
    const p = Math.max(0, Math.min(1, percent));
    const underBtn = document.getElementById('autoProgressBarFill');
    const overlay = document.getElementById('renderProgressBarFill');
    if (underBtn) underBtn.style.width = `${p * 100}%`;
    if (overlay) overlay.style.width = `${p * 100}%`;
    try { window.dispatchEvent(new CustomEvent('autoopt:progress', { detail: { percent: p, step } })); } catch {}
  }
}

// Global function for automation details
window.showAutomationDetails = function(title) {
  // Find the automation across all processes
  let automation = null;
  for (const process of Object.values(PROCESS_AUTOMATIONS)) {
    automation = process.automations.find(a => a.title === title);
    if (automation) break;
  }

  if (automation) {
    alert(`${automation.title}\n\n${automation.description}\n\nExpected Impact: ${automation.impact}\n\nClick "Get My Automation Roadmap" below to receive implementation details!`);
  }
}; 