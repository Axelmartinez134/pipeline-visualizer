import { useEffect, useState, useRef } from 'react'
import './App.css'
import PipelineVisualizer from './features/visualizer/PipelineVisualizer.tsx'
import { VisualizerProvider, useVisualizer } from './features/visualizer/VisualizerContext.tsx'
import ProcessAnalysis from './features/visualizer/ProcessAnalysis.jsx'
import { DeviceDetection } from './3d/utils/deviceDetection.js'

function App() {
  const [isMobile, setIsMobile] = useState(() => {
    try { return DeviceDetection.isMobile(); } catch { return false; }
  })

  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const leadCaptureRef = useRef(null)

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

  // Track viewport changes to update mobile state
  useEffect(() => {
    const onResize = () => {
      try { setIsMobile(DeviceDetection.isMobile()); } catch {}
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    }
  }, [])

  // Observer for the sticky CTA
  useEffect(() => {
    if (!isMobile) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show the sticky CTA whenever the form is NOT visible (above or below viewport)
        setShowStickyCTA(!entry.isIntersecting)
      },
      {
        rootMargin: '0px',
        threshold: 0.01, // Trigger when element is barely visible/hidden
      }
    )

    const currentRef = leadCaptureRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [isMobile])

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

  // Glow the sticky CTA button when 3 optimizations have been applied
  useEffect(() => {
    const onStep = (e) => {
      const step = typeof e.detail?.step === 'number' ? e.detail.step : 0;
      if (step === 3) {
        const stickyBtn = document.getElementById('stickyCTAButton');
        if (stickyBtn) {
          stickyBtn.classList.add('tutorial-glow');
          setTimeout(() => stickyBtn.classList.remove('tutorial-glow'), 1700);
        }
      }
    };
    window.addEventListener('optimization:step', onStep);
    return () => window.removeEventListener('optimization:step', onStep);
  }, []);

  return (
    <VisualizerProvider>
    <div className="container">
      <div className="header">
        <h1>Find the Constraint That Caps Your Growth</h1>
        <p>A Theory‑of‑Constraints visualizer with AI‑informed automation roadmaps. Predictable, evidence‑based improvements—delivered within 24 hours after submission.</p>
      </div>

      <div className="tabs">
        <TabsRow />
      </div>

      <PipelineVisualizer>
        {isMobile ? <MobileScenarioSwitcher /> : null}
        {/* Pill carries progress; render-progress bar removed */}
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
          {!isMobile ? <PlayPause /> : null}
          
          {!isMobile ? (
            <div className="zoom-controls">
              <ZoomButtons />
            </div>
          ) : null}
          
          {!isMobile ? (
            <>
              <div className="scenario-toggle">
                <ScenarioToggle />
              </div>
              <AutoOptimizeControls />
            </>
          ) : null}
        </div>
      </PipelineVisualizer>

      <ProcessAnalysis selectedProcess="overview" />

      <div className="lead-capture" ref={leadCaptureRef}>
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

      <StickyCTA isVisible={showStickyCTA} />
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
      data-stage={stage}
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
  const [scenario, setScenario] = useState('current');
  const [step, setStep] = useState(0);
  useEffect(() => {
    const onScenario = (e) => {
      setScenario(e.detail?.scenario || 'current');
      if (typeof e.detail?.stepCount === 'number') setStep(Math.min(3, e.detail.stepCount));
    };
    const onStep = (e) => setStep(Math.min(3, e.detail?.step || 0));
    window.addEventListener('scenario:changed', onScenario);
    window.addEventListener('optimization:step', onStep);
    return () => {
      window.removeEventListener('scenario:changed', onScenario);
      window.removeEventListener('optimization:step', onStep);
    };
  }, []);
  const isOptimized = scenario === 'optimized';
  const pillProgress = isOptimized ? step / 3 : 0;
  const afterLabel = isOptimized ? (step < 3 ? 'Apply Next Automation' : 'Optimization complete') : 'See After Automation';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button className={`toggle-btn ${!isOptimized ? 'active' : ''}`} data-scenario="current" onClick={() => v.switchScenario('current')}>Current State</button>
      <button
        className={`toggle-btn pill-progress ${isOptimized ? 'active' : ''}`}
        style={{ ['--pill-progress']: pillProgress }}
        data-scenario="optimized"
        onClick={() => v.switchScenario('optimized')}
      >
        <span className="pill-label">{afterLabel}</span>
      </button>
    </div>
  )
}

