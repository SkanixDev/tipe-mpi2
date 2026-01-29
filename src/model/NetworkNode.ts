export type NodeType = "ORIGIN" | "CDN" | "FOG" | "USER";

// Interface pour les liens entre nœuds
export interface Link {
  target: NetworkNode;
  bandwidth: number; // Mbps
  latency: number; // ms
}

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
  constructor(id: string) {
    super(id, "CDN");
  }
}

export class FogNode extends NetworkNode {
  constructor(id: string) {
    super(id, "FOG");
  }
}

export class UserNode extends NetworkNode {
  constructor(id: string) {
    super(id, "USER");
  }
}
