# 🚀 Phase 3B : Étapes d'Implémentation

## 📋 Vue d'Ensemble

Phase 3B consiste à implémenter **3 stratégies de cache** (FIFO, LRU, MPI) et les comparer avec la **Loi de Zipf** pour générer des requêtes réalistes.

**Timeline estimée** : 16-21h  
**Ordre strict** : Zipf → LRU → MPI → Stats

---

## ✅ Étape 1 : Générateur Zipf (1h30)

### Objectif
Créer un système qui génère des requêtes vidéo selon une distribution Zipf (20% vidéos = 80% trafic).

### Fichier à créer
- `src/engine/VideoRequestGenerator.ts`

### Points clés à implémenter

1. **Fonction `zipfProbability(rank, alpha)`**
   - Calcule la probabilité pour une vidéo de rang `rank`
   - Formule : `1 / rank^alpha / normalization`
   - Normalisation : somme des inverses pour tous les rangs

2. **Classe `VideoRequestGenerator`**
   - Constructeur : `(numVideos: number, alpha: number = 1.0)`
   - Propriétés : `videoRanks[]`, `probabilities[]`, `cumulativeProbabilities[]`
   - Méthode : `getRandomVideoId(): string` → retourne `video_1`, `video_2`, etc.
   - Méthode : `sampleZipf(): number` → échantillonne selon distribution

3. **Tests d'implémentation**
   - Logger les 10 premières vidéos générées
   - Vérifier que `video_1` est demandée beaucoup plus souvent que `video_100`

### Validation
```typescript
const gen = new VideoRequestGenerator(100, 1.0);
const samples = Array(1000).fill(0).map(() => gen.getRandomVideoId());
// video_1 doit être > 10% des requêtes
// video_2 doit être > 5% des requêtes
```

---

## ✅ Étape 2 : LRU Strategy (1h)

### Objectif
Implémenter la stratégie LRU (Least Recently Used) pour remplacer FIFO.

### Fichiers à créer/modifier

- `src/engine/cache/CacheStrategy.ts` *(interface)*
- `src/engine/cache/LRUStrategy.ts` *(implémentation)*
- `src/model/NetworkNode.ts` *(modifier CDNNode et FogNode)*

### Points clés à implémenter

1. **Interface `CacheStrategy`**
   ```typescript
   interface CacheStrategy {
     evict(): string; // Retourne la clé à supprimer
     add(key: string, chunk: CachedChunk): void;
     get(key: string): CachedChunk | undefined;
     has(key: string): boolean;
   }
   ```

2. **Classe `LRUStrategy implements CacheStrategy`**
   - Propriétés : `cache: Map<string, CachedChunk>`, `capacity: number`
   - Méthode `evict()` : Trouver le chunk avec le plus petit `lastAccessedFrame`
   - Méthode `add()` : Stocker et éviter si plein
   - Méthode `onAccess(key)` : Mettre à jour `lastAccessedFrame`

3. **Modification `NetworkNode.ts`**
   - Remplacer `cache: Map` par `cacheStrategy: CacheStrategy`
   - Adapter les appels `hasChunk()`, `storeChunk()`, etc.

### Validation
- Un chunk accédé ne doit jamais être évincé avant un chunk ancien
- Hit rate doit être stable (amélioration par rapport à FIFO)

---

## ✅ Étape 3 : Algorithm Comparison Framework (1h)

### Objectif
Créer un framework permettant de comparer les 3 algorithmes.

### Fichiers à modifier

- `src/engine/NetworkEngine.ts`
- `src/engine/config.ts`

### Points clés à implémenter

1. **Ajouter property `cacheStrategy` à NetworkEngine**
   ```typescript
   cacheStrategy: 'FIFO' | 'LRU' | 'MPI' = 'FIFO';
   setCacheStrategy(strategy): void // Basculer l'algorithme
   ```

2. **Adapter `updatePackets()` pour utiliser la strategy**
   - Au lieu de : `node.cache.set(key, chunk)`
   - Faire : `node.cacheStrategy.add(key, chunk)`

