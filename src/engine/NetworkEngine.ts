import {
  NetworkNode,
  OriginNode,
  CDNNode,
  FogNode,
  UserNode,
} from "../model/NetworkNode";
import type { Link } from "../model/NetworkNode";
import { Packet } from "../model/Packet";
import Logger from "../utils/Logger";
import { NETWORK_CONFIG } from "./config";

export class NetworkEngine {
  // Propriétés du moteur
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  nodes: NetworkNode[] = [];
  isRunning: boolean = false;

  // Camera
  cameraX: number = 0;
  cameraY: number = 0;
  zoom: number = 1;
  isDragging: boolean = false;
  lastMouseX: number = 0;
  lastMouseY: number = 0;

  packets: Packet[] = [];
  frameDurationMs: number = 16.67; // Hypothèse 60 FPS

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    Logger.info("Initialisation du NetworkEngine");

    // Event pour gérer la cam
    this.setupInputs();

    // Adapter la taille du canvas
    this.resize();

    // Générer un réseau tout de suite
    this.generateNetworkTree();
    Logger.info(`Réseau généré (${this.nodes.length} nœuds)`);
  }

  // Gestion des inputs pour la caméra
  setupInputs() {
    Logger.debug("Setup des inputs caméra");
    // 1. Zoom avec la molette
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomIntensity = 0.1;
      const direction = e.deltaY > 0 ? -1 : 1;
      const factor = 1 + zoomIntensity * direction;

      // On limite le zoom (entre x0.1 et x5)
      const newZoom = this.zoom * factor;
      if (newZoom > 0.1 && newZoom < 5) {
        // Zoomer vers la souris (maths un peu astucieuses)
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        // On décale la caméra pour que le point sous la souris reste stable
        this.cameraX = mouseX - (mouseX - this.cameraX) * factor;
        this.cameraY = mouseY - (mouseY - this.cameraY) * factor;
        this.zoom = newZoom;
      }
    });

    // 2. Déplacement (Pan) - Clic enfoncé
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouseX = e.offsetX;
      this.lastMouseY = e.offsetY;
      this.canvas.style.cursor = "grabbing";
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
      this.canvas.style.cursor = "default";
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        const dx = e.offsetX - this.lastMouseX;
        const dy = e.offsetY - this.lastMouseY;

        this.cameraX += dx;
        this.cameraY += dy;

        this.lastMouseX = e.offsetX;
        this.lastMouseY = e.offsetY;
      }
    });
  }

  // Adapter la taille du canvas à son conteneur
  resize() {
    Logger.debug("Resize canvas");
    this.canvas.width =
      this.canvas.parentElement?.clientWidth || window.innerWidth;
    this.canvas.height =
      this.canvas.parentElement?.clientHeight || window.innerHeight;
  }

  // Création de l'infrastructure réseau (arbre)
  generateNetworkTree() {
    Logger.info("Génération de la topologie réseau");
    this.nodes = [];
    const width = this.canvas.width * 2;

    // 1. ORIGIN
    const origin = new OriginNode("Netflix_HQ");
    origin.x = width / 2;
    origin.y = 50;
    this.nodes.push(origin);
    Logger.debug(`Origin créé: ${origin.id}`);

    // 2. CDN
    const numCDNs = NETWORK_CONFIG.CDN.countPerOrigin;
    for (let i = 0; i < numCDNs; i++) {
      const cdn = new CDNNode(`CDN_${i + 1}`);

      // Positionnement
      cdn.x = (width / (numCDNs + 1)) * (i + 1);
      cdn.y = NETWORK_CONFIG.CDN.position.y;

      cdn.connecTo(
        origin,
        NETWORK_CONFIG.CDN.options.latencyToOrigin,
        NETWORK_CONFIG.CDN.options.bandwidthToOrigin,
      );
      this.nodes.push(cdn);
      Logger.debug(`CDN créé: ${cdn.id}`);

      // 3. FOG
      const numFogs = NETWORK_CONFIG.FOG.countPerCDN;
      for (let j = 0; j < numFogs; j++) {
        const fog = new FogNode(`FOG_${i + 1}_${j + 1}`);

        const offset = (j - (numFogs - 1) / 2) * 150;
        fog.x = cdn.x + offset;
        fog.y = 400;

        fog.connecTo(
          cdn,
          NETWORK_CONFIG.FOG.options.latencyToCDN,
          NETWORK_CONFIG.FOG.options.bandwidthToCDN,
        );
        this.nodes.push(fog);
        Logger.debug(`Fog créé: ${fog.id}`);

        // 4. USERS
        const numUsers = NETWORK_CONFIG.USER.countPerFog;
        for (let k = 0; k < numUsers; k++) {
          const user = new UserNode(`USER_${i + 1}_${j + 1}_${k + 1}`);

          // éventail
          const userOffset = (k - (numUsers - 1) / 2) * 20;
          user.x = fog.x + userOffset;
          user.y = NETWORK_CONFIG.USER.position.y;

          user.connecTo(
            fog,
            NETWORK_CONFIG.USER.options.latencyToFog,
            NETWORK_CONFIG.USER.options.bandwidthToFog,
          );
          this.nodes.push(user);
          Logger.debug(`User créé: ${user.id}`);
        }
      }
    }
  }

  // BOUCLE DE RENDERING
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    Logger.info("Démarrage de la simulation");
    this.animate();
  }

  stop() {
    this.isRunning = false;
    Logger.info("Simulation arrêtée");
  }

  animate() {
    if (!this.isRunning) return;

    Logger.debug("Frame render");

    // 0. Mettre à jour la simulation (avant le rendu)
    this.updatePackets();

    // 1. Effacer le canvas
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1.1 Ajout de la cam
    this.ctx.translate(this.cameraX, this.cameraY);
    this.ctx.scale(this.zoom, this.zoom);

    // 2. Dessiner les nœuds et les liens
    this.ctx.lineWidth = 2 / this.zoom;
    this.ctx.strokeStyle = "#555";

    for (const node of this.nodes) {
      // Petite optimisation : ne pas dessiner si c'est hors écran (Culling)
      // (Optionnel pour l'instant)

      // Dessiner les liens
      for (const link of node.links) {
        this.ctx.beginPath();
        this.ctx.moveTo(node.x, node.y);
        this.ctx.lineTo(link.target.x, link.target.y);
        this.ctx.stroke();
      }
    }

    // 3. Dessiner les nœuds par-dessus les liens
    for (const node of this.nodes) {
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);

      switch (node.type) {
        case "ORIGIN":
          this.ctx.fillStyle = "#ff4444";
          break; // Rouge
        case "CDN":
          this.ctx.fillStyle = "#ffbb33";
          break; // Orange
        case "FOG":
          this.ctx.fillStyle = "#33b5e5";
          break; // Bleu
        case "USER":
          this.ctx.fillStyle = "#00C851";
          break; // Vert
      }
      this.ctx.fill();
    }

    // 3.1 Dessiner les paquets par-dessus les nœuds
    for (const packet of this.packets) {
      if (packet.status !== "TRANSIT") continue;

      const packetPath = packet.path;
      const currentStepIndex = packet.currentStepIndex;
      if (packetPath.length < 2 || currentStepIndex >= packetPath.length - 1) {
        continue;
      }

      const startNode = packetPath[currentStepIndex];
      const endNode = packetPath[currentStepIndex + 1];

      const packetPositionX =
        startNode.x + (endNode.x - startNode.x) * packet.progress;
      const packetPositionY =
        startNode.y + (endNode.y - startNode.y) * packet.progress;

      this.ctx.beginPath();
      this.ctx.arc(packetPositionX, packetPositionY, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = packet.type === "REQUEST" ? "#f4d03f" : "#ffffff";
      this.ctx.fill();
    }

    // 4. Prochaine frame
    requestAnimationFrame(() => this.animate());
  }

  createPacket(packet: Packet) {
    this.packets.push(packet);
    Logger.debug(`Packet ajouté: ${packet.id}`);
  }

  // Helper pour créer une requête depuis un UserNode
  createRequestFromUser(
    userNode: UserNode,
    videoId: string,
    chunkIndex: number,
    isLastChunk: boolean = false,
  ) {
    const originNode = this.getOriginNode();
    if (!originNode) {
      Logger.error("Impossible de créer une requête: Origin introuvable");
      return;
    }

    const requestPacket = new Packet(
      `REQ_${userNode.id}_${videoId}_${chunkIndex}`,
      "REQUEST",
      userNode,
      originNode,
      videoId,
      chunkIndex,
    );
    requestPacket.isLastChunk = isLastChunk;
    this.createPacket(requestPacket);
    Logger.info(
      `Création de la requête ${requestPacket.id} depuis ${userNode.id}`,
    );
  }

  // Met à jour tous les paquets (progression + routage)
  updatePackets() {
    Logger.debug(`Mise à jour des paquets (${this.packets.length} au total)`);
    const activePackets: Packet[] = [];
    const spawnedPackets: Packet[] = [];

    for (const packet of this.packets) {
      // 1) Initialiser le chemin si besoin
      if (packet.status === "QUEUED") {
        const path = this.buildPathForPacket(packet);
        Logger.debug(`Path trouvé (${path.length} nœuds) pour ${packet.id}`);

        if (path.length < 2) {
          packet.status = "DELIVERED";
          continue;
        }

        packet.path = path;
        packet.currentStepIndex = 0;
        packet.progress = 0;
        packet.status = "TRANSIT";

        const firstLink = this.getLinkBetweenNodes(path[0], path[1]);
        if (firstLink) {
          packet.speed = this.calculateProgressSpeed(firstLink, packet);
        } else {
          packet.status = "DELIVERED";
          continue;
        }
      }

      // 2) Avancer le paquet sur le lien actuel
      if (packet.status === "TRANSIT") {
        packet.progress += packet.speed;
        Logger.debug(
          `Packet ${packet.id} progress=${packet.progress.toFixed(2)}`,
        );

        // Fin de lien
        if (packet.progress >= 1) {
          packet.currentStepIndex += 1;
          packet.progress = 0;
          Logger.debug(
            `Packet ${packet.id} avance au step ${packet.currentStepIndex}`,
          );

          // Arrivé au dernier noeud du chemin
          if (packet.currentStepIndex >= packet.path.length - 1) {
            packet.status = "DELIVERED";
          } else {
            const currentNode = packet.path[packet.currentStepIndex];
            const nextNode = packet.path[packet.currentStepIndex + 1];
            const nextLink = this.getLinkBetweenNodes(currentNode, nextNode);

            if (nextLink) {
              packet.speed = this.calculateProgressSpeed(nextLink, packet);
            } else {
              packet.status = "DELIVERED";
            }
          }
        }
      }

      // 3) Traitement à l'arrivée
      if (packet.status === "DELIVERED") {
        const deliveredNode =
          packet.path.length > 0
            ? packet.path[packet.path.length - 1]
            : packet.target;

        Logger.info(`Packet livré: ${packet.id} à ${deliveredNode.id}`);

        if (packet.type === "REQUEST" && deliveredNode.type === "ORIGIN") {
          // Génère une réponse vers l'utilisateur d'origine
          const responsePacket = new Packet(
            `RESP_${packet.id}`,
            "RESPONSE",
            deliveredNode,
            packet.source,
            packet.videoId,
            packet.chunkIndex,
          );
          responsePacket.isLastChunk = packet.isLastChunk;
          spawnedPackets.push(responsePacket);
          Logger.info(`Réponse générée: ${responsePacket.id}`);
        }

        // On ne garde pas le paquet livré
        continue;
      }

      activePackets.push(packet);
    }

    this.packets = activePackets.concat(spawnedPackets);
    Logger.debug(
      `Packets actifs: ${activePackets.length}, nouveaux: ${spawnedPackets.length}`,
    );
  }

  // Construit le chemin complet pour un paquet
  buildPathForPacket(packet: Packet): NetworkNode[] {
    Logger.debug(`Build path pour ${packet.id} (${packet.type})`);
    if (packet.type === "REQUEST") {
      return this.findPathToOrigin(packet.source);
    }

    const originNode = this.getOriginNode();
    if (!originNode) return [];

    return this.findPathFromOrigin(originNode, packet.target);
  }

  // Trouve un chemin en remontant vers l'ORIGIN
  findPathToOrigin(startNode: NetworkNode): NetworkNode[] {
    Logger.debug(`Path to Origin depuis ${startNode.id}`);
    const path: NetworkNode[] = [];
    let currentNode: NetworkNode | null = startNode;

    while (currentNode) {
      path.push(currentNode);
      if (currentNode.type === "ORIGIN") break;
      currentNode = this.getParentCandidate(currentNode);
    }

    return path;
  }

  // Trouve un chemin en descendant depuis l'ORIGIN jusqu'à la cible
  findPathFromOrigin(
    originNode: NetworkNode,
    targetNode: NetworkNode,
  ): NetworkNode[] {
    Logger.debug(`Path from Origin ${originNode.id} vers ${targetNode.id}`);
    const path: NetworkNode[] = [];
    const found = this.depthFirstFindPath(originNode, targetNode, path);
    return found ? path : [];
  }

  depthFirstFindPath(
    currentNode: NetworkNode,
    targetNode: NetworkNode,
    path: NetworkNode[],
  ): boolean {
    Logger.debug(`DFS at ${currentNode.id}`);
    path.push(currentNode);
    if (currentNode === targetNode) return true;

    const children = this.getChildrenOf(currentNode);
    for (const child of children) {
      const found = this.depthFirstFindPath(child, targetNode, path);
      if (found) return true;
    }

    path.pop();
    return false;
  }

  getChildrenOf(parentNode: NetworkNode): NetworkNode[] {
    Logger.debug(`Recherche enfants de ${parentNode.id}`);
    return this.nodes.filter(
      (node) =>
        node.parent === parentNode ||
        node.links.some((link) => link.target === parentNode),
    );
  }

  // Trouve le parent en se basant sur le champ parent ou sur les liens
  getParentCandidate(node: NetworkNode): NetworkNode | null {
    Logger.debug(`Recherche parent de ${node.id}`);
    if (node.parent) return node.parent;

    const firstLink = node.links[0];
    return firstLink ? firstLink.target : null;
  }

  // Récupère un lien (dans un sens ou dans l'autre)
  getLinkBetweenNodes(
    startNode: NetworkNode,
    endNode: NetworkNode,
  ): Link | null {
    Logger.debug(`Recherche lien ${startNode.id} -> ${endNode.id}`);
    const directLink = startNode.links.find((link) => link.target === endNode);
    if (directLink) return directLink;

    const reverseLink = endNode.links.find((link) => link.target === startNode);
    if (reverseLink) return reverseLink;

    return null;
  }

  // Convertit latence + type de paquet en vitesse (progression par frame)
  calculateProgressSpeed(link: Link, packet: Packet): number {
    Logger.debug(`Calcul speed pour ${packet.id} (latency=${link.latency}ms)`);
    const baseTraversalFrames = Math.max(
      1,
      link.latency / this.frameDurationMs,
    );
    const sizeFactor = packet.type === "REQUEST" ? 1 : 10;
    const traversalFrames = baseTraversalFrames * sizeFactor;

    return 1 / traversalFrames;
  }

  getOriginNode(): OriginNode | null {
    const originNode = this.nodes.find((node) => node.type === "ORIGIN");
    if (!originNode) Logger.error("Origin introuvable");
    return originNode ? (originNode as OriginNode) : null;
  }
}
