import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../Supabase";

type Team = "ally" | "enemy";
type GameMode = "Control" | "Escort" | "Hybrid" | "Push" | "Flashpoint" | "Clash" | "Assault";

interface MapData {
  map_id: number;
  name: string;
  map_type: string;
  image_path: string | null;
}

interface HeroAsset {
  asset_id: number;
  name: string;
  image_path: string;
  hero_roles: string;
}

interface Marker {
  id: number;
  x: number;
  y: number;
  team: Team;
  type: "player" | "asset";
  iconUrl?: string;
  label?: string;
  heroName?: string;
}

const gameModes: GameMode[] = ["Hybrid", "Escort", "Control", "Push", "Flashpoint", "Assault", "Clash"];
const roles = ["Tank", "Damage", "Support"];

const TacMap: React.FC = () => {
  const [mapList, setMapList] = useState<MapData[]>([]);
  const [heroAssets, setHeroAssets] = useState<HeroAsset[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team>("ally");
  const [activeRoleTab, setActiveRoleTab] = useState<string>("Tank");
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMapSelection, setShowMapSelection] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentMap = mapList.find((m) => m.name === selectedMap);
  const allyMarkers = markers.filter(m => m.team === "ally");
  const enemyMarkers = markers.filter(m => m.team === "enemy");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: mapsData } = await supabase.from("Maps").select("*");
      if (mapsData) {
        setMapList(mapsData.map((m: any) => ({
          ...m,
          image_path: m.image_path && m.image_path.trim() !== "EMPTY" ? m.image_path.trim() : null
        })));
      }

      const { data: assetsData } = await supabase.from("Assets").select("*");
      if (assetsData) {
        setHeroAssets(assetsData.map((a: any) => ({
          asset_id: a.asset_id,
          name: a.name || "Unknown",
          image_path: a.image_path ? a.image_path.trim() : "",
          hero_roles: a.hero_roles || "Tank"
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const getCanvasCoords = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    if (!currentMap?.image_path || e.shiftKey) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = activeTeam === "ally" ? "#007bff" : "#dc3545";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!currentMap?.image_path) return;
    
    const assetData = JSON.parse(e.dataTransfer.getData("assetData"));
    const rect = mapRef.current?.getBoundingClientRect();
    
    if (!rect || !assetData) return;

    const currentTeamMarkers = activeTeam === "ally" ? allyMarkers : enemyMarkers;
    if (currentTeamMarkers.length >= 5) return;

    const isHeroOnTeam = currentTeamMarkers.some(m => m.heroName === assetData.name);
    if (isHeroOnTeam) return;

    setMarkers([...markers, {
      id: Date.now(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      team: activeTeam,
      type: "asset",
      iconUrl: assetData.image_path,
      heroName: assetData.name
    }]);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (!currentMap?.image_path || !e.shiftKey) return;
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentTeamMarkers = activeTeam === "ally" ? allyMarkers : enemyMarkers;
    if (currentTeamMarkers.length >= 5) return;

    setMarkers([...markers, {
      id: Date.now(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      team: activeTeam,
      type: "player",
      label: activeTeam === "ally" ? "A" : "E"
    }]);
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
    setMarkers([]);
  };

  const filteredMaps = mapList.filter(m => m.map_type?.toLowerCase() === selectedMode?.toLowerCase());
  
  const filteredHeroes = heroAssets
    .filter(h => h.hero_roles === activeRoleTab)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ padding: "20px", marginTop: "80px", color: "white", backgroundColor: "#111", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <h1 style={{ marginBottom: "20px" }}>Overwatch Tac Map</h1>

      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px" }}>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "10px", padding: "8px", background: "#222", borderRadius: "8px" }}>
                <button onClick={() => setActiveTeam("ally")} style={{ padding: "8px 12px", background: activeTeam === "ally" ? "#007bff" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Ally ({allyMarkers.length}/5)</button>
                <button onClick={() => setActiveTeam("enemy")} style={{ padding: "8px 12px", background: activeTeam === "enemy" ? "#dc3545" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Enemy ({enemyMarkers.length}/5)</button>
              </div>
              <button onClick={clearCanvas} style={{ padding: "8px 16px", background: "#c4302b", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Reset Map</button>
              {currentMap && (
                <span style={{ color: "#aaa", fontSize: "14px" }}>
                  Map: <strong>{currentMap.name}</strong> 
                  <span style={{ margin: "0 8px", opacity: 0.5 }}>|</span> 
                  Type: <strong>{currentMap.map_type}</strong>
                </span>
              )}
            </div>

            {selectedMap && (
              <button 
                onClick={() => setShowMapSelection(!showMapSelection)}
                style={{ padding: "8px 16px", background: "#444", color: "white", border: "1px solid #666", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
              >
                {showMapSelection ? "Hide Selection" : "Change Map"}
              </button>
            )}
          </div>

          {showMapSelection && (
            <div style={{ background: "#222", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #333" }}>
              <div style={{ marginBottom: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0" }}>1. Game Mode</h4>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {gameModes.map((mode) => (
                    <button 
                      key={mode} 
                      onClick={() => { setSelectedMode(mode); setSelectedMap(null); clearCanvas(); }} 
                      style={{ padding: "8px 12px", background: selectedMode === mode ? "#e60082" : "#333", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 10px 0" }}>2. Select Map</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {!selectedMode ? (
                    <p style={{ color: "#888", fontSize: "13px" }}>Select a mode first.</p>
                  ) : (
                    filteredMaps.map((map) => (
                      <button 
                        key={map.map_id} 
                        onClick={() => { setSelectedMap(map.name); setShowMapSelection(false); clearCanvas(); }} 
                        style={{ padding: "6px 10px", background: selectedMap === map.name ? "#f65dfb" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                      >
                        {map.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <div 
            ref={mapRef} 
            onClick={handleMapClick} 
            onMouseDown={startDrawing} 
            onMouseMove={draw} 
            onMouseUp={() => setIsDrawing(false)} 
            onMouseLeave={() => setIsDrawing(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{ width: "100%", height: "600px", position: "relative", border: "2px solid #444", backgroundColor: "#000", backgroundImage: currentMap?.image_path ? `url("${currentMap.image_path}")` : "none", backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", borderRadius: "8px", cursor: currentMap?.image_path ? "crosshair" : "not-allowed", overflow: "hidden" }}
          >
            {!currentMap?.image_path && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#666", textAlign: "center" }}>
                <h3 style={{ margin: 0 }}>Select a map to begin</h3>
                <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>Placement and drawing are disabled until a map is active.</p>
              </div>
            )}
            <canvas ref={canvasRef} width={1000} height={600} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 2, pointerEvents: "none" }} />
            {markers.map((m) => (
              <div key={m.id} style={{ position: "absolute", width: "40px", height: "40px", left: m.x - 20, top: m.y - 20, zIndex: 5, pointerEvents: "none" }}>
                {m.type === "player" ? (
                  <div style={{ width: "100%", height: "100%", background: m.team === "ally" ? "#007bff" : "#dc3545", border: "2px solid white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{m.label}</div>
                ) : (
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <img src={m.iconUrl} style={{ width: "100%", height: "100%", borderRadius: "50%", border: `2px solid ${m.team === "ally" ? "#007bff" : "#dc3545"}`, background: "#222" }} alt="hero" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: "300px", background: "#222", padding: "15px", borderRadius: "8px", border: "1px solid #444", height: "fit-content", maxHeight: "85vh", display: "flex", flexDirection: "column", marginTop: "42px" }}>
          <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
            {roles.map(role => (
              <button 
                key={role} 
                onClick={() => setActiveRoleTab(role)}
                style={{ flex: 1, padding: "8px 5px", fontSize: "12px", background: activeRoleTab === role ? "#e60082" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                {role}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", overflowY: "auto" }}>
            {filteredHeroes.map(asset => {
              const isHeroOnCurrentTeam = (activeTeam === "ally" ? allyMarkers : enemyMarkers).some(m => m.heroName === asset.name);
              const isDisabled = !currentMap?.image_path || isHeroOnCurrentTeam;
              
              return (
                <div 
                  key={asset.asset_id} 
                  draggable={!isDisabled}
                  onDragStart={(e) => e.dataTransfer.setData("assetData", JSON.stringify(asset))}
                  style={{ 
                    cursor: isDisabled ? "not-allowed" : "grab", 
                    textAlign: "center", 
                    padding: "5px", 
                    background: "#333", 
                    borderRadius: "4px", 
                    border: "1px solid #444",
                    opacity: isDisabled ? 0.3 : 1
                  }}
                >
                  <img src={asset.image_path} alt={asset.name} style={{ width: "50px", height: "50px", borderRadius: "4px", backgroundColor: "#000" }} />
                  <div style={{ fontSize: "10px", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name.replace('_Icon', '')}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TacMap;