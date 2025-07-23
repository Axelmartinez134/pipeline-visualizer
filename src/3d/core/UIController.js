/**
 * UI Controller
 * Manages form interactions, content updates, and business logic
 */

import { PROCESS_AUTOMATIONS } from '../constants/processContent.js';
import { STAGE_CONFIG, BUSINESS_METRICS } from '../constants/businessData.js';
import { DOMHelpers } from '../utils/domHelpers.js';

export class UIController {
  constructor(sceneManager, businessData) {
    this.sceneManager = sceneManager;
    this.businessData = businessData;
    this.selectedProcess = 'overview';
    this.currentScenario = 'current';
    this.isTransitionInProgress = false;
    this.lastTransitionTime = 0;
    this.minTransitionInterval = 500; // Minimum time between transitions (ms)
    this.init();
  }

  init() {
    this.initializeControlValues();
    this.updateProcessContent('overview');
    this.updateBusinessMetrics();
    
    // CRITICAL FIX: Set Overview tab as active on app load
    this.updateTabStates('overview');
  }

  // Process tab selection with transition throttling
  selectProcess(processId) {
    // Prevent rapid clicking and transition conflicts
    const now = Date.now();
    if (this.isTransitionInProgress) {
      console.log('Transition in progress, ignoring click for:', processId);
      return false;
    }

    if (now - this.lastTransitionTime < this.minTransitionInterval) {
      console.log('Too soon after last transition, ignoring click for:', processId);
      return false;
    }

    // Check if scene manager camera is transitioning
    if (this.sceneManager?.camera?.isTransitioning && this.sceneManager.camera.isTransitioning()) {
      console.log('Camera transition in progress, ignoring click for:', processId);
      return false;
    }

    // Update transition state
    this.isTransitionInProgress = true;
    this.lastTransitionTime = now;
    this.selectedProcess = processId;
    
    // Add visual feedback
    this.addTransitionFeedback(processId);
    
    // Update UI state - Fix tab selection logic
    this.updateTabStates(processId);
    
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
    setTimeout(() => {
      this.isTransitionInProgress = false;
      this.removeTransitionFeedback();
    }, estimatedDuration + 200); // Add 200ms buffer
    
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

    if (ARC_DETECTION.debugMode) {
      console.log('Resetting camera to overview from:', this.selectedProcess);
    }

    this.selectedProcess = 'overview';
    
    // Use the normal selectProcess flow to ensure consistent behavior
    this.sceneManager.selectProcess('overview');
    this.updateProcessContent('overview');
    this.updateTabStates('overview');
  }

  // Update stage capacity with transition state awareness
  updateStage(stage, value) {
    this.businessData[stage] = parseInt(value);
    
    // Update UI
    DOMHelpers.updateSliderValue(stage, value);
    
    // Update 3D scene
    this.sceneManager.updateStage(stage, value);
    
    // Update metrics
    this.updateBusinessMetrics();
    this.updateBottleneckAlert();
  }

  // Toggle water simulation
  toggleSimulation() {
    const button = document.querySelector('.play-button');
    const isSimulating = button.textContent === '⏸';
    button.textContent = isSimulating ? '▶' : '⏸';
    
    this.sceneManager.toggleSimulation();
  }

  // Switch between current and optimized scenarios
  switchScenario(scenario) {
    this.currentScenario = scenario;
    
    // Update UI state
    DOMHelpers.updateToggleButtons(scenario);
    
    // Update 3D scene
    this.sceneManager.switchScenario(scenario);
    
    // Update slider values for optimized scenario
    if (scenario === 'optimized') {
      this.businessData.onboarding = 75;
      DOMHelpers.updateSliderValue('onboarding', 75);
      const slider = document.querySelector('input[onchange*="onboarding"]');
      if (slider) slider.value = 75;
    } else if (scenario === 'current') {
      this.businessData.onboarding = 25;
      DOMHelpers.updateSliderValue('onboarding', 25);
      const slider = document.querySelector('input[onchange*="onboarding"]');
      if (slider) slider.value = 25;
    }
    
    // Update metrics and content
    this.updateBusinessMetrics();
    this.updateBottleneckAlert();
    
    if (this.selectedProcess !== 'overview') {
      this.updateProcessContent(this.selectedProcess);
    }
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
    try {
      // Get form data
      const formData = this.collectFormData();
      
      // Validate required fields
      if (!this.validateFormData(formData)) {
        return; // Validation errors already shown
      }

      // Show loading state
      this.setFormLoading(true);

      // Import Airtable service
      const { airtableService } = await import('../../services/airtableService.js');

      // Collect smart pipeline data
      const pipelineData = airtableService.collectPipelineData();
      const userJourney = airtableService.collectUserJourney();

      // Submit to Airtable
      await airtableService.submitLead({
        ...formData,
        pipelineData,
        userJourney
      });

      // Show success message
      this.showFormSuccess();

    } catch (error) {
      console.error('Form submission error:', error);
      this.showFormError(error.message);
    } finally {
      this.setFormLoading(false);
    }
  }

