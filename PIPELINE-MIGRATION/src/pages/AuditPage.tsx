import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SimplifiedPipelineDemo from '../features/audit/components/SimplifiedPipelineDemo';
import '../features/audit/styles/audit.css';

/**
 * AuditPage - Simplified pipeline visualizer demo page
 * 
 * This page integrates the pipeline visualizer into the automatedbots.com site
 * at the /audit route. It shows a simplified 3-click automation demo with
 * educational overlays and a Calendly booking button.
 * 
 * User Flow:
 * 1. User visits /audit
 * 2. Sees 3D pipeline locked at overview
 * 3. Clicks "See After Automation" (3 times total)
 * 4. Pipes grow progressively with each click
 * 5. Sees bottleneck priorities in bottom overlay
 * 6. Clicks "Schedule Free Consultation" to book call
 */
export default function AuditPage() {
  return (
    <div className="audit-page">
      <Header />
      
      <main className="audit-main">
        <SimplifiedPipelineDemo />
      </main>
      
      <Footer />
    </div>
  );
}
