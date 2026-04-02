import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../Supabase";
import { useSearchParams } from "react-router-dom";

/** * TYPES & INTERFACES 
 */
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

interface CustomModalProps {
  isOpen: boolean;
  title: string;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  showCancel?: boolean;
}

/**
 * CUSTOM MODAL COMPONENT
 * Styled to match the purple/dark theme of the Forum and Saves pages.
 */
const CustomModal: React.FC<CustomModalProps> = ({ 
  isOpen, title, children, onConfirm, onCancel, confirmText = "OK", showCancel = true 
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.85)", display: "flex", 
      justifyContent: "center", alignItems: "center", zIndex: 1000,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: "#161616", padding: "30px", borderRadius: "12px",
        border: "1px solid #282828", boxShadow: "0 0 30px rgba(230, 0, 130, 0.2)",
        width: "400px", textAlign: "center"
      }}>
        <h3 style={{ color: "#f65dfb", marginBottom: "20px", fontSize: "22px", fontWeight: "750" }}>
          {title}
        </h3>
        <div style={{ marginBottom: "25px" }}>{children}</div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          {showCancel && (
            <button onClick={onCancel} style={{
              background: "transparent", color: "#888", border: "1px solid #444",
              padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold"
            }}>Cancel</button>
          )}
          <button onClick={onConfirm} style={{
            background: "#e60082", color: "white", border: "none",
            padding: "10px 24px", borderRadius: "6px", cursor: "pointer", 
            fontWeight: "bold", boxShadow: "0 4px 10px rgba(230, 0, 130, 0.3)"
          }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const gameModes: GameMode[] = ["Hybrid", "Escort", "Control", "Push", "Flashpoint", "Assault", "Clash"];
const roles = ["Damage", "Support", "Tank"];

const TacMap: React.FC = () => {
  const [searchParams] = useSearchParams();
  const loadId = searchParams.get("load");

  // State Management
  const [mapList, setMapList] = useState<MapData[]>([]);
  const [heroAssets, setHeroAssets] = useState<HeroAsset[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [description, setDescription] = useState(""); 
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team>("ally");
  const [activeRoleTab, setActiveRoleTab] = useState<string>("Damage");
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMapSelection, setShowMapSelection] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal States
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");

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

  useEffect(() => {
    if (loadId && mapList.length > 0 && heroAssets.length > 0) {
      loadSavedStrategy(loadId);
    }
  }, [loadId, mapList, heroAssets]);

  const loadSavedStrategy = async (id: string) => {
    setLoading(true);
    try {
      const { data: save, error: sError } = await supabase
        .from("Saved_Maps")
        .select(`*, Maps(name, map_type)`)
        .eq("save_id", id)
        .single();

      if (sError) throw sError;

      setSelectedMode(save.Maps.map_type);
      setSelectedMap(save.Maps.name);
      setDescription(save.description || ""); 
      setShowMapSelection(false);

      const { data: assets, error: aError } = await supabase
        .from("Map_Assets")
        .select("*")
        .eq("save_id", id);

      if (aError) throw aError;

      const loadedMarkers: Marker[] = assets.map((a: any) => {
        const hero = heroAssets.find(h => h.asset_id === a.asset_id);
        return {
          id: Math.random(), 
          x: a.x_position,
          y: a.y_position,
          team: a.hero_team as Team,
          type: a.asset_id ? "asset" : "player",
          iconUrl: hero?.image_path,
          heroName: hero?.name,
          label: a.asset_id ? undefined : (a.hero_team === "ally" ? "A" : "E")
        };
      });
      setMarkers(loadedMarkers);

      const { data: drawing, error: dError } = await supabase
        .from("Map_Drawings")
        .select("path")
        .eq("save_id", id)
        .maybeSingle();

      if (drawing?.path && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext("2d");
          ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx?.drawImage(img, 0, 0);
        };
        img.src = drawing.path;
      }
    } catch (err: any) {
      console.error("Load failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

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
    if (e.shiftKey || !currentMap) return; 
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
    if (!currentMap) return; 
    const assetData = JSON.parse(e.dataTransfer.getData("assetData"));
    const rect = mapRef.current?.getBoundingClientRect();
    
    if (!rect || !assetData) return;
    const currentTeamMarkers = activeTeam === "ally" ? allyMarkers : enemyMarkers;
    if (currentTeamMarkers.length >= 5) return;
    if (currentTeamMarkers.some(m => m.heroName === assetData.name)) return;

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
    if (!e.shiftKey || !currentMap?.image_path) return; 
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
    setDescription("");
    setIsResetModalOpen(false);
  };

  const triggerSaveFlow = () => {
    if (!currentMap) return alert("Please select a map before saving.");
    setIsNameModalOpen(true);
  };

  const finalizeSave = async () => {
    if (!newStrategyName) return;
    setIsNameModalOpen(false);
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to save.");

      const { data: saveHeader, error: headerError } = await supabase
        .from("Saved_Maps")
        .insert([{
          map_id: currentMap!.map_id,
          user_id: user.id,
          name: newStrategyName,
          description: description 
        }])
        .select()
        .single();

      if (headerError) throw headerError;

      if (markers.length > 0) {
        const assetsToInsert = markers.map((m) => ({
          save_id: saveHeader.save_id,
          asset_id: m.type === "asset" 
            ? heroAssets.find(h => h.name === m.heroName)?.asset_id 
            : null,
          x_position: Math.round(m.x),
          y_position: Math.round(m.y),
          hero_team: m.team 
        }));
        await supabase.from("Map_Assets").insert(assetsToInsert);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const pixels = ctx?.getImageData(0, 0, canvas.width, canvas.height).data;
        const hasDrawing = pixels?.some(channel => channel !== 0);

        if (hasDrawing) {
          await supabase.from("Map_Drawings").insert([{
            save_id: saveHeader.save_id,
            path: canvas.toDataURL(), 
            color: activeTeam === "ally" ? "#007bff" : "#dc3545",
            width: 3
          }]);
        }
      }

      setIsConfirmModalOpen(true);
      setNewStrategyName("");
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMaps = mapList.filter(m => m.map_type?.toLowerCase() === selectedMode?.toLowerCase());
  const filteredHeroes = heroAssets
    .filter(h => h.hero_roles === activeRoleTab)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading && !selectedMap) return <div style={{color: "white", padding: "100px"}}>Loading...</div>;

  return (
    <div style={{ padding: "20px", marginTop: "10px", color: "white", backgroundColor: "#111", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <h1>Tactical Map</h1>

      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px" }}>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "10px", padding: "8px", background: "#222", borderRadius: "8px" }}>
                <button onClick={() => setActiveTeam("ally")} style={{ padding: "8px 12px", background: activeTeam === "ally" ? "#007bff" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Ally ({allyMarkers.length}/5)</button>
                <button onClick={() => setActiveTeam("enemy")} style={{ padding: "8px 12px", background: activeTeam === "enemy" ? "#dc3545" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Enemy ({enemyMarkers.length}/5)</button>
              </div>
              <button onClick={() => setIsResetModalOpen(true)} style={{ padding: "8px 16px", background: "#c4302b", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Reset Map</button>
              <button onClick={triggerSaveFlow} disabled={isSaving} style={{ padding: "8px 16px", background: isSaving ? "#666" : "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: isSaving ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                {isSaving ? "Saving..." : "Save Strategy"}
              </button>
            </div>

            {selectedMap && (
              <button onClick={() => setShowMapSelection(!showMapSelection)} style={{ padding: "8px 16px", background: "#444", color: "white", border: "1px solid #666", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>
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
                    <button key={mode} onClick={() => { setSelectedMode(mode); setSelectedMap(null); clearCanvas(); }} style={{ padding: "8px 12px", background: selectedMode === mode ? "#e60082" : "#333", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>{mode}</button>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ margin: "0 0 10px 0" }}>2. Select Map</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {!selectedMode ? <p style={{ color: "#888", fontSize: "13px" }}>Select a mode first.</p> : filteredMaps.map((map) => (
                    <button key={map.map_id} onClick={() => { setSelectedMap(map.name); setShowMapSelection(false); }} style={{ padding: "6px 10px", background: selectedMap === map.name ? "#f65dfb" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>{map.name}</button>
                  ))}
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
            style={{ width: "100%", height: "600px", position: "relative", border: "2px solid #444", backgroundColor: "#000", backgroundImage: currentMap?.image_path ? `url("${currentMap.image_path}")` : "none", backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", borderRadius: "8px", cursor: "crosshair", overflow: "hidden" }}
          >
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

        <div style={{ width: "300px", background: "#222", padding: "15px", borderRadius: "8px", border: "1px solid #444", height: "fit-content", marginTop: "42px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#f65dfb", textTransform: "uppercase", letterSpacing: "1px" }}>Strategy Description</h4>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 'Hold high ground until pick...'"
              style={{ width: "100%", height: "100px", background: "#111", color: "#eee", border: "1px solid #444", borderRadius: "4px", padding: "10px", fontSize: "13px", resize: "none", outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
            {roles.map(role => (
              <button key={role} onClick={() => setActiveRoleTab(role)} style={{ flex: 1, padding: "8px 5px", fontSize: "12px", background: activeRoleTab === role ? "#e60082" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>{role}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", overflowY: "auto" }}>
            {filteredHeroes.map(asset => {
              const isHeroOnTeam = (activeTeam === "ally" ? allyMarkers : enemyMarkers).some(m => m.heroName === asset.name);
              return (
                <div key={asset.asset_id} draggable={!isHeroOnTeam} onDragStart={(e) => e.dataTransfer.setData("assetData", JSON.stringify(asset))} style={{ cursor: isHeroOnTeam ? "not-allowed" : "grab", textAlign: "center", padding: "5px", background: "#333", borderRadius: "4px", border: "1px solid #444", opacity: isHeroOnTeam ? 0.3 : 1 }}>
                  <img src={asset.image_path} alt={asset.name} style={{ width: "50px", height: "50px", borderRadius: "4px" }} />
                  <div style={{ fontSize: "10px", marginTop: "4px" }}>{asset.name.replace('_Icon', '')}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CustomModal
        isOpen={isNameModalOpen}
        title="Name Your Strategy"
        onConfirm={finalizeSave}
        onCancel={() => setIsNameModalOpen(false)}
        confirmText="Save Strategy"
      >
        <input 
          type="text"
          value={newStrategyName}
          onChange={(e) => setNewStrategyName(e.target.value)}
          placeholder="e.g. King's Row Dive"
          autoFocus
          style={{
            width: "100%", padding: "12px", background: "#0a0a0a",
            border: "1px solid #e60082", borderRadius: "6px", color: "white",
            outline: "none", textAlign: "center", fontSize: "16px"
          }}
        />
      </CustomModal>

      <CustomModal
        isOpen={isConfirmModalOpen}
        title="Strategy Saved!"
        onConfirm={() => setIsConfirmModalOpen(false)}
        showCancel={false}
        confirmText="Awesome"
      >
        <p style={{ color: "#aaa" }}>Your tactical masterpiece is now saved.</p>
      </CustomModal>

      <CustomModal
        isOpen={isResetModalOpen}
        title="Reset Map?"
        onConfirm={clearCanvas}
        onCancel={() => setIsResetModalOpen(false)}
        confirmText="Clear Everything"
      >
        <p style={{ color: "#aaa" }}>This will remove all markers, drawings, and descriptions. Are you sure?</p>
      </CustomModal>
    </div>
  );
};

export default TacMap;