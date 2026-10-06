# GenomeAI — Multi-Agent Genetic Disease Analysis Platform

A React + Three.js redesign of the genetic disease analysis project — dark,
glassmorphic, biotech-SaaS styling with an animated DNA hero, an interactive
AI agent architecture diagram, a live analysis demo, a pannable/zoomable
knowledge graph, and a sample clinical dashboard.

## Getting started

```bash
npm install
npm run dev       # local dev server (Vite)
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

## Project structure

```
src/
  main.jsx              entry point, mounts <App />
  App.jsx                page shell: nav, mobile menu, hero, composes all sections
  index.css               all styling (design tokens, layout, animation)

  components/
    DNABackground.jsx     the Three.js animated DNA helix used in the hero

  sections/                one file per page section, in the order they render
    Stats.jsx
    Agents.jsx             the AI Core diagram
    Workflow.jsx
    GeneDemo.jsx           the "Analyze Gene" live demo
    KnowledgeGraph.jsx     pan/zoom biomedical graph
    Dashboard.jsx
    TrustedSources.jsx
    ReportPreview.jsx
    Footer.jsx

  hooks/
    useCountUp.js          animated number count-up, triggered on scroll-into-view
    useInView.js           thin IntersectionObserver wrapper

  data/                    all placeholder content lives here — swap these
                           out for real API data without touching any UI code
    genes.js
    stats.js
    agents.js
    workflow.js
    geneDemo.js
    knowledgeGraph.js
    dashboard.js
    trustedSources.js
```

## Connecting real data

Every section reads from a plain data file in `src/data/`. To wire up a real
backend:

1. Replace the static export in the relevant `src/data/*.js` file with a
   `fetch`/API call (e.g. in a `useEffect` inside the section, or lift state
   up into `App.jsx` and pass it down as props).
2. `GeneDemo.jsx`'s `handleAnalyze()` currently just steps through a
   hardcoded timeline (`DEMO_STEPS`) — replace that function body with your
   real analysis call, updating `stepIndex`/`status` as your backend reports
   progress (e.g. via polling or a websocket), and swap `DEMO_RESULT` for the
   real response payload.
3. `ReportPreview.jsx`'s download button currently just shows a "sample
   only" toast — wire `handleDownload()` to your real report-generation
   endpoint.

## Notes

- Colors, fonts, and spacing are all defined as CSS custom properties at the
  top of `index.css` (`--bg`, `--primary`, `--secondary`, `--accent`,
  `--success`) — change them there to re-theme the whole app.
- The DNA background is intentionally scoped to the hero section only
  (`overflow: hidden` on `.ga-hero`) so it never interferes with reading
  text further down the page. Everything below the hero uses lightweight
  CSS-only ambient motion (`.ga-ambient-glow`) instead of WebGL, to keep
  the rest of the page cheap to render.
- Every interactive section (AI Agents diagram, Knowledge Graph, Gene Demo)
  was built and manually verified in a real browser during development —
  see inline comments for any behavior that isn't obvious from the JSX
  alone.
