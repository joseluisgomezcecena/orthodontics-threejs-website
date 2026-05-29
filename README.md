# Orthodontics Three.js Website

A product landing page for orthodontic manufacturers built with vanilla JavaScript and Three.js. Features an interactive 3D bracket viewer with spatial annotations, cinematic camera transitions, and a fully responsive layout.

## Features

- **Interactive 3D viewer** — drag to rotate, scroll to zoom, touch supported
- **Spatial CSS2D labels** — annotations that rotate with the 3D model in real time
- **Cinematic fly-to** — GSAP-powered camera transition triggered by the MIM + Fresado badge
- **Procedural fallback** — if the GLB fails to load, a code-generated bracket keeps the hero section intact
- **Premium material system** — MeshStandardMaterial with metalness/roughness tuned for polished stainless steel

## Stack

- [Three.js r128](https://threejs.org/) — WebGL rendering, scene graph, GLTFLoader
- [CSS2DRenderer](https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer) — DOM-based spatial label overlay
- [GSAP 3](https://gsap.com/) — camera fly-to animation
- Vanilla JS, no framework

## 3D Asset

`models/bracket.glb` — orthodontic bracket modeled and exported from Blender. Materials are applied at runtime via Three.js MeshStandardMaterial for full control over metalness and environment reflections.

## Getting Started

No build step required. Serve the project root with any static server:

```bash
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or whichever port your server uses).

## Structure

```
├── index.html       # Single-page layout
├── app.js           # BracketViewer class — scene, labels, interactions
├── styles.css       # All styles including spatial label rules
└── models/
    └── bracket.glb  # Interactive 3D asset
```
