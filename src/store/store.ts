import { BusinessData, ProcessId, Scenario } from './types';

export type PipelineState = {
  businessData: BusinessData;
  selectedProcess: ProcessId;
  scenario: Scenario;
};

export type PipelineActions = {
  selectProcess: (p: ProcessId) => void;
  updateStage: (stage: keyof BusinessData, value: number) => void;
  switchScenario: (s: Scenario) => void;
};

// Minimal in-memory store; replace later with Context/Zustand
const state: PipelineState = {
  businessData: {
    leadGen: 90,
    qualification: 45,
    onboarding: 25,
    delivery: 60,
    retention: 35,
  },
  selectedProcess: 'overview',
  scenario: 'current',
};

export const pipelineStore: PipelineState & PipelineActions = {
  ...state,
  selectProcess: (p) => {
    pipelineStore.selectedProcess = p;
  },
  updateStage: (stage, value) => {
    pipelineStore.businessData[stage] = value;
  },
  switchScenario: (s) => {
    pipelineStore.scenario = s;
  },
};


