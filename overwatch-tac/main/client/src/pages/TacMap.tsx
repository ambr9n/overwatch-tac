import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../Supabase";

// --- Types ---
type Team = "ally" | "enemy";
type GameMode = "Control" | "Escort" | "Hybrid" | "Push" | "Flashpoint" | "Clash" | "Assault";

interface MapData {
  map_id: number;
  name: string;
  map_type: string; // This must match the DB column name exactly
  image: string | null;
}

interface Marker {
  id: number;
  x: number;
  y: number;
  team: Team;
}

const gameModes: GameMode[] = ["Hybrid", "Escort", "Control", "Push", "Flashpoint", "Assault", "Clash"];

const TacMap: React.FC = () => {
  const [mapList, setMapList] = useState<MapData[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team>("ally");
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Logic to find current map data
  const currentMap = mapList.find((m) => m.name === selectedMap);
  const allyCount = markers.filter(m => m.team === "ally").length;
  const enemyCount = markers.filter(m => m.team === "enemy").length;

  // --- Fetch Logic ---
  useEffect(() => {
    const fetchMapsFromDB = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("Maps")
        .select("map_id, name, map_type, image_path"); 

      if (error) {
        console.error("Supabase Error:", error);
      } else if (data) {
        const formattedMaps: MapData[] = data.map((m: any) => {
          let publicUrl = null;

          // Checking for the string 'EMPTY' as per your DB screenshots
          if (m.image_path && m.image_path.trim() !== "EMPTY") {
            // Using capital 'Maps' as seen in your successful URL logs
            const { data: urlData } = supabase.storage
              .from("Maps") 
              .getPublicUrl(m.image_path);
            
            publicUrl = urlData.publicUrl;
          }

          return {
            map_id: m.map_id,
            name: m.name,
            map_type: m.map_type, // Resolve TypeScript 'property missing' error
            image: publicUrl
          };
        });
        setMapList(formattedMaps);
      }
      setLoading(false);
    };

    fetchMapsFromDB();
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
  };

  const filteredMaps = mapList.filter(m => 
    m.map_type?.trim().toLowerCase() === selectedMode?.trim().toLowerCase()
  );

  return (
    <div style={{ padding: "20px", marginTop: "80px", color: "white", backgroundColor: "#111", minHeight: "100vh" }}>
      <h1>Overwatch Tac Map</h1>

      {/* 1. Game Mode Selection */}
      <div style={{ marginBottom: "20px" }}>
        <h3>1. Select Game Mode</h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {gameModes.map((mode) => (
            <button
              key={mode}
              onClick={() => { setSelectedMode(mode); setSelectedMap(null); setMarkers([]); clearCanvas(); }}
              style={{
                padding: "10px 15px",
                background: selectedMode === mode ? "#e60082" : "#333",
                color: "white", border: "none", borderRadius: "4px", cursor: "pointer",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Map Selection */}
      <div style={{ marginBottom: "20px" }}>
        <h3>2. Select Map</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", minHeight: "45px" }}>
          {!selectedMode ? (
            <p style={{ color: "#888" }}>Select a game mode to see maps.</p>
          ) : filteredMaps.length > 0 ? (
            filteredMaps.map((map) => (
              <button
                key={map.map_id}
                onClick={() => { setSelectedMap(map.name); setMarkers([]); clearCanvas(); }}
                style={{
                  padding: "8px 12px",
                  background: selectedMap === map.name ? "#f65dfb" : "#444",
                  color: "white", border: "none", borderRadius: "4px", cursor: "pointer",
                }}
              >
                {map.name}
              </button>
            ))
          ) : (
            <p style={{ color: "#888" }}>No maps available for "{selectedMode}".</p>
          )}
        </div>
      </div>

      {/* 3. Toolbar */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "20px", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "10px", padding: "10px", background: "#222", borderRadius: "8px" }}>
          <button onClick={() => setActiveTeam("ally")} style={{ padding: "10px", background: activeTeam === "ally" ? "#007bff" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Ally ({allyCount}/5)
          </button>
          <button onClick={() => setActiveTeam("enemy")} style={{ padding: "10px", background: activeTeam === "enemy" ? "#dc3545" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Enemy ({enemyCount}/5)
          </button>
        </div>
        <button onClick={() => {setMarkers([]); clearCanvas();}} style={{ padding: "10px 20px", background: "#c4302b", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Reset Map
        </button>
      </div>

      {/* 4. Interactive Display */}
      <div style={{ position: "relative", maxWidth: "1000px", margin: "0 auto" }}>
        <div
          ref={mapRef}
          onClick={(e) => {
            if (!currentMap?.image) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setMarkers([...markers, { 
              id: Date.now(), 
              x: e.clientX - rect.left, 
              y: e.clientY - rect.top, 
              team: activeTeam 
            }]);
          }}
          style={{
            width: "100%",
            height: "600px",
            position: "relative",
            border: "2px solid #444",
            backgroundColor: "#000",
            // The double quotes around the URL are vital for links with special characters
            // Change this line temporarily to a link you KNOW works in your browser
            backgroundImage: `url("https://xxdbxtsuckrwqvoezhk.supabase.co/storage/v1/object/public/Maps/anubis.png")`,
            backgroundSize: "contain", 
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            overflow: "hidden",
            borderRadius: "8px",
            cursor: "crosshair"
          }}
        >
          <canvas ref={canvasRef} width={1000} height={600} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }} />

          {markers.map((m) => (
            <div
              key={m.id}
              style={{
                position: "absolute", width: "26px", height: "26px",
                background: m.team === "ally" ? "#007bff" : "#dc3545",
                border: "2px solid white", borderRadius: "50%",
                left: m.x - 13, top: m.y - 13, zIndex: 5,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold",
                boxShadow: "0 0 10px rgba(0,0,0,0.5)"
              }}
            >
              {m.team === "ally" ? "A" : "E"}
            </div>
          ))}

          {!currentMap && (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#666" }}>
              <h3>Select a map to begin</h3>
            </div>
          )}
          
          {currentMap && !currentMap.image && (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#e60082" }}>
              <h3>No map image found for {currentMap.name}</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TacMap;