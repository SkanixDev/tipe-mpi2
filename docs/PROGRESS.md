# 📊 Suivi de Progression - TIPE Network Simulation

## ✅ Phase 1 : L'Infrastructure (TERMINÉE)

**Objectif** : Avoir un réseau statique qui s'affiche sur l'écran

### Réalisations

- [x] Setup du projet (Vite + TypeScript)
- [x] Création des classes Modèle (`NetworkNode`, `Link`)
- [x] Génération de la topologie en arbre (Origin → CDN → Fog → User)
- [x] Moteur de rendu (Canvas) et caméra (Zoom/Pan)
- [x] Affichage des nœuds colorés selon leur type
- [x] Affichage des liens entre nœuds

**Date de complétion** : ✅ Terminée

---

## ✅ Phase 2 : Le Flux et la Dynamique (TERMINÉE)

**Objectif** : Voir des "points" (requêtes) bouger et simuler le cycle complet

### Réalisations

- [x] Classe `Packet` avec type REQUEST/RESPONSE
- [x] Propriétés de navigation (path, currentStepIndex, progress, speed)
- [x] Routage intelligent (findPathToOrigin, findPathFromOrigin)
- [x] Physique des paquets (progression sur les liens)
- [x] Calcul de vitesse basé sur latence des liens
- [x] Cycle complet : REQUEST → ORIGIN → RESPONSE → USER
- [x] Rendu visuel des paquets (jaune = REQUEST, blanc = RESPONSE)
- [x] Helper `createRequestFromUser()` pour faciliter les tests
- [x] Logs détaillés (info/debug/error) avec Logger
- [x] Bouton test dans l'UI pour déclencher des requêtes

### Points Techniques Maîtrisés

- Multi-hop routing (traversée de plusieurs liens)
- Gestion d'état des paquets (QUEUED → TRANSIT → DELIVERED)
- Interpolation linéaire pour le rendu
- Génération automatique de réponses à l'arrivée à l'Origin

**Date de complétion** : ✅ 29 janvier 2026

---

## 🚧 Phase 3 : L'Intelligence et l'Optimisation (EN COURS)

**Objectif** : Comparer des stratégies de cache pour optimiser la latence

### Phase 3A : Quick Win (En préparation)

- [ ] Ajouter cache aux CDNNode et FogNode
- [ ] Interface `CachedChunk`
- [ ] Méthodes `hasChunk()`, `storeChunk()`, `evictChunk()`
- [ ] Implémentation cache hit/miss dans updatePackets()
- [ ] Snooping : remplissage au passage des RESPONSE
- [ ] Test visuel avec 2 users regardant la même vidéo

**Estimation** : 2-3h

---

### Phase 3B : Montée Scientifique (Non démarré)

#### Étape 1 : Générateur Zipf

- [ ] Créer `VideoRequestGenerator`
- [ ] Implémenter la loi de Zipf
- [ ] Distribution réaliste de demandes vidéo
- [ ] Validation de la distribution (logs/stats)

**Estimation** : 1h30

---

#### Étape 2 : FIFO (First In, First Out)

- [ ] Classe `FIFOCacheStrategy`
- [ ] Queue d'insertion FIFO
- [ ] Méthode `evict()` simple
- [ ] Benchmark initial

**Estimation** : 1h

---

#### Étape 3 : LRU (Least Recently Used)

- [ ] Classe `LRUCacheStrategy`
- [ ] Tracking de `lastAccessedFrame`
- [ ] Éviction basée sur la récence
- [ ] Comparaison vs FIFO

**Estimation** : 1h

---

#### Étape 4 : Algorithme MPI Intelligent

- [ ] Classe `MPIStrategy`
- [ ] Choix de l'approche (préchargement ou pondération)
- [ ] Implémentation custom
- [ ] Tuning des paramètres

**Options d'implémentation** :

1. LRU + Préchargement séquentiel (si chunk N, précharger N+1)
2. LRU + Pondération Zipf (score basé sur popularité)
3. Hybride (combiner plusieurs heuristiques)

**Estimation** : 2-3h

---

#### Étape 5 : Métriques et Stats

- [ ] Classe `SimulationStats`
- [ ] Tracking latence (moyenne, P50, P95, P99)
- [ ] Calcul hit rate (Fog, CDN, global)
- [ ] Bandwidth saved
- [ ] Composant React `StatsPanel`
- [ ] Export CSV pour graphiques

