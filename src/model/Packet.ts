// src/model/Packet.ts
import { NetworkNode } from "./NetworkNode";

export type PacketType = "REQUEST" | "RESPONSE";
export type PacketStatus = "QUEUED" | "TRANSIT" | "DELIVERED";

export class Packet {
  id: string;
  type: PacketType;
  status: PacketStatus = "QUEUED";

  source: NetworkNode;
  target: NetworkNode; // Qui doit recevoir ce paquet ?

  // Chemin de routage (liste de nœuds à traverser)
  path: NetworkNode[] = [];
  currentStepIndex: number = 0;

  videoId: string;
  chunkIndex: number;
  isLastChunk: boolean = false;

  progress: number = 0;
  speed: number;

  constructor(
    id: string,
    type: PacketType,
    source: NetworkNode,
    target: NetworkNode,
    videoId: string,
    chunkIndex: number,
  ) {
    this.id = id;
    this.type = type;
    this.source = source;
    this.target = target;
    this.videoId = videoId;
    this.chunkIndex = chunkIndex;

    // Physique simple :
    // Une requête (1ko) va 10x plus vite qu'une vidéo (1Mo)
    this.speed = type === "REQUEST" ? 0.2 : 0.005;
  }
}
