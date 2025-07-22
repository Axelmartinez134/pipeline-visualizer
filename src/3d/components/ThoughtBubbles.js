/**
 * Thought Bubbles Component
 * Manages HTML overlay thought bubbles with 3D positioning
 */

import { THOUGHT_BUBBLE_CONTENT } from '../constants/processContent.js';
import { DOMHelpers } from '../utils/domHelpers.js';

export class ThoughtBubbles {
  constructor(camera) {
    this.camera = camera;
    this.bubbles = [];
    this.container = null;
    this.init();
  }

  init() {
    this.container = DOMHelpers.createThoughtBubbleContainer();
    if (!this.container) {
      console.error('Could not create thought bubble container');
    }
  }

  createBubble(stage, worldPosition) {
    try {
      const content = THOUGHT_BUBBLE_CONTENT[stage];
      if (!content) return null;

      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'thought-bubble';
      bubbleDiv.id = `thought-bubble-${stage}`;
      bubbleDiv.style.position = 'absolute';
      bubbleDiv.style.display = 'none';
      
      // Add click handler to dismiss bubble
      bubbleDiv.addEventListener('click', (e) => {
        if (e.target.closest('.bubble-cta')) return; // Don't dismiss if clicking CTA
        this.hideBubble(stage);
      });
      
      const previewsHTML = content.previews.map(preview => `
        <div class="automation-preview">
          <span class="automation-icon">${preview.icon}</span>
          <span class="automation-text">${preview.text}</span>
        </div>
      `).join('');
      
      bubbleDiv.innerHTML = `
        <div class="thought-bubble-content">
          <h4>${content.title}</h4>
          <div class="preview-items">
            ${previewsHTML}
          </div>
          <div class="bubble-cta" onclick="window.scrollToAutomations()">
            <span>See full roadmap</span>
            <span class="arrow">↓</span>
          </div>
        </div>
        <div class="bubble-tail"></div>
      `;
      
      // Add to container
      if (this.container) {
        this.container.appendChild(bubbleDiv);
      }
      
      const bubbleData = {
        element: bubbleDiv,
        worldPosition: worldPosition.clone(),
        stage: stage,
        isVisible: false
      };
      
      this.bubbles.push(bubbleData);
      
      // Set initial position
      this.updateBubblePosition(bubbleData);
      
      return bubbleData;
    } catch (error) {
      console.error('Error creating thought bubble:', error);
      return null;
    }
  }

  updateBubblePosition(bubbleData) {
    if (!bubbleData.element || !this.camera) return;
    
    const containerElement = DOMHelpers.getContainerElement();
    if (!containerElement) return;
    
    const vector = new THREE.Vector3();
    vector.copy(bubbleData.worldPosition);
    vector.project(this.camera);
    
    const x = (vector.x * 0.5 + 0.5) * containerElement.clientWidth;
    const y = (-(vector.y * 0.5) + 0.5) * containerElement.clientHeight;
    
    // Calculate distance-based offset for better positioning at different zoom levels
    const distance = this.camera.position.distanceTo(bubbleData.worldPosition);
    const offsetY = Math.max(15, Math.min(60, distance * 6)); // Scale offset based on distance
    
    bubbleData.element.style.left = `${x}px`;
    bubbleData.element.style.top = `${y - offsetY}px`;
    bubbleData.element.style.transform = 'translate(-50%, -100%)';
  }

  showBubble(stage, autoHideDelay = 7000) {
    console.log('ThoughtBubbles.showBubble called for stage:', stage);
    console.log('Available bubbles:', this.bubbles.map(b => b.stage));
    
    const bubble = this.bubbles.find(b => b.stage === stage);
    if (!bubble) {
      console.error('No bubble found for stage:', stage);
      return;
    }

    console.log('Found bubble, showing it:', bubble.stage);
    bubble.element.classList.add('visible');
    bubble.isVisible = true;
    
    // Update position immediately when showing
    this.updateBubblePosition(bubble);
    console.log('Bubble position updated for:', stage);
    
    // Auto-hide after delay
    if (autoHideDelay > 0) {
      setTimeout(() => {
        this.hideBubble(stage);
      }, autoHideDelay);
    }
  }

  hideBubble(stage) {
    const bubble = this.bubbles.find(b => b.stage === stage);
    if (!bubble) return;

    bubble.element.classList.remove('visible');
    bubble.isVisible = false;
  }

  hideAllBubbles() {
    this.bubbles.forEach(bubble => {
      bubble.element.classList.remove('visible');
      bubble.isVisible = false;
    });
  }

  updatePositions() {
    // Only update positions for visible bubbles
    this.bubbles.forEach(bubble => {
      if (bubble.isVisible) {
        this.updateBubblePosition(bubble);
      }
    });
  }

  clearAllBubbles() {
    this.bubbles.forEach(bubble => {
      if (bubble.element.parentNode) {
        bubble.element.parentNode.removeChild(bubble.element);
      }
    });
    this.bubbles = [];
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  dispose() {
    this.clearAllBubbles();
    this.container = null;
  }

  // Create bubbles for all stages
  createAllBubbles(stagePositions) {
    this.clearAllBubbles();
    
    const stages = ['leadGen', 'qualification', 'onboarding', 'delivery', 'retention'];
    
    stages.forEach((stage, index) => {
      const position = stagePositions[index];
      const worldPos = new THREE.Vector3(position, 0.8 + 1.0, 0); // Above the pipe
      this.createBubble(stage, worldPos);
    });
    
    // Temporary test: Show a test bubble immediately for debugging
    console.log('Creating test bubble for onboarding stage');
    setTimeout(() => {
      console.log('Test: Showing onboarding bubble for 3 seconds');
      this.showBubble('onboarding', 3000);
    }, 3000);
  }
}

// Global function for CTA clicks
window.scrollToAutomations = function() {
  const processAnalysis = document.getElementById('processAnalysis');
  if (processAnalysis) {
    processAnalysis.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}; 