3. **Ajouter UI control en `App.tsx`**
   - Bouton/Select pour choisir : FIFO | LRU | MPI
   - Relancer la simulation avec le nouvel algorithme

### Validation
- Pouvoir basculer entre les stratégies sans crash
- Vérifier les logs pour chaque éviction

---

## ✅ Étape 4 : LRU + FIFO Comparison (2h)

### Objectif
Implémenter FIFO en tant que stratégie et comparer visuellement avec LRU.

### Fichiers à créer

- `src/engine/cache/FIFOStrategy.ts`

### Points clés à implémenter

1. **Classe `FIFOStrategy implements CacheStrategy`**
   - Propriétés : `cache: Map<string, CachedChunk>`, `insertionQueue: string[]`
   - Méthode `evict()` : `return this.insertionQueue.shift()!`
   - Méthode `add()` : Ajouter à `insertionQueue` et au cache

2. **Tests manuels**
   - Lancer 2 users avec même vidéo → HIT sur Fog pour User 2
   - Observer la queue FIFO se remplir
   - Logger les évictions

3. **Comparer les métriques**
   - Lancer 5 min avec FIFO → noter hit rate
   - Lancer 5 min avec LRU → noter hit rate
   - LRU devrait être ~10-15% meilleur

### Validation
```
FIFO hit rate: 35%
LRU hit rate:  50%
✅ Amélioration visible
```

---

## ✅ Étape 5 : Stats Tracking (1h30)

### Objectif
Tracker toutes les métriques pour comparer les algorithmes.

### Fichiers à créer

- `src/engine/SimulationStats.ts`

### Points clés à implémenter

1. **Interface `SimulationStats`**
   ```typescript
   interface SimulationStats {
     totalRequests: number;
     cacheHits: number;
     cacheMisses: number;
     hitRate: number; // %
     averageLatency: number; // ms
     latencies: number[]; // pour P95, P99
     p50Latency: number;
     p95Latency: number;
     p99Latency: number;
   }
   ```

2. **Classe `StatsCollector`**
   - Méthode `recordRequest(packet)` : Tracker créations
   - Méthode `recordHit(node)` : Tracker hits
   - Méthode `recordMiss()` : Tracker misses
   - Méthode `recordDelivery(packet)` : Calculer latence
   - Méthode `getPercentile(p)` : Retourner P95/P99

3. **Intégration à `NetworkEngine`**
   - Créer instance `this.stats = new StatsCollector()`
   - Appeler `recordRequest()` quand USER crée une requête
   - Appeler `recordHit()` quand cache HIT
   - Appeler `recordDelivery()` quand USER reçoit

### Validation
- Vérifier `hitRate = cacheHits / totalRequests * 100`
- P95 doit être > P50 (médiane)
- Logs pour chaque métrique

---

## ✅ Étape 6 : UI Stats Panel (1h)

### Objectif
Afficher les stats en temps réel dans l'UI.

### Fichiers à créer/modifier

- `src/components/StatsPanel.tsx` *(créer)*
- `src/App.tsx` *(modifier)*

### Points clés à implémenter

1. **Composant `StatsPanel`**
   ```tsx
   export function StatsPanel({ stats, strategy }: Props) {
     return (
       <div className="stats-panel">
         <h3>{strategy} Algorithm</h3>
         <div>Total Requests: {stats.totalRequests}</div>
         <div>Cache Hits: {stats.cacheHits} ({stats.hitRate.toFixed(1)}%)</div>
         <div>Avg Latency: {stats.averageLatency.toFixed(1)}ms</div>
         <div>P95 Latency: {stats.p95Latency.toFixed(1)}ms</div>
       </div>
     );
   }
   ```

2. **Passer les stats du engine**
   - Dans `App.tsx`, créer state `stats`
   - Passer `engine.getStats()` au composant
   - Mettre à jour chaque frame (avec `requestAnimationFrame`)

3. **Affichage côte-à-côte (optionnel)**
   - Afficher stats FIFO | stats LRU | stats MPI
   - Pour facile comparaison visuelle

### Validation
- Stats mises à jour en temps réel
- Les 3 panneaux affichent des chiffres différents (normal)

---

