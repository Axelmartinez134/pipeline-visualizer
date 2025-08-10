# 3D Pipeline Visualization - Modular Architecture

## Overview

This document describes the modular architecture implemented to replace the monolithic `pipelineVisualization.js` file. The new structure follows mobile-first design principles and industry best practices for maintainable, scalable 3D web applications.

## 🎯 Goals Achieved

### Primary Objectives
- **Modular Design**: Broke down 983-line monolithic file into focused, reusable components
- **Mobile-First Foundation**: Built responsive architecture optimized for mobile devices first
- **Maintainability**: Clear separation of concerns with logical component boundaries
- **Scalability**: Foundation for future features like responsive camera system and desktop optimization

### Architecture Benefits
- ✅ **Single Responsibility**: Each component has a clear, focused purpose
- ✅ **Dependency Injection**: Components receive dependencies rather than creating them
- ✅ **Error Isolation**: Failures in one component don't crash the entire system
- ✅ **Testability**: Individual components can be tested in isolation
- ✅ **Reusability**: Components can be reused across different contexts

## 📁 File Structure

```
src/3d/
├── constants/           # Configuration and constant values
│   ├── businessData.js     # Business logic constants and defaults
│   ├── cameraSettings.js   # Camera positions and animation config
│   ├── deviceBreakpoints.js # Mobile-first responsive breakpoints
│   └── processContent.js   # Thought bubble and automation content
├── utils/              # Utility functions and helpers
│   ├── deviceDetection.js  # Mobile/desktop detection utilities
│   ├── domHelpers.js       # DOM manipulation and canvas utilities
│   └── errorHandling.js    # Centralized error management
├── components/         # Reusable 3D and UI components
│   ├── Camera.js           # Camera management with mobile-first positioning
│   ├── Lighting.js         # Scene lighting configuration
│   ├── Pipeline.js         # 3D pipeline rendering and animations
│   └── ThoughtBubbles.js   # HTML overlay bubble management
├── core/               # Core orchestration logic
│   ├── PipelineRenderer.js # Main orchestrator and entry point
│   ├── SceneManager.js     # 3D scene coordination
│   ├── UIController.js     # UI interactions and business logic (delegates to managers)
│   ├── OverlayManager.js   # Educational overlays show/hide/update
│   ├── FormController.js   # Lead form collection/validation/submission and UI state
│   └── TutorialManager.js  # Tutorial state, overlays, and highlight behaviors
├── index.js            # Main entry point
└── ARCHITECTURE.md     # This documentation file
```

## 🧩 Component Breakdown

### Constants Layer (`/constants/`)

**businessData.js**
- Default pipeline values for coaching businesses
- Stage configuration and positioning
- Business metrics and calculations
- Pipeline visual parameters

**cameraSettings.js**
- Camera positions for different process views
- Mobile-first camera configuration
- Animation settings and material colors

**deviceBreakpoints.js**
- Responsive design breakpoints (mobile: <768px)
- Device type definitions
- Canvas configuration constants

**processContent.js**
- Thought bubble content for each process stage
- Automation descriptions and impact data
- Process analysis information

### Utilities Layer (`/utils/`)

**deviceDetection.js**
- Mobile/tablet/desktop detection
- Performance capability assessment
- Viewport dimension utilities
- Quality recommendation logic

**domHelpers.js**
- Canvas and container element management
- UI state update utilities
- Loading overlay management
- Element waiting utilities

**errorHandling.js**
- Global error handler setup
- Library validation
- User-friendly error messaging
- Error logging and context

### Components Layer (`/components/`)

**Camera.js**
- Responsive camera management
- Mobile-first positioning (further back on mobile)
- Process-specific camera animations
- Device adaptation on resize

**Lighting.js**
- Scene lighting setup (ambient + directional)
- Shadow configuration
- Quality-based optimization
- Resource cleanup

