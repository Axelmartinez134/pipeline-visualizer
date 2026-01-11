/**
 * Educational Overlays Component
 * These overlays show bottleneck identification and educational content
 */

import React from 'react';
import './EducationalOverlays.css';

const EducationalOverlays = () => {
  return (
    <>
      {/* Top Educational Overlay - Will be hidden in simplified demo */}
      <div 
        id="educationalTopOverlay" 
        className="educational-overlay top-overlay hidden"
      >
        <div className="educational-content">
          <span className="educational-text"></span>
        </div>
      </div>

      {/* Bottom Educational Overlay - Shows bottleneck priority list */}
      <div 
        id="educationalBottomOverlay" 
        className="educational-overlay bottom-overlay"
      >
        <div className="educational-content">
          <span className="constraint-indicator"></span>
          <span className="educational-text"></span>
        </div>
      </div>
    </>
  );
};

export default EducationalOverlays;


