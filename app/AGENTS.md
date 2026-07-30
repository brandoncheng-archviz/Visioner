# Visioner — AI Video & Image Creation Platform

> A React-based single-page application for AI-driven video and image content creation. The project provides a homepage for discovering content and a visual node-based canvas editor for building multimedia workflows.

**Important:** The current working directory (`D:/CX/Cx_work/Aiwork/Visioner/app`) is the project root. All source code, configuration, and build assets live here. There is no nested `app/` subdirectory inside this directory.

**Related Rule Files:**
- `docs/image-node-rules.md` — ImageNode prompt assembly, reference usage, controller, and interaction rules (in Chinese). Must be read before modifying ImageNode behavior.

---

## Technology Stack

| Layer | Technology | Version (from `package.json`) |
|-------|-----------|-------------------------------|
| Framework | React | ^19.2.0 |
| Language | TypeScript | ~5.9.3 |
| Build Tool | Vite | ^7.2.4 |
| Styling | Tailwind CSS | ^3.4.19 |
| UI Components | shadcn/ui (New York style) | — |
| Router | react-router-dom | ^7.14.2 |
| Canvas | @xyflow/react | ^12.10.2 |
| Carousel | embla-carousel-react | ^8.6.0 |
| Icons | lucide-react | ^0.562.0 |
| Forms | react-hook-form + zod | ^7.70.0 / ^4.3.5 |
| Charts | recharts | ^2.15.4 |
| i18n | i18next + react-i18next | ^26.2.0 / ^17.0.8 |
| Testing | vitest | ^4.1.10 |

Additional notable dependencies:

