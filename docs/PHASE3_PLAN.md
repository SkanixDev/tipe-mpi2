# 📊 Phase 3 : L'Intelligence et l'Optimisation - Plan Complet

## 🎯 Objectif Global

**Comparer des stratégies de cache** pour réduire la latence moyenne dans un réseau de distribution de contenu vidéo. Au lieu que chaque requête remonte jusqu'à l'Origin, les nœuds intermédiaires (Fog et CDN) **stockent localement** les chunks populaires.

---

## 📅 Contexte du TIPE

### Positionnement

- **Rôle simulé** : Fournisseur de Contenu / CDN (ex: Netflix, YouTube)
- **Justification** : Le streaming vidéo représente ~80% du trafic Internet mondial
- **Contrainte Système** : Le réseau est considéré comme fixe (Topologie Arbre établie)
- **Variable d'ajustement** : Le contenu des mémoires cache (Fog/Edge Computing)

### Objectifs

1. **Maximiser la QoS** (Quality of Service) : Réduire la latence d'accès au contenu
2. **Minimiser la Congestion** : Éviter la saturation des liens montants vers le Serveur Origine
3. **Moyen** : Comparer des stratégies de cache (Réactive vs Prédictive)

### Problématique

> "Quel algorithme de cache minimise la latence moyenne sous contrainte de capacité limitée dans un réseau de distribution vidéo hiérarchique ?"

---

## 🗺️ Stratégie d'Implémentation : Approche Hybride

### Phase 3A : Quick Win (Prototype Fonctionnel) - 2-3h

**Objectif** : Voir visuellement que le cache fonctionne

1. Ajouter `cache: Set<string>` aux nœuds intermédiaires
2. Implémenter le "snooping" (remplissage au passage des réponses)
3. Implémenter la vérification de cache (cache hit/miss)
4. Tester avec 2 users regardant la même vidéo → Observer le rebond

**Résultat attendu** : Billes jaunes qui rebondissent sur le Fog au lieu de monter jusqu'à l'Origin

---

### Phase 3B : Montée en Scientificité - 1 jour

**Objectif** : Rigueur scientifique et comparaison d'algorithmes

1. **Ajouter la Loi de Zipf** (1h)
   - Créer `VideoRequestGenerator` avec distribution réaliste
   - Les users demandent automatiquement des vidéos selon Zipf
   - Impact : Hit rate passe de ~20% à ~70%

2. **Implémenter LRU** (1h)
   - Remplacer `Set` par structure avec timestamp d'accès
   - Virer le chunk le moins récemment utilisé
   - Impact : +10-15% de hit rate vs FIFO

3. **Créer l'algorithme "MPI" intelligent** (2h)
   - Hybride LRU + préchargement séquentiel
   - Ou LRU + pondération par popularité Zipf
   - Impact : Démontrer une amélioration mesurable

4. **Métriques et graphiques** (1h)
   - Panel de stats (hit rate, latence moyenne)
   - Export CSV pour graphiques dans le rapport

---

## 🧩 Architecture Technique

### 1. Modification des Nœuds (Model)

#### Structure de Cache

```typescript
interface CachedChunk {
  videoId: string;
  chunkIndex: number;
  storedAtFrame: number; // Timestamp de stockage
  lastAccessedFrame: number; // Pour LRU
  accessCount: number; // Pour LFU ou stats
}
```

#### Ajout aux Classes de Nœuds

```typescript
export class CDNNode extends NetworkNode {
  cache: Map<string, CachedChunk>;
  cacheCapacity: number = 100; // 100 chunks max

  constructor(id: string) {
    super(id, "CDN");
    this.cache = new Map();
  }

  hasChunk(videoId: string, chunkIndex: number): boolean {
    return this.cache.has(`${videoId}_${chunkIndex}`);
  }

  storeChunk(chunk: CachedChunk): void {
    const key = `${chunk.videoId}_${chunk.chunkIndex}`;

    // Vérifier la capacité et appliquer l'algo d'éviction si nécessaire
    if (this.cache.size >= this.cacheCapacity) {
      this.evictChunk(); // Dépend de la stratégie (FIFO/LRU/MPI)
    }

    this.cache.set(key, chunk);
  }
}

export class FogNode extends NetworkNode {
  cache: Map<string, CachedChunk>;
  cacheCapacity: number = 20; // Plus petit que CDN

  // Mêmes méthodes que CDNNode
}
```

