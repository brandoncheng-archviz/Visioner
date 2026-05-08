# Visioner — AI Video Creation Platform

> A React-based single-page application for AI-driven video and image content creation. The project provides a homepage for discovering content and a visual node-based canvas editor for building multimedia workflows.

**Important:** All application source code, configuration, and build assets live inside the `app/` subdirectory. The repository root only contains `.git/` and the `app/` folder. Every command below should be run from `app/` unless noted otherwise.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2 |
| Language | TypeScript | ~5.9 |
| Build Tool | Vite | 7.2 |
| Styling | Tailwind CSS | 3.4 |
| UI Components | shadcn/ui (New York style) | — |
| Router | react-router-dom | 7.x |
| Canvas | @xyflow/react + custom 2D canvas | 12.10 |
| Carousel | embla-carousel-react | 8.6 |
| Icons | lucide-react | 0.562 |
| Forms | react-hook-form + zod | 7.70 / 4.3 |
| Charts | recharts | 2.15 |

---

## Project Structure

```
app/
├── public/
│   └── images/              # Static image assets (banners, show covers, project thumbs)
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components (40+ primitives: button, dialog, form, etc.)
│   │   ├── NodeEditor/      # Custom 2D canvas node editor (NodeEditorCanvas.tsx, NodeRegistry.ts)
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
│   │   └── siteData.ts      # Static mock data: banners, projects, TV shows, canvas nodes/edges
│   ├── hooks/
│   │   └── use-mobile.ts    # useIsMobile hook (breakpoint 768px)
│   ├── lib/
│   │   ├── nodeEditor/
│   │   │   ├── dag.ts       # Cycle detection, topological sort, execution batches
│   │   │   └── types.ts     # Port types, EditorNode, EditorEdge, connection validation
│   │   ├── nodeSystem.ts    # Node port config & DAG execution engine for React Flow canvas
│   │   └── utils.ts         # cn() utility for Tailwind class merging
│   ├── pages/
│   │   ├── Home.tsx         # Landing page composing Navbar + HeroCarousel + RecentProjects + TVShow
│   │   └── CanvasPage.tsx   # Visual node editor (React Flow based)
│   ├── services/
│   │   └── accountApi.ts    # Mock API for user profile, credits, billing, devices, plans
│   ├── App.tsx              # Root router with BrowserRouter, Routes for / and /canvas
│   ├── main.tsx             # React root render with StrictMode
│   └── index.css            # Global styles, Tailwind directives, ReactFlow custom CSS, CSS variables
├── components.json          # shadcn/ui configuration
├── vite.config.ts           # Vite config: base './', port 3000, @/ -> ./src alias
├── tailwind.config.js       # Custom theme extending shadcn color tokens, animations
├── tsconfig.json            # Project references to tsconfig.app.json & tsconfig.node.json
├── tsconfig.app.json        # Strict TypeScript: noUnusedLocals, noUnusedParameters
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

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` | Landing page with discovery content |
| `/canvas` | `CanvasPage` | New or existing canvas editor |
| `/canvas/:projectId` | `CanvasPage` | Canvas editor for a specific project |

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
- **TypeScript**: Strict mode is enabled. `noUnusedLocals` and `noUnusedParameters` are active; unused variables will fail the build.
- **ESLint**: The project disables `@typescript-eslint/no-explicit-any` in a few places (`CanvasPage.tsx`, `nodeSystem.ts`) for React Flow node type definitions. Prefer avoiding `any` in new code.

---

## Key Modules

### React Flow Canvas Editor (`src/pages/CanvasPage.tsx`)

A node-based editor built on `@xyflow/react` supporting six custom node types:

- `image` — Displays an image with optional prompt text, editable name, file upload, and a floating prompt panel on selection.
- `video` — Video placeholder with model/seed info on selection.
- `text` — Checklist for text-generation tasks.
- `audio` — Audio waveform visualization placeholder.
- `script` — Script processing placeholder.
- `video-merge` — Video composition placeholder.

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

An independent canvas-based node editor rendered on a raw `<canvas>` element:

- `NodeEditorCanvas.tsx` — Main component handling pan, zoom, selection, connection dragging, and rendering.
- `NodeRegistry.ts` — Node templates (`PromptInput`, `LoadModel`, `TextEncode`, `EmptyLatent`, `KSampler`, `VAEDecode`, `PreviewImage`) with typed ports.
- `src/lib/nodeEditor/types.ts` — Core types (`EditorNode`, `EditorEdge`, `PortType`, `Camera`, `ConnectionPreview`) and connection validation (`canConnect`).
- `src/lib/nodeEditor/dag.ts` — Cycle detection (DFS), topological sort (Kahn), execution batching, and input hashing.

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
- `galleryData` / `galleryCategories` — Gallery items and filter tabs.
- `getProjectCanvasData(projectId)` — Returns nodes for a given project ID.

There is no backend API integration at this time.

### Account Service (`src/services/accountApi.ts`)

Mock API service for user account features (profile, credits, usage, billing, devices, plans). When a real backend is ready, set `VITE_API_BASE_URL` and the service will switch from mock data to real `fetch` calls.

---

## Testing

There are **no test files** in the project currently. No test runner (Jest, Vitest, Playwright, etc.) is installed.

If you add tests, the conventional location would be alongside source files (e.g., `*.test.tsx`) or in a top-level `tests/` directory inside `app/`.

---

## Dependencies of Note

- **@xyflow/react** — React Flow canvas; its CSS must be imported (`@xyflow/react/dist/style.css`).
- **embla-carousel-react** — Lightweight carousel for the hero banner.
- **next-themes** — Present in dependencies but not actively used (shadcn/ui scaffold default).
- **kimi-plugin-inspect-react** — Dev-only Vite plugin for React component inspection.
- **zustand** — Present in dependencies but not actively used in current source.

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
