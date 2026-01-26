import { useEffect, useRef } from "react";
import "./App.css";
import { NetworkEngine } from "./engine/NetworkEngine";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<NetworkEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // init du moteur
    const engine = new NetworkEngine(canvasRef.current);
    engineRef.current = engine;
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
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />

      {/* Overlay UI (Juste pour vérifier que React marche par dessus) */}
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
        <h2>TIPE</h2>
      </div>
    </div>
  );
}

export default App;