function AutoOptimizeControls() {
  const v = useVisualizer();
  const [running, setRunning] = useState(false);
  const [scenario, setScenario] = useState('current');

  useEffect(() => {
    const onScenario = (e) => setScenario(e.detail?.scenario || 'current');
    const onState = (e) => setRunning(!!e.detail?.running);
    window.addEventListener('scenario:changed', onScenario);
    window.addEventListener('autoopt:state', onState);
    return () => {
      window.removeEventListener('scenario:changed', onScenario);
      window.removeEventListener('autoopt:state', onState);
    }
  }, []);

  const showButton = scenario === 'optimized';

  return (
    <div className="autoopt-controls">
      {showButton ? (
        <div className="autoopt-row">
          <button
            className="autoopt-btn"
            disabled={running}
            aria-pressed={running}
            onClick={() => v.startAutoOptimizeSequence && v.startAutoOptimizeSequence()}
          >
            Auto-Optimize (x3)
          </button>
          {running ? (
            <button className="autoopt-stop" onClick={() => v.stopAutoOptimizeSequence && v.stopAutoOptimizeSequence()}>Stop</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MobileScenarioSwitcher() {
  const v = useVisualizer();
  const [active, setActive] = useState('current');
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const onState = (e) => setRunning(!!e.detail?.running);
    window.addEventListener('autoopt:state', onState);
    return () => window.removeEventListener('autoopt:state', onState);
  }, []);
  useEffect(() => {
    const onScenario = (e) => {
      setActive(e.detail?.scenario || 'current');
      if (typeof e.detail?.stepCount === 'number') setStep(Math.min(3, e.detail.stepCount));
    };
    const onStep = (e) => setStep(Math.min(3, e.detail?.step || 0));
    window.addEventListener('scenario:changed', onScenario);
    window.addEventListener('optimization:step', onStep);
    return () => {
      window.removeEventListener('scenario:changed', onScenario);
      window.removeEventListener('optimization:step', onStep);
    };
  }, []);
  return (
    <div className="mobile-scenario-switcher">
      <div className="mobile-toggle-row">
        <button
          className={`toggle-btn ${active === 'current' ? 'active' : ''}`}
          data-scenario="current"
          onClick={() => { setActive('current'); v.switchScenario('current'); }}
        >
          Current State
        </button>
        <button
          className={`toggle-btn pill-progress ${active === 'optimized' ? 'active' : ''}`}
          style={{ ['--pill-progress']: (active === 'optimized' ? step / 3 : 0) }}
          data-scenario="optimized"
          onClick={() => { setActive('optimized'); v.switchScenario('optimized'); }}
        >
          <span className="pill-label">{active === 'optimized' ? (step < 3 ? 'Apply Next Automation' : 'Optimization complete') : 'See After Automation'}</span>
        </button>
      </div>
    </div>
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
      <div className="tab" onClick={() => v.selectProcess('overview')}>Overview</div>
    </>
  )
}

function StickyCTA({ isVisible }) {
  const scrollToForm = () => {
    const formElement = document.querySelector('.lead-capture');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className={`sticky-cta-bar ${isVisible ? 'visible' : ''}`}>
      <div className="sticky-cta-content">
        <h4>Ready to Remove Your Constraint?</h4>
        <button id="stickyCTAButton" onClick={scrollToForm}>
          Get My Automation Strategy
        </button>
      </div>
    </div>
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