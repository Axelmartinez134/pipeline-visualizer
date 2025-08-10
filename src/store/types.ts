export type ProcessId = 'overview' | 'leadGen' | 'qualification' | 'onboarding' | 'delivery' | 'retention';

export type BusinessData = {
  leadGen: number;
  qualification: number;
  onboarding: number;
  delivery: number;
  retention: number;
};

export type Scenario = 'current' | 'optimized';


