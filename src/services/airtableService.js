/**
 * Airtable Service for Pipeline Analyzer Form Submissions
 * Handles secure form data submission to Airtable base
 */

class AirtableService {
  constructor() {
    this.baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
    this.tableName = import.meta.env.VITE_AIRTABLE_TABLE_NAME;
    this.apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
    this.baseUrl = `https://api.airtable.com/v0/${this.baseId}/${encodeURIComponent(this.tableName)}`;
  }

  /**
   * Validate that all required environment variables are present
   */
  validateConfig() {
    const missing = [];
    if (!this.baseId) missing.push('VITE_AIRTABLE_BASE_ID');
    if (!this.tableName) missing.push('VITE_AIRTABLE_TABLE_NAME');
    if (!this.apiKey) missing.push('VITE_AIRTABLE_API_KEY');

    if (missing.length > 0) {
      throw new Error(`Missing Airtable configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Submit form data to Airtable
   * @param {Object} formData - The form data to submit
   * @returns {Promise<Object>} - Airtable response
   */
  async submitLead(formData) {
    try {
      this.validateConfig();

      const payload = {
        fields: {
          "Name": formData.name,
          "Email": formData.email,
          "Company": formData.company,
          "Primary Challenge": formData.challenge,
          "Industry": formData.industry || "coaching",
          "Submission Date": new Date().toISOString(),
          "Pipeline Data": JSON.stringify(formData.pipelineData || {}),
          "User Journey": JSON.stringify(formData.userJourney || {})
        }
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Airtable API Error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Successfully submitted to Airtable:', result.id);
      return result;

    } catch (error) {
      console.error('❌ Airtable submission failed:', error);
      throw error;
    }
  }

  /**
   * Collect smart pipeline data from the current state
   * @returns {Object} - Pipeline interaction data
   */
  collectPipelineData() {
    try {
      // Get current slider values
      const pipelineSettings = {
        leadGen: document.getElementById('leadGenValue')?.textContent || null,
        qualification: document.getElementById('qualificationValue')?.textContent || null,
        onboarding: document.getElementById('onboardingValue')?.textContent || null,
        delivery: document.getElementById('deliveryValue')?.textContent || null
      };

      // Get current industry selection
      const industry = document.getElementById('industrySelect')?.value || 'coaching';

      // Get bottleneck information if available
      const bottleneckAlert = document.getElementById('bottleneckAlert')?.textContent || null;

      return {
        settings: pipelineSettings,
        industry: industry,
        bottleneck: bottleneckAlert,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error collecting pipeline data:', error);
      return {};
    }
  }

  /**
   * Collect user journey data (which tabs they explored, time spent, etc.)
   * @returns {Object} - User interaction data
   */
  collectUserJourney() {
    try {
      // This could be enhanced to track tab clicks, time spent, etc.
      return {
        sessionStart: window.pipelineSessionStart || new Date().toISOString(),
        currentTab: window.currentProcessTab || 'overview',
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error collecting user journey:', error);
      return {};
    }
  }
}

// Export singleton instance
export const airtableService = new AirtableService();
export default airtableService; 