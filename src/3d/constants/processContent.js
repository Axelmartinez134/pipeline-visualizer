/**
 * Process Content Configuration
 * Thought bubble content and automation descriptions
 */

// Thought bubble content for each process
export const THOUGHT_BUBBLE_CONTENT = {
  leadGen: {
    title: "🎯 Marketing: Predictable leads, not lucky spikes. Capture, enrich, and route automatically.",
    previews: [
      { icon: "⚙️", text: "Capture → Enrich → Route" },
      { icon: "📧", text: "Behavior‑based nurture" },
      { icon: "🤖", text: "Lead scoring & de‑dupe" }
    ]
  },
  qualification: {
    title: "📞 Sales: Frictionless conversions, fewer drop‑offs. Auto‑qualify, schedule, and follow up.",
    previews: [
      { icon: "💬", text: "AI pre‑qualification" },
      { icon: "📅", text: "Auto‑booking + reminders" },
      { icon: "🔁", text: "Smart follow‑ups" }
    ]
  },
  onboarding: {
    title: "🚀 Onboarding: Day‑1 starts, not week‑2 waits. Kickoff, docs, and access in minutes.",
    previews: [
      { icon: "📝", text: "Intake & e‑signature" },
      { icon: "📂", text: "Docs & access setup" },
      { icon: "⏱️", text: "Go‑live faster" }
    ]
  },
  delivery: {
    title: "⚙️ Fulfillment: Reliable delivery at demand. Assign, track, and unblock work on time.",
    previews: [
      { icon: "🧭", text: "Auto‑assign & SLA cues" },
      { icon: "📊", text: "Progress & blockers" },
      { icon: "🔔", text: "On‑time nudges" }
    ]
  },
  retention: {
    title: "🔁 Retention: Longer LTV, calmer ops. Health checks, save plays, and renewals on cue.",
    previews: [
      { icon: "❤️", text: "Health scoring & alerts" },
      { icon: "🛟", text: "Save plays & offers" },
      { icon: "📈", text: "Renewals & expansions" }
    ]
  }
};

// Process-specific automation data
export const PROCESS_AUTOMATIONS = {
  overview: {
    title: "Business Process Overview",
    description: "Click any process above to zoom into specific automation opportunities",
    automations: [
      {
        title: "Automated Client Onboarding System",
        description: "Replace manual intake with AI-powered onboarding flows. Typical coaching businesses see 3x capacity increase.",
        impact: "+200% Capacity → $150K Revenue",
        priority: true
      },
      {
        title: "Lead Scoring & Qualification Bot", 
        description: "AI chatbot qualifies prospects automatically. Coaching businesses reduce unqualified calls by 60%.",
        impact: "+50% Qualified Leads → $45K Revenue",
        priority: false
      },
      {
        title: "Client Success & Retention Automation",
        description: "Automated check-ins, progress tracking, and renewal campaigns. Industry benchmark: 35% retention improvement.",
        impact: "+35% Retention → $36K Revenue", 
        priority: false
      }
    ]
  },
  leadGen: {
    title: "Marketing Process Analysis",
    description: "Your marketing generates good lead volume. Consider optimizing after fixing your onboarding bottleneck.",
    status: "optimization",
    statusText: "⚡ OPTIMIZATION OPPORTUNITY",
    capacity: 120,
    unit: "leads/month",
    automations: [
      {
        title: "Lead Magnet Automation System",
        description: "Automated lead magnet delivery, email sequences, and lead scoring integration.",
        impact: "40% more qualified leads",
        priority: false
      },
      {
        title: "Social Media Content Scheduler",
        description: "AI-powered content creation and scheduling across all platforms with engagement tracking.",
        impact: "Save 10 hours/week",
        priority: false
      },
      {
        title: "Email Nurture Sequences",
        description: "Automated email campaigns based on lead behavior and engagement patterns.",
        impact: "25% increase in conversion",
        priority: false
      }
    ]
  },
  qualification: {
    title: "Sales Process Analysis", 
    description: "Your qualification process is performing well but could be optimized for efficiency.",
    status: "secondary",
    statusText: "📞 SECONDARY OPTIMIZATION",
    capacity: 45,
    unit: "qualified prospects/month",
    automations: [
      {
        title: "Lead Qualification Chatbot",
        description: "AI chatbot pre-qualifies leads before they book discovery calls, saving you time.",
        impact: "60% fewer unqualified calls",
        priority: false
      },
      {
        title: "Automated Follow-up Sequences",
        description: "Smart follow-up campaigns for prospects who don't book initially.",
        impact: "30% more bookings",
        priority: false
      },
      {
        title: "Discovery Call Booking System",
        description: "Automated calendar booking with pre-call questionnaires and reminder sequences.",
        impact: "Reduce no-shows by 40%",
        priority: false
      }
    ]
  },
  onboarding: {
    title: "Onboarding Process Analysis",
    description: "BOTTLENECK DETECTED! Your onboarding can only handle 25 clients/month. This is limiting your entire business to $75K ARR.",
    status: "bottleneck", 
    statusText: "🚨 CRITICAL CONSTRAINT - Start Here!",
    capacity: 25,
    unit: "new clients/month",
    automations: [
      {
        title: "Automated Client Intake System",
        description: "Complete intake automation including forms, document collection, and initial setup. This is your highest ROI opportunity.",
        impact: "3x capacity increase → $150K+ ARR",
        priority: true
      },
      {
        title: "Document Collection Workflow",
        description: "Automated document requests, reminders, and organization system.",
        impact: "Save 5 hours per client",
        priority: true
      },
      {
        title: "Welcome Sequence Automation",
        description: "Automated welcome emails, expectation setting, and first session scheduling.",
        impact: "Reduce onboarding time by 70%",
        priority: true
      }
    ]
  },
  delivery: {
    title: "Service Delivery Analysis",
    description: "Your delivery capacity is strong. Focus on onboarding optimization first for maximum impact.",
    status: "optimization",
    statusText: "⚡ GOOD CAPACITY",
    capacity: 60,
    unit: "client capacity/month",
    automations: [
      {
        title: "Session Scheduling Automation", 
        description: "Smart scheduling system with automatic reminders and rescheduling capabilities.",
        impact: "Reduce scheduling time by 80%",
        priority: false
      },
      {
        title: "Progress Tracking System",
        description: "Automated client progress tracking with milestone alerts and reporting.",
        impact: "Better client outcomes",
        priority: false
      },
      {
        title: "Resource Delivery Automation",
        description: "Automated delivery of coaching resources, worksheets, and action items.",
        impact: "Save 3 hours/week",
        priority: false
      }
    ]
  },
  retention: {
    title: "Client Retention Analysis",
    description: "Your retention needs improvement. Address after fixing the onboarding bottleneck.",
    status: "secondary",
    statusText: "📈 NEEDS IMPROVEMENT",
    capacity: 35,
    unit: "retained clients/month", 
    automations: [
      {
        title: "Client Success Automation",
        description: "Automated check-ins, progress celebrations, and early warning system for at-risk clients.",
        impact: "35% retention improvement",
        priority: false
      },
      {
        title: "Renewal Campaign System",
        description: "Automated renewal reminders, success showcases, and upgrade offers.",
        impact: "25% more renewals",
        priority: false
      },
      {
        title: "Feedback Collection Automation",
        description: "Automated feedback requests, testimonial collection, and satisfaction tracking.",
        impact: "Improve service quality",
        priority: false
      }
    ]
  }
}; 