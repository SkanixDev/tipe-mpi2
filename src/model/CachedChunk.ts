/**
 * Représente un chunk vidéo stocké en cache
 */
export interface CachedChunk {
  videoId: string;
  chunkIndex: number;

  // Timestamps pour les stratégies de cache
  storedAtFrame: number; // Quand le chunk a été mis en cache
  lastAccessedFrame: number; // Dernière fois qu'il a été demandé (pour LRU)
  accessCount: number; // Nombre de fois demandé (pour LFU/stats)
}

/**
 * Clé unique pour identifier un chunk en cache
 */
export function getCacheKey(videoId: string, chunkIndex: number): string {
  return `${videoId}_${chunkIndex}`;
}
