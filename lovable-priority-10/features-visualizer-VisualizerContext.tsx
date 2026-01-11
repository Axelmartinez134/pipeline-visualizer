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
  submitLeadForm: () => void | Promise<void>;
  startAutoOptimizeSequence?: () => void;
  stopAutoOptimizeSequence?: () => void;
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
    submitLeadForm: async () => {
      // Try immediate window path first
      let ui = (window as any).PipelineVisualization?.renderer?.uiController;

      // If not ready, try importing module export and retry a few times
      if (!ui) {
        try {
          const mod = await import('../../3d/index.js');
          const renderer = (mod as any).pipelineRenderer || (window as any).PipelineVisualization?.renderer;
          ui = renderer?.uiController;
        } catch {}
      }

      // Brief retry loop in case initialization finishes shortly after click
      if (!ui) {
        for (let i = 0; i < 5; i++) {
          await new Promise(res => setTimeout(res, 150));
          ui = (window as any).PipelineVisualization?.renderer?.uiController;
          if (ui) break;
        }
      }

      if (ui?.submitLeadForm) {
        await ui.submitLeadForm();
        return;
      }

      // Fallback to legacy global if present
      const fn = (window as any).submitLeadForm;
      if (typeof fn === 'function') {
        fn();
      } else {
        // As a last resort, inform in console; UI will remain unchanged
        console.warn('submitLeadForm: UI controller not ready');
      }
    },
    startAutoOptimizeSequence: () => {
      const ui = (window as any).PipelineVisualization?.renderer?.uiController;
      if (ui?.startAutoOptimizeSequence) ui.startAutoOptimizeSequence();
    },
    stopAutoOptimizeSequence: () => {
      const ui = (window as any).PipelineVisualization?.renderer?.uiController;
      if (ui?.stopAutoOptimizeSequence) ui.stopAutoOptimizeSequence();
    },
  }), []);

  return (
    <VisualizerContext.Provider value={api}>{children}</VisualizerContext.Provider>
  );
}

export function useVisualizer() {
  return useContext(VisualizerContext);
}


