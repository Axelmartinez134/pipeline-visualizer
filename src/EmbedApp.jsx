import { useEffect } from 'react'
import './EmbedApp.css'
import PipelineVisualizer from './features/visualizer/PipelineVisualizer.tsx'
import { VisualizerProvider, useVisualizer } from './features/visualizer/VisualizerContext.tsx'

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
    <VisualizerProvider>
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
        <TabsRow />
      </div>

      <PipelineVisualizer variant="embed" />

      <div id="processAnalysis" className="analysis-section">
        <div id="analysisContent"></div>
      </div>
    </div>
    </VisualizerProvider>
  )
}

export default EmbedApp 

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