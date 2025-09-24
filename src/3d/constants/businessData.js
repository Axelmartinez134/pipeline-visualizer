/**
 * Business Data Configuration
 * Default values and constants for coaching business pipeline
 */

// Coaching/Consulting Industry Realistic Defaults
export const DEFAULT_BUSINESS_DATA = {
  leadGen: 60,         // leads/month - display 50, internal 60
  qualification: 50,   // qualified prospects/month - display 40, internal 50
  onboarding: 40,      // new clients/month - display 30, internal 40
  delivery: 30,        // client capacity/month - display 20, internal 30
  retention: 30        // retained clients/month - display 20, internal 30
};

// Stage configuration
export const STAGE_CONFIG = {
  STAGES: ['leadGen', 'qualification', 'onboarding', 'delivery', 'retention'],
  STAGE_POSITIONS: [-6, -3, 0, 3, 6],
  STAGE_NAMES: {
    leadGen: 'Lead Generation',
    qualification: 'Qualification', 
    onboarding: 'Onboarding',
    delivery: 'Service Delivery',
    retention: 'Client Retention'
  }
};

// Pipeline visual configuration
export const PIPELINE_CONFIG = {
  MAX_POSSIBLE_CAPACITY: 110, // Based on slider max values (100 display + 10 conversion)
  MIN_POSSIBLE_CAPACITY: 10,  // Based on slider min values
  MIN_RADIUS: 0.4,           // Minimum pipe radius
  MAX_RADIUS: 1.2,           // Maximum pipe radius
  PIPE_HEIGHT: 2,            // Pipe cylinder height
  PIPE_SEGMENTS: 16,         // Pipe geometry segments
  CONNECTOR_RADIUS: 0.2,     // Connector pipe radius
  CONNECTOR_LENGTH: 1.5      // Connector pipe length
};

// Business metrics
export const BUSINESS_METRICS = {
  CLIENT_VALUE_ANNUAL: 3000, // Typical coaching client value per year
  REVENUE_MULTIPLIER: 3000   // For ARR calculations
}; 