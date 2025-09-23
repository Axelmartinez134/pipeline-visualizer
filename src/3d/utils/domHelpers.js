/**
 * DOM Helper Utilities
 * Canvas and element management functions
 */

import { CANVAS_CONFIG } from '../constants/deviceBreakpoints.js';

export class DOMHelpers {
  static getCanvasElement() {
    return document.getElementById('pipelineCanvas');
  }

  static getContainerElement() {
    return document.querySelector('.pipeline-container');
  }

  static getCanvasDimensions() {
    const canvas = this.getCanvasElement();
    const container = this.getContainerElement();
    
    if (!canvas || !container) {
      throw new Error('Required DOM elements not found');
    }
    
    const canvasWidth = canvas.clientWidth || container.clientWidth;
    const canvasHeight = CANVAS_CONFIG.HEIGHT;
    
    return { width: canvasWidth, height: canvasHeight };
  }

  static createThoughtBubbleContainer() {
    const container = this.getContainerElement();
    if (!container) return null;

    let bubblesContainer = container.querySelector('.css2d-container');
    if (!bubblesContainer) {
      bubblesContainer = document.createElement('div');
      bubblesContainer.className = 'css2d-container';
      container.appendChild(bubblesContainer);
    }
    
    return bubblesContainer;
  }

  static hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  static updateSliderValue(stage, value) {
    const valueDisplay = document.getElementById(stage + 'Value');
    if (valueDisplay) {
      // Convert internal value (business logic) to display value (user sees value - 10)
      const displayValue = parseInt(value) - 10;
      valueDisplay.textContent = displayValue;
    }
  }

  static updateTabStates(activeTabSelector) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    
    // Add active class to selected tab
    if (activeTabSelector) {
      const activeTab = document.querySelector(activeTabSelector);
      if (activeTab) {
        activeTab.classList.add('active');
      }
    }
  }

  static updateToggleButtons(activeScenario) {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    const clickedBtn = document.querySelector(`.toggle-btn[data-scenario="${activeScenario}"]`);
    if (clickedBtn) {
      clickedBtn.classList.add('active');
    }
  }

  static updateRevenue(revenue) {
    const formattedRevenue = (revenue / 1000).toFixed(0);
    const revenueDisplay = document.getElementById('revenueDisplay');
    if (revenueDisplay) {
      revenueDisplay.textContent = `Current Revenue: $${formattedRevenue}K ARR`;
    }
  }

  static updateEfficiency(efficiency) {
    const efficiencyDisplay = document.getElementById('efficiency');
    if (efficiencyDisplay) {
      efficiencyDisplay.textContent = `${efficiency}%`;
    }
  }

  static updateBottleneckImpact(lostRevenue) {
    const impactDisplay = document.getElementById('bottleneckImpact');
    if (impactDisplay) {
      impactDisplay.textContent = `$${(lostRevenue / 1000).toFixed(0)}K`;
    }
  }

  static waitForElement(elementId, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.getElementById(elementId);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${elementId} not found within ${timeout}ms`));
        } else {
          setTimeout(checkElement, 100);
        }
      };
      
      checkElement();
    });
  }
} 