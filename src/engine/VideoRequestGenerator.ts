// Idée clé : la vidéo de rang 1 est la plus populaire, le rang 2 un peu moins, etc.
// La probabilité d'un rang r est proportionnelle à 1 / r^alpha.
// - alpha petit (~0.8) : popularité plus “plate”

import Logger from "../utils/Logger";

// - alpha grand (~1.2) : quelques vidéos dominent fortement
export class VideoRequestGenerator {
  private numVideos: number;
  private alpha: number;
  private randomFn: () => number;
  private videoRanks: number[] = [];
  private cumulativeProbabilities: number[] = [];

  constructor(
    numVideos: number,
    alpha: number = 4.0,
    randomFn: () => number = Math.random,
  ) {
    this.numVideos = Math.max(1, Math.floor(numVideos));
    this.alpha = Math.max(0.1, alpha);
    this.randomFn = randomFn;
    this.buildDistribution();
  }

  // Met à jour le catalogue et/ou le paramètre alpha, puis reconstruit la distribution
  updateParameters(numVideos: number, alpha: number = 1.0): void {
    this.numVideos = Math.max(1, Math.floor(numVideos));
    this.alpha = Math.max(0.1, alpha);
    this.buildDistribution();
  }

  // Retourne un id de vidéo sous la forme "video_7" en respectant Zipf
  getRandomVideoId(): string {
    const rank = this.sampleZipfRank();
    return `video_${rank}`;
  }

  // Pré-calcule la distribution cumulative (CDF) pour un tirage rapide en O(n)
  // CDF[i] = P(rang <= i+1)
  private buildDistribution(): void {
    this.videoRanks = Array.from({ length: this.numVideos }, (_, i) => i + 1);
    const normalization = this.sumOfInverses(this.numVideos, this.alpha);

    const cumulative: number[] = [];
    let runningSum = 0;

    for (const rank of this.videoRanks) {
      const probability = 1 / rank ** this.alpha / normalization;
      runningSum += probability;
      cumulative.push(runningSum);
    }

    this.cumulativeProbabilities = cumulative;
    Logger.debug(
      `Distribution Zipf construite: ${this.numVideos} vidéos, alpha=${this.alpha}`,
      this.videoRanks,
      this,
    );
  }

  // Calcule la constante de normalisation : somme des 1 / r^alpha
  // Permet d'assurer que les probabilités totalisent 1
  private sumOfInverses(count: number, alpha: number): number {
    let sum = 0;
    for (let rank = 1; rank <= count; rank += 1) {
      sum += 1 / rank ** alpha;
    }
    return sum;
  }

  // Échantillonne un rang selon la loi de Zipf via la CDF pré-calculée
  // Méthode : on tire un U[0,1] puis on retourne le premier rang dont la CDF dépasse U
  private sampleZipfRank(): number {
    const randomValue = this.randomFn();

    for (
      let index = 0;
      index < this.cumulativeProbabilities.length;
      index += 1
    ) {
      if (randomValue <= this.cumulativeProbabilities[index]) {
        return this.videoRanks[index];
      }
    }

    return this.videoRanks[this.videoRanks.length - 1];
  }
}