## ✅ Étape 7 : MPI Algorithm (2-3h)

### Objectif
Créer un algorithme custom qui bat LRU d'au moins 5%.

### Fichiers à créer

- `src/engine/cache/MPIStrategy.ts`

### Points clés à implémenter

**Choix entre 2 approches :**

#### Option A : LRU + Préchargement Séquentiel
1. Base LRU pour l'éviction
2. Quand un chunk N est livré, précharger N+1 en background
3. Seul si cache < 90% de capacité
4. Avantage : Exploit localité séquentielle vidéo

```typescript
onChunkDelivered(videoId: string, chunkIndex: number) {
  if (this.cache.size < this.capacity * 0.9) {
    const nextKey = `${videoId}_${chunkIndex + 1}`;
    this.prefetch(nextKey); // Mock request to Origin
  }
}
```

#### Option B : LRU + Pondération Zipf
1. Tracker popularité de chaque vidéo (accès par vidéo)
2. Score d'éviction = `accessCount * 0.4 + popularity * 0.4 - recency * 0.0001`
3. Éviter les chunks populaires même s'ils sont vieux
4. Avantage : S'adapte dynamiquement à la demande

```typescript
calculateScore(chunk: CachedChunk): number {
  const recency = currentFrame - chunk.lastAccessedFrame;
  const videoPopularity = this.videoAccessCount.get(chunk.videoId) || 1;
  return chunk.accessCount * 0.4 + videoPopularity * 0.4 - recency * 0.0001;
}
```

### Implémentation

1. **Créer `MPIStrategy implements CacheStrategy`**
2. **Implémenter la méthode `evict()`** selon l'option choisie
3. **Tester contre LRU** sur 5 min
4. **Ajuster les poids** (0.4 / 0.4 / 0.0001) pour optimiser

### Validation
```
LRU hit rate:  50%
MPI hit rate:  58%
✅ MPI > LRU (+8%, dépassement de 5%)
```

---

## ✅ Étape 8 : Export CSV (1h)

### Objectif
Exporter les données pour générer des graphiques externes.

### Fichiers à modifier

- `src/engine/SimulationStats.ts`
- `src/App.tsx`

### Points clés à implémenter

1. **Méthode `exportCSV()` dans StatsCollector**
   ```typescript
   exportCSV(): string {
     const header = "Frame,TotalRequests,CacheHits,HitRate,AvgLatency,P95\n";
     const rows = this.snapshots.map(s => 
       `${s.frame},${s.totalRequests},${s.cacheHits},...`
     ).join("\n");
     return header + rows;
   }
   ```

2. **Prendre un snapshot chaque 60 frames**
   - Garder l'historique de stats
   - Permettre de tracer l'évolution temps réel

3. **Bouton "Export CSV" en UI**
   - Ouvrir un dialog de téléchargement
   - Exporter pour les 3 stratégies séparément

### Validation
- CSV correctement formaté
- Ouvrir dans Excel, tracer les courbes
- Vérifier que courbe MPI est sous FIFO/LRU (latence)

---

## ✅ Étape 9 : Visualization Tests (1h)

### Objectif
Valider les implémentations avec des tests visuels.

### Tests manuels à faire

1. **Test 1 : Hit Rate Progressive**
   - Démarrer avec cache vide
   - Lancer 10 users pendant 2 min
   - Vérifier que hit rate augmente progressivement
   - Logger : Frame 0: 0%, Frame 60: 15%, Frame 120: 35%

2. **Test 2 : Zipf Distribution**
   - Activer logs de VideoRequestGenerator
   - Vérifier que `video_1` >> `video_2` >> ... >> `video_100`
   - Ratio doit respecter 1/rank

3. **Test 3 : Comparaison FIFO vs LRU**
   - Même scénario, 2 runs successifs
   - Note hit rates : FIFO vs LRU
   - LRU doit être meilleur

4. **Test 4 : Comparaison LRU vs MPI**
   - Même scénario, 2 runs
   - MPI doit battre LRU sur au moins 1 métrique

5. **Test 5 : Heure de Pointe (Rush Hour)**
   - Multiplier x10 les requêtes pendant 30 sec
   - Vérifier pas de crash
   - Hit rate doit baisser (normal, cache trop petite)

