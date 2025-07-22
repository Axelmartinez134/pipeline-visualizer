import { useEffect } from 'react'
import './App.css'

function App() {
  useEffect(() => {
    // Wait for THREE.js and GSAP to be available
    const waitForLibraries = () => {
      if (typeof window.THREE !== 'undefined' && typeof window.gsap !== 'undefined') {
        console.log('Libraries loaded, loading modular pipeline system...')
        loadModularPipeline()
      } else {
        console.log('Waiting for THREE.js and GSAP...')
        setTimeout(waitForLibraries, 100)
      }
    }

    const loadModularPipeline = async () => {
      try {
        // Import and initialize the new modular 3D pipeline system
        const { initializePipeline } = await import('./3d/index.js');
        console.log('Modular pipeline system loaded successfully')
      } catch (error) {
        console.error('Failed to load modular pipeline system:', error)
        const overlay = document.getElementById('loadingOverlay')
        if (overlay) {
          overlay.textContent = 'Error: Failed to load 3D visualization'
        }
      }
    }

    // Start checking for libraries
    waitForLibraries()

    // Cleanup function
    return () => {
      // The modular system handles its own cleanup through dispose methods
      if (window.PipelineVisualization?.dispose) {
        window.PipelineVisualization.dispose()
      }
    }
  }, [])

  return (
    <div className="container">
      <div className="header">
        <h1>🤖 AutomatedBots Pipeline Analyzer</h1>
        <p>Find Your Business Bottlenecks & Automate Your Growth</p>
        
        <div className="industry-selector">
          <label htmlFor="industrySelect">Industry:</label>
          <select id="industrySelect" className="industry-dropdown" onChange={(e) => window.updateIndustry && window.updateIndustry(e.target.value)}>
            <option value="coaching">Coaching Business</option>
            <option value="consulting" disabled>Consulting (Coming Soon)</option>
            <option value="ecommerce" disabled>E-commerce (Coming Soon)</option>
            <option value="saas" disabled>SaaS (Coming Soon)</option>
          </select>
        </div>
      </div>

      <div className="tabs">
        <div className="tab active" onClick={() => window.selectProcessTab && window.selectProcessTab('overview')}>Overview</div>
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('leadGen')}>Marketing</div>
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('qualification')}>Sales</div>
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('onboarding')}>Onboarding</div>
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('delivery')}>Fulfillment</div>
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('retention')}>Retention</div>
      </div>

      <div className="controls">
        <button className="control-btn" onClick={() => window.resetCamera && window.resetCamera()}>🏠 Overview</button>
      </div>

      <div className="pipeline-container">
        <div id="loadingOverlay" className="loading-overlay">
          🚀 Initializing 3D Pipeline...
        </div>
        <canvas id="pipelineCanvas"></canvas>

        <div className="capacity-controls">
          <div className="slider-group">
            <label>Marketing Leads/month:</label>
            <span id="leadGenValue">120</span>
            <input type="range" className="slider" min="50" max="300" defaultValue="120" onChange={(e) => window.updateStage && window.updateStage('leadGen', e.target.value)} />
          </div>

          <div className="slider-group">
            <label>Sales Calls/month:</label>
            <span id="qualificationValue">45</span>
            <input type="range" className="slider" min="20" max="100" defaultValue="45" onChange={(e) => window.updateStage && window.updateStage('qualification', e.target.value)} />
          </div>

          <div className="slider-group">
            <label>Onboarding Capacity/month:</label>
            <span id="onboardingValue">25</span>
            <input type="range" className="slider" min="10" max="80" defaultValue="25" onChange={(e) => window.updateStage && window.updateStage('onboarding', e.target.value)} />
          </div>

          <div className="slider-group">
            <label>Service Delivery/month:</label>
            <span id="deliveryValue">60</span>
            <input type="range" className="slider" min="30" max="120" defaultValue="60" onChange={(e) => window.updateStage && window.updateStage('delivery', e.target.value)} />
          </div>

          <div className="slider-group">
            <label>Retention Support/month:</label>
            <span id="retentionValue">35</span>
            <input type="range" className="slider" min="20" max="100" defaultValue="35" onChange={(e) => window.updateStage && window.updateStage('retention', e.target.value)} />
          </div>
        </div>

        <div className="simulation-controls">
          <button className="play-button" onClick={() => window.toggleSimulation && window.toggleSimulation()}>▶</button>
          <div className="scenario-toggle">
            <button className="toggle-btn active" onClick={() => window.switchScenario && window.switchScenario('current')}>Current State</button>
            <button className="toggle-btn" onClick={() => window.switchScenario && window.switchScenario('optimized')}>After Automation</button>
          </div>
        </div>
      </div>

      <div id="processAnalysis" className="analysis-section">
        <h3>Process Analysis</h3>
        <div id="analysisContent">
          <p>Welcome to the AutomatedBots Pipeline Analyzer! This interactive tool helps you visualize your coaching business processes and identify automation opportunities.</p>
          
          <h4>🎯 How It Works:</h4>
          <ul>
            <li><strong>Adjust Sliders:</strong> Set your current monthly capacities for each stage</li>
            <li><strong>Explore Sections:</strong> Click the tabs above to dive into specific areas</li>
            <li><strong>Identify Bottlenecks:</strong> Watch for red sections indicating constraints</li>
            <li><strong>See Improvements:</strong> Toggle between Current State and After Automation</li>
          </ul>
          
          <h4>🚀 Get Started:</h4>
          <p>Click on any process tab (Marketing, Sales, Onboarding, Fulfillment, Retention) to see specific automation recommendations for that area.</p>
        </div>
      </div>

      <div className="lead-capture">
        <h3>Ready to Automate Your Pipeline?</h3>
        <p>Get a personalized automation strategy for your coaching business</p>
        
        <form id="leadForm" className="lead-form">
          <div className="form-row">
            <input type="text" id="name" placeholder="Your Name" required />
            <input type="text" id="company" placeholder="Company Name" required />
          </div>
          
          <div className="form-row">
            <input type="email" id="email" placeholder="Email Address" required />
            <select id="challenge" required>
              <option value="">What's your biggest challenge?</option>
              <option value="lead-generation">Not enough leads</option>
              <option value="sales-conversion">Poor sales conversion</option>
              <option value="client-onboarding">Slow client onboarding</option>
              <option value="service-delivery">Inefficient service delivery</option>
              <option value="client-retention">Client retention issues</option>
              <option value="scaling">Scaling the business</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <button 
            type="button" 
            onClick={() => window.submitLeadForm && window.submitLeadForm()}
            style={{
              background: 'linear-gradient(45deg, #1E3A8A, #374151)', 
              color: 'white', 
              border: 'none', 
              padding: '15px 30px', 
              borderRadius: '25px', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              marginTop: '20px', 
              cursor: 'pointer', 
              width: '100%'
            }}
          >
            Get My Automation Strategy
          </button>
        </form>
      </div>
    </div>
  )
}

export default App 