import React from 'react'
import { PROCESS_AUTOMATIONS } from '../../3d/constants/processContent.js'

export default function ProcessAnalysis({ selectedProcess = 'overview' }) {
  const process = PROCESS_AUTOMATIONS[selectedProcess] || PROCESS_AUTOMATIONS.overview

  const statusIcon = process.status === 'bottleneck' ? '🚨' : process.status === 'optimization' ? '⚡' : process.status === 'secondary' ? '📊' : ''
  const statusClass = process.status === 'bottleneck' ? 'status-bottleneck' : process.status === 'optimization' ? 'status-optimization' : process.status === 'secondary' ? 'status-secondary' : ''

  return (
    <div id="processAnalysis" className="analysis-section">
      <div className="process-header">
        <div className="process-title">{statusIcon} {process.title}</div>
        {process.statusText ? <div className={`process-status ${statusClass}`}>{process.statusText}</div> : null}
        {process.description ? (
          <p style={{ color: '#6B7280', maxWidth: 600, margin: '0 auto', lineHeight: 1.5 }}>{process.description}</p>
        ) : null}
      </div>

      {process.capacity ? (
        <div className="process-metrics">
          <div className="process-metric">
            <div className="process-metric-value">{process.capacity}</div>
            <div className="process-metric-label">{process.unit}</div>
          </div>
          <div className="process-metric">
            <div className="process-metric-value">{process.status === 'bottleneck' ? 'HIGH' : 'LOW'}</div>
            <div className="process-metric-label">Priority Level</div>
          </div>
          <div className="process-metric">
            <div className="process-metric-value">{process.status === 'bottleneck' ? '$150K+' : '$20-50K'}</div>
            <div className="process-metric-label">Revenue Impact</div>
          </div>
        </div>
      ) : null}

      <div className="process-automations">
        <h4>{process.status === 'bottleneck' ? '🎯 Priority Automations - Start Here:' : '⚡ Available Automations:'}</h4>
        {process.automations?.map((automation) => (
          <div key={automation.title} className={`automation-item ${automation.priority ? 'priority' : ''}`} onClick={() => showAutomationDetails(automation.title)}>
            <div className="automation-title">
              {automation.title}
              {automation.priority ? <span className="priority-badge">HIGHEST ROI</span> : null}
            </div>
            <div className="automation-description">{automation.description}</div>
            <div style={{ marginTop: 8, color: '#1E3A8A', fontWeight: 'bold', fontSize: '0.9rem' }}>
              💡 {automation.impact}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function showAutomationDetails(title) {
  // local finder to avoid relying on window globals
  let automation = null
  for (const process of Object.values(PROCESS_AUTOMATIONS)) {
    automation = process.automations?.find((a) => a.title === title)
    if (automation) break
  }
  if (automation) {
    alert(`${automation.title}\n\n${automation.description}\n\nExpected Impact: ${automation.impact}\n\nClick "Get My Automation Roadmap" below to receive implementation details!`)
  }
}


