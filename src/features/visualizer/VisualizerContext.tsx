import React, { createContext, useContext, useMemo } from 'react';

type ProcessId = 'overview' | 'leadGen' | 'qualification' | 'onboarding' | 'delivery' | 'retention';
type Scenario = 'current' | 'optimized';

export type VisualizerApi = {
  selectProcess: (id: ProcessId) => void;
  updateStage: (stage: keyof Record<ProcessId, never> | string, value: number) => void;
  toggleSimulation: () => void;
  switchScenario: (s: Scenario) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  updateIndustry: (industry: string) => void;
  submitLeadForm: () => void;
};

const noop = () => {};

const defaultApi: VisualizerApi = {
  selectProcess: noop,
  updateStage: noop as any,
  toggleSimulation: noop,
  switchScenario: noop as any,
  zoomIn: noop,
  zoomOut: noop,
  resetZoom: noop,
  updateIndustry: noop,
  submitLeadForm: noop,
};

const VisualizerContext = createContext<VisualizerApi>(defaultApi);

export function VisualizerProvider({ children }: { children: React.ReactNode }) {
  const api = useMemo<VisualizerApi>(() => ({
  selectProcess: (id) => {
      const ui = (window as any).PipelineVisualization?.renderer?.uiController;
      if (ui?.selectProcess) ui.selectProcess(id);
      else {
        const fn = (window as any).selectProcessTab || (window as any).selectProcess;
        if (typeof fn === 'function') fn(id);
      }
    },
    updateStage: (stage, value) => {
      const ui = (window as any).PipelineVisualization?.renderer?.uiController;
      if (ui?.updateStage) ui.updateStage(stage as any, value);
      else {
        const fn = (window as any).updateStage;
        if (typeof fn === 'function') fn(stage, value);
      }
    },
    toggleSimulation: () => {
      const ui = (window as any).PipelineVisualization?.renderer?.uiController;
      if (ui?.toggleSimulation) ui.toggleSimulation();
      else {
        const fn = (window as any).toggleSimulation;
        if (typeof fn === 'function') fn();
      }
    },
    switchScenario: (s) => {
      const ui = (window as any).PipelineVisualization?.renderer?.uiController;
      if (ui?.switchScenario) ui.switchScenario(s);
      else {
        const fn = (window as any).switchScenario;
        if (typeof fn === 'function') fn(s);
      }
    },
    zoomIn: () => {
      const cam = (window as any).PipelineVisualization?.renderer?.sceneManager?.camera;
      if (cam?.zoomIn) cam.zoomIn();
      else {
        const fn = (window as any).zoomIn;
        if (typeof fn === 'function') fn();
      }
    },
    zoomOut: () => {
      const cam = (window as any).PipelineVisualization?.renderer?.sceneManager?.camera;
      if (cam?.zoomOut) cam.zoomOut();
      else {
        const fn = (window as any).zoomOut;
        if (typeof fn === 'function') fn();
      }
    },
    resetZoom: () => {
      const cam = (window as any).PipelineVisualization?.renderer?.sceneManager?.camera;
      if (cam?.resetZoom) cam.resetZoom();
      else {
        const fn = (window as any).resetZoom;
        if (typeof fn === 'function') fn();
      }
    },
    updateIndustry: (industry) => {
      const ui = (window as any).PipelineVisualization?.renderer?.uiController;
      if (ui?.updateIndustry) ui.updateIndustry(industry);
      else {
        const fn = (window as any).updateIndustry;
        if (typeof fn === 'function') fn(industry);
      }
    },
    submitLeadForm: () => {
      const ui = (window as any).PipelineVisualization?.renderer?.uiController;
      if (ui?.submitLeadForm) ui.submitLeadForm();
      else {
        const fn = (window as any).submitLeadForm;
        if (typeof fn === 'function') fn();
      }
    },
  }), []);

  return (
    <VisualizerContext.Provider value={api}>{children}</VisualizerContext.Provider>
  );
}

export function useVisualizer() {
  return useContext(VisualizerContext);
}