**Pipeline.js**
- 3D pipeline object creation
- Pipe sizing based on capacity
- Water flow animations
- Scenario switching (current/optimized)

**ThoughtBubbles.js**
- HTML overlay bubble creation
- 3D-to-2D position projection
- Visibility management
- Click interaction handling

### Core Layer (`/core/`)

**SceneManager.js**
- Coordinates all 3D components
- Manages Three.js scene, renderer setup
- Animation loop management
- Performance quality adaptation

**UIController.js**
- Business logic and UI interactions (delegates to managers below)
- Metrics calculation and display
- Process content management (analysis panel now React-rendered outside 3D)

**OverlayManager.js**
- Encapsulates educational overlay DOM updates and visibility
- Updates bottleneck text and triangle placement; shows/hides overlays

**FormController.js**
- Lead form data collection and validation
- Airtable submission (via `services/airtableService.js`)
- Loading/success/error UI handling

**TutorialManager.js**
- Tutorial steps, overlays, and highlight effects (tabs, sliders, pipeline)
- Completes tutorial and switches to normal overlays

**PipelineRenderer.js**
- Main orchestrator class
- Initialization sequencing
- Component lifecycle management
- UI no longer depends on `window.*` globals; React context calls controller/camera directly

## 🔧 How It Works

### Initialization Flow

1. **Entry Point** (`index.js`)
   - Creates PipelineRenderer instance
   - Starts initialization process

2. **Renderer Setup** (`PipelineRenderer.js`)
   - Initializes error handling
   - Validates libraries and DOM elements
   - Creates SceneManager and UIController

3. **Scene Creation** (`SceneManager.js`)
   - Sets up Three.js scene and renderer
   - Creates Camera, Lighting, Pipeline, ThoughtBubbles
   - Starts animation loop

4. **UI Integration** (`UIController.js`)
   - Connects 3D scene to HTML controls
   - Manages business logic and metrics
   - Handles user interactions

### Data Flow

```
User Interaction (HTML) 
    ↓
UIController (business logic)
    ↓
SceneManager (3D coordination)
    ↓
Components (Camera, Pipeline, etc.)
    ↓
Three.js Scene Update
```

### Mobile-First Implementation

The architecture implements mobile-first design in several ways:

1. **Camera Positioning**: Mobile devices get camera positioned further back (`z: 8` vs `z: 5`)
2. **Device Detection**: Responsive breakpoints prioritize mobile experience
3. **Performance Scaling**: Quality settings adapt based on device capabilities
4. **Touch Optimization**: Thought bubbles and interactions optimized for touch

## 🚀 Future Enhancement Ready

This modular architecture creates a foundation for:

### Responsive Camera System (Next Phase)
- Device-specific camera configurations already prepared
- Animation utilities in place
- Performance detection ready

### Desktop Optimization
- Quality scaling system implemented
- Device detection utilities ready
- Component isolation allows desktop-specific enhancements

### Additional Features
- New components can be added without touching existing code
- Constants can be modified for different industries
- UI controller can be extended for new interactions

## 🛠 Development Guidelines

### Adding New Components

1. Create component in appropriate layer (`components/`, `utils/`, etc.)
2. Follow dependency injection pattern
3. Implement dispose() method for cleanup
4. Add error handling for critical operations

### Modifying Existing Components

1. Each component has single responsibility - modify accordingly
2. Update corresponding constants if needed
3. Ensure mobile-first principles are maintained
4. Test across device types

### Best Practices

- **Constants First**: Store configuration in constants files
- **Error Boundaries**: Wrap risky operations in try-catch
- **Memory Management**: Always implement dispose() methods
- **Mobile Priority**: Test mobile experience first
- **Separation of Concerns**: Keep 3D logic separate from business logic

## 📱 Mobile-First Principles Applied

1. **Performance**: Quality adapts to device capabilities
2. **Viewport**: Camera positions prioritize mobile viewing
3. **Interactions**: Touch-friendly bubble interactions
4. **Loading**: Optimized initialization for slower mobile networks
5. **Memory**: Efficient resource management for limited mobile memory