  // Collect form data from DOM
  collectFormData() {
    return {
      name: document.getElementById('name')?.value?.trim() || '',
      email: document.getElementById('email')?.value?.trim() || '',
      company: document.getElementById('company')?.value?.trim() || '',
      challenge: document.getElementById('challenge')?.value || '',
      industry: document.getElementById('industrySelect')?.value || 'coaching'
    };
  }

  // Validate form data
  validateFormData(formData) {
    const errors = [];
    
    if (!formData.name) errors.push('Name is required');
    if (!formData.email) errors.push('Email is required');
    if (!formData.company) errors.push('Company name is required');
    if (!formData.challenge) errors.push('Please select your biggest challenge');
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (errors.length > 0) {
      this.showFormError(errors.join('<br>'));
      return false;
    }

    return true;
  }

  // Show loading state
  setFormLoading(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('leadForm');
    
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? '⏳ Submitting...' : 'Get My Automation Strategy';
      submitBtn.style.opacity = isLoading ? '0.7' : '1';
    }
    
    if (form) {
      form.style.pointerEvents = isLoading ? 'none' : 'auto';
    }
  }

  // Show success message
  showFormSuccess() {
    const statusElement = document.getElementById('formStatus');
    if (statusElement) {
      statusElement.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #059669, #34D399);
          color: white;
          padding: 15px;
          border-radius: 10px;
          margin: 15px 0;
          text-align: center;
          font-weight: 500;
        ">
          ✅ Success! Your automation strategy will be sent within 24 hours.<br>
          We'll follow up to schedule your strategy call.
        </div>
      `;
    }

    // Reset form after short delay
    setTimeout(() => {
      document.getElementById('leadForm')?.reset();
      if (statusElement) statusElement.innerHTML = '';
    }, 5000);
  }

  // Show error message
  showFormError(message) {
    const statusElement = document.getElementById('formStatus');
    if (statusElement) {
      statusElement.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #DC2626, #EF4444);
          color: white;
          padding: 15px;
          border-radius: 10px;
          margin: 15px 0;
          text-align: center;
          font-weight: 500;
        ">
          ❌ ${message}
        </div>
      `;

      // Auto-hide error after 7 seconds
      setTimeout(() => {
        if (statusElement) statusElement.innerHTML = '';
      }, 7000);
    }
  }

  // Initialize control values
  initializeControlValues() {
    STAGE_CONFIG.STAGES.forEach(stage => {
      DOMHelpers.updateSliderValue(stage, this.businessData[stage]);
    });
    this.updateBottleneckAlert();
  }

  // Update business metrics display
  updateBusinessMetrics() {
    const metrics = this.sceneManager.getBusinessMetrics();
    if (!metrics) return;
    
    // Update revenue
    DOMHelpers.updateRevenue(metrics.revenue);
    
    // Update efficiency
    DOMHelpers.updateEfficiency(metrics.efficiency);
    
    // Update lost revenue
    const capacities = Object.values(this.businessData);
    const maxCapacity = Math.max(...capacities);
    const potentialRevenue = maxCapacity * BUSINESS_METRICS.CLIENT_VALUE_ANNUAL;
    const lostRevenue = potentialRevenue - metrics.revenue;
    DOMHelpers.updateBottleneckImpact(lostRevenue);
  }

  // Update bottleneck alert
  updateBottleneckAlert() {
    const metrics = this.sceneManager.getBusinessMetrics();
    if (!metrics) return;
    
    const stageName = STAGE_CONFIG.STAGE_NAMES[metrics.bottleneckStage];
    const alertElement = document.getElementById('bottleneckAlert');
    if (alertElement) {
      alertElement.innerHTML = `🚨 <strong>${stageName}</strong> is your bottleneck!`;
    }
  }

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

  // Update process content panel
  updateProcessContent(processId) {
    try {
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