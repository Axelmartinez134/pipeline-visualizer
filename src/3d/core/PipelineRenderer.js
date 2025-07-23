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
      
      // Enable debug features in development
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        ErrorHandler.enableDebugMode();
        this.addArcTransitionTestFunction();
        console.log('🧪 Test arc transitions with: window.testArcTransitions()');
      }
      
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

  addArcTransitionTestFunction() {
    // Add test function to global scope for easy testing
    window.testArcTransitions = () => {
      console.log('🧪 Testing arc transitions between all sections...');
      
      const sections = ['leadGen', 'qualification', 'onboarding', 'delivery', 'retention'];
      let testIndex = 0;
      
      const runNextTest = () => {
        if (testIndex >= sections.length - 1) {
          console.log('✅ Arc transition tests completed!');
          return;
        }
        
        const fromSection = sections[testIndex];
        const toSection = sections[testIndex + 1];
        
        console.log(`Testing: ${fromSection} → ${toSection}`);
        
        // Navigate to first section
        this.uiController.selectProcess(fromSection);
        
        // Wait for transition to complete, then go to next
        setTimeout(() => {
          this.uiController.selectProcess(toSection);
          testIndex++;
          
          // Continue to next test
          setTimeout(runNextTest, 3000);
        }, 2000);
      };
      
      // Start with overview, then begin tests
      this.uiController.selectProcess('overview');
      setTimeout(() => {
        this.uiController.selectProcess(sections[0]);
        setTimeout(runNextTest, 2000);
      }, 1000);
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