/**
 * FormController
 * Handles lead form data collection, validation, submission, and UI feedback
 */

export class FormController {
  async submitLeadForm() {
    try {
      const formData = this.collectFormData();
      if (!this.validateFormData(formData)) return;

      this.setFormLoading(true);

      const { airtableService } = await import('../../services/airtableService.js');
      const pipelineData = airtableService.collectPipelineData();
      const userJourney = airtableService.collectUserJourney();

      await airtableService.submitLead({
        ...formData,
        pipelineData,
        userJourney,
      });

      this.showFormSuccess();
    } catch (error) {
      console.error('Form submission error:', error);
      this.showFormError(error.message);
    } finally {
      this.setFormLoading(false);
    }
  }

  collectFormData() {
    return {
      name: document.getElementById('name')?.value?.trim() || '',
      email: document.getElementById('email')?.value?.trim() || '',
      company: document.getElementById('company')?.value?.trim() || '',
      phone: document.getElementById('phone')?.value?.trim() || '',
      industry: document.getElementById('industry')?.value?.trim() || '',
      companySize: document.getElementById('companySize')?.value || '',
      challenge: document.getElementById('challenge')?.value || '',
    };
  }

  validateFormData(formData) {
    const errors = [];
    if (!formData.name) errors.push('Full name is required');
    if (!formData.email) errors.push('Business email is required');
    if (!formData.company) errors.push('Company name is required');
    if (!formData.industry) errors.push('Industry is required');
    if (!formData.companySize) errors.push('Company size is required');
    if (!formData.challenge) errors.push('Please select your biggest challenge');

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

  setFormLoading(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('leadForm');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? '⏳ Submitting...' : 'Get My Automation Strategy';
      submitBtn.style.opacity = isLoading ? '0.7' : '1';
    }
    if (form) form.style.pointerEvents = isLoading ? 'none' : 'auto';
  }

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
    // Notify React/UI via event so status persists across re-renders
    try {
      window.dispatchEvent(new CustomEvent('leadForm:status', { detail: { type: 'success' } }));
    } catch {}
    setTimeout(() => {
      document.getElementById('leadForm')?.reset();
      if (statusElement) statusElement.innerHTML = '';
    }, 5000);
  }

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
      setTimeout(() => {
        if (statusElement) statusElement.innerHTML = '';
      }, 7000);
    }
    // Notify React/UI via event so status persists across re-renders
    try {
      window.dispatchEvent(new CustomEvent('leadForm:status', { detail: { type: 'error', message } }));
    } catch {}
  }
}


