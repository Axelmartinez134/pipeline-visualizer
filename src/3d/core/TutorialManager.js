/**
 * TutorialManager
 * Encapsulates tutorial state, overlays, and highlight behaviors.
 * Delegates to UIController for state access but centralizes DOM effects.
 */

export class TutorialManager {
  /**
   * @param {import('./UIController.js').UIController} ui
   */
  constructor(ui) {
    this.ui = ui;
  }

  initializeTutorial() {
    if (this.ui.tutorialState.isActive) {
      this.updateTutorialOverlays();
      this.ui.overlayManager.showEducationalOverlays();
      this.setupTutorialClickHandlers();

      const currentStep = this.ui.TUTORIAL_STEPS[this.ui.tutorialState.currentStep];
      if (currentStep.highlightSliders) this.highlightSliders();
      if (currentStep.highlightBottomBox) this.highlightBottomBox();
      if (currentStep.highlightTabs) this.highlightTabs();
      if (currentStep.highlightPipeline) this.highlightPipeline();
    }
  }

  advanceTutorial() {
    if (!this.ui.tutorialState.isActive || this.ui.tutorialState.completed) return;

    if (this.ui.tutorialState.currentStep < this.ui.tutorialState.maxSteps) {
      this.removeTutorialHighlights();
      this.ui.tutorialState.currentStep++;
      this.updateTutorialOverlays();
      this.setupTutorialClickHandlers();

      const step = this.ui.TUTORIAL_STEPS[this.ui.tutorialState.currentStep];
      if (step.highlightSliders) this.highlightSliders();
      if (step.highlightBottomBox) this.highlightBottomBox();
      if (step.highlightTabs) this.highlightTabs();
      if (step.highlightPipeline) this.highlightPipeline();
    } else {
      this.completeTutorial();
    }
  }

  completeTutorial() {
    this.ui.tutorialState.completed = true;
    this.ui.tutorialState.isActive = false;
    this.ui.overlayManager.hideEducationalOverlays();
    this.removeTutorialHighlights();
    setTimeout(() => {
      this.ui.overlayManager.updateEducationalOverlays();
      this.ui.overlayManager.showEducationalOverlays();
    }, 300);
  }

  updateTutorialOverlays() {
    const step = this.ui.TUTORIAL_STEPS[this.ui.tutorialState.currentStep];
    if (!step) return;
    const topOverlay = document.getElementById('educationalTopOverlay');
    if (!topOverlay) return;
    const content = topOverlay.querySelector('.educational-content');
    if (content) {
      content.innerHTML = `
        <span class="educational-text">
          <div style="margin-bottom: 8px;">
            <span class="step-counter">Step ${this.ui.tutorialState.currentStep + 1} of ${this.ui.tutorialState.maxSteps + 1}</span>
          </div>
          <strong style="font-size: 1.1rem; color: #1E3A8A; display: block; margin-bottom: 8px;">${step.title}</strong>
          <span style="font-size: 0.95rem; line-height: 1.4;">${step.content}</span>
          ${step.showClickMe ? '<div class="click-me-indicator">👆 ' + step.cta + '</div>' : ''}
        </span>
      `;
    }
    if (step.showClickMe) topOverlay.classList.add('tutorial-glow');
    else topOverlay.classList.remove('tutorial-glow');
  }

  setupTutorialClickHandlers() {
    const topOverlay = document.getElementById('educationalTopOverlay');
    const bottomOverlay = document.getElementById('educationalBottomOverlay');
    const currentStep = this.ui.TUTORIAL_STEPS[this.ui.tutorialState.currentStep];

    if (topOverlay && currentStep.showClickMe) {
      topOverlay.style.cursor = 'pointer';
      topOverlay.onclick = () => {
        if (this.ui.tutorialState.isActive && !this.ui.tutorialState.completed) {
          if (this.ui.tutorialState.currentStep === this.ui.tutorialState.maxSteps) this.completeTutorial();
          else this.advanceTutorial();
        }
      };
    } else if (topOverlay) {
      topOverlay.style.cursor = 'default';
      topOverlay.onclick = null;
    }

    if (bottomOverlay) {
      bottomOverlay.onclick = () => {
        if (this.ui.tutorialState.currentStep === this.ui.tutorialState.maxSteps && this.ui.tutorialState.isActive) {
          this.completeTutorial();
        }
      };
    }
  }

  highlightSliders() {
    const sliderGroups = document.querySelectorAll('.slider-group');
    sliderGroups.forEach(group => group.classList.add('tutorial-highlight'));
    setTimeout(() => sliderGroups.forEach(group => group.classList.remove('tutorial-highlight')), 3000);
  }

  highlightBottomBox() {
    const bottomOverlay = document.getElementById('educationalBottomOverlay');
    if (!bottomOverlay) return;
    bottomOverlay.classList.add('tutorial-highlight');
    setTimeout(() => bottomOverlay.classList.remove('tutorial-highlight'), 3000);
  }