---

### 2. Modification du Routage (Engine)

#### Comportement avec Cache

```
AVANT (Phase 2):
USER → FOG → CDN → ORIGIN (toujours)

APRÈS (Phase 3):
1. USER envoie REQUEST vers FOG
2. FOG vérifie son cache :
   - ✅ HIT : Génère RESPONSE immédiatement
   - ❌ MISS : Transmet au CDN
3. CDN vérifie son cache :
   - ✅ HIT : Génère RESPONSE
   - ❌ MISS : Transmet à ORIGIN
4. ORIGIN répond toujours (a tout le contenu)
5. La RESPONSE redescend et **met en cache** au passage
```

#### Implémentation dans `updatePackets()`

```typescript
// Quand un paquet REQUEST arrive à un nœud intermédiaire
if (packet.status === "ARRIVED_AT_NODE") {
  const currentNode = packet.path[packet.currentStepIndex];

  if (currentNode.type === "FOG" || currentNode.type === "CDN") {
    const cacheKey = `${packet.videoId}_${packet.chunkIndex}`;

    if (currentNode.hasChunk(packet.videoId, packet.chunkIndex)) {
      // 🎯 CACHE HIT !
      Logger.info(`⚡ Cache HIT sur ${currentNode.id}`);

      // Génère la réponse immédiatement
      const response = createResponsePacket(packet, currentNode);
      spawnedPackets.push(response);

      // Mise à jour des stats
      currentNode.cache.get(cacheKey).lastAccessedFrame = currentFrame;
      currentNode.cache.get(cacheKey).accessCount++;

      packet.status = "DELIVERED";
      continue;
    }
  }
}

// Snooping : Quand une RESPONSE traverse un nœud
if (packet.status === "TRANSIT" && packet.type === "RESPONSE") {
  const currentNode = packet.path[packet.currentStepIndex];

  if (currentNode.type === "FOG" || currentNode.type === "CDN") {
    currentNode.storeChunk({
      videoId: packet.videoId,
      chunkIndex: packet.chunkIndex,
      storedAtFrame: currentFrame,
      lastAccessedFrame: currentFrame,
      accessCount: 0,
    });
  }
}
```

---

## 📈 Simulation de la Demande : Loi de Zipf

### Principe

Dans la réalité, **toutes les vidéos ne sont pas demandées équitablement** :

- Top 20% des vidéos → 80% du trafic (Netflix, YouTube)
- Quelques vidéos ultra-populaires, beaucoup de vidéos rares

### Formule de Zipf

```typescript
function zipfProbability(rank: number, alpha: number = 1.0): number {
  // rank = 1 (la plus populaire), 2, 3, ...
  // alpha = paramètre d'inclinaison (1.0 = standard)

  const normalization = sumOfInverses(totalVideos, alpha);
  return 1 / Math.pow(rank, alpha) / normalization;
}

function sumOfInverses(n: number, alpha: number): number {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += 1 / Math.pow(i, alpha);
  }
  return sum;
}
```

### Implémentation du Générateur

```typescript
class VideoRequestGenerator {
  videoRanks: number[];
  probabilities: number[];
  cumulativeProbabilities: number[];

  constructor(numVideos: number, alpha: number = 1.0) {
    this.videoRanks = Array.from({ length: numVideos }, (_, i) => i + 1);
    this.probabilities = this.videoRanks.map((r) => zipfProbability(r, alpha));

    // Précalcul des probabilités cumulées pour l'échantillonnage
    this.cumulativeProbabilities = [];
    let sum = 0;
    for (const p of this.probabilities) {
      sum += p;
      this.cumulativeProbabilities.push(sum);
    }
  }

  getRandomVideoId(): string {
    const rank = this.sampleZipf();
    return `video_${rank}`;
  }

  sampleZipf(): number {
    const random = Math.random();

    for (let i = 0; i < this.cumulativeProbabilities.length; i++) {
      if (random < this.cumulativeProbabilities[i]) {
        return this.videoRanks[i];
      }
    }

    return this.videoRanks[this.videoRanks.length - 1];
  }
}
```

