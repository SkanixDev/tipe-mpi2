import { useEffect, useRef, useState } from "react";
import "./App.css";
import { NetworkEngine } from "./engine/NetworkEngine";
import type { NetworkNode } from "./model/NetworkNode";
import { CDNNode, FogNode } from "./model/NetworkNode";
import Logger from "./utils/Logger";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<NetworkEngine | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(0.3);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  const handleRequest = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const firstUserNode = engine.nodes.find((node) => node.type === "USER");
    if (!firstUserNode) {
      Logger.error("Aucun UserNode trouvé pour la requête test");
      return;
    }

    engine.createRequestFromUser(firstUserNode, "video1", 0, false);
  };

  // 🎯 Test Cache : 2 users regardent la même vidéo
  const handleCacheTest = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const users = engine.nodes.filter((node) => node.type === "USER");
    if (users.length < 2) {
      Logger.error("Besoin d'au moins 2 users pour le test cache");
      return;
    }

    const user1 = users[0];
    const user2 = users[1];

    Logger.info("🎬 Test Cache : User 1 demande Matrix chunk 0");
    engine.createRequestFromUser(user1, "Matrix", 0, false);

    // User 2 demande le même chunk 2 secondes plus tard
    setTimeout(() => {
      Logger.info(
        "🎬 Test Cache : User 2 demande Matrix chunk 0 (devrait HIT le cache !)",
      );
      engine.createRequestFromUser(user2, "Matrix", 0, false);
    }, 2000);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // init du moteur
    const engine = new NetworkEngine(canvasRef.current);
    engineRef.current = engine;
    engine.setSimulationSpeed(speedMultiplier);
    engine.start();

    // bonne taille
    const handleResize = () => {
      engine.resize();
      engine.generateNetworkTree();
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.stop();
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setSimulationSpeed(speedMultiplier);
  }, [speedMultiplier]);

  const handleCanvasClick = (
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  ) => {
    const engine = engineRef.current;
    if (!engine) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const clickedNode = engine.getNodeAtScreenPosition(offsetX, offsetY);
    setSelectedNode(clickedNode);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block" }}
        onClick={handleCanvasClick}
      />

      {/* Overlay UI */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          color: "white",
          fontFamily: "sans-serif",
          background: "rgba(0,0,0,0.7)",
          padding: "10px",
          borderRadius: "5px",
        }}
      >
        <h2>TIPE - Phase 3A : Cache</h2>
        <button
          onClick={handleRequest}
          style={{ marginBottom: "10px", display: "block" }}
        >
          Requête simple
        </button>
        <button
          onClick={handleCacheTest}
          style={{ marginBottom: "10px", display: "block" }}
        >
          🧪 Test Cache (2 users)
        </button>

        <label
          style={{ display: "block", marginTop: "10px", fontSize: "12px" }}
        >
          Vitesse simulation: x{speedMultiplier.toFixed(2)}
        </label>
        <input
          type="range"
          min="0.05"
          max="1.5"
          step="0.05"
          value={speedMultiplier}
          onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
          style={{ width: "200px" }}
        />

        <div style={{ marginTop: "12px", fontSize: "12px" }}>
          <strong>Node sélectionné :</strong>
          {selectedNode ? (
            <div style={{ marginTop: "6px" }}>
              <div>ID : {selectedNode.id}</div>
              <div>Type : {selectedNode.type}</div>
              <div>Parent : {selectedNode.parent?.id ?? "Aucun"}</div>
              {(selectedNode instanceof CDNNode ||
                selectedNode instanceof FogNode) && (
                <div style={{ marginTop: "6px" }}>
                  <div>
                    Cache : {selectedNode.cache.size} /{" "}
                    {selectedNode.cacheCapacity}
                  </div>
                  <div style={{ opacity: 0.8, marginTop: "4px" }}>
                    Clés:{" "}
                    {Array.from(selectedNode.cache.keys())
                      .slice(0, 5)
                      .join(", ") || "(vide)"}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: "6px", opacity: 0.7 }}>
              Cliquez sur un nœud pour voir ses stats
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
