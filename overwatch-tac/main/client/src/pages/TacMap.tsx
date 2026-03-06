import React, { useState, useEffect, useRef } from "react";
import type { MouseEvent } from "react";

// Asset Imports
import watchpoint from "/src/assets/maps/watchpoint_map.png";
import lijiang from "/src/assets/maps/lijiang_map.png";
import kings from "/src/assets/maps/kings_map.png";
import junk from "/src/assets/maps/junk_map.png";
import ilios from "/src/assets/maps/ilios_map.png";
import horizon from "/src/assets/maps/horizon_map.png";
import holly from "/src/assets/maps/holly_map.png";
import hana from "/src/assets/maps/hana_map.png";
import eich from "/src/assets/maps/eich_map.png";
import dorado from "/src/assets/maps/dorado_map.png";
import blizzworld from "/src/assets/maps/blizzworld_map.png";
import anubis from "/src/assets/maps/anubis_map.png";

type Team = "ally" | "enemy";
type ToolMode = "place" | "drag" | "draw"; // Added draw mode

interface Marker {
  id: number;
  x: number;
  y: number;
  team: Team;
}

type GameMode = "Control" | "Escort" | "Hybrid" | "Push" | "Flashpoint" | "Clash" | "Assault";

interface MapData {
  name: string;
  mode: GameMode;
  image: string;
}

const mapList: MapData[] = [
  { name: "Watchpoint: Gibraltar", mode: "Escort", image: watchpoint },
  { name: "Lijiang Tower", mode: "Control", image: lijiang },
  { name: "King's Row", mode: "Hybrid", image: kings },
  { name: "Junkertown", mode: "Escort", image: junk },
  { name: "Ilios", mode: "Control", image: ilios },
  { name: "Horizon Lunar Colony", mode: "Assault", image: horizon },
  { name: "Hollywood", mode: "Hybrid", image: holly },
  { name: "Hanaoka", mode: "Clash", image: hana },
  { name: "Eichenwalde", mode: "Hybrid", image: eich },
  { name: "Dorado", mode: "Escort", image: dorado },
  { name: "Blizzard World", mode: "Hybrid", image: blizzworld },
  { name: "Temple of Anubis", mode: "Assault", image: anubis },
];

const gameModes: GameMode[] = ["Control", "Escort", "Hybrid", "Push", "Flashpoint", "Clash", "Assault"];

