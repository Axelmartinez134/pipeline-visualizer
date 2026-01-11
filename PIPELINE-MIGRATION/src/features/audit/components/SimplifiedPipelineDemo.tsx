import React, { useState, useEffect } from 'react';
import PipelineVisualizer from '../../../features/visualizer/PipelineVisualizer';
import { VisualizerProvider, useVisualizer } from '../contexts/VisualizerContext';
import EducationalOverlays from './EducationalOverlays';
import { DeviceDetection } from '../3d/utils/deviceDetection';

/**
 * SimplifiedPipelineDemo
 * 
 * Simplified version of the full pipeline visualizer for the /audit page.
 * 
 * Features:
 * - Camera locked at overview (never moves)
 * - No tabs, sliders, or simulation controls
 * - Just 2 buttons: "Current State" and "See After Automation"
 * - 3-click optimization sequence (pill fills progressively)
 * - Bottom educational overlay shows bottleneck priorities
 * - Calendly button at bottom
 * 
 * Removed:
 * - Tab navigation
 * - Capacity sliders
 * - Simulation play/pause
 * - Zoom controls
 * - Top educational overlay
 * - Process analysis panel
 * - Lead form
 * - Thought bubbles (process-specific suggestions)
 * - Water flow animations
 */
export default function SimplifiedPipelineDemo() {
  return (
    <VisualizerProvider>
      <SimplifiedPipelineDemoInner />
    </VisualizerProvider>
  );
}

function SimplifiedPipelineDemoInner() {
  const [isMobile, setIsMobile] = useState(() => {
    try { return DeviceDetection.isMobile(); } catch { return false; }
  });

  useEffect(() => {
    // Wait for THREE.js and GSAP to be available
    const waitForLibraries = () => {
      if (typeof window.THREE !== 'undefined' && typeof window.gsap !== 'undefined') {
        console.log('[Audit] Libraries loaded, waiting for CSS...');
        waitForCSSAndLayout();
      } else {
        console.log('[Audit] Waiting for THREE.js and GSAP...');
        setTimeout(waitForLibraries, 100);
      }
    };

    const waitForCSSAndLayout = () => {
      const checkLayoutReady = () => {
        const container = document.querySelector('.pipeline-container');
        if (container && container.clientWidth > 0) {
          console.log('[Audit] CSS loaded and layout ready, initializing pipeline...');
          setTimeout(loadModularPipeline, 50);
        } else {
          console.log('[Audit] Waiting for CSS layout...');
          setTimeout(checkLayoutReady, 50);
        }
      };
      checkLayoutReady();
    };

    const loadModularPipeline = async () => {
      try {
        // Import and initialize the audit-specific 3D pipeline
        const { initializePipeline } = await import('../3d/index');
        console.log('[Audit] Modular pipeline system loaded successfully');
      } catch (error) {
        console.error('[Audit] Failed to load modular pipeline system:', error);
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
          overlay.textContent = 'Error: Failed to load 3D visualization';
        }
      }
    };

    waitForLibraries();

    return () => {
      if (window.PipelineVisualization?.dispose) {
        window.PipelineVisualization.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      try { setIsMobile(DeviceDetection.isMobile()); } catch {}
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return (
    <div className="simplified-pipeline-demo">
      <PipelineVisualizer variant="main">
        {/* Educational overlays (bottom overlay only) */}
        <EducationalOverlays />
        
        {/* Scenario toggle buttons - mobile and desktop */}
        {isMobile ? <MobileScenarioSwitcher /> : <DesktopScenarioButtons />}
      </PipelineVisualizer>

      {/* Calendly booking button */}
      <div className="calendly-section">
        <button
          className="calendly-btn"
          onClick={() => {
            // @ts-ignore - Calendly is loaded via script tag in index.html
            if (typeof window.Calendly !== 'undefined') {
              // @ts-ignore
              window.Calendly.initPopupWidget({
                url: 'https://calendly.com/YOUR_USERNAME/30min'
              });
            } else {
              console.warn('Calendly script not loaded');
              alert('Booking system is loading, please try again in a moment.');
            }
          }}
        >
          Schedule Free Consultation
        </button>
      </div>
    </div>
  );
}

/**
 * Desktop Scenario Buttons
 * Two buttons below the pipeline: "Current State" and "See After Automation"
 */
function DesktopScenarioButtons() {
  const v = useVisualizer();
  const [scenario, setScenario] = useState('current');
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onScenario = (e: any) => {
      setScenario(e.detail?.scenario || 'current');
      if (typeof e.detail?.stepCount === 'number') setStep(Math.min(3, e.detail.stepCount));
    };
    const onStep = (e: any) => setStep(Math.min(3, e.detail?.step || 0));
    window.addEventListener('scenario:changed', onScenario);
    window.addEventListener('optimization:step', onStep);
    return () => {
      window.removeEventListener('scenario:changed', onScenario);
      window.removeEventListener('optimization:step', onStep);
    };
  }, []);

  const isOptimized = scenario === 'optimized';
  const pillProgress = isOptimized ? step / 3 : 0;
  const afterLabel = isOptimized 
    ? (step < 3 ? 'Apply Next Automation' : 'Optimization complete') 
    : 'See After Automation';

  return (
    <div className="desktop-scenario-buttons">
      <button
        className={`toggle-btn ${!isOptimized ? 'active' : ''}`}
        data-scenario="current"
        onClick={() => v.switchScenario('current')}
      >
        Current State
      </button>
      <button
        className={`toggle-btn pill-progress ${isOptimized ? 'active' : ''}`}
        style={{ ['--pill-progress' as any]: pillProgress }}
        data-scenario="optimized"
        onClick={() => v.switchScenario('optimized')}
      >
        <span className="pill-label">{afterLabel}</span>
      </button>
    </div>
  );
}

/**
 * Mobile Scenario Switcher
 * Same buttons but styled for mobile display
 */
function MobileScenarioSwitcher() {
  const v = useVisualizer();
  const [active, setActive] = useState('current');
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onScenario = (e: any) => {
      setActive(e.detail?.scenario || 'current');
      if (typeof e.detail?.stepCount === 'number') setStep(Math.min(3, e.detail.stepCount));
    };
    const onStep = (e: any) => setStep(Math.min(3, e.detail?.step || 0));
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
          style={{ ['--pill-progress' as any]: (active === 'optimized' ? step / 3 : 0) }}
          data-scenario="optimized"
          onClick={() => { setActive('optimized'); v.switchScenario('optimized'); }}
        >
          <span className="pill-label">
            {active === 'optimized' 
              ? (step < 3 ? 'Apply Next Automation' : 'Optimization complete') 
              : 'See After Automation'}
          </span>
        </button>
      </div>
    </div>
  );
}