## 🔗 Integration Points

### With React App (`src/App.jsx`)
- Uses a reusable wrapper component `PipelineVisualizer.tsx` to create the canvas/overlays and run init/dispose
- Interactions go through `VisualizerProvider`/`useVisualizer` (context shim) which calls `uiController`/camera directly
- No reliance on `window.*` UI globals (legacy exposure removed)
- Process analysis panel is React-rendered via `features/visualizer/ProcessAnalysis.jsx`

### With Embed App (`src/EmbedApp.jsx`)
- Same `PipelineVisualizer` and context wiring with `variant="embed"` (uses embed data/content)

### With CSS Styles
- Maintains existing CSS class structure
- Thought bubble styling preserved
- Responsive design classes utilized

## 📊 Benefits Realized

1. **Code Organization**: 983 lines → organized modules (~100-200 lines each)
2. **Maintainability**: Clear component boundaries and responsibilities
3. **Debugging**: Isolated error handling and logging
4. **Performance**: Mobile-optimized quality scaling
5. **Extensibility**: Easy to add new features without touching existing code
6. **Testing**: Individual components can be unit tested
7. **Documentation**: Self-documenting through clear structure

---

This architecture successfully transforms the monolithic pipeline visualization into a maintainable, scalable, and mobile-first 3D web application foundation. 

---

## Recent Refactor and Tooling Updates (August 2025)

### React Integration Layer (outside `src/3d`)

```
src/
├── features/visualizer/
│   ├── PipelineVisualizer.tsx      # Thin React wrapper; mounts canvas/overlays and runs init/dispose
│   ├── VisualizerContext.tsx       # Context provider + hook to call uiController/camera (no window globals)
│   └── ProcessAnalysis.jsx         # React-rendered analysis panel (replaces innerHTML)
├── esmSetup.js                     # ESM import unifier; attaches window.THREE/window.gsap for legacy code
```

Key changes:
- Removed CDN `<script>` tags; `three` and `gsap` are imported via ESM; `esmSetup.js` assigns globals for legacy 3D code paths.
- `App.jsx` and `EmbedApp.jsx` now wrap content in `VisualizerProvider` and use `useVisualizer()` for tabs, sliders, zoom, scenario, industry, and form submit.
- `ProcessAnalysis.jsx` replaced DOM `innerHTML` in `UIController` for the analysis content.

### Controller/Manager split
- `UIController` delegates to:
  - `OverlayManager` for educational overlays
  - `FormController` for lead form logic
  - `TutorialManager` for tutorial overlays/highlights
- This reduces `UIController` surface area and isolates concerns for future testing.

### Removal of global UI functions
- `PipelineRenderer.exposeGlobalFunctions()` no longer assigns `window.selectProcessTab`, `window.updateStage`, etc.
- React context/hook (`VisualizerContext`) calls `uiController` and `sceneManager.camera` directly.

### Error handling fix
- `ErrorHandler` now imports `CAMERA_POSITIONS` for fallback transitions instead of referencing `camera.constructor.CAMERA_POSITIONS`.

### Testing & DX
- Vitest configured (`vitest.config.ts`) with a basic smoke test for the 3D entry point.
- ESLint (flat config) + Prettier added; scripts: `typecheck`, `lint`, `test`, `format`.
- ESLint configured with browser globals (`THREE`, `gsap`, `fetch`, etc.) to avoid false positives for runtime-only APIs.

### Notes for future development
- The context layer currently shims to legacy globals only as a fallback; the project now runs without them. New UI should call the context (or a dedicated store) directly.
- Consider migrating 3D modules to import `THREE`/`gsap` directly to remove the need for `esmSetup.js` globals.
- Expand tests around camera transitions and pipeline updates; wire `ProcessAnalysis` to selected process from a store for live updates.