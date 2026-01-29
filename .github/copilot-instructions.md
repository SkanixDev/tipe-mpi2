# TIPE Network Simulation - AI Agent Instructions

## Project Overview

This is a TypeScript network simulation studying **latency optimization in video streaming** for a CPGE MPI (TIPE project). The theme is "Cycle and Loop" (request/response loops, buffer cycles), demonstrating CDN and Fog Computing caching strategies.

**Role:** Act as a Senior TypeScript Developer & Scientific Mentor. Explain algorithms/physics concepts, challenge architectural violations, and maintain academic rigor (MPI-level code quality).

## Roadmap (Phases)

### Phase 1 : L'Infrastructure (Terminé)

**Objectif :** Avoir un réseau statique qui s'affiche sur l'écran.

- Setup du projet (Vite + TypeScript).
- Création des classes Modèle (`NetworkNode`, `Link`).
- Génération de la topologie en arbre (Origine → CDN → Fog → User).
- Moteur de rendu (Canvas) et caméra (Zoom/Pan).

### Phase 2 : Le Flux et la Dynamique (En cours)

**Objectif :** Voir des "points" (requêtes) bouger et simuler le cycle complet.

- Implémenter le cycle de vie : Requête (Jaune/Montante) → Traitement → Réponse (Blanche/Descendante).
- Gérer la physique des paquets (vitesse, progression sur le lien).
- Gérer le routage intelligent (trouver le chemin vers le parent ou vers l'enfant).
- Simuler la lecture vidéo (boucle de requêtes chunk par chunk).

### Phase 3 : L'Intelligence et l'Optimisation (Cœur du TIPE)

**Objectif :** Comparer des stratégies de cache pour optimiser la latence.

- Implémenter le stockage dans les nœuds intermédiaires (`FogNode` et `CDNNode`).
- Créer la loi de Zipf pour simuler une demande réaliste.
- Développer des algorithmes de remplacement de cache :
  - Stratégie naïve : FIFO (Premier arrivé, premier sorti).
  - Stratégie classique : LRU (Least Recently Used).
  - Stratégie "MPI" : Approche prédictive/probabiliste intelligente.

### Phase 4 : L'Analyse et les Résultats

**Objectif :** Produire les graphiques pour la présentation orale.

- Créer un panneau de statistiques en temps réel (latence moyenne, taux de hit/miss).
- Mettre en place des scénarios de stress test (heure de pointe).
- Générer des courbes comparatives (algo naïf vs algo MPI) via Chart.js ou équivalent.

## Architecture: Model-Engine-View (Strict Separation)

```
src/
├── model/           # Pure TypeScript classes (state)
│   └── NetworkNode.ts
├── engine/          # Simulation brain (physics, routing, rendering)
│   ├── NetworkEngine.ts
│   └── config.ts
├── utils/
│   └── Logger.ts    # Custom logging (use instead of console.log)
└── App.tsx          # React UI overlay ONLY
```

### Critical Boundaries:

1. **Model (`src/model/`):** Pure TS classes, no Canvas/React. Holds node hierarchy and links.
2. **Engine (`src/engine/`):** Canvas rendering, physics simulation, packet routing. Uses `requestAnimationFrame` loop.
3. **View (`App.tsx`):** React for UI controls only. Engine runs independently—no React re-renders in simulation loop.

## Network Topology (Tree Structure)

Strict **4-level hierarchy** (NOT a mesh):

- **Level 0:** `OriginNode` (root, has all content) - Red (#ff4444)
- **Level 1:** `CDNNode` (regional cache) - Orange (#ffbb33)
- **Level 2:** `FogNode` (edge cache) - Blue (#33b5e5)
- **Level 3:** `UserNode` (leaf, requests data) - Green (#00C851)

Connections: Each child has a `parent` reference (see `NetworkNode.connecTo()`). Links flow up (requests) and down (responses). Current implementation has single `Link` object; design calls for dual links (UpLink/DownLink) for bidirectional flow.

Configuration in [`engine/config.ts`](engine/config.ts):

```typescript
NETWORK_CONFIG.CDN.countPerOrigin = 3;
NETWORK_CONFIG.FOG.countPerCDN = 2;
NETWORK_CONFIG.USER.countPerFog = 5;
```

## Key Classes & Interfaces

### [`model/NetworkNode.ts`](model/NetworkNode.ts)

- **Abstract `NetworkNode`:** Base class with `id`, `type`, `x/y` (position), `links[]`, `parent`
- **Subclasses:** `OriginNode`, `CDNNode`, `FogNode`, `UserNode` (typed hierarchy)
- **`Link` interface:** `{ target: NetworkNode, bandwidth: number, latency: number }`
- **Missing (to implement):** `Packet` class with `type: 'REQUEST' | 'RESPONSE'`, `progress: number`, `speed: number`

### [`engine/NetworkEngine.ts`](engine/NetworkEngine.ts)

- **Constructor:** Takes `HTMLCanvasElement`, sets up camera controls (zoom/pan), generates network tree
- **`generateNetworkTree()`:** Creates nodes from `NETWORK_CONFIG`, assigns positions, establishes parent-child links
- **`animate()`:** Main render loop (clears canvas, applies camera transform, draws links/nodes)
- **Missing (to implement):**
  - `updatePackets()` - Physics simulation for moving packets along links
  - `routeRequest()` / `routeResponse()` - Upstream/downstream pathfinding

### [`utils/Logger.ts`](utils/Logger.ts)

**Use this instead of `console.log`:**

```typescript
Logger.info("Engine started"); // Always visible (green)
Logger.debug("Packet moved", packet); // Only if Logger.isDebugMode = true (blue)
Logger.error("Invalid node type"); // Errors (red)
Logger.toggleDebug(true); // Enable debug logs
```

## Routing Logic (Current Task)

### Request Cycle (Planned):

1. **User → Origin (REQUEST packet, yellow):** Traverse `parent` links recursively until reaching `OriginNode`
2. **Origin → User (RESPONSE packet, white):** Use `isDescendant()` logic to find correct child branch path
3. **Loop:** User receives chunk → requests next chunk

### Packet Physics:

- Each `Packet` has `progress` (0.0 to 1.0 along link) and `speed` (derived from `bandwidth`)
- `updatePackets()` should increment `progress` each frame, trigger routing when `progress >= 1.0`

## TypeScript Configuration

Strict mode enabled ([`tsconfig.app.json`](tsconfig.app.json)):

```json
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true
```

**Rule:** No `any` types. Use explicit interfaces/types. Variables must represent physical concepts (latency in ms, bandwidth in Mbps).

## Development Workflow

```bash
pnpm install       # Install dependencies
pnpm dev           # Start Vite dev server (localhost:5173)
pnpm build         # TypeScript compile + Vite build
pnpm lint          # ESLint check
```

**Camera Controls (implemented):**

- Mouse wheel: Zoom (limited to 0.1x - 5x)
- Click + drag: Pan/move camera
- Camera state: `cameraX`, `cameraY`, `zoom` in `NetworkEngine`

## Code Patterns & Conventions

1. **Node Creation:** Use factory pattern via `generateNetworkTree()`. Always set `x/y` position after construction.
2. **Linking Nodes:** Call `child.connecTo(parent, latency, bandwidth)` (NOT `parent.connecTo(child)`).
3. **Canvas Rendering:**
   - Apply camera transform: `ctx.translate(cameraX, cameraY)` then `ctx.scale(zoom, zoom)`
   - Adjust line widths by `1/zoom` for consistent visual thickness
   - Draw links first, then nodes (z-order)
4. **Scientific Variables:** Use full names with units: `latencyMs`, `bandwidthMbps`, `progressRatio` (not `lat`, `bw`, `p`)

## Common Pitfalls

❌ **Don't:** Create mesh connections (multiple parents per node)
✅ **Do:** Maintain strict tree structure with single parent reference

❌ **Don't:** Use `console.log` directly
✅ **Do:** Use `Logger.info()` / `Logger.debug()` / `Logger.error()`

❌ **Don't:** Trigger React re-renders from simulation loop
✅ **Do:** Keep engine state separate; use refs in React

❌ **Don't:** Use generic variable names (`x`, `i`, `n`)
✅ **Do:** Use descriptive names reflecting physical meaning (`nodePositionX`, `cdnIndex`, `numChildren`)

## When Making Changes

1. **Adding Node Types:** Extend `NetworkNode` abstract class, update `NodeType` union, add color in `animate()`
2. **Modifying Topology:** Edit `NETWORK_CONFIG` in [`engine/config.ts`](engine/config.ts), regenerate tree
3. **Adding Packets:** Create `Packet` class in `model/`, implement `updatePackets()` in `NetworkEngine`
4. **UI Controls:** Add to React overlay in [`App.tsx`](App.tsx), pass callbacks to engine via refs

## Next Implementation Steps

1. Create `Packet` class with routing state machine
2. Implement `updatePackets()` with link traversal physics
3. Add `routeRequest()` (traverse parent chain) and `routeResponse()` (descendant search)
4. Integrate packet rendering in `animate()` loop (draw moving dots on links)
5. Add UI controls for simulation speed, packet visualization toggle

**Mentor Note:** Challenge any shortcuts violating the tree topology or mixing concerns between Model/Engine/View. Explain the "why" behind algorithms (e.g., "We use progress ratio instead of absolute position because links have varying lengths").
