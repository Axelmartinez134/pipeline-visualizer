/**
 * MetricsService
 * Computes and presents business metrics and alerts
 */

import { BUSINESS_METRICS, STAGE_CONFIG } from '../constants/businessData.js';
import { DOMHelpers } from '../utils/domHelpers.js';

export class MetricsService {
  constructor(sceneManager, businessData) {
    this.sceneManager = sceneManager;
    this.businessData = businessData;
  }

  updateBusinessMetrics() {
    const metrics = this.sceneManager.getBusinessMetrics();
    if (!metrics) return;

    DOMHelpers.updateRevenue(metrics.revenue);
    DOMHelpers.updateEfficiency(metrics.efficiency);

    const capacities = Object.values(this.businessData);
    const maxCapacity = Math.max(...capacities);
    const potentialRevenue = maxCapacity * BUSINESS_METRICS.CLIENT_VALUE_ANNUAL;
    const lostRevenue = potentialRevenue - metrics.revenue;
    DOMHelpers.updateBottleneckImpact(lostRevenue);
  }

  updateBottleneckAlert() {
    const metrics = this.sceneManager.getBusinessMetrics();
    if (!metrics) return;
    const stageName = STAGE_CONFIG.STAGE_NAMES[metrics.bottleneckStage];
    const alertElement = document.getElementById('bottleneckAlert');
    if (alertElement) {
      alertElement.innerHTML = `🚨 <strong>${stageName}</strong> is your bottleneck!`;
    }
  }
}