---

## 🧠 Algorithmes de Remplacement de Cache

### Stratégie 1 : FIFO (First In, First Out)

**Principe** : Vire le chunk le plus ancien (peu importe s'il est populaire)

```typescript
class FIFOCache {
  insertionQueue: string[] = []; // Ordre d'arrivée

  evict(): string {
    return this.insertionQueue.shift()!; // Premier entré = premier sorti
  }

  add(key: string, chunk: CachedChunk) {
    if (this.cache.size >= this.capacity) {
      const victimKey = this.evict();
      this.cache.delete(victimKey);
    }

    this.cache.set(key, chunk);
    this.insertionQueue.push(key);
  }
}
```

**Performance attendue** : Médiocre (vire des chunks populaires)

---

### Stratégie 2 : LRU (Least Recently Used)

**Principe** : Vire le chunk **le moins récemment utilisé**

```typescript
class LRUCache {
  evict(): string {
    let oldestKey = "";
    let oldestFrame = Infinity;

    for (const [key, chunk] of this.cache) {
      if (chunk.lastAccessedFrame < oldestFrame) {
        oldestFrame = chunk.lastAccessedFrame;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  onAccess(key: string, currentFrame: number) {
    const chunk = this.cache.get(key);
    if (chunk) {
      chunk.lastAccessedFrame = currentFrame;
      chunk.accessCount++;
    }
  }
}
```

**Performance attendue** : Bonne (garde les chunks populaires récents)

---

### Stratégie 3 : Algorithme "MPI" Intelligent

**Principe** : Combine plusieurs heuristiques pour prédire quoi garder

#### Approche 1 : LRU + Préchargement Séquentiel

```typescript
class SmartCacheMPI {
  evict(): string {
    // Même logique que LRU
    return this.lruEvict();
  }

  predictNextChunk(videoId: string, currentChunk: number): string {
    // Si on vient de servir le chunk N, précharge N+1
    return `${videoId}_${currentChunk + 1}`;
  }

  onResponse(packet: Packet) {
    // Stocke le chunk actuel
    this.storeChunk(packet);

    // Précharge le suivant si on a de la place
    if (this.cache.size < this.capacity * 0.9) {
      // 90% de remplissage
      const nextKey = this.predictNextChunk(packet.videoId, packet.chunkIndex);
      this.requestPrefetch(nextKey);
    }
  }
}
```

#### Approche 2 : LRU + Pondération Zipf

```typescript
class SmartCacheMPI {
  videoPopularity: Map<string, number> = new Map(); // Compteur d'accès par vidéo

  evict(): string {
    let bestVictim = "";
    let lowestScore = Infinity;

    for (const [key, chunk] of this.cache) {
      const score = this.calculateUtilityScore(chunk);

      if (score < lowestScore) {
        lowestScore = score;
        bestVictim = key;
      }
    }

    return bestVictim;
  }

  calculateUtilityScore(chunk: CachedChunk): number {
    const recency = currentFrame - chunk.lastAccessedFrame;
    const frequency = chunk.accessCount;
    const popularity = this.videoPopularity.get(chunk.videoId) || 1;

    // Score : fréquence + popularité de la vidéo - pénalité temporelle
    return frequency * 0.4 + popularity * 0.4 - recency * 0.0001;
  }
}
```

---

## 📊 Mesure des Performances

### Métriques à Calculer

```typescript
interface SimulationStats {
  // Compteurs globaux
  totalRequests: number;
  cacheHitsFog: number;
  cacheHitsCDN: number;
  cacheMissesOrigin: number;

  // Ratios
  hitRateFog: number; // % de hits au niveau Fog
  hitRateCDN: number; // % de hits au niveau CDN
  overallHitRate: number; // % total (Fog + CDN)

  // Latence
  averageLatency: number; // Latence moyenne (en ms)
  p50Latency: number; // Médiane
  p95Latency: number; // 95e percentile
  p99Latency: number; // 99e percentile

  // Bande passante
  bandwidthSavedMbps: number; // Trafic évité vers l'Origin
  totalBandwidthUsed: number;

  // Par algorithme (pour comparaison)
  statsFIFO: AlgorithmStats;
  statsLRU: AlgorithmStats;
  statsMPI: AlgorithmStats;
}

interface AlgorithmStats {
  name: string;
  hitRate: number;
  avgLatency: number;
  p95Latency: number;
  bandwidthSaved: number;
}
```

### Calcul de la Latence

```typescript
class Packet {
  createdAtFrame: number;
  deliveredAtFrame?: number;

  getLatencyMs(frameDurationMs: number): number {
    if (!this.deliveredAtFrame) return 0;
    return (this.deliveredAtFrame - this.createdAtFrame) * frameDurationMs;
  }
}

// Dans NetworkEngine
trackLatency(packet: Packet) {
  const latency = packet.getLatencyMs(this.frameDurationMs);
  this.stats.latencies.push(latency);
  this.stats.totalLatency += latency;
  this.stats.averageLatency = this.stats.totalLatency / this.stats.totalRequests;
}

calculatePercentile(percentile: number): number {
  const sorted = this.stats.latencies.sort((a, b) => a - b);
  const index = Math.floor(sorted.length * (percentile / 100));
  return sorted[index];
}
```

---

## 🎮 Scénarios de Test

### Scénario 1 : Charge Uniforme

- **Description** : Tous les users demandent des vidéos à intervalle constant
- **Objectif** : Tester la robustesse du cache en régime stable
- **Durée** : 5 minutes de simulation

### Scénario 2 : Heure de Pointe (Rush Hour)

- **Description** : Multiplie x10 le nombre de requêtes pendant 30 secondes
- **Objectif** : Tester si le cache tient sous la pression
- **Attendu** : Dégradation gracieuse, pas d'effondrement

### Scénario 3 : Vidéo Virale (Flash Crowd)

- **Description** : Une vidéo devient soudainement ultra-populaire
- **Objectif** : Vérifier si l'algo adapte son cache rapidement
- **Implémentation** : Modifier la distribution Zipf dynamiquement

---

## 🛠️ Plan d'Implémentation Détaillé

### Étape 1 : Ajouter le Stockage aux Nœuds (1h)

**Fichiers à modifier** :

- `src/model/NetworkNode.ts`

**Actions** :

1. Ajouter `cache: Map<string, CachedChunk>` à CDNNode et FogNode
2. Créer l'interface `CachedChunk`
3. Ajouter les méthodes `hasChunk()`, `storeChunk()`, `evictChunk()`
4. Configurer `cacheCapacity` selon le type de nœud

---

### Étape 2 : Implémenter le Cache Hit/Miss (2h)

**Fichiers à modifier** :

- `src/engine/NetworkEngine.ts`

**Actions** :

1. Dans `updatePackets()`, vérifier le cache quand REQUEST arrive
2. Si HIT : générer RESPONSE immédiatement depuis le nœud
3. Si MISS : continuer le routage vers le parent
4. Ajouter le snooping : stocker les chunks au passage des RESPONSE

---

### Étape 3 : Implémenter FIFO (1h)

**Fichiers à créer** :

- `src/engine/cache/FIFOStrategy.ts`

**Actions** :

1. Créer une classe `FIFOCacheStrategy`
2. Implémenter `evict()` avec une queue FIFO
3. Tester avec des requêtes manuelles
4. Logger les évictions pour debug

---

### Étape 4 : Implémenter LRU (1h)

**Fichiers à créer** :

- `src/engine/cache/LRUStrategy.ts`

**Actions** :

1. Créer une classe `LRUCacheStrategy`
2. Implémenter `evict()` basé sur `lastAccessedFrame`
3. Comparer visuellement avec FIFO
4. Mesurer le hit rate

---

### Étape 5 : Générateur Zipf (1h30)

**Fichiers à créer** :

- `src/engine/VideoRequestGenerator.ts`

**Actions** :

1. Implémenter `zipfProbability()` et `sampleZipf()`
2. Créer la classe `VideoRequestGenerator`
3. Intégrer au `NetworkEngine` pour génération automatique
4. Tester la distribution (logger les vidéos demandées)

---

### Étape 6 : Algorithme MPI (2-3h)

**Fichiers à créer** :

- `src/engine/cache/MPIStrategy.ts`

**Actions** :

1. Choisir l'approche (préchargement ou pondération)
2. Implémenter la logique custom
3. Benchmarker contre FIFO et LRU
4. Ajuster les paramètres pour optimiser

---

### Étape 7 : Statistiques et Graphiques (2h)

**Fichiers à créer** :

- `src/engine/SimulationStats.ts`
- `src/components/StatsPanel.tsx`

**Actions** :

1. Créer la classe `SimulationStats` avec toutes les métriques
2. Tracker latence, hit rate, bandwidth à chaque frame
3. Créer un panneau React affichant les stats en temps réel
4. Exporter CSV pour graphiques externes (Excel/Python)

---

## 📈 Visualisations Attendues

### 1. Graphique : Latence Moyenne vs Temps

- **Axe X** : Temps de simulation (secondes)
- **Axe Y** : Latence moyenne (ms)
- **Courbes** : 3 courbes (FIFO, LRU, MPI)
- **Attendu** : MPI < LRU < FIFO

### 2. Graphique : Hit Rate par Algorithme

- **Type** : Diagramme en barres
- **Axe X** : Algorithme (FIFO, LRU, MPI)
- **Axe Y** : Hit Rate (%)
- **Attendu** : MPI > LRU > FIFO

### 3. Panel Temps Réel

```
┌────────────────────────────────────┐
│  Statistiques de Simulation        │
├────────────────────────────────────┤
│  Requêtes totales : 1,234          │
│  Cache Hits (Fog) : 567 (46%)      │
│  Cache Hits (CDN) : 234 (19%)      │
│  Cache Miss       : 433 (35%)      │
├────────────────────────────────────┤
│  Latence moyenne  : 45 ms          │
│  P95 Latency      : 120 ms         │
│  Bandwidth saved  : 1.2 Gbps       │
└────────────────────────────────────┘
```

---

## 🎯 Critères de Succès

### Phase 3A (Quick Win)

- ✅ Cache fonctionne visuellement (rebond sur Fog)
- ✅ Snooping remplit les caches au passage
- ✅ Hit rate > 0% (même faible)

### Phase 3B (Scientifique)

- ✅ Distribution Zipf implémentée et vérifiée
- ✅ 3 algorithmes comparés (FIFO, LRU, MPI)
- ✅ MPI bat LRU d'au moins 5% sur une métrique
- ✅ Stats exportables pour le rapport

### Soutenance

- ✅ Démonstration visuelle claire
- ✅ Graphiques comparatifs propres
- ✅ Explication des choix algorithmiques
- ✅ Critique des limites (ex: overhead mémoire)

---

## 📚 Références Scientifiques

### Pour la Soutenance

1. **Loi de Zipf** : Breslau et al. (1999) "Web Caching and Zipf-like Distributions"
2. **CDN et Edge Computing** : Nygren et al. (2010) "The Akamai Network: A Platform for High-Performance Internet Applications"
3. **Algorithmes de Cache** : O'Neil et al. (1993) "The LRU-K Page Replacement Algorithm"
4. **Netflix Architecture** : Netflix Tech Blog - "Content Delivery Architecture"

---

## 🚀 Timeline Suggérée

### Jour 1 (3-4h)

- Étapes 1-2 : Cache basique + Hit/Miss
- Test visuel avec 2 users

### Jour 2 (4-5h)

- Étapes 3-4 : FIFO + LRU
- Première comparaison

### Jour 3 (3-4h)

- Étape 5 : Générateur Zipf
- Tests de distribution

### Jour 4 (4-5h)

- Étape 6 : Algorithme MPI
- Benchmarking

### Jour 5 (2-3h)

- Étape 7 : Stats et export
- Génération des graphiques finaux

**Total estimé** : 16-21h de travail effectif

---

## ⚠️ Pièges à Éviter

1. **Oublier de normaliser Zipf** : Les probabilités doivent sommer à 1
2. **Confondre hit local et hit global** : Un hit CDN n'est pas un hit Fog
3. **Négliger les cas limites** : Cache vide, cache plein, vidéo inexistante
4. **Sur-optimiser trop tôt** : D'abord faire marcher, ensuite optimiser
5. **Pas de seed aléatoire** : Pour reproduire les tests, fixer `Math.random()`

---

## 💡 Conseils pour la Soutenance

### Points à Mettre en Avant

1. **Réalisme** : Zipf représente la vraie distribution (citer Netflix)
2. **Innovation** : Ton algo MPI apporte une amélioration mesurable
3. **Trade-offs** : Discuter mémoire vs performance, complexité vs gain
4. **Scalabilité** : Que se passe-t-il avec 10x plus de users ?

### Questions Attendues

**Q1** : "Pourquoi pas juste augmenter la taille du cache ?"  
**R** : Coût matériel prohibitif, on optimise l'algo d'abord

**Q2** : "Votre algo MPI bat LRU, mais de combien ?"  
**R** : Montrer le graphique avec les chiffres précis

**Q3** : "Et si la demande change (pas Zipf stable) ?"  
**R** : Montrer le scénario "Vidéo Virale" où MPI s'adapte mieux

---

## ✅ Checklist Finale

Avant de considérer Phase 3 terminée :

- [ ] Cache implémenté (FIFO, LRU, MPI)
- [ ] Zipf implémenté et testé
- [ ] Hit/Miss fonctionnel avec logs
- [ ] Snooping fonctionnel
- [ ] Stats calculées en temps réel
- [ ] Panel UI affichant les métriques
- [ ] Export CSV des résultats
- [ ] Graphiques générés (latence, hit rate)
- [ ] Tests des 3 scénarios effectués
- [ ] Documentation des résultats
- [ ] Code commenté et propre
- [ ] README mis à jour

---

## 🔗 Fichiers du Projet

### Structure Attendue Finale

```
src/
├── model/
│   ├── NetworkNode.ts        (✅ Phase 1, ✏️ Phase 3: +cache)
│   ├── Packet.ts             (✅ Phase 2)
│   └── CachedChunk.ts        (🆕 Phase 3)
├── engine/
│   ├── NetworkEngine.ts      (✅ Phase 1-2, ✏️ Phase 3: +cache logic)
│   ├── config.ts             (✅ Phase 1)
│   ├── VideoRequestGenerator.ts  (🆕 Phase 3)
│   ├── SimulationStats.ts    (🆕 Phase 3)
│   └── cache/
│       ├── CacheStrategy.ts  (🆕 Phase 3: interface)
│       ├── FIFOStrategy.ts   (🆕 Phase 3)
│       ├── LRUStrategy.ts    (🆕 Phase 3)
│       └── MPIStrategy.ts    (🆕 Phase 3)
├── components/
│   └── StatsPanel.tsx        (🆕 Phase 3)
├── utils/
│   └── Logger.ts             (✅ Phase 1)
└── App.tsx                   (✅ Phase 1-2, ✏️ Phase 3: +controls)
```

---

**Date de création** : 29 janvier 2026  
**Dernière mise à jour** : 29 janvier 2026  
**Status** : Phase 2 terminée ✅ | Phase 3 en préparation 🚧
