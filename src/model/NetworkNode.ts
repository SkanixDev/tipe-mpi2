export type NodeType = "ORIGIN" | "CDN" | "FOG" | "USER";

// Interface pour les liens entre nœuds
export interface Link {
  target: NetworkNode;
  bandwidth: number; // Mbps
  latency: number; // ms
}

import type { CachedChunk } from "./CachedChunk";
import { getCacheKey } from "./CachedChunk";

// Classe de base pour les nœuds du réseau
export abstract class NetworkNode {
  id: string;
  type: NodeType;

  // Position pour le canvas
  x: number = 0;
  y: number = 0;

  // Connexions
  links: Link[] = [];
  parent: NetworkNode | null = null;

  constructor(id: string, type: NodeType) {
    this.id = id;
    this.type = type;
  }

  // Relie ce nœud (enfant) à son parent
  connecTo(parentNode: NetworkNode, latency: number, bandwidth: number) {
    this.links.push({ target: parentNode, latency, bandwidth });
    this.parent = parentNode;
  }
}

// Extensions de NetworkNode pour chaque type de nœud
export class OriginNode extends NetworkNode {
  constructor(id: string) {
    super(id, "ORIGIN");
  }
}
export class CDNNode extends NetworkNode {
  // Système de Cache
  cache: Map<string, CachedChunk> = new Map();
  cacheCapacity: number = 20; // 20 chunks max (peut être ajusté)
  insertionQueue: string[] = []; // Pour FIFO (ordre d'arrivée)

  constructor(id: string) {
    super(id, "CDN");
  }

  // Vérifie si un chunk est en cache
  hasChunk(videoId: string, chunkIndex: number): boolean {
    const key = getCacheKey(videoId, chunkIndex);
    return this.cache.has(key);
  }

  // Stocke un chunk en cache (avec éviction FIFO si plein)
  storeChunk(videoId: string, chunkIndex: number, currentFrame: number): void {
    const key = getCacheKey(videoId, chunkIndex);

    // Si déjà présent, mettre à jour l'accès
    if (this.cache.has(key)) {
      const chunk = this.cache.get(key)!;
      chunk.lastAccessedFrame = currentFrame;
      chunk.accessCount++;
      return;
    }

    // Si plein, appliquer l'éviction FIFO
    if (this.cache.size >= this.cacheCapacity) {
      this.evictChunk();
    }

    // Ajouter le nouveau chunk
    const newChunk: CachedChunk = {
      videoId,
      chunkIndex,
      storedAtFrame: currentFrame,
      lastAccessedFrame: currentFrame,
      accessCount: 0,
    };

    this.cache.set(key, newChunk);
    this.insertionQueue.push(key);
  }

  // Éviction FIFO : vire le plus vieux chunk
  private evictChunk(): void {
    if (this.insertionQueue.length === 0) return;

    const victimKey = this.insertionQueue.shift()!;
    this.cache.delete(victimKey);
  }

  // Met à jour les stats d'accès lors d'un cache hit/
  onCacheHit(videoId: string, chunkIndex: number, currentFrame: number): void {
    const key = getCacheKey(videoId, chunkIndex);
    const chunk = this.cache.get(key);

    if (chunk) {
      chunk.lastAccessedFrame = currentFrame;
      chunk.accessCount++;
    }
  }
}

export class FogNode extends NetworkNode {
  // Système de Cache pour les Fog
  cache: Map<string, CachedChunk> = new Map();
  cacheCapacity: number = 5; // 5 chunks max (Edge = petite mémoire)
  insertionQueue: string[] = []; // Pour FIFO

  constructor(id: string) {
    super(id, "FOG");
  }

  // Vérifie si un chunk est en cache
  hasChunk(videoId: string, chunkIndex: number): boolean {
    const key = getCacheKey(videoId, chunkIndex);
    return this.cache.has(key);
  }

  // Stocke un chunk en cache (avec éviction FIFO si plein)
  storeChunk(videoId: string, chunkIndex: number, currentFrame: number): void {
    const key = getCacheKey(videoId, chunkIndex);

    // Si déjà présent, mettre à jour l'accès
    if (this.cache.has(key)) {
      const chunk = this.cache.get(key)!;
      chunk.lastAccessedFrame = currentFrame;
      chunk.accessCount++;
      return;
    }

    // Si plein, appliquer l'éviction FIFO
    if (this.cache.size >= this.cacheCapacity) {
      this.evictChunk();
    }

    // Ajouter le nouveau chunk
    const newChunk: CachedChunk = {
      videoId,
      chunkIndex,
      storedAtFrame: currentFrame,
      lastAccessedFrame: currentFrame,
      accessCount: 0,
    };

    this.cache.set(key, newChunk);
    this.insertionQueue.push(key);
  }

  // Éviction FIFO : vire le plus vieux chunk
  private evictChunk(): void {
    if (this.insertionQueue.length === 0) return;

    const victimKey = this.insertionQueue.shift()!;
    this.cache.delete(victimKey);
  }

  // Met à jour les stats d'accès lors d'un cache hit
  onCacheHit(videoId: string, chunkIndex: number, currentFrame: number): void {
    const key = getCacheKey(videoId, chunkIndex);
    const chunk = this.cache.get(key);

    if (chunk) {
      chunk.lastAccessedFrame = currentFrame;
      chunk.accessCount++;
    }
  }
}

export class UserNode extends NetworkNode {
  constructor(id: string) {
    super(id, "USER");
  }
}
