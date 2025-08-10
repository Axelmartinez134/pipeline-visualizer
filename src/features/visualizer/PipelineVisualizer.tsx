import React, { useEffect } from 'react';
// Ensure ESM libs are loaded and attached to window for legacy modules
import '../../esmSetup.js';

type Variant = 'main' | 'embed';

export type PipelineVisualizerProps = {
  variant?: Variant;
  initialData?: Record<string, number>;
  onReady?: () => void;
  onDispose?: () => void;
  children?: React.ReactNode;
};

// Thin wrapper that mounts current modular system and disposes on unmount
export default function PipelineVisualizer({ variant = 'main', onReady, onDispose, children }: PipelineVisualizerProps) {
  useEffect(() => {
    let dispose: (() => void) | null = null;

    async function init() {
      try {
        if (variant === 'embed') {
          const mod = await import('../../3d/embedIndex.js');
          // embedIndex auto-initializes; keep a disposer
          dispose = mod.disposeEmbedPipeline;
        } else {
          const mod = await import('../../3d/index.js');
          // index auto-initializes; keep a disposer
          dispose = mod.disposePipeline;
        }
        onReady?.();
      } catch (e) {
        console.error('PipelineVisualizer init error', e);
      }
    }

    init();
    return () => {
      try {
        onDispose?.();
        dispose?.();
      } catch (e) {
        console.warn('PipelineVisualizer dispose error', e);
      }
    };
  }, [variant, onReady, onDispose]);

  return (
    <div className="pipeline-container">
      <div id="loadingOverlay" className="loading-overlay">🚀 Initializing 3D Pipeline...</div>
      <canvas id="pipelineCanvas" />
      {/* Overlays remain managed by legacy controller for now */}
      <div id="educationalTopOverlay" className="educational-overlay top-overlay hidden">
        <div className="educational-content">
          {variant === 'main' ? (
            <span className="educational-text">
              This is <strong>Theory of Constraints</strong> applied to your <strong id="businessTypeText">Coaching</strong> business
            </span>
          ) : (
            <span className="educational-text" />
          )}
        </div>
      </div>
      <div id="educationalBottomOverlay" className="educational-overlay bottom-overlay hidden">
        <div className="educational-content">
          {variant === 'main' ? (
            <>
              <div className="constraint-indicator">
                👆 <strong id="constraintStageText">Onboarding</strong> is your bottleneck limiting you to <strong id="constraintRevenueText">$75,000</strong> ARR
              </div>
              <div className="educational-cta">
                <strong>Click the tabs above to explore automation solutions</strong>
              </div>
            </>
          ) : (
            <div className="educational-cta">
              <strong>
                Explore each process area above, then discover your actual bottleneck with our proven assessment. We'll show you the exact automation solution to break through it.
              </strong>{' '}
              <a href="/" style={{ color: '#1E3A8A', textDecoration: 'underline', fontWeight: 'bold' }}>Find Your Constraint →</a>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}


