import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../Supabase";
import { useSearchParams } from "react-router-dom";

/** * TYPES & INTERFACES */
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
        <h3 style={{ color: "#f65dfb", marginBottom: "20px", fontSize: "22px", fontWeight: "750" }}>{title}</h3>
        <div style={{ marginBottom: "25px", color: "#aaa" }}>{children}</div>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const loadId = searchParams.get("load");

  const [activeSaveId, setActiveSaveId] = useState<string | null>(loadId);
  const [mapList, setMapList] = useState<MapData[]>([]);
  const [heroAssets, setHeroAssets] = useState<HeroAsset[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [description, setDescription] = useState(""); 
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team>("ally");
  const [activeRoleTab, setActiveRoleTab] = useState<string>("Damage");
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMapSelection, setShowMapSelection] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 

  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const allyCount = useMemo(() => markers.filter(m => m.team === "ally").length, [markers]);
  const enemyCount = useMemo(() => markers.filter(m => m.team === "enemy").length, [markers]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: mapsData } = await supabase.from("Maps").select("*");
      if (mapsData) setMapList(mapsData);
      const { data: assetsData } = await supabase.from("Assets").select("*");
      if (assetsData) setHeroAssets(assetsData);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (loadId && mapList.length > 0 && heroAssets.length > 0 && !isDataLoaded) {
      loadSavedStrategy(loadId);
      setIsDataLoaded(true);
    }
  }, [loadId, mapList, heroAssets, isDataLoaded]);

  const loadSavedStrategy = async (id: string) => {
    const { data: save } = await supabase.from("Saved_Maps").select(`*, Maps(name, map_type)`).eq("save_id", id).single();
    
    if (save) {
      setActiveSaveId(id);
      setSelectedMode(save.Maps.map_type);
      setSelectedMap(save.Maps.name);
      setDescription(save.description || "");
      setShowMapSelection(false);

      const { data: assets } = await supabase.from("Map_Assets").select("*").eq("save_id", id);
      
      if (assets) {
        const loadedMarkers: Marker[] = assets.map((a: any) => {
          const hero = heroAssets.find(h => h.asset_id === a.asset_id);
          return {
            id: a.id,
            x: a.x_position,
            y: a.y_position,
            team: a.hero_team as Team,
            type: a.asset_id ? "asset" : "player",
            iconUrl: hero?.image_path,
            heroName: hero?.name
          };
        });
        setMarkers(loadedMarkers); 
      }

      const { data: drawing } = await supabase.from("Map_Drawings").select("path").eq("save_id", id).maybeSingle();
      if (drawing?.path && canvasRef.current) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const ctx = canvasRef.current?.getContext("2d");
          ctx?.clearRect(0, 0, 1000, 600);
          ctx?.drawImage(img, 0, 0);
        };
        img.src = drawing.path;
      }
    }
  };

  const getCoords = (e: React.MouseEvent | React.DragEvent) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { 
      x: (e.clientX - rect.left) * (1000 / rect.width), 
      y: (e.clientY - rect.top) * (600 / rect.height) 
    };
  };

  const addMarker = (newMarker: Marker) => {
    setMarkers(prev => {
      const teamMarkers = prev.filter(m => m.team === newMarker.team);
      if (teamMarkers.length >= 5) return prev;
      if (newMarker.heroName && teamMarkers.some(m => m.heroName === newMarker.heroName)) return prev;
      return [...prev, newMarker];
    });
  };

  const finalizeSave = async () => {
    setIsNameModalOpen(false);
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let currentId = activeSaveId;

      if (!currentId) {
        const { data: header, error: headerError } = await supabase.from("Saved_Maps").insert([{
          map_id: mapList.find(m => m.name === selectedMap)?.map_id,
          user_id: user.id,
          name: newStrategyName,
          description: description 
        }]).select().single();
        
        if (headerError) throw headerError;
        currentId = header.save_id;
        setActiveSaveId(currentId);
      } else {
        // --- UPDATE HEADER ---
        const { error: updateError } = await supabase.from("Saved_Maps")
          .update({ description: description })
          .eq("save_id", currentId);
        
        if (updateError) throw updateError;

        // --- PREVENT DUPLICATION ---
        // We delete everything associated with this save first, then re-insert current markers.
        const { error: deleteError } = await supabase.from("Map_Assets").delete().eq("save_id", currentId);
        if (deleteError) throw deleteError;
      }

      // Re-inserting assets
      if (markers.length > 0) {
        const { error: insertError } = await supabase.from("Map_Assets").insert(markers.map(m => ({
          save_id: currentId,
          asset_id: heroAssets.find(h => h.name === m.heroName)?.asset_id || null,
          x_position: Math.round(m.x), 
          y_position: Math.round(m.y), 
          hero_team: m.team 
        })));
        if (insertError) throw insertError;
      }

      // Drawing Save
      if (canvasRef.current) {
        const drawingData = canvasRef.current.toDataURL("image/png");
        await supabase.from("Map_Drawings").upsert({
          save_id: currentId,
          path: drawingData,
          color: activeTeam === "ally" ? "#007bff" : "#dc3545",
          width: 3
        }, { onConflict: 'save_id' });
      }

      // Refresh Marker IDs from DB to ensure frontend/backend stay in sync
      const { data: refreshedAssets } = await supabase.from("Map_Assets").select("*").eq("save_id", currentId);
      if (refreshedAssets) {
        const syncedMarkers: Marker[] = refreshedAssets.map((a: any) => {
          const hero = heroAssets.find(h => h.asset_id === a.asset_id);
          return {
            id: a.id,
            x: a.x_position,
            y: a.y_position,
            team: a.hero_team as Team,
            type: a.asset_id ? "asset" : "player",
            iconUrl: hero?.image_path,
            heroName: hero?.name
          };
        });
        setMarkers(syncedMarkers);
      }

      setIsConfirmModalOpen(true);
    } catch (err) { 
        console.error("Save failed:", err); 
    } finally { 
        setIsSaving(false); 
    }
  };

  const clearCanvas = () => {
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, 1000, 600);
    setMarkers([]);
    setDescription("");
    setActiveSaveId(null);
    setSearchParams({}, { replace: true });
    setIsDataLoaded(true); 
    setIsResetModalOpen(false);
  };

  return (
    <div style={{ padding: "20px", color: "white", backgroundColor: "#111", minHeight: "100vh" }}>
      <h1 style={{ fontWeight: "800", letterSpacing: "-1px", marginBottom: "20px" }}>Tactical Map</h1>

      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ display: "flex", background: "#222", borderRadius: "8px", padding: "5px" }}>
                <button onClick={() => setActiveTeam("ally")} style={{ padding: "8px 12px", background: activeTeam === "ally" ? "#007bff" : "transparent", border: "none", color: "white", cursor: "pointer", fontWeight: "bold", borderRadius: "4px" }}>Ally ({allyCount}/5)</button>
                <button onClick={() => setActiveTeam("enemy")} style={{ padding: "8px 12px", background: activeTeam === "enemy" ? "#dc3545" : "transparent", border: "none", color: "white", cursor: "pointer", fontWeight: "bold", borderRadius: "4px" }}>Enemy ({enemyCount}/5)</button>
              </div>
              <button onClick={() => setIsResetModalOpen(true)} style={{ padding: "8px 16px", background: "#c4302b", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Reset Map</button>
              <button onClick={() => (activeSaveId ? finalizeSave() : setIsNameModalOpen(true))} disabled={isSaving} style={{ padding: "8px 16px", background: isSaving ? "#444" : "#28a745", border: "none", borderRadius: "4px", color: "white", cursor: "pointer", fontWeight: "bold" }}>
                {isSaving ? "Saving..." : activeSaveId ? "Update Strategy" : "Save Strategy"}
              </button>
            </div>
            {selectedMap && <button onClick={() => setShowMapSelection(!showMapSelection)} style={{ background: "#444", border: "none", color: "white", padding: "8px 16px", borderRadius: "4px", cursor: "pointer" }}>{showMapSelection ? "Hide Selection" : "Change Map"}</button>}
          </div>

          {showMapSelection && (
            <div style={{ background: "#222", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #333" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>1. Mode</h4>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "15px" }}>
                {gameModes.map(m => <button key={m} onClick={() => { setSelectedMode(m); setSelectedMap(null); clearCanvas(); }} style={{ padding: "6px 10px", background: selectedMode === m ? "#e60082" : "#333", border: "none", color: "white", cursor: "pointer", borderRadius: "4px", fontSize: "12px" }}>{m}</button>)}
              </div>
              <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>2. Map</h4>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {mapList.filter(m => m.map_type === selectedMode).map(m => <button key={m.map_id} onClick={() => { setSelectedMap(m.name); setShowMapSelection(false); }} style={{ padding: "6px 10px", background: selectedMap === m.name ? "#f65dfb" : "#444", border: "none", color: "white", cursor: "pointer", borderRadius: "4px", fontSize: "12px" }}>{m.name}</button>)}
              </div>
            </div>
          )}

          <div 
            ref={mapRef} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const assetData = e.dataTransfer.getData("assetData");
              if (!assetData) return;
              const asset = JSON.parse(assetData);
              const coords = getCoords(e);
              addMarker({
                id: Date.now(), x: coords.x, y: coords.y,
                team: activeTeam, type: "asset", iconUrl: asset.image_path, heroName: asset.name
              });
            }}
            style={{ 
              width: "100%", height: "600px", position: "relative", border: "2px solid #444", borderRadius: "8px",
              backgroundImage: `url("${mapList.find(m => m.name === selectedMap)?.image_path}")`,
              backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundColor: "#000"
            }}
          >
            <canvas 
              ref={canvasRef} width={1000} height={600} 
              onMouseDown={(e) => {
                 const ctx = canvasRef.current?.getContext("2d");
                 if (ctx) {
                   const { x, y } = getCoords(e);
                   ctx.beginPath(); ctx.moveTo(x, y);
                   ctx.strokeStyle = activeTeam === "ally" ? "#007bff" : "#dc3545";
                   ctx.lineWidth = 3; ctx.lineCap = "round";
                   setIsDrawing(true);
                 }
              }}
              onMouseMove={(e) => {
                if (isDrawing) {
                  const { x, y } = getCoords(e);
                  canvasRef.current?.getContext("2d")?.lineTo(x, y);
                  canvasRef.current?.getContext("2d")?.stroke();
                }
              }}
              onMouseUp={() => setIsDrawing(false)}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", cursor: "crosshair", zIndex: 2 }} 
            />
            {markers.map(m => (
              <div key={m.id} style={{ 
                position: "absolute", 
                left: `${(m.x / 1000) * 100}%`, 
                top: `${(m.y / 600) * 100}%`, 
                width: "40px", height: "40px", 
                transform: "translate(-50%, -50%)", 
                zIndex: 5, pointerEvents: "none" 
              }}>
                <img src={m.iconUrl} style={{ width: "100%", borderRadius: "50%", border: `2px solid ${m.team === "ally" ? "#007bff" : "#dc3545"}`, background: "#222" }} alt={m.heroName} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: "300px", background: "#222", padding: "15px", borderRadius: "8px", height: "fit-content", marginTop: "42px", border: "1px solid #444" }}>
          <h4 style={{ color: "#f65dfb", fontSize: "12px", textTransform: "uppercase", marginBottom: "10px" }}>Description</h4>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", height: "100px", background: "#111", color: "white", border: "1px solid #444", borderRadius: "4px", padding: "10px", marginBottom: "15px", resize: "none" }} />
          <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
            {roles.map(r => <button key={r} onClick={() => setActiveRoleTab(r)} style={{ flex: 1, padding: "5px", background: activeRoleTab === r ? "#e60082" : "#444", border: "none", color: "white", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>{r}</button>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", maxHeight: "400px", overflowY: "auto", paddingRight: "5px" }}>
            {heroAssets.filter(h => h.hero_roles === activeRoleTab).map(h => (
              <div key={h.asset_id} draggable onDragStart={(e) => e.dataTransfer.setData("assetData", JSON.stringify(h))} style={{ textAlign: "center", background: "#333", padding: "5px", borderRadius: "4px" }}>
                <img src={h.image_path} style={{ width: "50px", borderRadius: "4px", cursor: "grab" }} alt={h.name} />
                <div style={{ fontSize: "10px", marginTop: "4px" }}>{h.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CustomModal isOpen={isNameModalOpen} title="Name Your Strategy" onConfirm={finalizeSave} onCancel={() => setIsNameModalOpen(false)}>
        <input type="text" value={newStrategyName} onChange={(e) => setNewStrategyName(e.target.value)} placeholder="Strategy Name..." style={{ width: "100%", padding: "12px", background: "#000", border: "1px solid #e60082", color: "white", borderRadius: "4px", outline: "none", textAlign: "center" }} />
      </CustomModal>

      <CustomModal isOpen={isConfirmModalOpen} title="Success!" onConfirm={() => setIsConfirmModalOpen(false)} showCancel={false} confirmText="Awesome">
        <p>Your strategy has been updated and saved.</p>
      </CustomModal>

      <CustomModal isOpen={isResetModalOpen} title="Reset Map?" onConfirm={clearCanvas} onCancel={() => setIsResetModalOpen(false)}>
        <p>This will clear all markers and drawings. Continue?</p>
      </CustomModal>
    </div>
  );
};

export default TacMap;