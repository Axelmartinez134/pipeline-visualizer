/**
 * Scene Manager
 * Coordinates all 3D components and rendering
 */

import { MATERIAL_COLORS } from '../constants/cameraSettings.js';
import { DOMHelpers } from '../utils/domHelpers.js';
import { DeviceDetection } from '../utils/deviceDetection.js';
import { Camera } from '../components/Camera.js';
import { Lighting } from '../components/Lighting.js';
import { Pipeline } from '../components/Pipeline.js';
import { ThoughtBubbles } from '../components/ThoughtBubbles.js';

export class SceneManager {
  constructor(businessData) {
    this.scene = null;
    this.camera = null;
    this.lighting = null;
    this.pipeline = null;
    this.thoughtBubbles = null;
    this.renderer = null;
    this.businessData = businessData;
    this.isAnimating = false;
  }

  async init() {
    try {
      console.log('Initializing Scene Manager...');
      
      // Wait for canvas to be available
      await DOMHelpers.waitForElement('pipelineCanvas');
      
      this.createScene();
      this.createRenderer();
      this.createCamera();
      this.createLighting();
      this.createThoughtBubbles();
      this.createPipeline();
      
      this.setupEventListeners();
      this.startAnimation();
      
      DOMHelpers.hideLoadingOverlay();
      
      console.log('Scene Manager initialization complete');
    } catch (error) {
      console.error('Error in SceneManager.init:', error);
      throw error;
    }
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(MATERIAL_COLORS.BACKGROUND);
  }

  createRenderer() {
    const canvas = DOMHelpers.getCanvasElement();
    const dimensions = DOMHelpers.getCanvasDimensions();
    
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: canvas, 
      antialias: true 
    });
    this.renderer.setSize(dimensions.width, dimensions.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Adjust quality based on device
    const quality = DeviceDetection.getRecommendedQuality();
    this.setRenderQuality(quality);
  }

  createCamera() {
    this.camera = new Camera();
  }

  createLighting() {
    this.lighting = new Lighting(this.scene);
    
    // Adjust lighting quality based on device
    const quality = DeviceDetection.getRecommendedQuality();
    this.lighting.setQuality(quality);
  }

  createPipeline() {
    this.pipeline = new Pipeline(this.scene, this.businessData);
    const stagePositions = this.pipeline.create();
    
    // Create thought bubbles after pipeline is created
    if (this.thoughtBubbles && stagePositions.length > 0) {
      this.thoughtBubbles.createAllBubbles(stagePositions);
    }
  }

  createThoughtBubbles() {
    this.thoughtBubbles = new ThoughtBubbles(this.camera.getCamera());
  }

  setRenderQuality(quality) {
    if (!this.renderer) return;
    
    switch (quality) {
      case 'low':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        this.renderer.shadowMap.enabled = false;
        break;
      case 'medium':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        break;
      case 'high':
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        break;
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    const dimensions = DOMHelpers.getCanvasDimensions();
    this.camera.handleResize();
    this.renderer.setSize(dimensions.width, dimensions.height);
  }

  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  }

  animate() {
    if (!this.isAnimating) return;
    
    try {
      requestAnimationFrame(() => this.animate());
      this.renderer.render(this.scene, this.camera.getCamera());
      
      // Update thought bubble positions for visible bubbles
      if (this.thoughtBubbles) {
        this.thoughtBubbles.updatePositions();
      }
    } catch (error) {
      console.error('Error in animation loop:', error);
      // Continue animation loop even if there's an error
      requestAnimationFrame(() => this.animate());
    }
  }

  stopAnimation() {
    this.isAnimating = false;
  }

  // Public API methods for UI interaction
  selectProcess(processId) {
    console.log('SceneManager.selectProcess called with:', processId);
    
    if (this.camera) {
      this.camera.animateToProcess(processId);
      console.log('Camera animation started for:', processId);
    }
    
    if (this.thoughtBubbles) {
      this.thoughtBubbles.hideAllBubbles();
      console.log('All bubbles hidden');
      
      // Show relevant thought bubble after camera animation
      if (processId !== 'overview') {
        console.log('Setting timeout to show bubble for:', processId);
        setTimeout(() => {
          console.log('Attempting to show bubble for:', processId);
          this.thoughtBubbles.showBubble(processId);
        }, 2000); // Increased delay to 2 seconds
      }
    } else {
      console.error('ThoughtBubbles not initialized!');
    }
  }

  resetCamera() {
    if (this.camera) {
      this.camera.resetToOverview();
    }
    
    if (this.thoughtBubbles) {
      this.thoughtBubbles.hideAllBubbles();
    }
  }

  updateStage(stage, value) {
    if (this.pipeline) {
      const stagePositions = this.pipeline.updateStage(stage, value);
      
      // Recreate thought bubbles with new positions
      if (this.thoughtBubbles && stagePositions.length > 0) {
        this.thoughtBubbles.createAllBubbles(stagePositions);
      }
    }
    
    // Hide bubbles when adjusting sliders
    if (this.thoughtBubbles) {
      this.thoughtBubbles.hideAllBubbles();
    }
  }

  toggleSimulation() {
    if (this.pipeline) {
      const stagePositions = this.pipeline.toggleSimulation();
      
      // Recreate thought bubbles
      if (this.thoughtBubbles && stagePositions.length > 0) {
        this.thoughtBubbles.createAllBubbles(stagePositions);
      }
    }
    
    // Hide bubbles when toggling simulation
    if (this.thoughtBubbles) {
      this.thoughtBubbles.hideAllBubbles();
    }
  }

  switchScenario(scenario) {
    if (this.pipeline) {
      const stagePositions = this.pipeline.switchScenario(scenario);
      
      // Recreate thought bubbles
      if (this.thoughtBubbles && stagePositions.length > 0) {
        this.thoughtBubbles.createAllBubbles(stagePositions);
      }
    }
    
    // Hide bubbles when switching scenarios
    if (this.thoughtBubbles) {
      this.thoughtBubbles.hideAllBubbles();
    }
  }

  getBusinessMetrics() {
    if (!this.pipeline) return null;
    
    return {
      revenue: this.pipeline.calculateRevenue(),
      bottleneckStage: this.pipeline.getBottleneckStage(),
      efficiency: this.pipeline.getEfficiency()
    };
  }

  dispose() {
    this.stopAnimation();
    
    if (this.pipeline) this.pipeline.dispose();
    if (this.thoughtBubbles) this.thoughtBubbles.dispose();
    if (this.lighting) this.lighting.dispose();
    if (this.camera) this.camera.dispose();
    if (this.renderer) this.renderer.dispose();
    
    window.removeEventListener('resize', this.onWindowResize);
  }
} 