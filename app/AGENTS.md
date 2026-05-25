# Visioner — AI Video & Image Creation Platform

> A React-based single-page application for AI-driven video and image content creation. The project provides a homepage for discovering content and a visual node-based canvas editor for building multimedia workflows.

**Important:** All application source code, configuration, and build assets live inside the `app/` subdirectory. The repository root only contains `.git/`, `package-lock.json`, `CANVAS_RULES.md`, and the `app/` folder. Every command below should be run from `app/` unless noted otherwise.

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

---

## Project Structure

```
app/
├── public/
│   ├── assets/              # Static assets (examples, home banners)
│   └── images/              # Static image assets (banners, show covers, project thumbs)
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components (50+ primitives: button, dialog, form, etc.)
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
│   │   ├── components/      # Canvas UI components (stage, sidebar, toolbars, menus)
│   │   │   ├── CanvasContextMenus.tsx
│   │   │   ├── CanvasSidebar.tsx
│   │   │   ├── CanvasStage.tsx
│   │   │   ├── CanvasToolbar.tsx
│   │   │   ├── GlobalDropForwarder.tsx
│   │   │   ├── ImagePreviewModal.tsx
│   │   │   ├── ImageRoleTag.tsx
│   │   │   ├── ImageToolbar.tsx
│   │   │   ├── NodeShell.tsx
│   │   │   ├── PresetPickerModal.tsx
│   │   │   ├── ShortcutRow.tsx
│   │   │   ├── StylePickerModal.tsx
│   │   │   ├── TempConnectionLine.tsx
│   │   │   └── UpscaleParamPanel.tsx
│   │   ├── constants/       # Canvas constants, presets, image usage configs
│   │   │   ├── canvasConstants.ts
│   │   │   ├── imageUsages.ts
│   │   │   └── presets.ts
│   │   ├── hooks/           # Canvas-specific hooks
│   │   │   └── useToast.ts
│   │   ├── nodes/           # Node type components
│   │   │   ├── ImageNode/
│   │   │   │   ├── ImageNode.tsx
│   │   │   │   ├── ImageNodeControlPanel.tsx
│   │   │   │   └── index.ts
│   │   │   ├── AudioNode.tsx
│   │   │   ├── ScriptNode.tsx
│   │   │   ├── TextNode.tsx
│   │   │   ├── UpscaleNode.tsx
│   │   │   ├── VideoMergeNode.tsx
│   │   │   └── VideoNode.tsx
│   │   ├── types/           # Canvas-specific TypeScript types
│   │   │   ├── canvas.types.ts
│   │   │   ├── generation.types.ts
│   │   │   ├── imageNode.types.ts
│   │   │   └── imageNodeData.types.ts
│   │   └── utils/           # Pure utility functions
│   │       ├── mockGenerationTask.ts
│   │       ├── presetSelection.ts
│   │       ├── promptUtils.ts
│   │       ├── referenceUtils.ts
│   │       └── userPresets.ts
│   ├── data/
│   │   └── siteData.ts      # Static mock data: banners, projects, gallery, canvas nodes/edges
│   ├── hooks/
│   │   └── use-mobile.ts    # useIsMobile hook (breakpoint 768px)
│   ├── i18n/                # Internationalization (react-i18next)
│   │   ├── index.ts         # i18n init with zh-CN default, en-US fallback
│   │   └── locales/
│   │       ├── zh-CN.ts     # Full Chinese translation (~850 lines)
│   │       └── en-US.ts     # English translation
│   ├── lib/
│   │   ├── nodeEditor/
│   │   │   ├── dag.ts       # Cycle detection, topological sort, execution batches, input hashing
│   │   │   └── types.ts     # Port types, EditorNode, EditorEdge, Camera, connection validation
│   │   ├── nodeSystem.ts    # Node port config & DAG execution engine for React Flow canvas
│   │   └── utils.ts         # cn() utility for Tailwind class merging
│   ├── pages/
│   │   ├── Home.tsx         # Landing page composing Navbar + HeroCarousel + RecentProjects + TVShow
│   │   ├── CanvasPage.tsx   # Visual node editor page entry (~911 lines)
│   │   └── add_thumbnails.py# Helper script to inject thumbnails into CanvasPage preset data
│   ├── services/
│   │   └── accountApi.ts    # Mock API for user profile, credits, billing, devices, plans
│   ├── App.css              # Minimal root-level styles
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
- **TypeScript**: Strict mode is enabled. `noUnusedLocals` and `noUnusedParameters` are active; unused variables will fail the build. `verbatimModuleSyntax` is also enabled, so type-only imports must use the `type` keyword (e.g., `import type { Foo } from '...'` or `import { type Foo } from '...'`).
- **ESLint**: The project disables `@typescript-eslint/no-explicit-any` in `src/lib/nodeSystem.ts` for React Flow node data definitions. Prefer avoiding `any` in new code.

---

## Key Modules

### React Flow Canvas Editor (`src/pages/CanvasPage.tsx` + `src/features/canvas/`)

The canvas editor has been refactored from a monolithic file into a feature module. `CanvasPage.tsx` (~911 lines) acts as the page entry and core state container, while UI and node logic live in `src/features/canvas/`.

**`CanvasPage.tsx` / `FlowCanvas` responsibilities:**
- Page entry and React Flow provider wrapper
- Core `nodes` / `edges` / `tempLine` state management
- Line drawing logic (custom connection lines from output ports)
- Copy / paste / duplicate / delete logic
- Keyboard shortcuts (`Ctrl+C` / `Ctrl+V`, `Delete` / `Backspace`)
- Drag-and-drop upload handling
- Box-selection pre-highlight logic
- Context menu state
- Node registration and menu/drag/shortcut entry wiring

**Extracted UI components (`src/features/canvas/components/`):**
- `CanvasStage.tsx` — React Flow container, Background, MiniMap, drop overlay, temp connection line, reject tooltip, upload toast
- `CanvasSidebar.tsx` — Left sidebar pill, expanded panels (add, AI toolbox, assets, history, support)
- `CanvasContextMenus.tsx` — Canvas right-click menu, node creation menu, node right-click menu
- `CanvasToolbar.tsx` — Bottom toolbar (MiniMap toggle, grid toggle, reset, zoom, help panel)
- `GlobalDropForwarder.tsx` — Browser-level drag/drop event forwarding
- `PresetPickerModal.tsx` — Preset selection modal for image generation
- `StylePickerModal.tsx` — Style selection modal
- `ImagePreviewModal.tsx` — Fullscreen image preview
- `ImageRoleTag.tsx` — Reference image role tag component
- `ImageToolbar.tsx` — Floating toolbar for selected image nodes
- `UpscaleParamPanel.tsx` — Upscale parameter configuration panel
- `TempConnectionLine.tsx` — Custom temporary connection line
- `NodeShell.tsx` — Common node wrapper shell
- `ShortcutRow.tsx` — Keyboard shortcut help row

**Node components (`src/features/canvas/nodes/`):**
- `ImageNode/` — Image node with control panel, prompt box, reference image area, generation history, preset/style pickers
- `VideoNode.tsx`
- `TextNode.tsx`
- `AudioNode.tsx`
- `ScriptNode.tsx`
- `VideoMergeNode.tsx`
- `UpscaleNode.tsx`

**Supporting modules:**
- `types/` — `canvas.types.ts`, `imageNode.types.ts`, `generation.types.ts`, `imageNodeData.types.ts`
- `constants/` — `canvasConstants.ts`, `imageUsages.ts`, `presets.ts`
- `utils/` — `promptUtils.ts`, `referenceUtils.ts`, `mockGenerationTask.ts`, `presetSelection.ts`, `userPresets.ts`
- `hooks/` — `useToast.ts`

**Canvas architecture rules (from `CANVAS_RULES.md`):**
- Do **not** put new node UI, new panel UI, new toolbar UI, or new business logic back into `CanvasPage.tsx`.
- New canvas features should be placed in the appropriate `src/features/canvas/` subfolder.
- `CanvasPage.tsx` should only receive minimal wiring (node registration, menu entry, shortcut entry, state bridging).
- Do not actively perform large-scale hook extractions (e.g., `useLineDrawing`, `useCanvasClipboard`) unless explicitly required.
- Prefer small, low-risk changes that keep the current architecture stable.

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
- Typed port system (IMAGE, PROMPT, LATENT, MODEL, NUMBER) with colored handles and connection validation.
- Fake/mock generation flow with task states (running, success, error), history tracking, and abort support.

### Custom 2D Canvas Node Editor (`src/components/NodeEditor/`)

An independent canvas-based node editor rendered on a raw `<canvas>` element. **Note:** This module is not currently imported or wired into any route; it is a standalone subsystem.

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

### Internationalization (`src/i18n/`)

The app uses `react-i18next` with `i18next`. Default language is `zh-CN` (Chinese Simplified) with `en-US` as fallback.

- `src/i18n/index.ts` — Initializes i18n with resources and interpolation settings.
- `src/i18n/locales/zh-CN.ts` — Comprehensive Chinese translations covering all UI sections (canvas, image node, presets, styles, toolbar, modals, account, etc.).
- `src/i18n/locales/en-US.ts` — English translations.

All user-facing text should be added to both locale files and accessed via the `useTranslation()` hook or the `t` function.

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

---

## Development Collaboration & Execution Rules

可以使用终端辅助开发，但执行会明显修改项目状态、依赖状态或 Git 状态的操作前，需要先说明目的、影响和预期结果。

### 需要特别谨慎的操作

以下操作执行前**必须先说明目的、影响和预期结果**，涉及 Git 或依赖变更时须等待明确批准：

- `git commit` / `git push` / `git reset` / `git checkout` / `git rebase`
- `npm install` / `pnpm install` / `yarn add`
- 修改 `package.json` / `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`
- 删除文件、批量移动文件、批量重命名文件
- 修改环境变量或配置文件（如 `.env`、`vite.config.ts`）
- 发布、部署、清理缓存等影响较大的命令

### 新增依赖的规则

如确实需要新增依赖或修改 package 文件，请先说明：

- **为什么现有依赖无法满足当前需求**
- **新依赖的用途和预期收益**
- **会影响哪些文件**
- **是否有更轻量的替代方案**（如使用现有工具库、浏览器原生 API、手写实现等）

获得明确批准后，方可执行安装或修改。

### 构建与验证命令

开发过程中可以执行构建和验证类命令辅助开发，例如：

```bash
cd app && npm run build
cd app && npm run lint
cd app && npm run dev
```

执行前需说明目的。单次任务中，构建/验证类命令**最多执行 3 次**；超过则停止，提供建议命令供手动执行。

### 无关命令禁止

不要执行与当前任务无关的终端命令。

### 命令执行后的说明

修改或验证完成后，说明执行了哪些命令及结果。
