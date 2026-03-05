import React, { useState } from "react";
import type { MouseEvent } from "react";

// Using root-relative paths for Vite to ensure resolve works regardless of file depth
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

interface Marker {
  x: number;
  y: number;
}

type GameMode =
  | "Control"
  | "Escort"
  | "Hybrid"
  | "Push"
  | "Flashpoint"
  | "Clash"
  | "Assault";

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

const gameModes: GameMode[] = [
  "Control",
  "Escort",
  "Hybrid",
  "Push",
  "Flashpoint",
  "Clash",
  "Assault",
];

const TacMap: React.FC = () => {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  const currentMap = mapList.find((m) => m.name === selectedMap);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!currentMap) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMarkers([...markers, { x, y }]);
  };

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    setSelectedMap(null);
    setMarkers([]);
  };

  const handleMapSelect = (mapName: string) => {
    setSelectedMap(mapName);
    setMarkers([]);
  };

  return (
    <div style={{ padding: "20px", color: "white", backgroundColor: "#1a1a1a", minHeight: "100vh" }}>
      <h2>Tac Map</h2>

      <h3>Select Game Mode</h3>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {gameModes.map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeSelect(mode)}
            style={{
              padding: "6px 12px",
              background: selectedMode === mode ? "#00bfff" : "#444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      <h3>Select Map</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        {mapList.map((map) => {
          const isModeMatch = selectedMode === map.mode;
          return (
            <button
              key={map.name}
              onClick={() => (isModeMatch ? handleMapSelect(map.name) : null)}
              style={{
                padding: "6px 10px",
                background:
                  selectedMap === map.name
                    ? "#ff8c00"
                    : isModeMatch
                    ? "#2e8b57"
                    : "#333",
                opacity: selectedMode && !isModeMatch ? 0.4 : 1,
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isModeMatch ? "pointer" : "not-allowed",
              }}
            >
              {map.name}
            </button>
          );
        })}
      </div>

      {selectedMode && <h4>Mode: {selectedMode}</h4>}
      {selectedMap && <h4>Map: {selectedMap}</h4>}

      <div
        onClick={handleClick}
        style={{
          width: "100%",
          maxWidth: "1000px",
          height: "600px",
          position: "relative",
          border: "2px solid #555",
          cursor: currentMap ? "crosshair" : "not-allowed",
          backgroundImage: currentMap ? `url(${currentMap.image})` : "none",
          backgroundSize: "contain", // Changed to contain to ensure map is visible
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundColor: "#222",
          margin: "0 auto",
          overflow: "hidden"
        }}
      >
        {markers.map((m, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: "12px",
              height: "12px",
              background: "orange",
              border: "2px solid white",
              borderRadius: "50%",
              left: m.x - 6, // Center the marker on click point
              top: m.y - 6,
              pointerEvents: "none", // Prevent markers from blocking clicks
            }}
          />
        ))}
        {!currentMap && (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#888" }}>
            Select a map to begin placing markers
          </div>
        )}
      </div>
    </div>
  );
};

export default TacMap;