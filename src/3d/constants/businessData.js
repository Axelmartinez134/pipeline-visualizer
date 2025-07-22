/**
 * Business Data Configuration
 * Default values and constants for coaching business pipeline
 */

// Coaching/Consulting Industry Realistic Defaults
export const DEFAULT_BUSINESS_DATA = {
  leadGen: 120,        // leads/month - typical coaching business
  qualification: 45,   // qualified prospects/month - 38% qualification rate
  onboarding: 25,      // new clients/month - typical bottleneck
  delivery: 60,        // client capacity/month
  retention: 35        // retained clients/month
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
  MAX_POSSIBLE_CAPACITY: 300, // Based on slider max values
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