import React, { useState } from "react";
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

interface Marker {
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

  const currentMap = mapList.find((m) => m.name === selectedMap);
  
  // Get counts for each team
  const allyCount = markers.filter(m => m.team === "ally").length;
  const enemyCount = markers.filter(m => m.team === "enemy").length;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!currentMap) return;

    // Enforcement: Limit to 5 per team
    const currentTeamCount = markers.filter(m => m.team === activeTeam).length;
    if (currentTeamCount >= 5) {
      alert(`Limit reached! You can only place 5 ${activeTeam} icons.`);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMarkers([...markers, { x, y, team: activeTeam }]);
  };

  const handleReset = () => setMarkers([]);

  return (
    <div style={{ padding: "20px", color: "white", backgroundColor: "#1a1a1a", minHeight: "100vh", fontFamily: "sans-serif" }}>
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
      <div
        onClick={handleClick}
        style={{
          width: "100%", maxWidth: "1000px", height: "600px",
          position: "relative", border: "2px solid #555",
          cursor: currentMap ? "crosshair" : "not-allowed",
          backgroundImage: currentMap ? `url(${currentMap.image})` : "none",
          backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
          backgroundColor: "#222", margin: "0 auto", overflow: "hidden"
        }}
      >
        {markers.map((m, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: "20px", height: "20px",
              background: m.team === "ally" ? "#007bff" : "#dc3545",
              border: "2px solid white", borderRadius: "50%",
              left: m.x - 10, top: m.y - 10,
              pointerEvents: "none",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold"
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
  );
};

export default TacMap;