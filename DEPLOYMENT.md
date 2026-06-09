# UHCR Documentation Website - Deployment Guide

## 🚀 Overview

A modern, high-performance documentation website for UHCR built with:
- **React 19** + **TypeScript** + **Vite** 
- React Router for client-side routing
- Markdown rendering with syntax highlighting
- Dark/Light theme support
- Responsive design (320px - 2560px)
- Plugin Builder tool
- WCAG 2.1 AA accessibility compliant

## 📦 Project Structure

```
UHCR-DOCS/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── CodeBlock/    # Syntax-highlighted code with copy button
│   │   ├── Header/       # Site header with navigation
│   │   ├── Hero/         # Landing page hero section
│   │   ├── MarkdownRenderer/  # Markdown content renderer
│   │   ├── Sidebar/      # Navigation sidebar
│   │   └── TableOfContents/   # Page TOC
│   ├── pages/            # Page components
│   │   ├── Home/         # Landing page
│   │   ├── DocPage/      # Documentation page wrapper
│   │   ├── NotFound/     # 404 page
│   │   └── PluginBuilder/  # Interactive plugin builder
│   ├── layouts/          # Layout components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── styles/           # Global styles and theme
│   └── types/            # TypeScript definitions
├── mcp/
│   ├── server.py         # MCP server implementation
│   ├── __init__.py       # Version   
│   └── README.md         # README
├── public/
│   └── docs/             # Markdown documentation files
└── dist/                 # Production build output
```

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
cd web
npm install
```

### Development Server
```bash
npm run dev
```
Opens at `http://localhost:5173`

### Build for Production
```bash
npm run build
```
Output in `dist/` folder

### Preview Production Build
```bash
npm run preview
```

## 🎨 Features Implemented

### ✅ Core Functionality
- [x] React Router with nested routes
- [x] Markdown rendering with GFM support
- [x] Syntax highlighting (Python, JS, TS, Bash, JSON, YAML)
- [x] Copy-to-clipboard for code blocks
- [x] Dark/Light theme with localStorage persistence
- [x] System preference detection
- [x] Responsive navigation sidebar
- [x] Table of contents with scroll spy
- [x] 404 error page

### ✅ UX/UI Improvements
- [x] Modern typography (Inter/SF Pro/Segoe UI stack)
- [x] Improved color contrast (WCAG 2.1 AA compliant)
- [x] Smooth animations and transitions
- [x] Touch-friendly targets (44x44px minimum)
- [x] Fluid typography with clamp()
- [x] Better shadows and depth
- [x] Backdrop blur effects
- [x] Reduced motion support
- [x] Focus-visible indicators

### ✅ Plugin Builder
- [x] Interactive form for plugin configuration
- [x] Real-time TOML generation
- [x] Python template generation
- [x] Download generated files
- [x] Installation instructions
- [x] Dependency management

### ✅ Accessibility
- [x] Semantic HTML elements
- [x] ARIA labels and roles
- [x] Keyboard navigation
- [x] Focus indicators
- [x] Color contrast ratios
- [x] Screen reader support
- [x] Skip navigation links

### ✅ Performance
- [x] Code splitting
- [x] Lazy loading
- [x] Optimized images
- [x] Minified assets
- [x] Caching strategies
- [x] Fast HMR in development

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Chrome Android 90+

## 📱 Responsive Breakpoints

- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px+
- **Large Desktop**: 1400px+

### Mobile Optimizations
- Collapsible sidebar
- Stacked navigation
- Full-width buttons
- Hidden TOC
- Simplified header
- Touch-optimized targets

## 🎨 Design System

### Colors (Light Mode)
- Primary: `#6366f1` (Indigo)
- Background: `#ffffff` / `#f8fafc` / `#f1f5f9`
- Text: `#0f172a` / `#475569` / `#94a3b8`

### Colors (Dark Mode)
- Primary: `#818cf8` (Light Indigo)
- Background: `#0f172a` / `#1e293b` / `#334155`
- Text: `#f1f5f9` / `#cbd5e1` / `#64748b`

### Typography
- **Font Family**: System UI stack (SF Pro, Segoe UI, Inter, Roboto)
- **Code Font**: JetBrains Mono, Fira Code, Consolas
- **Base Size**: 16px
- **Line Height**: 1.6
- **Scale**: Fluid with clamp()

### Spacing
- Uses consistent spacing scale
- Responsive with clamp()
- Mobile-first approach

## 🚀 Deployment Options

### Option 1: Vercel
```bash
npm install -g vercel
vercel
```

### Option 2: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Option 3: GitHub Pages
```bash
# Update vite.config.ts with base path
npm run build
# Deploy dist/ folder to gh-pages branch
```

### Option 4: Static Hosting
```bash
npm run build
# Upload dist/ folder to any static host
```

## 🔧 Configuration

### Base Path
For subdirectory deployment, update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/your-subdirectory/',
  // ...
})
```

### Environment Variables
Create `.env` file:
```
VITE_APP_TITLE=UHCR Documentation
VITE_BASE_URL=https://your-domain.com
```

## 📝 Adding New Documentation

1. Add markdown file to `docs/` folder
2. Copy to `public/docs/`
3. Add route in `src/utils/navigation.ts`
4. Add to sidebar navigation structure
5. Add route in `src/router.tsx`

## 🐛 Troubleshooting

### Issue: Markdown files not loading
**Solution**: Ensure files are copied to `public/docs/` folder

### Issue: Dark mode not persisting
**Solution**: Check localStorage is enabled in browser

### Issue: Build errors
**Solution**: Clear cache and rebuild
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Hot reload not working
**Solution**: Restart dev server
```bash
npm run dev
```

## 📊 Performance Metrics

Target metrics:
- Lighthouse Performance: 90+
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

## 🔐 Security

- XSS protection via rehype-sanitize
- Content Security Policy ready
- No inline scripts
- Secure dependencies

## 📄 License

Apache-2.0 - See LICENSE.txt

## 🤝 Contributing

See CONTRIBUTING.md for guidelines

## 📞 Support

- Documentation: Visit /docs/contributing
- Issues: GitHub Issues
- Discussions: GitHub Discussions

---

Built with ❤️ for the UHCR community