### Validation
- Tous les logs cohérents
- Pas d'exceptions
- Les chiffres "font du sens"

---

## ✅ Étape 10 : Documentation & Cleanup (30 min)

### Objectif
Nettoyer le code et documenter Phase 3B.

### Fichiers à modifier

- Tous les fichiers créés : ajouter commentaires
- `docs/PROGRESS.md` : mettre à jour status Phase 3B
- `README.md` : documenter les nouvelles features

### Points clés

1. **Commentaires TypeScript**
   - Interface : expliquer chaque propriété
   - Classe : expliquer la stratégie
   - Méthode complexe : pseudocode

2. **Logs informatifs**
   - `Logger.info()` pour les créations
   - `Logger.debug()` pour les détails
   - Pas de `console.log` brut

3. **PROGRESS.md mise à jour**
   ```markdown
   ## Phase 3B ✅ TERMINÉE
   - [x] Générateur Zipf implémenté
   - [x] LRU implémenté (hit rate +15%)
   - [x] MPI implémenté (hit rate +8% vs LRU)
   - [x] Stats temps réel
   - [x] Export CSV pour graphiques
   ```

---

## 📊 Résumé des Fichiers

### À CRÉER (8 fichiers)

```
src/engine/VideoRequestGenerator.ts
src/engine/SimulationStats.ts
src/engine/cache/CacheStrategy.ts (interface)
src/engine/cache/FIFOStrategy.ts
src/engine/cache/LRUStrategy.ts
src/engine/cache/MPIStrategy.ts
src/components/StatsPanel.tsx
docs/PHASE3B_COMPLETED.md (rapport final)
```

### À MODIFIER (2 fichiers)

```
src/model/NetworkNode.ts (ajouter cacheStrategy)
src/engine/NetworkEngine.ts (intégrer strategies, stats)
src/App.tsx (UI pour stratégies, stats panel)
docs/PROGRESS.md (mettre à jour)
```

---

## 🎯 Points de Validation par Étape

| Étape | Fichiers | ✅ Critère |
|-------|----------|-----------|
| 1 | VideoRequestGenerator | Video 1 > 10%, Video 100 < 1% |
| 2 | LRUStrategy | Hit rate > FIFO |
| 3 | CacheStrategy | Pouvoir basculer algos |
| 4 | FIFOStrategy | FIFO < LRU en hit rate |
| 5 | SimulationStats | Metrics calculées correctement |
| 6 | StatsPanel | Affichage temps réel sans lag |
| 7 | MPIStrategy | MPI > LRU d'au moins 5% |
| 8 | Export CSV | Fichier valide, courbes tracables |
| 9 | Tests | Tous les scénarios réussis |
| 10 | Docs | Code commenté, propre |

---

## 🚀 Commandes Utiles

```bash
# Après chaque étape, tester la build
pnpm build

# Vérifier les erreurs TypeScript
pnpm lint

# Lancer la démo
pnpm dev
```

---

## 💡 Astuces d'Implémentation

1. **Zipf** : Pré-calculer `cumulativeProbabilities[]` pour éviter boucle infinie
2. **LRU** : Utiliser une Map simple, balayer tout le cache pour trouver l'oldest
3. **MPI** : Commencer simple (juste LRU), puis ajouter heuristiques
4. **Stats** : Prendre un snapshot tous les 60 frames pour éviter trop de données
5. **UI** : Mettre les stats dans un `<div position: fixed>` pour pas déranger la canvas

---

## ⚠️ Pièges à Éviter

❌ Oublier de normaliser Zipf (probs doivent sommer à 1)  
❌ Confondre `lastAccessedFrame` avec `createdAtFrame`  
❌ Évincerle mauvais chunk (LRU)  
❌ Ne pas réinitialiser les stats quand on change d'algo  
❌ Exporter CSV avec délimiteur `;` au lieu de `,`  

---

**Bon courage !** 🎉

Pour chaque étape, teste localement avant de passer à la suivante.  
N'hésite pas à Logger abondamment pour déboguer.

