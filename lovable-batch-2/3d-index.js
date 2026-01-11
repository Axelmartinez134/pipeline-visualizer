/**
 * 3D Pipeline Visualization - Main Entry Point
 * Modular architecture for AutomatedBots Pipeline Analyzer
 */

import { PipelineRenderer } from './core/PipelineRenderer.js';

// Global instance
let pipelineRenderer = null;

/**
 * Initialize the 3D pipeline visualization
 * This replaces the monolithic pipelineVisualization.js file
 */
async function initializePipeline() {
  try {
    console.log('Initializing modular 3D Pipeline...');
    
    // Create and initialize the pipeline renderer
    pipelineRenderer = new PipelineRenderer();
    await pipelineRenderer.init();
    
    // Ensure the global reference points to the initialized renderer
    window.PipelineVisualization = {
      renderer: pipelineRenderer,
      initialize: initializePipeline,
      dispose: disposePipeline
    };
    
  } catch (error) {
    console.error('Failed to initialize pipeline:', error);
  }
}

/**
 * Cleanup function for the pipeline
 */
function disposePipeline() {
  if (pipelineRenderer) {
    pipelineRenderer.dispose();
    pipelineRenderer = null;
  }
  // Keep global API but clear renderer reference
  if (window.PipelineVisualization) {
    window.PipelineVisualization.renderer = null;
  }
}

// Auto-initialize when script loads (React handles DOM readiness)
initializePipeline();

// Export for potential external use
export { pipelineRenderer, initializePipeline, disposePipeline };

// Global will be assigned in initializePipeline()