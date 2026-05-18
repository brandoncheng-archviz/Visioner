# Visioner — AI Video Creation Platform

> A React-based single-page application for AI-driven video and image content creation. The project provides a homepage for discovering content and a visual node-based canvas editor for building multimedia workflows.

**Important:** All application source code, configuration, and build assets live inside the `app/` subdirectory. The repository root only contains `.git/` and the `app/` folder. Every command below should be run from `app/` unless noted otherwise.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | `^19.2.0` |
| Language | TypeScript | `~5.9.3` |
| Build Tool | Vite | `^7.2.4` |
| Styling | Tailwind CSS | `^3.4.19` |
| PostCSS | autoprefixer | `^10.4.23` |
| UI Components | shadcn/ui (New York style) | — |
| Router | react-router-dom | `^7.14.2` |
| Canvas | @xyflow/react | `^12.10.2` |
| Carousel | embla-carousel-react | `^8.6.0` |
| Icons | lucide-react | `^0.562.0` |
| Forms | react-hook-form + zod | `^7.70.0` / `^4.3.5` |
| Charts | recharts | `^2.15.4` |
| Dev Plugin | kimi-plugin-inspect-react | `^1.0.3` |

---

## Project Structure

```
app/
├── public/
│   └── images/              # Static image assets (banners, show covers, project thumbs)
├── src/
│   ├── components/
│   │   ├── ui/              # 53+ shadcn/ui primitives (button, dialog, form, carousel, etc.)
│   │   ├── NodeEditor/      # Custom 2D canvas node editor (not wired to any route)
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
│   ├── data/
│   │   └── siteData.ts      # Static mock data: banners, projects, gallery, canvas presets
│   ├── hooks/
│   │   └── use-mobile.ts    # useIsMobile hook (breakpoint 768px)
│   ├── lib/
│   │   ├── nodeEditor/
│   │   │   ├── dag.ts       # Cycle detection, topological sort, execution batches, input hashing
│   │   │   └── types.ts     # Port types, EditorNode, EditorEdge, Camera, connection validation
│   │   ├── nodeSystem.ts    # Node port config & DAG execution engine for React Flow canvas
│   │   └── utils.ts         # cn() utility for Tailwind class merging
│   ├── pages/
│   │   ├── Home.tsx         # Landing page composing Navbar + HeroCarousel + RecentProjects + TVShow
│   │   ├── CanvasPage.tsx   # React Flow node editor (~5,050 lines)
│   │   └── add_thumbnails.py # Helper script to inject thumbnails into CanvasPage preset data
│   ├── services/
│   │   └── accountApi.ts    # Mock API for user profile, credits, billing, devices, plans
│   ├── App.css              # Minimal root-level styles
│   ├── App.tsx              # Root router with BrowserRouter, Routes for / and /canvas
│   ├── index.css            # Global styles, Tailwind directives, ReactFlow custom CSS, CSS variables
│   └── main.tsx             # React root render with StrictMode
├── AGENTS.md                # Agent-focused project documentation
├── README.md                # Generic Vite + React README
├── info.md                  # Setup notes (Node 20, Tailwind v3.4.19, Vite v7.2.4)
├── components.json          # shadcn/ui configuration
├── vite.config.ts           # Vite config: base './', port 3000, @/ -> ./src alias
├── tailwind.config.js       # Custom theme extending shadcn color tokens, animations
├── tsconfig.json            # Project references to tsconfig.app.json & tsconfig.node.json
├── tsconfig.app.json        # Strict TypeScript app config
├── tsconfig.node.json       # Node-side config for Vite
├── eslint.config.js         # ESLint flat config: TS + react-hooks + react-refresh
└── postcss.config.js        # Tailwind + autoprefixer
```

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

The `vite.config.ts` sets `base: './'` so the built app can be served from any subpath.

---

## Routing

