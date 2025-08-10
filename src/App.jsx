import { useEffect, useState } from 'react'
import './App.css'
import PipelineVisualizer from './features/visualizer/PipelineVisualizer.tsx'
import { VisualizerProvider, useVisualizer } from './features/visualizer/VisualizerContext.tsx'
import ProcessAnalysis from './features/visualizer/ProcessAnalysis.jsx'

function App() {
  useEffect(() => {
    // Wait for THREE.js and GSAP to be available
    const waitForLibraries = () => {
      if (typeof window.THREE !== 'undefined' && typeof window.gsap !== 'undefined') {
        console.log('Libraries loaded, waiting for CSS to be ready...')
        waitForCSSAndLayout()
      } else {
        console.log('Waiting for THREE.js and GSAP...')
        setTimeout(waitForLibraries, 100)
      }
    }

    const waitForCSSAndLayout = () => {
      // Wait for CSS to be applied and container to have proper dimensions
      const checkLayoutReady = () => {
        const container = document.querySelector('.pipeline-container')
        if (container && container.clientWidth > 0) {
          console.log('CSS loaded and layout ready, initializing pipeline...')
          // Small additional delay to ensure all styles are fully applied
          setTimeout(loadModularPipeline, 50)
        } else {
          console.log('Waiting for CSS layout...')
          setTimeout(checkLayoutReady, 50)
        }
      }
      checkLayoutReady()
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

  // Debug and native fallback click listener for submit button
  useEffect(() => {
    const button = document.getElementById('submitBtn');
    if (!button) return;
    const onNativeClick = () => {
      console.log('[LeadForm] Native click detected');
    };
    button.addEventListener('click', onNativeClick);
    return () => button.removeEventListener('click', onNativeClick);
  }, []);

  return (
    <VisualizerProvider>
    <div className="container">
      <div className="header">
        <h1>🤖 AutomatedBots Pipeline Analyzer</h1>
        <p>Find Your Business Bottlenecks & Automate Your Growth</p>
        
        <div className="industry-selector">
          <label htmlFor="industrySelect">Industry:</label>
          <IndustrySelect />
        </div>
      </div>

      <div className="tabs">
        <TabsRow />
      </div>

      <PipelineVisualizer>
        <div className="capacity-controls">
          <div className="slider-group">
            <div className="slider-header">
              <label>Marketing Leads/month:</label>
              <span id="leadGenValue" className="slider-value">80</span>
            </div>
            <StageSlider stage="leadGen" defaultValue={80} />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Sales Calls/month:</label>
              <span id="qualificationValue" className="slider-value">35</span>
            </div>
            <StageSlider stage="qualification" defaultValue={35} />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Onboarding Capacity/month:</label>
              <span id="onboardingValue" className="slider-value">15</span>
            </div>
            <StageSlider stage="onboarding" defaultValue={15} />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Service Delivery/month:</label>
              <span id="deliveryValue" className="slider-value">50</span>
            </div>
            <StageSlider stage="delivery" defaultValue={50} />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Retention Support/month:</label>
              <span id="retentionValue" className="slider-value">25</span>
            </div>
            <StageSlider stage="retention" defaultValue={25} />
          </div>
        </div>
        <div className="simulation-controls">
          <PlayPause />
          
          <div className="zoom-controls">
            <ZoomButtons />
          </div>
          
          <div className="scenario-toggle">
            <ScenarioToggle />
          </div>
        </div>
      </PipelineVisualizer>

      <ProcessAnalysis selectedProcess="overview" />

      <div className="lead-capture">
        <h3>Ready to Automate Your Pipeline?</h3>
        <p>Get a personalized automation strategy for your coaching business</p>
        
        <form id="leadForm" className="lead-form">
          <div className="form-row">
            <input type="text" id="name" placeholder="Your Full Name" required />
            <input type="text" id="company" placeholder="Your Company Name" required />
          </div>
          
          <div className="form-row">
            <input type="email" id="email" placeholder="Your Business Email" required />
            <input type="tel" id="phone" placeholder="Phone (Optional - for strategy calls)" />
          </div>

          <div className="form-row">
            <input type="text" id="industry" placeholder="Your Industry (e.g., Life Coaching, Marketing Agency, etc.)" required />
            <select id="companySize" required>
              <option value="">How many employees?</option>
              <option value="solo">Just me (Solo)</option>
              <option value="2-10">2-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="200+">200+ employees</option>
            </select>
          </div>
          
          <div className="form-row">
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
          
          <div id="formStatus"></div>
          
          <SubmitButton />
        </form>
      </div>
    </div>
    </VisualizerProvider>
  )
}

export default App 

function StageSlider({ stage, defaultValue }) {
  const v = useVisualizer();
  return (
    <input 
      type="range" className="slider" min="0" max="100" defaultValue={defaultValue}
      onChange={(e) => v.updateStage(stage, parseInt(e.target.value) + 10)}
    />
  );
}

function PlayPause() {
  const v = useVisualizer();
  return (
    <button className="play-button" onClick={() => v.toggleSimulation()}>▶</button>
  )
}

function ZoomButtons() {
  const v = useVisualizer();
  return (
    <>
      <button className="zoom-btn" onClick={() => v.zoomOut()} title="Zoom Out">🔍-</button>
      <button className="zoom-btn" onClick={() => v.resetZoom()} title="Reset Zoom">⌂</button>
      <button className="zoom-btn" onClick={() => v.zoomIn()} title="Zoom In">🔍+</button>
    </>
  )
}

function ScenarioToggle() {
  const v = useVisualizer();
  return (
    <>
      <button className="toggle-btn active" onClick={() => v.switchScenario('current')}>Current State</button>
      <button className="toggle-btn" onClick={() => v.switchScenario('optimized')}>After Automation</button>
    </>
  )
}

function IndustrySelect() {
  const v = useVisualizer();
  return (
    <select id="industrySelect" className="industry-dropdown" onChange={(e) => v.updateIndustry(e.target.value)}>
      <option value="coaching">Coaching Business</option>
      <option value="consulting" disabled>Consulting (Coming Soon)</option>
      <option value="ecommerce" disabled>E-commerce (Coming Soon)</option>
      <option value="saas" disabled>SaaS (Coming Soon)</option>
    </select>
  )
}

function TabsRow() {
  const v = useVisualizer();
  return (
    <>
      <div className="tab" onClick={() => v.selectProcess('leadGen')}>Marketing</div>
      <div className="tab" onClick={() => v.selectProcess('qualification')}>Sales</div>
      <div className="tab" onClick={() => v.selectProcess('onboarding')}>Onboarding</div>
      <div className="tab" onClick={() => v.selectProcess('delivery')}>Fulfillment</div>
      <div className="tab" onClick={() => v.selectProcess('retention')}>Retention</div>
      <div className="tab tab-overview" onClick={() => v.selectProcess('overview')}>Overview</div>
    </>
  )
}

function SubmitButton() {
  const v = useVisualizer();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  return (
    <button 
      type="button" 
      id="submitBtn"
      onClick={async () => {
        console.log('[LeadForm] React onClick fired');
        try {
          setIsSubmitting(true);
          setStatus(null);
          await v.submitLeadForm();
          setStatus('success');
        } catch (e) {
          setStatus('error');
        } finally {
          setIsSubmitting(false);
        }
      }}
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
        width: '100%',
        transition: 'all 0.3s ease',
        opacity: isSubmitting ? 0.7 : 1
      }}
      disabled={isSubmitting}
    >
      {isSubmitting ? '⏳ Submitting...' : 'Get My Automation Strategy'}
    </button>
  );
}