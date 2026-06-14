# UHCR Documentation Web Portal: Deployment Guide

## Executive Summary

The UHCR Documentation Web Portal is a responsive, single-page application (SPA) built using React 19, TypeScript, and Vite. Designed to load static markdown files client-side, the application features an interactive Plugin Builder tool, light/dark mode styling with local storage persistence, and WCAG 2.1 AA contrast compliance. This document serves as the installation, compilation, and deployment guide for production hosting environments.

## Table of Contents

- [Project Directory Layout](#project-directory-layout)
- [Development Workflow](#development-workflow)
- [Design System & Theme Tokens](#design-system--theme-tokens)
- [Hosting & Production Deployment](#hosting--production-deployment)
- [Adding New Documentation Files](#adding-new-documentation-files)
- [Security & Performance Guidelines](#security--performance-guidelines)
- [Troubleshooting](#troubleshooting)

---

## Project Directory Layout

```
UHCR-DOCS/
├── src/
│   ├── components/       # UI Components (CodeBlock, Sidebar, TOC, etc.)
│   ├── pages/            # Page Views (Home, DocPage, PluginBuilder, 404)
│   ├── layouts/          # Responsive grids and wrappers
│   ├── hooks/            # Custom React hooks (theme context, scrollSpy)
│   ├── utils/            # Sidebars and router mapping helpers
│   ├── styles/           # Global design system CSS tokens
│   └── types/            # TypeScript interface definitions
├── public/
│   └── docs/             # Source markdown documentation files
├── dist/                 # Compiled distribution assets
└── mcp/                  # Model Context Protocol service source
```

---

## Development Workflow

### Prerequisites
- Node.js version 18.0.0 or higher.
- Package manager (`npm` or `yarn`).

### Installation
From the repository root:
```bash
npm install
```

### Dev Execution
Launch the local Vite hot-reload server:
```bash
npm run dev
```
Navigate to `http://localhost:5173` in a web browser.

### Production Compilation
Build minimized static assets:
```bash
npm run build
```
The output is written to the `./dist/` directory.

### Preview Build
Verify compiled production assets locally:
```bash
npm run preview
```

---

## Design System & Theme Tokens

The UI adapts automatically to system dark mode preferences, supporting a fluid typography scale constructed via CSS `clamp()` and backdrop blurs.

### Core Color Palette (Light Mode)
- **Primary Accent**: `#6366f1` (Indigo)
- **Neutral Background**: `#ffffff` / `#f8fafc` / `#f1f5f9`
- **Text Color**: `#0f172a` (Primary) / `#475569` (Secondary)

### Core Color Palette (Dark Mode)
- **Primary Accent**: `#818cf8` (Light Indigo)
- **Neutral Background**: `#0f172a` / `#1e293b` / `#334155`
- **Text Color**: `#f1f5f9` (Primary) / `#cbd5e1` (Secondary)

### Typography Stack
- **Standard Text**: System UI font stack (`Inter`, `system-ui`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`).
- **Monospace Code**: `JetBrains Mono`, `Fira Code`, `Consolas`.

---

## Hosting & Production Deployment

Because the application compiles to flat, static HTML/JS/CSS assets, it can be hosted on any standard static web service:

### Vercel Deployment
```bash
npm install -g vercel
vercel --prod
```

### Netlify Deployment
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### GitHub Pages Deployment
1. Set the correct `base` URL in `vite.config.ts` matching your repository path:
   ```typescript
   export default defineConfig({
     base: '/UHCR-DOCS/',
   })
   ```
2. Build the site and push the `./dist` folder to the target deployment branch:
   ```bash
   npm run build
   npx gh-pages -d dist
   ```

---

## Adding New Documentation Files

To publish a new markdown guide on the documentation website:

1. Write the content in standard markdown and place the file in `public/docs/`.
2. Add a route definition mapping the file path in `src/utils/navigation.ts` inside `docRoutes`.
3. Register the new item within the structured sidebar navigation array `navigation` in the same file.
4. Add the route entry inside `src/router.tsx` to handle client-side hash routing.

---

## Security & Performance Guidelines

- **Content Protection**: Markdown content is sanitized using `rehype-sanitize` to defend against XSS vectors in code block previews.
- **Asset Split**: Vite automatically splits code bundles per page routing; do not bypass dynamic page imports.
- **Image Optimization**: Ensure any images embedded in markdown are pre-compressed and stored in the `/public/` assets folder.

---

## Troubleshooting

### Issue: Markdown pages return 404/Empty State
*Cause*: The target markdown file was not copied to the `public/docs/` directory, or there is a mismatch in the file name casing.  
*Solution*: Verify that the markdown file exists under `public/docs/` and that the casing matches the path entry in `navigation.ts`.

### Issue: Tailwind utility classes not updating
*Cause*: The project utilizes standard Vanilla CSS variables and utility classes. Tailwind is not loaded by default.  
*Solution*: Add custom styling rules directly inside the global CSS configurations under `src/styles/`.

---

## License

This documentation portal is licensed under the Apache-2.0 License.
