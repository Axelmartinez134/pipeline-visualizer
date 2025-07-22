/**
 * Pipeline Renderer
 * Main orchestrator for the 3D pipeline visualization
 */

import { DEFAULT_BUSINESS_DATA } from '../constants/businessData.js';
import { ErrorHandler } from '../utils/errorHandling.js';
import { SceneManager } from './SceneManager.js';
import { UIController } from './UIController.js';

export class PipelineRenderer {
  constructor() {
    this.businessData = { ...DEFAULT_BUSINESS_DATA };
    this.sceneManager = null;
    this.uiController = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      console.log('Starting AutomatedBots Pipeline Analyzer initialization...');
      
      // Initialize error handling
      ErrorHandler.init();
      
      // Validate required libraries
      if (!ErrorHandler.validateLibraries()) {
        return;
      }
      
      // Validate required DOM elements
      const requiredElements = ['pipelineCanvas', 'processAnalysis'];
      if (!ErrorHandler.validateDOMElements(requiredElements)) {
        ErrorHandler.showUserError('Required page elements not found. Please refresh the page.');
        return;
      }
      
      console.log('Libraries loaded:', { THREE: !!window.THREE, gsap: !!window.gsap });
      
      // Initialize scene manager
      this.sceneManager = new SceneManager(this.businessData);
      await this.sceneManager.init();
      
      // Initialize UI controller
      this.uiController = new UIController(this.sceneManager, this.businessData);
      
      // Expose global functions for HTML onclick handlers
      this.exposeGlobalFunctions();
      
      this.isInitialized = true;
      
      console.log('Pipeline Renderer initialization complete!');
    } catch (error) {
      ErrorHandler.logError('PipelineRenderer.init', error);
      ErrorHandler.showUserError('Failed to initialize 3D visualization. Please refresh the page.');
    }
  }

  exposeGlobalFunctions() {
    // Expose UI controller methods globally for HTML onclick handlers
    window.selectProcessTab = (processId) => {
      if (this.uiController) {
        this.uiController.selectProcess(processId);
      }
    };
    
    window.resetCamera = () => {
      if (this.uiController) {
        this.uiController.resetCamera();
      }
    };
    
    window.updateStage = (stage, value) => {
      if (this.uiController) {
        this.uiController.updateStage(stage, value);
      }
    };
    
    window.toggleSimulation = () => {
      if (this.uiController) {
        this.uiController.toggleSimulation();
      }
    };
    
    window.switchScenario = (scenario) => {
      if (this.uiController) {
        this.uiController.switchScenario(scenario);
      }
    };
    
    window.updateIndustry = (industry) => {
      if (this.uiController) {
        this.uiController.updateIndustry(industry);
      }
    };
    
    window.submitLeadForm = () => {
      if (this.uiController) {
        this.uiController.submitLeadForm();
      }
    };
  }

  dispose() {
    if (this.sceneManager) {
      this.sceneManager.dispose();
    }
    
    // Clean up global functions
    const globalFunctions = [
      'selectProcessTab', 'resetCamera', 'updateStage', 
      'toggleSimulation', 'switchScenario', 'updateIndustry', 'submitLeadForm'
    ];
    
    globalFunctions.forEach(funcName => {
      if (window[funcName]) {
        delete window[funcName];
      }
    });
    
    this.isInitialized = false;
  }

  getBusinessData() {
    return { ...this.businessData };
  }

  getSceneManager() {
    return this.sceneManager;
  }

  getUIController() {
    return this.uiController;
  }
} 