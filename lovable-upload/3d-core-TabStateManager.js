/**
 * TabStateManager
 * Manages tab active state and transition feedback classes
 */

export class TabStateManager {
  updateTabStates(processId) {
    try {
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

      const processNames = {
        leadGen: 'Marketing',
        qualification: 'Sales',
        onboarding: 'Onboarding',
        delivery: 'Fulfillment',
        retention: 'Retention',
        overview: 'Overview',
      };

      let targetTab = null;
      const processName = processNames[processId];
      if (processName) {
        targetTab = Array.from(document.querySelectorAll('.tab')).find(
          tab => tab.textContent.trim() === processName,
        );
      }
      if (!targetTab) targetTab = document.querySelector(`.tab[data-process="${processId}"]`);
      if (!targetTab) targetTab = document.querySelector(`.tab-${processId}`);
      if (targetTab) targetTab.classList.add('active');
    } catch {}
  }

  addTransitionFeedback(processId) {
    const targetTab = document.querySelector(`.tab[onclick*="${processId}"]`);
    if (targetTab) targetTab.classList.add('transitioning');
    const container = document.querySelector('.pipeline-container');
    if (container) container.classList.add('arc-transitioning');
  }

  removeTransitionFeedback() {
    document.querySelectorAll('.tab.transitioning').forEach(tab => tab.classList.remove('transitioning'));
    const container = document.querySelector('.pipeline-container');
    if (container) container.classList.remove('arc-transitioning');
  }
}





