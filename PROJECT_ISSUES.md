# Project Issues Checklist

Use this as a living backlog to track the refactor and growth tasks. Check items as they’re delivered.

## Phase 1 — Minimal Merge (foundation)
- [ ] Replace CDN libs with ESM setup (Three, GSAP)
  - [ ] Add ESM setup module that assigns `window.THREE` and `window.gsap`
  - [ ] Remove CDN tags from `index.html`
  - [ ] Verify visualizer initializes normally
- [ ] Add TypeScript baseline (no conversion required yet)
  - [ ] tsconfig.json with mixed JS/TS support
  - [ ] Install `typescript`, `@types/react`, `@types/react-dom`
- [ ] Store scaffold
  - [ ] Define `BusinessData`, `ProcessId` types
  - [ ] Create minimal store with actions (no UI wiring yet)
- [ ] Thin `PipelineVisualizer.tsx`
  - [ ] Component renders canvas container and runs init/dispose (current 3D system)
  - [ ] Not yet replacing `App`/`EmbedApp`

## Phase 2 — Library alignment and reliability
- [ ] Align `three` version with helpers (e.g., `three-spritetext`)
- [ ] Ensure all modules import ESM where needed (no reliance on globals)
- [ ] Fix `ErrorHandler` fallback reference for camera positions
- [ ] Add smoke tests (init, camera transition)

## Phase 3 — UI modularization
- [ ] Extract `TutorialManager`, `OverlayManager`, `FormController` from `UIController`
- [ ] Move overlays and controls to React components
- [ ] Introduce a small state store (Context/Zustand) and remove `window.*`
- [ ] Wire `PipelineVisualizer` into pages; keep pages thin

## Phase 4 — Lead-gen upgrades
- [ ] Personalized PDF report generation (branded)
- [ ] Post-submit calendar modal (with UTM carry-over)
- [ ] Airtable lead scoring (interaction depth fields)
- [ ] ROI inputs (client value, close rate) and dynamic copy

## Phase 5 — DX and CI
- [ ] ESLint/Prettier configuration
- [ ] CI for lint/test


