import {
  NetworkNode,
  OriginNode,
  CDNNode,
  FogNode,
  UserNode,
} from "../model/NetworkNode";
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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    // Event pour gérer la cam
    this.setupInputs();

    // Adapter la taille du canvas
    this.resize();

    // Générer un réseau tout de suite
    this.generateNetworkTree();
  }

  // Gestion des inputs pour la caméra
  setupInputs() {
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
    this.canvas.width =
      this.canvas.parentElement?.clientWidth || window.innerWidth;
    this.canvas.height =
      this.canvas.parentElement?.clientHeight || window.innerHeight;
  }

  // Création de l'infrastructure réseau (arbre)
  generateNetworkTree() {
    this.nodes = [];
    const width = this.canvas.width * 2;

    // 1. ORIGIN
    const origin = new OriginNode("Netflix_HQ");
    origin.x = width / 2;
    origin.y = 50;
    this.nodes.push(origin);

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
        }
      }
    }
  }

  // BOUCLE DE RENDERING
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
  }

  animate() {
    if (!this.isRunning) return;

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

    // 4. Prochaine frame
    requestAnimationFrame(() => this.animate());
  }
}
