# Visioner — AI Video & Image Creation Platform

> A React-based single-page application for AI-driven video and image content creation. The project provides a homepage for discovering content and a visual node-based canvas editor for building multimedia workflows.

**Important:** All application source code, configuration, and build assets live inside the `app/` subdirectory. The repository root only contains `.git/`, `package-lock.json`, `CANVAS_RULES.md`, and the `app/` folder. Every command below should be run from `app/` unless noted otherwise. The `src/` directory at the repository root is effectively empty (contains only `.DS_Store` files) and is not part of the build.

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

Additional notable dependencies:

- **@radix-ui/* ** — Headless UI primitives used by shadcn/ui components (accordion, dialog, dropdown-menu, slider, tabs, tooltip, and many more).
- **class-variance-authority + clsx + tailwind-merge** — Utility stack for component variants and conditional class merging.
- **sonner + next-themes** — Toast notifications with theme-aware rendering.
- **react-resizable-panels** — Resizable panel layouts.
- **cmdk** — Command palette / combobox primitives.
- **date-fns + react-day-picker** — Date handling and calendar UI.
- **vaul** — Drawer component primitives.
- **input-otp** — OTP input component.

Dev dependencies:

- **kimi-plugin-inspect-react** — Dev-only Vite plugin for React component inspection.
- **typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-react-refresh** — Linting stack.
- **tailwindcss-animate + tw-animate-css** — Tailwind animation utilities.

Runtime requirement: **Node.js 20**.

---

## Project Structure

```
app/
├── public/
│   ├── images/              # Static image assets (show covers, project thumbs)
│   └── assets/
│       ├── examples/home/   # Home page banner images
│       ├── mock/generation-results/  # Mock AI generation result images
│       └── presets/         # Preset thumbnail images
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
│   │   ├── constants/       # Canvas constants, presets, image usage configs
│   │   ├── hooks/           # Canvas-specific hooks (useToast)
│   │   ├── nodes/           # Node type components (ImageNode, VideoNode, TextNode, etc.)
│   │   ├── sunSky/          # SunSky lighting analysis subsystem (types, utils, UI components)
│   │   ├── types/           # Canvas-specific TypeScript types
│   │   └── utils/           # Pure utility functions (prompt utils, reference utils, mock generation)
│   ├── data/
│   │   └── siteData.ts      # Static mock data: banners, projects, gallery, canvas nodes/edges
│   ├── hooks/
│   │   └── use-mobile.ts    # useIsMobile hook (breakpoint 768px)
│   ├── i18n/                # Internationalization (zh-CN default, en-US fallback)
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── zh-CN.ts
│   │       └── en-US.ts
│   ├── lib/
│   │   ├── nodeEditor/
│   │   │   ├── dag.ts       # Cycle detection, topological sort, execution batches, input hashing
│   │   │   └── types.ts     # Port types, EditorNode, EditorEdge, Camera, connection validation
│   │   ├── nodeSystem.ts    # Node port config & DAG execution engine for React Flow canvas (~319 lines)
│   │   └── utils.ts         # cn() utility for Tailwind class merging
│   ├── pages/
│   │   ├── Home.tsx         # Landing page composing Navbar + HeroCarousel + RecentProjects + TVShow
│   │   ├── CanvasPage.tsx   # Visual node editor orchestrator (~952 lines)
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
└── postcss.config.js        # Tailwind + autoprefixer
```

**Source file counts (actual):**
- `src/components/ui/`: 53 shadcn/ui primitive components
- `src/features/canvas/`: 62 files (components, nodes, sunSky, types, constants, utils, hooks)
- `src/` total: 141 TypeScript / TSX source files; 144 total files under `src/`

**Key file sizes (approximate):**
- `CanvasPage.tsx`: ~952 lines (page entry + core state container)
- `ImageNode.tsx`: ~821 lines
- `ImageNodeControlPanel.tsx`: ~1,484 lines
- `NodeEditorCanvas.tsx`: ~894 lines
- `PresetPickerModal.tsx`: ~621 lines
- `presets.ts`: ~941 lines
- `CompareNode.tsx`: ~564 lines
- `nodeSystem.ts`: ~319 lines

---

## Build & Development Commands

All commands must be run from the `app/` directory:

```bash
cd app

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

- **Language**: UI labels and user-facing text are in Chinese. Code comments, variable names, and file names are in English.
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

The canvas editor has been refactored from a monolithic file into a feature module. `CanvasPage.tsx` (~952 lines) acts as the page entry and core state container, while UI and node logic live in `src/features/canvas/`.

**`CanvasPage.tsx` / `FlowCanvas` responsibilities:**
- Canvas page entry and React Flow provider wrapper
- Core `nodes` / `edges` / `tempLine` state management
- Line drawing logic (custom connection lines from output ports)
- Copy / paste / duplicate / delete logic
- Keyboard shortcuts (`Ctrl+C` / `Ctrl+V`, `Delete` / `Backspace`, `Ctrl+Z` / `Ctrl+Shift+Z`, `Ctrl+A`, `Esc`, arrows, `+`/`-`, `0`/`f`/`1`)
- Drag-and-drop upload handling
- Box-selection pre-highlight logic
- Context menu state
- Node registration and menu/drag/shortcut entry wiring
- Undo/Redo history (max 50 states, JSON snapshot based)

**Extracted UI components (`src/features/canvas/components/`):**
- `CanvasStage.tsx` — React Flow container, Background, MiniMap, drop overlay, temp connection line, reject tooltip, upload toast
- `CanvasSidebar.tsx` — Left sidebar pill, expanded panels (add, AI toolbox, assets, history, support)
- `CanvasContextMenus.tsx` — Canvas right-click menu, node creation menu, node right-click menu
- `CanvasToolbar.tsx` — Bottom toolbar (MiniMap toggle, grid toggle, reset, zoom, help panel)
- `GlobalDropForwarder.tsx` — Browser-level drag/drop event forwarding
- `TempConnectionLine.tsx`, `ImagePreviewModal.tsx`, `ImageRoleTag.tsx`, `ImageToolbar.tsx`, `NodeShell.tsx`, `ShortcutRow.tsx`, `StylePickerModal.tsx`, `UpscaleParamPanel.tsx`, `PresetPickerModal.tsx`, `CustomPresetFallbackCover.tsx`

**Node components (`src/features/canvas/nodes/`):**
- `ImageNode/` — Image node with control panel, prompt box, reference image area, generation history, presets, and styles
- `VideoNode.tsx`
- `TextNode.tsx`
- `AudioNode.tsx`
- `ScriptNode.tsx`
- `VideoMergeNode.tsx`
- `UpscaleNode.tsx`
- `CompareNode.tsx` — Side-by-side image comparison with draggable slider
- `SunSkyNode/` — SunSky lighting analysis node (preview, controls, derived info)

**SunSky subsystem (`src/features/canvas/sunSky/`):**
A dedicated feature module for solar and sky lighting analysis, consumed by `SunSkyNode`. It includes:
- `components/` — `SunSkyPanel.tsx`, `SunSkyPreview.tsx`, `SunSkyControls.tsx`, `SunDomeController.tsx`, `SunSkyDerivedInfo.tsx`, `SunSkyPresetList.tsx`, `SunSkySnapshotStrip.tsx`
- `utils/` — `resolveSunSkyState.ts`, `resolveSimpleSunSkyState.ts`, `sunSkyMath.ts`, `sunSkyPrompt.ts`
- `data/` — `sunSkyPresets.ts`
- `types/` — `sunSky.types.ts`, `simpleSunSky.types.ts`

**Supporting modules:**
- `types/` — `canvas.types.ts`, `generation.types.ts`, `imageNode.types.ts`, `imageNodeData.types.ts`
- `constants/` — `canvasConstants.ts`, `imageUsages.ts`, `presets.ts`
- `utils/` — `promptUtils.ts`, `referenceUtils.ts`, `mockGenerationTask.ts`, `presetSelection.ts`, `userPresets.ts`
- `hooks/` — `useToast.ts`

**Canvas architecture rules (from `CANVAS_RULES.md` at repo root):**
- Do **not** put new node UI, new panel UI, new toolbar UI, or new business logic back into `CanvasPage.tsx`.
- New canvas features should be placed in the appropriate `src/features/canvas/` subfolder.
- `CanvasPage.tsx` should only receive minimal wiring (node registration, menu entry, shortcut entry, state bridging).
- Do not actively perform large-scale hook extractions (e.g., `useLineDrawing`, `useCanvasClipboard`) unless explicitly required.
- Prefer small, low-risk changes that keep the current architecture stable.

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

**ImageNode generation flow:**
- `ImageNode` is the most complex node type, supporting AI image generation via a mock task system.
- Generation state uses `GenerationTask` and `GenerationHistoryItem` types from `generation.types.ts`.
- The `mockGenerationTask.ts` utility simulates generation with a 2–5 second delay, 10% failure rate, and `AbortSignal` support.
- Image data fields: `inputImage` (original upload, never overwritten by generation), `currentImage` (latest display image), `image` (legacy compatibility), and `generatedImages` (history array).
- Nodes support reference images with typed roles (`primary_building`, `atmosphere_reference`, `vegetation_reference`, `people_reference`, `sky_reference`, `custom_reference`, etc.).

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
- `zh-CN.ts` — Default language (简体中文)
- `en-US.ts` — Fallback language

Translation keys are organized by feature namespace (`common`, `canvas`, `imageNode`, `reference`, `preset`, `style`, `toolbar`, `modal`, `toast`, `error`, `sidebar`, `contextMenu`, `navbar`, `accountPanel`, `account`, `audioNode`, `scriptNode`, `videoMergeNode`, `canvasEdge`, `recentProjects`, `gallery`, `mark`, `upscale`, `home`, `upgradePanel`, `plan`, `faq`, `compare`).

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

There are **no test files** in the project currently. No test runner (Jest, Vitest, Playwright, etc.) is installed.

If you add tests, the conventional location would be alongside source files (e.g., `*.test.tsx`) or in a top-level `tests/` directory inside `app/`.

---

## Security Considerations

- The app is a client-side only SPA with no authentication flow beyond a mocked user menu.
- No API keys or secrets are present in the source code.
- `zod` is available for runtime schema validation if backend APIs are introduced later.
- All images are loaded from the local `public/images/` directory or external avatar URLs (`dicebear.com`).

---

## Adding shadcn/ui Components

This project uses the shadcn/ui "New York" style with CSS variables. To add a new component from inside `app/`:

```bash
npx shadcn add <component-name>
```

The CLI will place it in `src/components/ui/` and follow the existing alias conventions (`@/lib/utils`, `@/components/ui`).