const TacMap: React.FC = () => {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team>("ally");
  const [toolMode, setToolMode] = useState<ToolMode>("place");
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentMap = mapList.find((m) => m.name === selectedMap);
  const allyCount = markers.filter(m => m.team === "ally").length;
  const enemyCount = markers.filter(m => m.team === "enemy").length;

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Drawing Functions
  const startDrawing = (e: React.MouseEvent) => {
    if (toolMode !== "draw" || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const rect = canvasRef.current.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = activeTeam === "ally" ? "#007bff" : "#dc3545";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!currentMap || toolMode !== "place" || draggingId !== null) return;

    const currentTeamCount = markers.filter(m => m.team === activeTeam).length;
    if (currentTeamCount >= 5) {
      setErrorMessage(`Limit reached! You can only place 5 ${activeTeam} icons.`);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMarkers([...markers, { id: Date.now(), x, y, team: activeTeam }]);
  };

  const startDragging = (e: React.MouseEvent, id: number) => {
    if (toolMode !== "drag") return;
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId !== null && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMarkers(prev => prev.map(m => m.id === draggingId ? { ...m, x, y } : m));
    }
    if (toolMode === "draw") draw(e);
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    stopDrawing();
  };

  const handleReset = () => {
    setMarkers([]);
    setErrorMessage(null);
    clearCanvas();
  };

  const handleRightClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div 
      style={{ padding: "20px", color: "white", backgroundColor: "#1a1a1a", minHeight: "100vh", fontFamily: "sans-serif" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <h2>Overwatch Tac Map</h2>

      {/* Mode Selection */}
      <div style={{ marginBottom: "16px" }}>
        <h3>1. Select Game Mode</h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {gameModes.map((mode) => (
            <button
              key={mode}
              onClick={() => { setSelectedMode(mode); setSelectedMap(null); setMarkers([]); clearCanvas(); }}
              style={{
                padding: "8px 12px",
                background: selectedMode === mode ? "#e60082ff" : "#444",
                color: "white", border: "none", borderRadius: "4px", cursor: "pointer",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Map Selection */}
      <div style={{ marginBottom: "16px" }}>
        <h3>2. Select Map</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {mapList.map((map) => {
            const isMatch = selectedMode === map.mode;
            return (
              <button
                key={map.name}
                onClick={() => isMatch && (setSelectedMap(map.name), setMarkers([]), clearCanvas())}
                style={{
                  padding: "6px 10px",
                  background: selectedMap === map.name ? "#f65dfbff" : isMatch ? "#962b9aff" : "#333",
                  opacity: selectedMode && !isMatch ? 0.4 : 1,
                  color: "white", border: "none", borderRadius: "4px",
                  cursor: isMatch ? "pointer" : "not-allowed",
                }}
              >
                {map.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "2px", background: "#333", padding: "4px", borderRadius: "8px" }}>
          <button onClick={() => setToolMode("place")} style={{ padding: "10px 15px", backgroundColor: toolMode === "place" ? "#444" : "transparent", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>📍 Place</button>
          <button onClick={() => setToolMode("drag")} style={{ padding: "10px 15px", backgroundColor: toolMode === "drag" ? "#444" : "transparent", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>🤚 Drag</button>
          <button onClick={() => setToolMode("draw")} style={{ padding: "10px 15px", backgroundColor: toolMode === "draw" ? "#444" : "transparent", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>✏️ Draw</button>
        </div>

        <div style={{ display: "flex", gap: "10px", padding: "10px", background: "#333", borderRadius: "8px" }}>
          <button onClick={() => setActiveTeam("ally")} style={{ padding: "10px 20px", backgroundColor: activeTeam === "ally" ? "#007bff" : "#555", color: "white", border: "2px solid white", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Ally ({allyCount}/5)</button>
          <button onClick={() => setActiveTeam("enemy")} style={{ padding: "10px 20px", backgroundColor: activeTeam === "enemy" ? "#dc3545" : "#555", color: "white", border: "2px solid white", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Enemy ({enemyCount}/5)</button>
        </div>
        
        <button onClick={clearCanvas} style={{ padding: "10px", background: "none", color: "#aaa", border: "1px solid #aaa", cursor: "pointer", borderRadius: "4px" }}>Clear Lines</button>
        <button onClick={handleReset} style={{ padding: "10px", background: "#c4302b", color: "white", border: "none", cursor: "pointer", borderRadius: "4px" }}>Reset All</button>
      </div>

      {/* Tactical Map Display */}
      <div style={{ position: "relative", maxWidth: "1000px", margin: "0 auto" }}>
        {errorMessage && (
          <div style={{ position: "absolute", top: "-50px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#dc3545", color: "white", padding: "10px 20px", borderRadius: "4px", zIndex: 100, fontWeight: "bold" }}>
            {errorMessage}
          </div>
        )}

        <div
          ref={mapRef}
          onClick={handleMapClick}
          style={{
            width: "100%", height: "600px", position: "relative", border: "2px solid #555",
            cursor: currentMap ? (toolMode === "place" ? "crosshair" : toolMode === "draw" ? "pencil" : (draggingId !== null ? "grabbing" : "grab")) : "not-allowed",
            backgroundImage: currentMap ? `url(${currentMap.image})` : "none",
            backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
            backgroundColor: "#222", overflow: "hidden", borderRadius: "8px"
          }}
        >
          {/* Drawing Layer */}
          <canvas
            ref={canvasRef}
            width={1000}
            height={600}
            onMouseDown={startDrawing}
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              pointerEvents: toolMode === "draw" ? "auto" : "none", zIndex: 2
            }}
          />

          {markers.map((m) => (
            <div
              key={m.id}
              onMouseDown={(e) => startDragging(e, m.id)}
              onContextMenu={(e) => handleRightClick(e, m.id)}
              style={{
                position: "absolute", width: "24px", height: "24px",
                background: m.team === "ally" ? "#007bff" : "#dc3545",
                border: "2px solid white", borderRadius: "50%",
                left: m.x - 12, top: m.y - 12,
                cursor: toolMode === "drag" ? (draggingId === m.id ? "grabbing" : "grab") : "default",
                boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", 
                fontSize: "12px", fontWeight: "bold", userSelect: "none",
                zIndex: draggingId === m.id ? 10 : 5
              }}
            >
              {m.team === "ally" ? "A" : "E"}
            </div>
          ))}
          
          {!currentMap && (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#888" }}>
              Select a map above to start planning
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TacMap;