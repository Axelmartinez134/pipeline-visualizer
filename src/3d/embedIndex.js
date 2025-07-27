/**
 * 3D Pipeline Visualization - Embed Entry Point
 * Specialized entry point for embed app using embed business data
 */

import { PipelineRenderer } from './core/PipelineRenderer.js';
import { DEFAULT_BUSINESS_DATA } from './constants/embedBusinessData.js';
import { PROCESS_AUTOMATIONS } from './constants/embedProcessContent.js';

// Global instance for embed
let embedPipelineRenderer = null;

/**
 * Initialize the 3D pipeline visualization for embed
 * Uses embed-specific business data and process content
 */
async function initializeEmbedPipeline() {
  try {
    console.log('Initializing embed 3D Pipeline...');
    
    // Set up global embed process content for UIController
    // We need to temporarily override the imported PROCESS_AUTOMATIONS
    const originalModule = await import('./constants/processContent.js');
    
    // Override the process content globally for this session
    window.EMBED_PROCESS_AUTOMATIONS = PROCESS_AUTOMATIONS;
    
    // Create and initialize the pipeline renderer with embed data
    embedPipelineRenderer = new PipelineRenderer();
    
    // Override the business data with embed-specific data
    embedPipelineRenderer.businessData = { ...DEFAULT_BUSINESS_DATA };
    
    await embedPipelineRenderer.init();
    
    // Completely disable ALL tutorial functionality for embed version
    if (embedPipelineRenderer.uiController) {
      // Override tutorial methods to be complete no-ops
      embedPipelineRenderer.uiController.startTutorial = () => {};
      embedPipelineRenderer.uiController.showTutorialStep = () => {};
      embedPipelineRenderer.uiController.addTutorialHighlights = () => {};
      embedPipelineRenderer.uiController.removeTutorialHighlights = () => {};
      embedPipelineRenderer.uiController.highlightAllTabs = () => {};
      
      // Override the tutorial overlay updater with our service offering copy
      embedPipelineRenderer.uiController.updateTutorialOverlays = () => {
        const topOverlay = document.getElementById('educationalTopOverlay');
        if (topOverlay) {
          const content = topOverlay.querySelector('.educational-content');
          if (content) {
            content.innerHTML = `
              <span class="educational-text">
                <strong style="font-size: 1.1rem; color: #1E3A8A; display: block; margin-bottom: 8px;">Our Service Offerings</strong>
                <span style="font-size: 0.95rem; line-height: 1.4;">Our AI automation portfolio combines productized solutions and custom development to expand capacity in each critical business process. <strong>Click any area to explore our services that eliminate bottlenecks and scale revenue.</strong></span>
              </span>
            `;
          }
          // Remove any tutorial styling
          topOverlay.classList.remove('tutorial-glow');
          topOverlay.style.cursor = 'default';
          topOverlay.onclick = null;
        }
      };
      
      // Set tutorial as permanently disabled
      embedPipelineRenderer.uiController.tutorialState = {
        isActive: false,
        currentStep: 0,
        maxSteps: 0,
        completed: true,
        disabled: true // Mark as disabled so it never starts
      };
      
      // Force our custom top overlay content and normal educational mode
      embedPipelineRenderer.uiController.updateTutorialOverlays(); // Apply our service offering copy
      embedPipelineRenderer.uiController.updateEducationalOverlays();
      embedPipelineRenderer.uiController.showEducationalOverlays();
      
      console.log('✅ Tutorial system completely disabled for embed - showing service offerings copy');
    }
    
  } catch (error) {
    console.error('Failed to initialize embed pipeline:', error);
  }
}

/**
 * Cleanup function for the embed pipeline
 */
function disposeEmbedPipeline() {
  if (embedPipelineRenderer) {
    embedPipelineRenderer.dispose();
    embedPipelineRenderer = null;
  }
  
  // Clean up global embed data
  if (window.EMBED_PROCESS_AUTOMATIONS) {
    delete window.EMBED_PROCESS_AUTOMATIONS;
  }
}

// Auto-initialize when script loads (React handles DOM readiness)
initializeEmbedPipeline();

// Export for potential external use
export { embedPipelineRenderer, initializeEmbedPipeline, disposeEmbedPipeline };

// Also expose globally for debugging
window.PipelineVisualization = {
  renderer: embedPipelineRenderer,
  initialize: initializeEmbedPipeline,
  dispose: disposeEmbedPipeline
}; 