import { useEffect } from 'react'
import './EmbedApp.css'

function EmbedApp() {
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
          console.log('CSS loaded and layout ready, initializing embed pipeline...')
          // Small additional delay to ensure all styles are fully applied
          setTimeout(loadEmbedPipeline, 50)
        } else {
          console.log('Waiting for CSS layout...')
          setTimeout(checkLayoutReady, 50)
        }
      }
      checkLayoutReady()
    }

    const loadEmbedPipeline = async () => {
      try {
        // Import and initialize the embed-specific 3D pipeline system
        const { initializeEmbedPipeline } = await import('./3d/embedIndex.js');
        console.log('Embed pipeline system loaded successfully')
      } catch (error) {
        console.error('Failed to load embed pipeline system:', error)
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
      {/* Hidden elements required by 3D pipeline system but not used in embed */}
      <div style={{ display: 'none' }}>
        <div id="processAnalysis">
          <div id="analysisContent"></div>
        </div>
        <form id="leadForm">
          <input type="text" id="name" />
          <input type="email" id="email" />
          <input type="text" id="company" />
          <input type="tel" id="phone" />
          <input type="text" id="industry" />
          <select id="companySize"><option></option></select>
          <select id="challenge"><option></option></select>
          <button type="button" id="submitBtn"></button>
          <div id="formStatus"></div>
        </form>
        <select id="industrySelect"><option value="coaching">Coaching</option></select>
        <div id="bottleneckAlert"></div>
        <div id="revenueDisplay"></div>
        <div id="efficiency"></div>
        <div id="bottleneckImpact"></div>
      </div>

      <div className="tabs">
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('leadGen')}>Marketing</div>
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('qualification')}>Sales</div>
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('onboarding')}>Onboarding</div>
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('delivery')}>Fulfillment</div>
        <div className="tab" onClick={() => window.selectProcessTab && window.selectProcessTab('retention')}>Retention</div>
        <div className="tab tab-overview" onClick={() => window.selectProcessTab && window.selectProcessTab('overview')}>Overview</div>
      </div>

      <div className="pipeline-container">
        <div id="loadingOverlay" className="loading-overlay">
          🚀 Initializing 3D Pipeline...
        </div>

        {/* Educational Text Overlays - Only show on Overview */}
        <div id="educationalTopOverlay" className="educational-overlay top-overlay hidden">
          <div className="educational-content">
            <span className="educational-text">
              Our AI automation portfolio combines productized solutions and custom development to expand capacity in each critical business process. <strong>Click any area to explore our services that eliminate bottlenecks and scale revenue.</strong>
            </span>
          </div>
        </div>

        <canvas id="pipelineCanvas"></canvas>

        <div id="educationalBottomOverlay" className="educational-overlay bottom-overlay hidden">
          <div className="educational-content">
            <div className="educational-cta">
              <strong>Explore each process area above, then discover your actual bottleneck with our proven assessment. We'll show you the exact automation solution to break through it.</strong> <a href="/" style={{color: '#1E3A8A', textDecoration: 'underline', fontWeight: 'bold'}}>Find Your Constraint →</a>
            </div>
          </div>
        </div>
      </div>

      <div id="processAnalysis" className="analysis-section">
        <div id="analysisContent"></div>
      </div>
    </div>
  )
}

export default EmbedApp 