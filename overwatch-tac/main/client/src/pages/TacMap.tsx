import React, { useState, useEffect, useRef } from "react";
import type { MouseEvent } from "react";

// Asset Imports (Keeping paths exactly as provided)
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

interface Marker {
  id: number; // Added unique ID for reliable dragging
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
  
  // States for website notification and drag-and-drop
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const currentMap = mapList.find((m) => m.name === selectedMap);
  const allyCount = markers.filter(m => m.team === "ally").length;
  const enemyCount = markers.filter(m => m.team === "enemy").length;

  // Clear notification after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!currentMap || draggingId !== null) return;

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
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMarkers(prev => prev.map(m => m.id === draggingId ? { ...m, x, y } : m));
  };

  const stopDragging = () => setDraggingId(null);

  const handleReset = () => {
    setMarkers([]);
    setErrorMessage(null);
  };

  return (
    <div 
      style={{ padding: "20px", color: "white", backgroundColor: "#1a1a1a", minHeight: "100vh", fontFamily: "sans-serif" }}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
    >
      <h2>Overwatch Tac Map</h2>

      {/* Mode Selection */}
      <div style={{ marginBottom: "16px" }}>
        <h3>1. Select Game Mode</h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {gameModes.map((mode) => (
            <button
              key={mode}
              onClick={() => { setSelectedMode(mode); setSelectedMap(null); setMarkers([]); }}
              style={{
                padding: "8px 12px",
                background: selectedMode === mode ? "#00bfff" : "#444",
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
                onClick={() => isMatch && (setSelectedMap(map.name), setMarkers([]))}
                style={{
                  padding: "6px 10px",
                  background: selectedMap === map.name ? "#ff8c00" : isMatch ? "#2e8b57" : "#333",
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

      {/* Team Selection & Placement Controls */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "15px" }}>
        <div style={{ display: "flex", gap: "10px", padding: "10px", background: "#333", borderRadius: "8px" }}>
          <button 
            onClick={() => setActiveTeam("ally")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTeam === "ally" ? "#007bff" : "#555",
              color: "white", border: "2px solid white", borderRadius: "4px", cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Ally Icon ({allyCount}/5)
          </button>
          <button 
            onClick={() => setActiveTeam("enemy")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTeam === "enemy" ? "#dc3545" : "#555",
              color: "white", border: "2px solid white", borderRadius: "4px", cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Enemy Icon ({enemyCount}/5)
          </button>
        </div>
        
        <button 
          onClick={handleReset}
          style={{ padding: "10px", background: "none", color: "#aaa", border: "1px solid #aaa", cursor: "pointer", borderRadius: "4px" }}
        >
          Clear All
        </button>
      </div>

      {/* Tactical Map Display */}
      <div style={{ position: "relative", maxWidth: "1000px", margin: "0 auto" }}>
        
        {/* IN-WEBSITE NOTIFICATION */}
        {errorMessage && (
          <div style={{
            position: "absolute", top: "-50px", left: "50%", transform: "translateX(-50%)",
            backgroundColor: "#dc3545", color: "white", padding: "10px 20px", borderRadius: "4px",
            zIndex: 100, fontWeight: "bold", boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            border: "1px solid white", pointerEvents: "none"
          }}>
            {errorMessage}
          </div>
        )}

        <div
          ref={mapRef}
          onClick={handleMapClick}
          style={{
            width: "100%", height: "600px",
            position: "relative", border: "2px solid #555",
            cursor: currentMap ? (draggingId !== null ? "grabbing" : "crosshair") : "not-allowed",
            backgroundImage: currentMap ? `url(${currentMap.image})` : "none",
            backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
            backgroundColor: "#222", overflow: "hidden"
          }}
        >
          {markers.map((m) => (
            <div
              key={m.id}
              onMouseDown={(e) => startDragging(e, m.id)}
              style={{
                position: "absolute",
                width: "24px", height: "24px",
                background: m.team === "ally" ? "#007bff" : "#dc3545",
                border: "2px solid white", borderRadius: "50%",
                left: m.x - 12, top: m.y - 12,
                cursor: draggingId === m.id ? "grabbing" : "grab",
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