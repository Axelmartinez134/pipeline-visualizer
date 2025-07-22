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
    this.init();
  }

  init() {
    this.initializeControlValues();
    this.updateProcessContent('overview');
    this.updateBusinessMetrics();
  }

  // Process tab selection
  selectProcess(processId) {
    this.selectedProcess = processId;
    
    // Update UI state
    DOMHelpers.updateTabStates(`.tab[onclick*="${processId}"]`);
    
    // Update 3D scene
    this.sceneManager.selectProcess(processId);
    
    // Update content
    this.updateProcessContent(processId);
  }

  // Reset to overview
  resetCamera() {
    this.selectedProcess = 'overview';
    this.sceneManager.resetCamera();
    this.updateProcessContent('overview');
    DOMHelpers.updateTabStates('.tab[onclick*="overview"]');
  }

  // Update stage capacity
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
  submitLeadForm() {
    alert("Thank you! Your automation roadmap will be sent to your email within 24 hours. We'll also follow up to schedule your strategy call.");
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