- **@radix-ui/*** — Headless UI primitives used by shadcn/ui components (accordion, dialog, dropdown-menu, slider, tabs, tooltip, and many more).
- **@hookform/resolvers** — Zod resolver bridge for react-hook-form.
- **class-variance-authority + clsx + tailwind-merge** — Utility stack for component variants and conditional class merging.
- **sonner + next-themes** — Toast notifications with theme-aware rendering.
- **react-resizable-panels** — Resizable panel layouts.
- **cmdk** — Command palette / combobox primitives.
- **date-fns + react-day-picker** — Date handling and calendar UI.
- **vaul** — Drawer component primitives.
- **input-otp** — OTP input component.
- **react-router** — Also listed in dependencies (used alongside react-router-dom).

Dev dependencies:

- **kimi-plugin-inspect-react** — Dev-only Vite plugin for React component inspection.
- **typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-react-refresh** — Linting stack.
- **tailwindcss-animate + tw-animate-css** — Tailwind animation utilities.

Runtime requirement: **Node.js 20**.

---

## Project Structure

```
app/  (project root — current working directory)
├── public/
│   ├── images/              # Static image assets (show covers, project thumbs)
│   └── assets/
│       ├── examples/home/   # Home page banner images
│       ├── mock/generation-results/  # Mock AI generation result images
│       ├── presets/         # Preset thumbnail images (realism, season, time, weather)
│       ├── styles/          # Style cover images (binyan, luxigon, mir)
│       └── sun-sky/matrix-preview/  # SunSky lighting preview matrix (136 images)
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components (53 primitives)
│   │   ├── NodeEditor/      # Custom 2D canvas node editor (standalone, not wired to routes)
│   │   │   ├── NodeEditorCanvas.tsx
│   │   │   └── NodeRegistry.ts
│   │   ├── AccountPanel.tsx
│   │   ├── CanvasEdge.tsx
│   │   ├── CustomConnectionLine.tsx
│   │   ├── HeroCarousel.tsx # Home page banner carousel
│   │   ├── Navbar.tsx       # Top navigation bar (home / canvas variants)
│   │   ├── RecentProjects.tsx
│   │   ├── RechargeModal.tsx
│   │   ├── TeamModal.tsx
│   │   ├── TVShow.tsx       # Video gallery with category filter and search
│   │   └── UpgradePanel.tsx
│   ├── features/canvas/     # Canvas editor feature module (refactored from CanvasPage.tsx)
│   │   ├── components/      # Canvas UI components (stage, sidebar, toolbars, menus, modals)
│   │   ├── connection/      # Connection drawing state machine and validation rules
│   │   ├── constants/       # Canvas constants, presets, image usage configs, node titles
│   │   ├── contexts/        # React contexts (HistoryContext)
│   │   ├── hooks/           # Canvas-specific hooks (shortcuts, viewport, clipboard, undo/redo, etc.)
│   │   ├── nodes/           # Node type components (ImageNode/, VideoNode, TextNode, etc.)
│   │   ├── sunSky/          # SunSky lighting analysis subsystem (types, utils, UI components)
│   │   ├── types/           # Canvas-specific TypeScript types
│   │   ├── utils/           # Pure utility functions (prompt utils, reference utils, mock generation)
│   │   └── services/        # Canvas-specific services (identifyElement.ts)
│   ├── data/
│   │   └── siteData.ts      # Static mock data: banners, projects, gallery, canvas nodes/edges
│   ├── hooks/
│   │   └── use-mobile.ts    # useIsMobile hook (breakpoint 768px)
│   ├── i18n/                # Internationalization (zh-CN default and fallback)
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── zh-CN.ts
│   │       └── en-US.ts
│   ├── lib/
│   │   ├── nodeEditor/
│   │   │   ├── dag.ts       # Cycle detection, topological sort, execution batches, input hashing
│   │   │   └── types.ts     # Port types, EditorNode, EditorEdge, Camera, connection validation
│   │   ├── nodeSystem.ts    # Node port config & DAG execution engine for React Flow canvas
│   │   └── utils.ts         # cn() utility for Tailwind class merging
│   ├── pages/
│   │   ├── Home.tsx         # Landing page composing Navbar + HeroCarousel + RecentProjects + TVShow
│   │   ├── CanvasPage.tsx   # Visual node editor orchestrator
│   │   └── add_thumbnails.py# Helper script to inject thumbnails into CanvasPage preset data
│   ├── services/
│   │   └── accountApi.ts    # Mock API for user profile, credits, billing, devices, plans
│   ├── App.css              # Minimal root-level styles (mostly unused template CSS)
│   ├── App.tsx              # Root router with BrowserRouter, Routes for / and /canvas
│   ├── main.tsx             # React root render with StrictMode
│   └── index.css            # Global styles, Tailwind directives, ReactFlow custom CSS, CSS variables
├── components.json          # shadcn/ui configuration (style: new-york, baseColor: slate)
├── vite.config.ts           # Vite config: base './', port 3000, @/ -> ./src alias
├── tailwind.config.js       # Custom theme extending shadcn color tokens, animations
├── tsconfig.json            # Project references to tsconfig.app.json & tsconfig.node.json
├── tsconfig.app.json        # Strict TypeScript: noUnusedLocals, noUnusedParameters, verbatimModuleSyntax
├── tsconfig.node.json       # Node-side config for Vite
├── eslint.config.js         # ESLint flat config: TS + react-hooks + react-refresh
├── postcss.config.js        # Tailwind + autoprefixer (ESM syntax)
├── info.md                  # Setup notes (Tailwind + shadcn component list)
├── index.html               # App entry HTML (title: "Visioner")
└── docs/
    └── image-node-rules.md  # ImageNode rule contract (in Chinese)
```

**Source file counts (verified):**
- `src/components/ui/`: 53 shadcn/ui primitive components.
- `src/features/canvas/`: 152 files (components, nodes, sunSky, types, constants, utils, hooks, services, contexts, connection).
- `src/` total: 231 TypeScript / TSX source files.
- Test files: 4 `.test.ts` files under `src/`.

**Key file sizes (verified line counts):**
- `CanvasPage.tsx`: ~2,150 lines (page entry + orchestration, now delegating to feature hooks and components).
- `ImageNode.tsx`: ~2,261 lines.
- `ImageNodeControlPanel.tsx`: ~1,809 lines.
- `NodeEditorCanvas.tsx`: ~894 lines.
- `PresetPickerModal.tsx`: ~542 lines.
- `presets.ts`: ~979 lines.
- `CompareNode.tsx`: ~705 lines.
- `UpscaleNode.tsx`: ~652 lines.
- `RelightNode.tsx`: ~824 lines.
- `UpscaleParamPanel.tsx`: ~310 lines.
- `nodeSystem.ts`: ~323 lines.
- `ConnectionEngine.ts`: ~249 lines.
- `ExteriorRenderNode.tsx`: ~498 lines.
- `imageGenerationRequest.ts`: ~67 lines + tests.

---

## Build & Development Commands

All commands should be run from the project root (current working directory):

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Production build (runs tsc then vite build)
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint

# Run tests with Vitest
npm run test
```

The `vite.config.ts` sets `base: './'` so the built app can be served from any subpath. The dev server runs on port 3000.

---

## Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` | Landing page with discovery content |
| `/canvas` | `CanvasPage` | New or existing canvas editor |
| `/canvas/:projectId` | `CanvasPage` | Canvas editor for a specific project |

`App.tsx` uses `BrowserRouter` with the three routes above. There is no route-level lazy loading currently.

---

## Code Style Guidelines

- **Language**: UI labels, user-facing text, and rule documents (`docs/image-node-rules.md`) are in Chinese. Code comments, variable names, and file names are in English.
- **Imports**: Use the `@/` path alias for all internal imports (e.g., `@/components/ui/button`, `@/lib/utils`).
- **Styling**: The project uses a custom dark theme. Tailwind utility classes are primary, but inline `style` props are used for dynamic values (especially in the canvas editor) and hardcoded palette colors.
- **Theme colors** (hardcoded across the app):
  - Background: `#0a0a0f`
  - Surface/card: `#14141a`
  - Elevated: `#1e1e28`, `#252530`
  - Border: `#2a2a35`
  - Primary accent: `#00d4ff` (cyan)
  - Secondary text: `#a0a0b0`
  - Muted text: `#6a6a7a`
- **CSS variables** (in `src/index.css`) define the shadcn/ui theme using HSL values:
  - `--background: 240 14% 4%`
  - `--primary: 195 100% 50%`
  - `--radius: 0.5rem`
- **Component patterns**: shadcn/ui components use `class-variance-authority` (cva) for variants and the `cn()` utility from `@/lib/utils` for conditional class merging.
- **TypeScript**: Strict mode is enabled with the following notable flags:
  - `noUnusedLocals: true` — unused variables will fail the build.
  - `noUnusedParameters: true` — unused parameters will fail the build.
  - `verbatimModuleSyntax: true` — type-only imports must use the `type` keyword (e.g., `import type { Foo } from '...'` or `import { type Foo } from '...'`).
  - `erasableSyntaxOnly: true` — only TypeScript syntax that can be erased during compilation is allowed.
  - `noUncheckedSideEffectImports: true` — side-effect imports must be valid.
- **ESLint**: Flat config using `eslint/config` (`defineConfig`, `globalIgnores`). The project disables `@typescript-eslint/no-explicit-any` in `src/lib/nodeSystem.ts` for React Flow node data definitions. Prefer avoiding `any` in new code.

---

## Key Modules

### React Flow Canvas Editor (`src/pages/CanvasPage.tsx` + `src/features/canvas/`)

The canvas editor has been refactored from a monolithic file into a feature module. `CanvasPage.tsx` now acts as the page entry and orchestration layer, while stateful logic, UI, and node implementations live in `src/features/canvas/`.

**`CanvasPage.tsx` responsibilities:**
- Canvas page entry and React Flow provider wrapper.
- High-level state bridging for `nodes`, `edges`, and `tempLine`.
- Wiring of extracted feature hooks and UI components.
- Node registration and menu/drag/shortcut entry wiring.
- Project loading via `useParams().projectId`.

**Extracted feature hooks (`src/features/canvas/hooks/`):**
- `useCanvasKeyboardShortcuts` — keyboard shortcuts (copy, paste, undo, redo, select all, delete, zoom, fit view, etc.).
- `useCanvasSelectionActions` — selection-based actions (delete, duplicate, box selection pre-highlight).
- `useCanvasViewport` — pan, zoom, fit view, viewport resets.
- `useCanvasDragDrop` — drag-and-drop upload handling.
- `useCanvasUiPanels` — UI panel state (sidebar, help, minimap, grid, etc.).
- `useTextNodeFloatingPanelPosition` — positioning for the floating TextNode input panel.
- `useCanvasUndoRedo` — undo/redo history (max 50 states, JSON snapshot based).
- `useCanvasImageImport` — image import decoding and filtering.
- `useCanvasNodeClipboard` — copy/paste/duplicate of nodes.
- `useFullscreenEscape` — fullscreen escape handling.
- `useToast` — toast notification helpers.

**Extracted UI components (`src/features/canvas/components/`):**
- `CanvasStage.tsx` — React Flow container, Background, MiniMap, drop overlay, temp connection line, reject tooltip, upload toast.
- `CanvasSidebar.tsx` — Left sidebar pill, expanded panels (add, AI toolbox, assets, history, support).
- `CanvasContextMenus.tsx` — Canvas right-click menu, node creation menu, node right-click menu.
- `CanvasToolbar.tsx` — Bottom toolbar (MiniMap toggle, grid toggle, reset, zoom, help panel).
- `GlobalDropForwarder.tsx` — Browser-level drag/drop event forwarding.
- `CanvasFlowStyles.tsx` — Additional global/flow CSS-injected styles.
- `CanvasToast.tsx` — Toast notification wrapper.
- `CanvasImageMarkCaptureLayer.tsx` — Image mark capture overlay.
- `TextNodeInputPanel.tsx` — Floating TextNode input panel.
- `ImageControllerPanel.tsx` — Image node atmosphere/material/landscape/lighting/interior controller panel.
- `CompareModeSwitcher.tsx`, `CompareFullscreenViewer.tsx` — Compare node UI helpers.
- `RelightControlBody.tsx`, `RelightAdvancedSettings.tsx` — Relight node controls.
- `TempConnectionLine.tsx`, `ImagePreviewModal.tsx`, `ImageRoleTag.tsx`, `ImageToolbar.tsx`, `LightPreviewPanel.tsx`, `NodeShell.tsx`, `ShortcutRow.tsx`, `StylePickerModal.tsx`, `UpscaleParamPanel.tsx`, `UpscaleResultToolbar.tsx`, `PresetPickerModal.tsx`, `CustomPresetFallbackCover.tsx`, `HistoryPanel.tsx`, `FullscreenCloseButton.tsx`.

**Connection subsystem (`src/features/canvas/connection/`):**
- `ConnectionEngine.ts` — Finite-state machine driving custom connection line drawing from output ports.
- `connectionTypes.ts` — Types for connection decisions, validation results, reject codes, edge payloads.
- `connectionRules.ts` — Validation rules (same handle side, same node, data type mismatch, cycle, duplicate, unique reference role conflict, relight/upscale/compare input limits, reference limits, text mode checks).
- `buildConnectionValidationInput.ts` — Builds validation input from React Flow nodes/edges/state.

**Node components (`src/features/canvas/nodes/`):**
- `ImageNode/` — Image node with control panel, prompt box, reference image area, generation history, presets, styles, and image controllers.
  - `ImageNode.tsx`, `ImageNodeControlPanel.tsx`, `ImageCropOverlay.tsx`, `index.ts`
  - `controllers/` — `ImageControllersTrigger.tsx`, `ImageControllersPopover.tsx`, `CameraControlPlaceholder.tsx`, `StructureControlPlaceholder.tsx`, `imageControllers.types.ts`, `imageControllersUtils.ts`.
- `ExteriorRenderNode/` — Exterior rendering node with connected images, render channels, atmosphere panel, prompt panel, and result graph generation.
  - `ExteriorRenderNode.tsx`, `ExteriorRenderFooter.tsx`, `ExteriorRenderAtmospherePanel.tsx`, `ExteriorRenderConnectedImages.tsx`, `ExteriorRenderPromptPanel.tsx`, `ExteriorRenderRenderChannelsPanel.tsx`, `exteriorRender.types.ts`, `exteriorRenderUtils.ts`, `exteriorRenderRequest.ts`, `exteriorRenderGeneration.ts`, `exteriorRenderResultGraph.ts`, `mockExteriorRender.ts`, plus `.test.ts` files.
- `VideoNode.tsx`
- `TextNode.tsx`
- `AudioNode.tsx`
- `ScriptNode.tsx`
- `VideoMergeNode.tsx`
- `UpscaleNode.tsx`
- `RelightNode.tsx` — AI relighting node with advanced settings and preset support.
- `CompareNode.tsx` — Side-by-side image comparison with draggable slider.
- `SunSkyNode/` — SunSky lighting analysis node (preview, controls, derived info).

**SunSky subsystem (`src/features/canvas/sunSky/`):**
A dedicated feature module for solar and sky lighting analysis, consumed by `SunSkyNode`. It includes:
- `components/` — `SunSkyPanel.tsx`, `SunSkyPreview.tsx`, `SunSkyControls.tsx`, `SunDomeController.tsx`, `SunSkyDerivedInfo.tsx`, `SunSkyPresetList.tsx`, `SunSkySnapshotStrip.tsx`.
- `utils/` — `resolveSunSkyState.ts`, `resolveSimpleSunSkyState.ts`, `sunSkyMath.ts`, `sunSkyPrompt.ts`.
- `data/` — `sunSkyPresets.ts`.
- `types/` — `sunSky.types.ts`, `simpleSunSky.types.ts`.

**Supporting modules:**
- `types/` — `canvas.types.ts`, `generation.types.ts`, `imageNode.types.ts`, `imageNodeData.types.ts`, `imageController.types.ts`, `imageControllers.types.ts`, `basicNode.types.ts`, `upscaleNode.types.ts`, `lightPreview.types.ts`, `history.types.ts`, `relight.types.ts`, plus node-specific types under `ExteriorRenderNode/` and `SunSkyNode/`.
- `constants/` — `canvasConstants.ts`, `canvasNodeTitles.ts`, `basicNodes.ts`, `imageUsages.ts`, `imageController.ts`, `imageModelOptions.ts`, `presets.ts`, `relightPresets.ts`, `textNode.ts`, `upscaleNodeDefaults.ts`.
- `utils/` — `promptUtils.ts`, `referenceUtils.ts`, `referenceLimits.ts`, `mockGenerationTask.ts`, `mockUpscaleTask.ts`, `mockRelightTask.ts`, `presetSelection.ts`, `userPresets.ts`, `imageNodeSizing.ts`, `resolveNodeImage.ts`, `nodeNaming.ts`, `nodeCopyData.ts`, `contentSafety.ts`, `relightSettings.ts`, `canvasGraphUtils.ts`, `canvasFileUtils.ts`, `canvasImageImportUtils.ts`, `canvasNodeFactories.ts`, `canvasEvents.ts`, `imageMarkCaptureRegistry.ts`, `cropImage.ts`, `compareSlots.ts`, `textNodeUtils.ts`, `shortcutLabels.ts`, `imageGenerationRequest.ts`, `canvasImageImportUtils.ts`.
- `hooks/` — Listed above.
- `services/` — `identifyElement.ts`.
- `contexts/` — `HistoryContext.tsx`.

**Features:**
- Left sidebar tool panel (add nodes, AI toolbox, assets, history, tutorial, support).
- Context menu on right-clicking the canvas to add nodes.
- Node context menu with copy, paste, duplicate, delete, and save-to-library actions.
- Floating toolbar appears when any node is selected (panorama, lighting, crop, etc.).
- MiniMap and Controls are visible.
- Edges are cyan (`#00d4ff`) smooth-step curves when selected, gray (`#555`) otherwise.
- Custom connection line drawing from output ports with cycle detection, type validation, unique role usage conflict detection, and drop-to-create-node support.
- Keyboard shortcuts: `Ctrl+C` / `Ctrl+V` for copy/paste, `Delete` / `Backspace` to remove selected nodes/edges, `Ctrl+Z` / `Ctrl+Shift+Z` for undo/redo, `Ctrl+A` to select all, `Esc` to deselect/close help, arrow keys to pan, `+`/`-` to zoom, `0`/`f`/`1` to fit view.
- Zoom slider, grid snap toggle, fit view reset, and help panel in the bottom toolbar.
- Image mark capture layer for creating local marks on images.
- TextNode floating input panel for writing and editing text nodes.
- Exterior render node with connected image slots, render channels (Albedo, Normal, AO, Depth), atmosphere controls, and automatic result graph creation.

**ImageNode generation flow:**
- `ImageNode` is the most complex node type, supporting AI image generation via a mock task system.
- Generation state uses `GenerationTask` and `GenerationHistoryItem` types from `generation.types.ts`.
- The `mockGenerationTask.ts` utility simulates generation with a delay, failure path, and `AbortSignal` support.
- Image data fields: `inputImage` (original upload, never overwritten by generation), `currentImage` (latest display image), `image` (legacy compatibility), and `generatedImages` (history array).
- Nodes support reference images with typed roles (`primary_building`, `atmosphere_reference`, `material_reference`, `landscape_reference`, `lighting_reference`, `interior_reference`, `custom_reference`, etc.).
- Reference usage rules are documented in `docs/image-node-rules.md`.
- `buildImageGenerationRequest` in `imageGenerationRequest.ts` builds the normalized API request object from node data, references, mark references, model parameters, controller state, style, and presets.

**ExteriorRenderNode flow:**
- Supports exterior rendering with a primary image input and optional render channels (Albedo, Normal, AO, Depth).
- `buildExteriorRenderRequest` normalizes connected images, render channels, atmosphere, and model parameters into a `ExteriorRenderRequest`.
- `runExteriorRenderGeneration` orchestrates `processing` → `success`/`failed` → `idle` and emits the result graph via `buildExteriorRenderResultGraph`.
- `mockExteriorRender.ts` simulates the backend with configurable delay, outcome, and task identity.
- Interaction locks during `processing` are derived from the view state via `getExteriorRenderInteractionLocks`.

**RelightNode flow:**
- `RelightNode` supports AI relighting with advanced parameter controls and presets.
- Uses `RelightTask` and related types from `relight.types.ts`.
- The `mockRelightTask.ts` utility simulates relighting with a delay and `AbortSignal` support.
- Settings are managed via `relightSettings.ts` and preset defaults live in `relightPresets.ts`.
- UI includes `RelightAdvancedSettings.tsx` and `RelightControlBody.tsx` for fine-tuning light direction, intensity, and color temperature.

#### Canvas Development Rules

**CanvasPage boundary**

- `src/pages/CanvasPage.tsx` is the Canvas page orchestration layer. It may retain page-level core state, module composition, node registration, node creation entry points, and cross-module event bridges.
- Do not place complete node UI, node-specific business logic, large static configuration, or implementations already extracted into feature modules in `CanvasPage.tsx`.
- Logic under `hooks/`, `components/`, `connection/`, `nodes/`, `services/`, and other Canvas feature directories must not be moved back into `CanvasPage.tsx`.
- Do not create abstractions merely to shorten a file. Add an abstraction only when its responsibility is clear and the migration risk is controlled.

**Directory responsibilities**

- `nodes/`: node UI and node-specific logic.
- `components/`: shared Canvas UI.
- `hooks/`: reusable state logic or state logic that needs isolation.
- `connection/`: connection state machines, connection validation, and stable rejection/error codes.
- `contexts/`: Context shared within the Canvas feature.
- `services/`: Canvas-level services and wrappers around external capabilities.
- `constants/`: static configuration, options, and presets.
- `types/`: types shared across Canvas modules.
- `utils/`: stateless pure functions.
- Node-private types, constants, and utilities may be colocated with the node; do not promote them to global directories without a cross-module need.
- Do not maintain authoritative node or component file inventories in these rules. Use the current directories and node registration implementation as the source of truth.

**Change principles**

- Prefer small, low-risk changes directly related to the current task.
- Unless the task explicitly requires it, preserve existing UI, interactions, data structures, and behavior.
- Do not perform unrelated directory moves, naming cleanup, or large-scale refactors.
- When a change must cross module boundaries, explain why in the delivery summary.

**Data and types**

- TypeScript type files are the single source of truth for field definitions; do not duplicate complete field lists in this document.
- Before changing ImageNode or generation-history data, read the current related types, normalization functions, and data-building logic.
- The behavior of `inputImage`, `currentImage`, compatibility fields, generation history, and generation tasks is defined by the current implementation and specialized types.
- Never infer data semantics only from old documentation or a field name.

**i18n and errors**

- New user-visible text must use the existing i18n mechanism, with matching keys added to both `zh-CN` and `en-US`.
- Business data must use stable values; never use translated Chinese or English display text for business decisions.
- Business logic should return stable error codes where practical, and the UI should translate them into visible messages.

**Testing**

- For request builders, normalization, data conversion, copied-state reset, and other pure functions, prefer unit tests in the repository's existing test framework.
- Pure visual styling changes do not require new tests.
- Use the repository's current test framework and commands; do not introduce a second testing system.

**Canvas delivery summary**

- State which files changed and each file's responsibility.
- State whether `CanvasPage.tsx` or Canvas core state was affected.
- State whether nodes, components, hooks, types, constants, services, or utilities were added.
- List validation commands run and any unfinished work or manual checks still required.

### Custom 2D Canvas Node Editor (`src/components/NodeEditor/`)

An independent canvas-based node editor rendered on a raw `<canvas>` element. **Note:** This module is not currently imported or wired into any route; it is a standalone subsystem.

- `NodeEditorCanvas.tsx` — Main component handling pan, zoom, selection, connection dragging, and rendering (~894 lines).
- `NodeRegistry.ts` — Node templates (`PromptInput`, `LoadModel`, `TextEncode`, `EmptyLatent`, `KSampler`, `VAEDecode`, `PreviewImage`) with typed ports.
- `src/lib/nodeEditor/types.ts` — Core types (`EditorNode`, `EditorEdge`, `PortType`, `Camera`, `ConnectionPreview`) and connection validation (`canConnect`).
- `src/lib/nodeEditor/dag.ts` — Cycle detection (DFS), topological sort (Kahn), execution batching, input hashing, and node input building.

Port types and colors:
- `IMAGE` — cyan `#22d3ee`
- `PROMPT` — purple `#a855f7`
- `LATENT` — orange `#f59e0b`
- `MODEL` — blue `#3b82f6`
- `NUMBER` — green `#22c55e`
- `CONDITIONING` — pink `#ec4899`
- `STRING` — slate `#94a3b8`
- `BOOLEAN` — red `#ef4444`
- `ANY` — white `#ffffff`

### Internationalization (`src/i18n/`)

The app uses `react-i18next` with two locale files:
- `zh-CN.ts` — Default language (简体中文).
- `en-US.ts` — Secondary locale.

Translation keys are organized by feature namespace (`common`, `canvas`, `imageNode`, `reference`, `preset`, `style`, `toolbar`, `modal`, `toast`, `error`, `sidebar`, `contextMenu`, `navbar`, `accountPanel`, `account`, `audioNode`, `scriptNode`, `videoMergeNode`, `canvasEdge`, `recentProjects`, `gallery`, `mark`, `upscale`, `home`, `upgradePanel`, `plan`, `faq`, `compare`, `lightPreview`, `controllers`).

### Data Layer (`src/data/siteData.ts`)

All content is currently static/mock data. This file exports:

- `banners` — Hero carousel slides.
- `recentProjects` — Project cards for the home page, each with an optional `canvasNodes` array.
- `galleryData` / `galleryCategories` — Gallery items and filter tabs for the TVShow section.
- `blankCanvasNodes` — Empty canvas node array helper.
- `getProjectCanvasData(projectId)` — Returns nodes for a given project ID.

There is no backend API integration at this time.

### Account Service (`src/services/accountApi.ts`)

Mock API service for user account features (profile, credits, usage, billing, devices, plans). When a real backend is ready, set `VITE_API_BASE_URL` and the service will switch from mock data to real `fetch` calls.

---

## Testing

The project uses **Vitest** for unit and integration testing.

- Test runner: `vitest` (^4.1.10).
- Run command: `npm run test` (runs `vitest run`).
- Existing test files:
  - `src/features/canvas/utils/imageGenerationRequest.test.ts` (11 tests) — Covers `buildImageGenerationRequest` normalization of references, mark references, count parsing, controller/style/presets passthrough, and immutability.
  - `src/features/canvas/utils/nodeCopyData.test.ts` (3 tests) — Covers `prepareCanvasNodeDataForCopy` resetting exterior render task state when copying.
  - `src/features/canvas/nodes/ExteriorRenderNode/exteriorRenderRequest.test.ts` (11 tests) — Covers request building, validation, view-state derivation, and `mockExteriorRender` behavior including task race conditions.
  - `src/features/canvas/nodes/ExteriorRenderNode/exteriorRenderGeneration.integration.test.ts` (2 tests) — Covers full `READY → PROCESSING → success → result graph → idle` flow and failed/retry flows.
- Total: 27 tests across 4 test files (all passing as of the last run).

If you add new tests, place them alongside the source files they cover (`*.test.ts` / `*.test.tsx`) or in a top-level `tests/` directory inside the project root.

---

## Security Considerations

- The app is a client-side only SPA with no authentication flow beyond a mocked user menu.
- No API keys or secrets are present in the source code.
- `zod` is available for runtime schema validation if backend APIs are introduced later.
- All images are loaded from the local `public/images/` directory or external avatar URLs (`dicebear.com`).
- Be careful not to expose backend credentials or real API keys in `src/services/accountApi.ts` or node mock utilities when wiring up production services.

---

## Adding shadcn/ui Components

This project uses the shadcn/ui "New York" style with CSS variables. To add a new component from inside the project root:

```bash
npx shadcn add <component-name>
```

The CLI will place it in `src/components/ui/` and follow the existing alias conventions (`@/lib/utils`, `@/components/ui`).