**Estimation** : 2h

---

### Scénarios de Test à Implémenter

- [ ] Scénario 1 : Charge uniforme
- [ ] Scénario 2 : Heure de pointe (x10 requêtes)
- [ ] Scénario 3 : Vidéo virale (flash crowd)

**Estimation** : 1h

---

## 📅 Phase 4 : L'Analyse et les Résultats (Non démarré)

**Objectif** : Produire les graphiques pour la présentation orale

### À Réaliser

- [ ] Panel de statistiques en temps réel
- [ ] Scénarios de stress test
- [ ] Génération de courbes comparatives (Chart.js)
- [ ] Export des données pour rapport
- [ ] Documentation des résultats
- [ ] Préparation de la soutenance

**Estimation** : 3-4h

---

## 📊 Métriques de Progression

### Temps Investi

- Phase 1 : ~4-5h
- Phase 2 : ~5-6h
- Phase 3A : 0h (à démarrer)
- Phase 3B : 0h (à démarrer)
- Phase 4 : 0h (à démarrer)

**Total actuel** : ~10h  
**Estimation restante** : ~16-21h  
**Total estimé** : ~26-31h

---

## 🎯 Prochaines Actions

### Immédiat (Aujourd'hui)

1. Lire et valider le plan Phase 3 complet
2. Décider de l'approche (Quick Win d'abord ou complet d'un coup)
3. Démarrer Phase 3A : Implémentation du cache basique

### Court Terme (Cette Semaine)

1. Terminer Phase 3A (cache + hit/miss)
2. Valider visuellement avec test 2 users
3. Démarrer Phase 3B (Zipf + FIFO)

### Moyen Terme (Semaine Prochaine)

1. Terminer Phase 3B (LRU + MPI + stats)
2. Démarrer Phase 4 (graphiques)
3. Premières courbes comparatives

---

## 💡 Notes et Décisions Techniques

### Architecture Choisie

- **Model-Engine-View** strict (séparation des responsabilités)
- **Canvas** pour le rendu (performant, contrôle total)
- **React** uniquement pour l'UI overlay
- **TypeScript** strict mode (qualité code)

### Choix de Design

- **Routage arbre hiérarchique** (pas de mesh)
- **Liens unidirectionnels** enfant → parent
- **Cache Map<string, CachedChunk>** (clé = videoId_chunkIndex)
- **Logs structurés** (Logger.info/debug/error)

### Problèmes Résolus

- [x] Crash de la fenêtre : Cycle de parentage dans `connecTo()`
- [x] Paquets invisibles : Liens orientés mal gérés dans routage
- [x] Routage multi-liens : Ajout de `path` et `currentStepIndex`
- [x] Vitesse adaptative : Calcul basé sur latence du lien

---

## 📚 Ressources et Références

### Documentation Consultée

- Instructions TIPE (`.github/copilot-instructions.md`)
- Plan Phase 3 détaillé (`docs/PHASE3_PLAN.md`)

### Outils Utilisés

- Vite (build tool)
- TypeScript 5.x
- Canvas API
- React 18

### Sources Scientifiques (à citer)

- Loi de Zipf : Breslau et al. (1999)
- CDN Architecture : Nygren et al. (2010)
- LRU Algorithm : O'Neil et al. (1993)
- Netflix CDN : Netflix Tech Blog

---

## 🎓 Pour la Soutenance

### Points Forts du Projet

1. ✅ **Réalisme** : Topologie hiérarchique + Zipf
2. ✅ **Visualisation** : Voir les paquets en temps réel
3. ✅ **Rigueur** : 3 algorithmes comparés scientifiquement
4. 🚧 **Innovation** : Algorithme MPI custom (à finaliser)

### Questions Anticipées

- Pourquoi Zipf ? → 80% du trafic Netflix vient de 20% du catalogue
- Pourquoi pas augmenter la capacité ? → Coût matériel vs optimisation algo
- Limitations ? → Modèle simplifié (pas de perte de paquets, pas de congestion)

---

**Dernière mise à jour** : 29 janvier 2026  
**Responsable** : @SkanixDev  
**Status global** : Phase 2 terminée ✅ | Phase 3 en préparation 🚧