Handled in `src/App.tsx` via `react-router-dom`:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` | Landing page with discovery content |
| `/canvas` | `CanvasPage` | New or existing canvas editor |
| `/canvas/:projectId` | `CanvasPage` | Canvas editor for a specific project |

---

## Key Modules

### React Flow Canvas Editor (`src/pages/CanvasPage.tsx`)

A node-based editor built on `@xyflow/react` supporting seven custom node types:

- `image` — Displays an image with optional prompt text, editable name, file upload, and a floating prompt panel on selection.
- `video` — Video placeholder with model/seed info on selection.
- `text` — Checklist for text-generation tasks.
- `audio` — Audio waveform visualization placeholder.
- `script` — Script processing placeholder.
- `video-merge` — Video composition placeholder.
- `upscale` — Image upscaling placeholder.

Features:
- Left sidebar tool panel (add nodes, AI toolbox, assets, history, tutorial, support).
- Context menu on right-clicking the canvas to add nodes.
- Node context menu with copy, paste, duplicate, delete, and save-to-library actions.
- Floating toolbar appears when any node is selected (panorama, lighting, crop, etc.).
- MiniMap and Controls are visible.
- Edges are cyan (`#00d4ff`) smooth-step curves when selected, gray (`#555`) otherwise.
- Custom connection line drawing from output ports with cycle detection, type validation, and drop-to-create-node support.
- Keyboard shortcuts: `Ctrl+C` / `Ctrl+V` for copy/paste, `Delete` / `Backspace` to remove selected nodes/edges.
- Zoom slider, grid snap toggle, fit view reset, and help panel in the bottom toolbar.

### Custom 2D Canvas Node Editor (`src/components/NodeEditor/`)

An independent canvas-based node editor rendered on a raw `<canvas>` element. **Note:** This module is not currently wired into any route; it is a standalone subsystem.

- `NodeEditorCanvas.tsx` — Main component handling pan, zoom, selection, connection dragging, and rendering.
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
- **Component patterns**: shadcn/ui components use `class-variance-authority` (cva) for variants and the `cn()` utility from `@/lib/utils` for conditional class merging.
- **TypeScript**: Strict mode is enabled with the following additional checks:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `verbatimModuleSyntax: true` (type-only imports must use the `type` keyword)
  - `erasableSyntaxOnly: true`
  - `noUncheckedSideEffectImports: true`
- **ESLint**: Flat config using `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`. The `@typescript-eslint/no-explicit-any` rule is disabled only in `src/lib/nodeSystem.ts` for React Flow node data definitions. Prefer avoiding `any` in new code.

---

## Testing

There are **no test files** in the project currently. No test runner (Jest, Vitest, Playwright, etc.) is installed.

If you add tests, the conventional location would be alongside source files (e.g., `*.test.tsx`) or in a top-level `tests/` directory inside `app/`.

---

## Deployment & Build Process

- The app is a **client-side only SPA** with no server-side rendering.
- No CI/CD configuration files exist (no `.github/workflows`, `.gitlab-ci.yml`, etc.).
- No Docker, `netlify.toml`, `vercel.json`, or deployment scripts exist at the project root.
- Production build is a standard Vite static output (`dist/`) with `base: './'`, suitable for any static host or subpath deployment.

---

## Security Considerations

- The app is a client-side only SPA with no authentication flow beyond a mocked user menu.
- No API keys or secrets are present in the source code.
- `zod` is available for runtime schema validation if backend APIs are introduced later.
- All images are loaded from the local `public/images/` directory or external avatar URLs (`dicebear.com`).

---

## Dependencies of Note

- **@xyflow/react** — React Flow canvas; its CSS must be imported (`@xyflow/react/dist/style.css`).
- **embla-carousel-react** — Lightweight carousel for the hero banner.
- **next-themes** — Used by the `sonner` toast component for theme-aware rendering.
- **kimi-plugin-inspect-react** — Dev-only Vite plugin for React component inspection.
- **zustand** — Present as a transitive dependency of `@xyflow/react` but not directly used in application code.

---

## Adding shadcn/ui Components

This project uses the shadcn/ui "New York" style with CSS variables. To add a new component from inside `app/`:

```bash
npx shadcn add <component-name>
```

The CLI will place it in `src/components/ui/` and follow the existing alias conventions (`@/lib/utils`, `@/components/ui`).