  highlightTabs() {
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(tab => {
      tab.classList.add('tutorial-highlight');
      const ob = tab.style.background, os = tab.style.boxShadow, obc = tab.style.borderColor, ot = tab.style.transform;
      tab.style.background = 'rgba(255, 193, 7, 0.2)';
      tab.style.borderColor = '#FFC107';
      tab.style.boxShadow = '0 0 15px rgba(255, 193, 7, 0.6), 0 0 25px rgba(255, 193, 7, 0.4)';
      tab.style.transform = 'scale(1.02)';
      tab.style.zIndex = '10';
      tab.style.transition = 'all 0.3s ease';
      tab.setAttribute('data-original-background', ob);
      tab.setAttribute('data-original-boxshadow', os);
      tab.setAttribute('data-original-border', obc);
      tab.setAttribute('data-original-transform', ot);
      void tab.offsetHeight;
    });
    setTimeout(() => {
      tabButtons.forEach(tab => {
        tab.classList.remove('tutorial-highlight');
        tab.style.background = tab.getAttribute('data-original-background') || '';
        tab.style.boxShadow = tab.getAttribute('data-original-boxshadow') || '';
        tab.style.borderColor = tab.getAttribute('data-original-border') || '';
        tab.style.transform = tab.getAttribute('data-original-transform') || '';
        tab.style.zIndex = '';
        tab.style.transition = '';
        tab.removeAttribute('data-original-background');
        tab.removeAttribute('data-original-boxshadow');
        tab.removeAttribute('data-original-border');
        tab.removeAttribute('data-original-transform');
      });
      return undefined;
    }, 3000);
  }

  highlightPipeline() {
    if (!this.ui.sceneManager || !this.ui.sceneManager.pipeline) return;
    const pipes = this.ui.sceneManager.pipeline.pipes;
    if (!pipes || pipes.length === 0) return;
    const glowMeshes = [];
    pipes.forEach(pipe => {
      const g = pipe.geometry, p = pipe.position.clone(), r = pipe.rotation.clone();
      const glowGeometry = new THREE.CylinderGeometry(
        g.parameters.radiusTop * 1.3,
        g.parameters.radiusBottom * 1.3,
        g.parameters.height * 1.1,
        g.parameters.radialSegments
      );
      const glowMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFC107, transparent: true, opacity: 0.35, emissive: 0xFFC107, emissiveIntensity: 0.7, side: THREE.DoubleSide
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.copy(p); glowMesh.rotation.copy(r);
      this.ui.sceneManager.pipeline.pipelineGroup.add(glowMesh);
      glowMeshes.push(glowMesh);
    });
    setTimeout(() => {
      glowMeshes.forEach(m => { this.ui.sceneManager.pipeline.pipelineGroup.remove(m); m.geometry.dispose(); m.material.dispose(); });
    }, 3000);
  }

  activateBottomOverlay() {
    const bottomOverlay = document.getElementById('educationalBottomOverlay');
    if (!bottomOverlay) return;
    bottomOverlay.classList.add('tutorial-glow');
    bottomOverlay.style.cursor = 'pointer';
    const content = bottomOverlay.querySelector('.educational-content');
    if (content && !content.querySelector('.click-me-indicator')) {
      const clickMe = document.createElement('div');
      clickMe.className = 'click-me-indicator';
      clickMe.innerHTML = '👆 Click to See Your Results';
      content.appendChild(clickMe);
    }
  }

  removeTutorialHighlights() {
    const all = document.querySelectorAll('.tutorial-glow, .tutorial-highlight');
    all.forEach(el => {
      el.classList.remove('tutorial-glow', 'tutorial-highlight');
      el.style.cursor = 'default';
      if (el.classList.contains('tab')) {
        const ob = el.getAttribute('data-original-background');
        const os = el.getAttribute('data-original-boxshadow');
        const obc = el.getAttribute('data-original-border');
        const ot = el.getAttribute('data-original-transform');
        if (ob !== null) {
          el.style.background = ob || '';
          el.style.boxShadow = os || '';
          el.style.borderColor = obc || '';
          el.style.transform = ot || '';
          el.style.zIndex = '';
          el.style.transition = '';
          el.removeAttribute('data-original-background');
          el.removeAttribute('data-original-boxshadow');
          el.removeAttribute('data-original-border');
          el.removeAttribute('data-original-transform');
        }
      }
    });
    document.querySelectorAll('.click-me-indicator').forEach(e => e.remove());
    const topOverlay = document.getElementById('educationalTopOverlay');
    const bottomOverlay = document.getElementById('educationalBottomOverlay');
    if (topOverlay) { topOverlay.onclick = null; topOverlay.style.cursor = 'default'; }
    if (bottomOverlay) { bottomOverlay.onclick = null; bottomOverlay.style.cursor = 'default'; }
  }
}


