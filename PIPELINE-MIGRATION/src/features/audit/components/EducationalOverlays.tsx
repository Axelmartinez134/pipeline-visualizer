import React from 'react';
import '../styles/educational-overlays.css';

/**
 * EducationalOverlays
 * 
 * HTML structure for the educational overlays that appear on the pipeline.
 * These are managed by the OverlayManager in the 3D system.
 * 
 * Two overlays:
 * 1. Top Overlay - Hidden in simplified demo (was "Theory of Constraints")
 * 2. Bottom Overlay - Shows bottleneck priorities and "Get My Automation Strategy" button
 * 
 * The bottom overlay dynamically updates based on which stage is the bottleneck.
 * It includes a pointer (triangle) that points to the bottleneck stage on the pipeline.
 */
export default function EducationalOverlays() {
  return (
    <>
      {/* Top Overlay - Hidden in audit demo */}
      <div id="educationalTopOverlay" className="educational-overlay top-overlay hidden">
        <div className="educational-content">
          <span className="educational-text">
            This is <strong>Theory of Constraints</strong> applied to your business
          </span>
        </div>
      </div>

      {/* Roadmap Overlay - Shows in optimized mode */}
      <div id="roadmapOverlay" className="educational-overlay top-overlay hidden">
        <div className="educational-content">
          <div id="roadmapTitle" className="roadmap-title">
            Your Highest‑Priority Bottlenecks
          </div>
          <div id="roadmapRows" className="roadmap-rows">
            <div id="roadmapRow1" className="roadmap-row">1. Fulfillment</div>
            <div id="roadmapRow2" className="roadmap-row">2. Onboarding</div>
            <div id="roadmapRow3" className="roadmap-row">3. Sales</div>
          </div>
          <div id="roadmapCTA" className="roadmap-cta">
            <button id="roadmapCTAButton" className="cta-btn">
              Get My Automation Strategy
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Overlay - Shows bottleneck info */}
      <div id="educationalBottomOverlay" className="educational-overlay bottom-overlay">
        <div className="educational-content">
          <div id="constraintCapacitySmall" className="constraint-capacity-small"></div>
          <div id="constraintIndicator" className="constraint-indicator">
            👆 <strong id="constraintStageText">Onboarding</strong> is your Bottleneck limiting your current growth
          </div>
          <div id="constraintCTA" className="educational-cta">
            <strong>Click below to see automation solutions</strong>
          </div>
        </div>
      </div>
    </>
  );
}
