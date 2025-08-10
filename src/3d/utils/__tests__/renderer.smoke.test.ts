import { describe, it, expect } from 'vitest';

describe('pipeline renderer smoke', () => {
  it('loads 3d entry point without throwing (module import)', async () => {
    // Just ensure the module imports in test env. It won't render in jsdom.
    const mod = await import('../../index.js');
    expect(mod).toBeTruthy();
    expect(typeof mod.initializePipeline).toBe('function');
  });
});


