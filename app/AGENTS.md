# Visioner — AI Video Creation Platform

> A React-based single-page application for AI-driven video and image content creation. The project provides a homepage for discovering content and a visual node-based canvas editor for building multimedia workflows.

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
| Canvas | @xyflow/react | 12.10 |
| Carousel | embla-carousel-react | 8.6 |
| Icons | lucide-react | 0.562 |
| Forms | react-hook-form + zod | 7.70 / 4.3 |
| Charts | recharts | 2.15 |

---

## Project Structure

```
├── public/
│   └── images/              # Static image assets (banners, show covers, project thumbs)
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components (40+ primitives: button, dialog, form, etc.)
│   │   ├── HeroCarousel.tsx # Home page banner carousel
│   │   ├── Navbar.tsx       # Top navigation bar (home / canvas variants)
│   │   ├── RecentProjects.tsx # Project list with "create new" card
│   │   └── TVShow.tsx       # Video gallery with category filter and search
│   ├── data/
│   │   └── siteData.ts      # Static mock data: banners, projects, TV shows, canvas nodes/edges
│   ├── hooks/
│   │   └── use-mobile.ts    # useIsMobile hook (breakpoint 768px)
│   ├── lib/
│   │   └── utils.ts         # cn() utility for Tailwind class merging
│   ├── pages/
│   │   ├── Home.tsx         # Landing page composing Navbar + HeroCarousel + RecentProjects + TVShow
│   │   └── CanvasPage.tsx   # Visual node editor using React Flow
│   ├── App.tsx              # Root router with BrowserRouter, Routes for / and /canvas
│   ├── main.tsx             # React root render with StrictMode
│   └── index.css            # Global styles, Tailwind directives, custom scrollbar, CSS variables
├── components.json          # shadcn/ui configuration
├── vite.config.ts           # Vite config: base './', port 3000, @/ -> ./src alias
├── tailwind.config.js       # Custom theme extending shadcn color tokens, animations
├── tsconfig.app.json        # Strict TypeScript: noUnusedLocals, noUnusedParameters
└── eslint.config.js         # ESLint flat config: TS + react-hooks + react-refresh
```

---

## Build & Development Commands

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
- **ESLint**: The project disables `@typescript-eslint/no-explicit-any` in a few places (`CanvasPage.tsx`) for React Flow node type definitions. Prefer avoiding `any` in new code.

---

## Key Modules

### Canvas Editor (`src/pages/CanvasPage.tsx`)

A node-based editor built on `@xyflow/react` supporting four custom node types:

- `image` — Displays an image with optional prompt text and image-editing toolbar on selection.
- `video` — Video placeholder with model/seed info on selection.
- `text` — Checklist for text-generation tasks.
- `audio` — Audio waveform visualization placeholder.

Features:
- Left sidebar tool panel (add nodes, AI toolbox, assets, history, tutorial, support).
- Context menu on right-clicking the canvas to add nodes.
- Floating toolbar appears when any node is selected (panorama, lighting, crop, etc.).
- MiniMap and Controls are visible.
- Edges are cyan (`#00d4ff`) smooth-step curves.

### Data Layer (`src/data/siteData.ts`)

All content is currently static/mock data. This file exports:
- `banners` — Hero carousel slides.
- `recentProjects` — Project cards for the home page.
- `tvShowData` / `tvShowCategories` — Gallery items and filter tabs.
- `initialNodes` / `initialEdges` — Default canvas graph.

There is no backend API integration at this time.

---

## Testing

There are **no test files** in the project currently. No test runner (Jest, Vitest, Playwright, etc.) is installed.

If you add tests, the conventional location would be alongside source files (e.g., `*.test.tsx`) or in a top-level `tests/` directory.

---

## Dependencies of Note

- **@xyflow/react** — React Flow canvas; its CSS must be imported (`@xyflow/react/dist/style.css`).
- **embla-carousel-react** — Lightweight carousel for the hero banner.
- **next-themes** — Present in dependencies but not actively used (shadcn/ui scaffold default).
- **kimi-plugin-inspect-react** — Dev-only Vite plugin for React component inspection.

---

## Security Considerations

- The app is a client-side only SPA with no authentication flow beyond a mocked user menu.
- No API keys or secrets are present in the source code.
- `zod` is available for runtime schema validation if backend APIs are introduced later.
- All images are loaded from the local `public/images/` directory or external avatar URLs (`dicebear.com`).

---

## Adding shadcn/ui Components

This project uses the shadcn/ui "New York" style with CSS variables. To add a new component:

```bash
npx shadcn add <component-name>
```

The CLI will place it in `src/components/ui/` and follow the existing alias conventions (`@/lib/utils`, `@/components/ui`).
