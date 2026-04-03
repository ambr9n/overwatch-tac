import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../Supabase";
import { useSearchParams } from "react-router-dom";

/** * TYPES & INTERFACES */
type Team = "ally" | "enemy";
type GameMode = "Control" | "Escort" | "Hybrid" | "Push" | "Flashpoint" | "Clash" | "Assault";
type ToolType = "select" | "move" | "pen" | "eraser";

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

interface DrawingLine {
  id: number;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

// History snapshot for undo/redo
interface HistoryState {
  markers: Marker[];
  drawings: DrawingLine[];
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
        <div style={{ marginBottom: "25px" }}>{children}</div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          {showCancel && (
            <button onClick={onCancel} style={{
              background: "transparent", 
              color: "#888", border: "1px solid #444",
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

interface ToolButtonProps {
  name: ToolType;
  icon: string;
  activeTool: ToolType | null;
  onClick: (tool: ToolType) => void;
  disabled?: boolean;
  title?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ name, icon, activeTool, onClick, disabled, title }) => {
  const isActive = activeTool === name;
  return (
    <button
      onClick={() => onClick(name)}
      disabled={disabled}
      title={title}
      style={{
        width: "40px", height: "40px", borderRadius: "8px", border: "none",
        background: isActive ? "linear-gradient(45deg, #e60082, #f65dfb)" : "#333",
        color: "white", cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", justifyContent: "center", alignItems: "center", fontSize: "16px",
        transition: "transform 0.2s, background 0.2s, box-shadow 0.2s",
        transform: isActive ? "scale(1.05)" : "scale(1)",
        boxShadow: isActive ? "0 4px 10px rgba(246, 93, 251, 0.4)" : "none",
        opacity: disabled ? 0.5 : 1
      }}
    >
      {icon}
    </button>
  );
};

const gameModes: GameMode[] = ["Hybrid", "Escort", "Control", "Push", "Flashpoint", "Clash", "Assault"];
const roles = ["Damage", "Support", "Tank"];

const TacMap: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const loadId = searchParams.get("load");

  // State Management
  const [mapList, setMapList] = useState<MapData[]>([]);
  const [heroAssets, setHeroAssets] = useState<HeroAsset[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [drawings, setDrawings] = useState<DrawingLine[]>([]);
  const [description, setDescription] = useState(""); 
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team>("ally");
  const [activeRoleTab, setActiveRoleTab] = useState<string>("Damage");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeSaveId, setActiveSaveId] = useState<string | null>(loadId);
  
  // Toolbar and Selection states
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [selectedElement, setSelectedElement] = useState<{ type: "marker" | "drawing"; id: number } | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);

  // Undo / Redo Stacks
  const [history, setHistory] = useState<HistoryState[]>([{ markers: [], drawings: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Modal toggles
  const [isMapSelectorOpen, setIsMapSelectorOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");

  // Hover states
  const [hoveredMap, setHoveredMap] = useState<MapData | null>(null);
  const [isMapButtonHovered, setIsMapButtonHovered] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const allyMarkers = useMemo(() => markers.filter(m => m.team === "ally"), [markers]);
  const enemyMarkers = useMemo(() => markers.filter(m => m.team === "enemy"), [markers]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: mapsData } = await supabase.from("Maps").select("*");
      if (mapsData) setMapList(mapsData);

      const { data: assetsData } = await supabase.from("Assets").select("*");
      if (assetsData) setHeroAssets(assetsData);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (loadId && mapList.length > 0 && heroAssets.length > 0 && !isDataLoaded) {
      loadSavedStrategy(loadId);
      setIsDataLoaded(true);
    }
  }, [loadId, mapList, heroAssets, isDataLoaded]);

  useEffect(() => {
    drawCanvas();
  }, [drawings, selectedElement, activeTool]);

  // Push to history helper
  const pushToHistory = (newMarkers: Marker[], newDrawings: DrawingLine[]) => {
    const nextState = { markers: newMarkers, drawings: newDrawings };
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(nextState);
    
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  // Undo Function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      setMarkers(prevState.markers);
      setDrawings(prevState.drawings);
      setHistoryIndex(prevIndex);
      setSelectedElement(null);
    }
  };

  // Redo Function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      setMarkers(nextState.markers);
      setDrawings(nextState.drawings);
      setHistoryIndex(nextIndex);
      setSelectedElement(null);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keybinds if the user is typing in a text field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl/Cmd + Z
      if (modifier && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl + Y or Ctrl/Cmd + Shift + Z
      else if ((modifier && e.key.toLowerCase() === 'y') || (modifier && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      // Delete: Delete or Backspace
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElement) {
          e.preventDefault();
          deleteSelectedElement();
        }
      }
      // Tool Quick-Keys
      else if (!modifier && selectedMap) {
        switch (e.key.toLowerCase()) {
          case 's': setActiveTool('select'); break;
          case 'm': setActiveTool('move'); break;
          case 'p': setActiveTool('pen'); break;
          case 'e': setActiveTool('eraser'); break;
          default: break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history, selectedElement, selectedMap]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 1000, 600);
    drawings.forEach(drawing => {
      if (drawing.points.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
      
      for (let i = 1; i < drawing.points.length; i++) {
        ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
      }
      
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (selectedElement?.type === "drawing" && selectedElement.id === drawing.id) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#f65dfb";
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.stroke();
      }
    });
  };

  const loadSavedStrategy = async (id: string) => {
    setLoading(true);
    try {
      const { data: save } = await supabase.from("Saved_Maps").select(`*, Maps(name, map_type)`).eq("save_id", id).single();
      if (save) {
        setActiveSaveId(id);
        setNewStrategyName(save.name);
        setSelectedMode(save.Maps.map_type);
        setSelectedMap(save.Maps.name);
        setDescription(save.description || ""); 
        setSidebarOpen(false);

        const { data: assets } = await supabase.from("Map_Assets").select("*").eq("save_id", id);
        let loadedMarkers: Marker[] = [];
        if (assets) {
          loadedMarkers = assets.map((a: any) => {
            const hero = heroAssets.find(h => h.asset_id === a.asset_id);
            return {
              id: a.id,
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
        }

        let loadedDrawings: DrawingLine[] = [];
        const { data: drawing } = await supabase.from("Map_Drawings").select("path").eq("save_id", id).maybeSingle();
        if (drawing?.path && canvasRef.current) {
          try {
            loadedDrawings = JSON.parse(drawing.path);
            setDrawings(loadedDrawings);
          } catch(e) {
            console.error("Failed to parse drawings");
          }
        }

        // Initialize history with loaded state
        setHistory([{ markers: loadedMarkers, drawings: loadedDrawings }]);
        setHistoryIndex(0);
      }
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const getCoords = (e: React.MouseEvent | React.DragEvent) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { 
      x: ((e.clientX - rect.left) / rect.width) * 1000, 
      y: ((e.clientY - rect.top) / rect.height) * 600 
    };
  };

  const finalizeSave = async () => {
    if (!newStrategyName && !activeSaveId) return;
    setIsNameModalOpen(false);
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to save.");

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
        await supabase.from("Saved_Maps").update({ description, name: newStrategyName }).eq("save_id", currentId);
        await supabase.from("Map_Assets").delete().eq("save_id", currentId);
      }

      if (markers.length > 0) {
        await supabase.from("Map_Assets").insert(markers.map(m => ({
          save_id: currentId,
          asset_id: heroAssets.find(h => h.name === m.heroName)?.asset_id || null,
          x_position: Math.round(m.x), 
          y_position: Math.round(m.y), 
          hero_team: m.team 
        })));
      }

      await supabase.from("Map_Drawings").upsert({
        save_id: currentId,
        path: JSON.stringify(drawings),
        color: activeTeam === "ally" ? "#007bff" : "#dc3545",
        width: 3
      }, { onConflict: 'save_id' });
      setIsConfirmModalOpen(true);
    } catch (err) { 
        console.error("Save failed:", err);
    } finally { 
        setIsSaving(false); 
    }
  };

  const clearCanvas = () => {
    setDrawings([]);
    setMarkers([]);
    setDescription("");
    setActiveSaveId(null);
    setSelectedElement(null);
    setSearchParams({}, { replace: true });
    setIsResetModalOpen(false);
    setHistory([{ markers: [], drawings: [] }]);
    setHistoryIndex(0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedMap) return;

    const assetData = e.dataTransfer.getData("assetData");
    if (!assetData) return;
    const asset = JSON.parse(assetData);
    const coords = getCoords(e);
    const currentTeamCount = activeTeam === "ally" ? allyMarkers.length : enemyMarkers.length;
    if (currentTeamCount >= 5) return;
    const newMarker: Marker = {
      id: Date.now(), x: coords.x, y: coords.y,
      team: activeTeam, type: "asset", iconUrl: asset.image_path, heroName: asset.name
    };
    const nextMarkers = [...markers, newMarker];
    setMarkers(nextMarkers);
    pushToHistory(nextMarkers, drawings);
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    let nextMarkers = [...markers];
    let nextDrawings = [...drawings];

    if (selectedElement.type === "marker") {
      nextMarkers = markers.filter(m => m.id !== selectedElement.id);
      setMarkers(nextMarkers);
    } else if (selectedElement.type === "drawing") {
      nextDrawings = drawings.filter(d => d.id !== selectedElement.id);
      setDrawings(nextDrawings);
    }

    pushToHistory(nextMarkers, nextDrawings);
    setSelectedElement(null);
  };

  const isPointNearLine = (px: number, py: number, line: DrawingLine): boolean => {
    const threshold = line.width + 5;
    for (let i = 0; i < line.points.length - 1; i++) {
      const x1 = line.points[i].x;
      const y1 = line.points[i].y;
      const x2 = line.points[i+1].x;
      const y2 = line.points[i+1].y;

      const A = px - x1;
      const B = py - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -1;
      if (len_sq !== 0) param = dot / len_sq;

      let xx, yy;
      if (param < 0) { xx = x1; yy = y1; }
      else if (param > 1) { xx = x2; yy = y2; }
      else { xx = x1 + param * C; yy = y1 + param * D; }

      const dx = px - xx;
      const dy = py - yy;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) return true;
    }
    return false;
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (!selectedMap) return;
    const { x, y } = getCoords(e);

    if (activeTool === "select") {
      const clickedMarker = markers.find(m => {
        const dx = (m.x / 1000) * 1000 - x;
        const dy = (m.y / 600) * 600 - y;
        return Math.sqrt(dx * dx + dy * dy) < 25; 
      });
      if (clickedMarker) {
        setSelectedElement({ type: "marker", id: clickedMarker.id });
        return;
      }

      const clickedDrawing = drawings.find(d => isPointNearLine(x, y, d));
      if (clickedDrawing) {
        setSelectedElement({ type: "drawing", id: clickedDrawing.id });
        return;
      }

      setSelectedElement(null);
    }

    if (activeTool === "eraser") {
      const lineToErase = drawings.find(d => isPointNearLine(x, y, d));
      if (lineToErase) {
        const nextDrawings = drawings.filter(d => d.id !== lineToErase.id);
        setDrawings(nextDrawings);
        pushToHistory(markers, nextDrawings);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedMap) return;
    const { x, y } = getCoords(e);

    if (activeTool === "pen") {
      setIsDrawing(true);
      const newLine: DrawingLine = {
        id: Date.now(),
        points: [{ x, y }],
        color: activeTeam === "ally" ? "#007bff" : "#dc3545",
        width: 3
      };
      setDrawings(prev => [...prev, newLine]);
      return;
    }

    if (activeTool === "eraser") {
      setIsDrawing(true);
      const lineToErase = drawings.find(d => isPointNearLine(x, y, d));
      if (lineToErase) {
        const nextDrawings = drawings.filter(d => d.id !== lineToErase.id);
        setDrawings(nextDrawings);
        pushToHistory(markers, nextDrawings);
      }
      return;
    }

    if (activeTool === "move" || activeTool === "select") {
      const clickedMarker = markers.find(m => {
        const dx = m.x - x;
        const dy = m.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 25;
      });
      if (clickedMarker) {
        setSelectedElement({ type: "marker", id: clickedMarker.id });
        setIsDraggingElement(true);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedMap) return;
    const { x, y } = getCoords(e);

    if (isDrawing && activeTool === "pen") {
      setDrawings(prev => {
        const updated = [...prev];
        const lastLine = updated[updated.length - 1];
        lastLine.points = [...lastLine.points, { x, y }];
        return updated;
      });
      return;
    }

    if (isDrawing && activeTool === "eraser") {
      const lineToErase = drawings.find(d => isPointNearLine(x, y, d));
      if (lineToErase) {
        setDrawings(prev => prev.filter(d => d.id !== lineToErase.id));
      }
      return;
    }

    if (isDraggingElement && selectedElement?.type === "marker") {
      setMarkers(prev => prev.map(m => 
        m.id === selectedElement.id ? { ...m, x, y } : m
      ));
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && activeTool === "pen") {
      // Finalized pen stroke, save to history
      pushToHistory(markers, drawings);
    }
    if (isDraggingElement && selectedElement?.type === "marker") {
      // Finalized marker move, save to history
      pushToHistory(markers, drawings);
    }
    setIsDrawing(false);
    setIsDraggingElement(false);
  };

  const filteredMaps = mapList.filter(m => m.map_type?.toLowerCase() === selectedMode?.toLowerCase());

  return (
    <div style={{ 
      color: "white", backgroundColor: "#111", position: "fixed", 
      top: "60px", 
      left: 0,
      height: "calc(100vh - 60px)", 
      width: "100vw", display: "flex", overflow: "hidden", zIndex: 50 
    }}>
      
      {/* LEFT SIDEBAR (Controls & Map Selection) */}
      <div style={{ 
        width: sidebarOpen ? "350px" : "0px", background: "#161616", 
        borderRight: sidebarOpen ? "1px solid #282828" : "none", display: "flex", 
        flexDirection: "column", padding: sidebarOpen ? "20px" : "0px", overflowY: "auto",
        overflowX: "hidden", transition: "width 0.3s ease, padding 0.3s ease", flexShrink: 0
      }}>
        <div style={{ minWidth: "310px" }}>
          {/* Replaced 'Tactical Map' heading with the Map Readout */}
          <div style={{ fontSize: "20px", marginBottom: "20px", fontWeight: "bold" }}>
            Map: <span style={{ color: "#f65dfb" }}>{selectedMap || "None Selected"}</span>
          </div>
          
          <button 
            onClick={() => setIsMapSelectorOpen(true)}
            onMouseEnter={() => setIsMapButtonHovered(true)} 
            onMouseLeave={() => setIsMapButtonHovered(false)} 
            style={{
              width: "100%", padding: "14px", background: "linear-gradient(45deg, #e60082, #f65dfb)", 
              color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bolder", fontSize: "16px", 
              marginBottom: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out", 
              transform: isMapButtonHovered ? "scale(1.02)" : "scale(1)", 
              boxShadow: isMapButtonHovered ? "0 6px 15px rgba(246, 93, 251, 0.5)" : "0 4px 10px rgba(230, 0, 130, 0.35)", 
            }}
          >
            Select Map
          </button>

          {/* ACTION BUTTONS */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px", opacity: selectedMap ? 1 : 0.5, pointerEvents: selectedMap ? "auto" : "none" }}>
            <button onClick={() => setIsResetModalOpen(true)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #c4302b", borderRadius: "4px", color: "#c4302b", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>Reset Map</button>
            <button onClick={() => (activeSaveId ? finalizeSave() : setIsNameModalOpen(true))} disabled={isSaving || !selectedMap} style={{ flex: 1, padding: "10px", background: (isSaving || !selectedMap) ? "#444" : "#28a745", border: "none", borderRadius: "4px", color: "white", cursor: selectedMap ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: "13px" }}>{isSaving ? "Saving..." : activeSaveId ? "Update Plan" : "Save Plan"}</button>
          </div>

          <div style={{ background: "#222", padding: "15px", borderRadius: "8px", border: "1px solid #444", marginBottom: "20px", opacity: selectedMap ? 1 : 0.5, pointerEvents: selectedMap ? "auto" : "none" }}>
            <h4 style={{ color: "#f65dfb", fontSize: "12px", textTransform: "uppercase", marginBottom: "10px" }}>Description</h4>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", height: "60px", background: "#111", color: "white", border: "1px solid #444", borderRadius: "4px", padding: "10px", resize: "none" }} />
          </div>

          <div style={{ background: "#222", padding: "15px", borderRadius: "8px", border: "1px solid #444", 
            opacity: selectedMap ? 1 : 0.5, pointerEvents: selectedMap ? "auto" : "none", display: "flex", flexDirection: "column", maxHeight: "380px" }}>
            <h4 style={{ color: "#f65dfb", fontSize: "12px", textTransform: "uppercase", marginBottom: "10px" }}>Team Selection</h4>
            <div style={{ display: "flex", gap: "10px", padding: "5px", background: "#111", borderRadius: "6px", marginBottom: "15px" }}>
              <button onClick={() => setActiveTeam("ally")} style={{ flex: 1, padding: "8px 12px", background: activeTeam === "ally" ? "#007bff" : "transparent", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Ally ({allyMarkers.length})</button>
              <button onClick={() => setActiveTeam("enemy")} style={{ flex: 1, padding: "8px 12px", background: activeTeam === "enemy" ? "#dc3545" : "transparent", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Enemy ({enemyMarkers.length})</button>
            </div>

            <h4 style={{ color: "#f65dfb", fontSize: "12px", textTransform: "uppercase", marginBottom: "10px" }}>Hero Pool</h4>
            <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
              {roles.map(r => <button key={r} onClick={() => setActiveRoleTab(r)} style={{ flex: 1, padding: "5px", background: activeRoleTab === r ? "#e60082" : "#444", border: "none", color: "white", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>{r}</button>)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", overflowY: "auto", flexGrow: 1 }}>
              {heroAssets.filter(h => h.hero_roles === activeRoleTab).map(asset => (
                  <div key={asset.asset_id} draggable={!!selectedMap} onDragStart={(e) => e.dataTransfer.setData("assetData", JSON.stringify(asset))} style={{ cursor: selectedMap ? "grab" : "not-allowed", textAlign: "center", padding: "5px", background: "#333", borderRadius: "4px", border: "1px solid #444" }}>
                    <img src={asset.image_path} alt={asset.name} style={{ width: "50px", height: "50px", borderRadius: "4px" }} />
                    <div style={{ fontSize: "10px", marginTop: "4px" }}>{asset.name}</div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0a0a0a", position: "relative", minWidth: 0, justifyContent: "center", alignItems: "center" }}>
        
        {/* LEFT SIDEBAR TOGGLE BUTTON */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          style={{ 
            position: "absolute", 
            top: "20px", 
            left: "10px", 
            zIndex: 15, 
            background: "rgba(230, 0, 130, 0.8)", 
            border: "none", 
            color: "white", 
            borderRadius: "4px", 
            width: "36px", 
            height: "36px", 
            cursor: "pointer", 
            fontWeight: "bold", 
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            transition: "left 0.3s ease, background 0.2s"
          }}
          title={sidebarOpen ? "Close Map Sidebar" : "Open Map Sidebar"}
        >
          {sidebarOpen ? "«" : "»"}
        </button>

        {/* MAP & CANVAS HUB */}
        <div ref={mapRef} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={handleMapClick} style={{ width: "100%", height: "100%", position: "relative", backgroundImage: `url("${mapList.find(m => m.name === selectedMap)?.image_path}")`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundColor: "#050505", cursor: selectedMap ? "default" : "not-allowed", opacity: selectedMap ? 1 : 0.6, aspectRatio: "1000 / 600", maxHeight: "100%", maxWidth: "100%", margin: "auto" }}>
          
          {!selectedMap && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#888", zIndex: 10, pointerEvents: "none", textAlign: "center" }}>
                  <p style={{ fontSize: "20px", fontWeight: "bold", color: "#f65dfb" }}>← Please Select a Map to Start</p>
              </div>
          )}

          <canvas 
            ref={canvasRef} 
            width={1000} 
            height={600} 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ 
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%", 
              cursor: activeTool === "pen" ? "crosshair" : activeTool === "eraser" ? "cell" : activeTool === "move" ? "grab" : "default", 
              zIndex: 2, pointerEvents: selectedMap ? "auto" : "none"
            }} 
          />

          {markers.map(m => {
            const isSelected = selectedElement?.type === "marker" && selectedElement.id === m.id;
            return (
              <div 
                key={m.id} 
                style={{ 
                  position: "absolute", left: `${(m.x / 1000) * 100}%`, top: `${(m.y / 600) * 100}%`, 
                  width: "40px", height: "40px", transform: "translate(-50%, -50%)", zIndex: 5,
                  pointerEvents: "none", cursor: "pointer"
                }}
              >
                {m.type === "player" ? (
                    <div style={{ width: "100%", height: "100%", background: m.team === "ally" ? "#007bff" : "#dc3545", border: isSelected ? "3px solid #f65dfb" : "2px solid white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{m.label}</div>
                ) : (
                    <img src={m.iconUrl} style={{ width: "100%", borderRadius: "50%", border: isSelected ? "3px solid #f65dfb" : `2px solid ${m.team === "ally" ? "#007bff" : "#dc3545"}`, background: "#222" }} alt={m.heroName} />
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT SIDEBAR TOGGLE BUTTON */}
        <button 
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)} 
          style={{ 
            position: "absolute",
            top: "20px", 
            right: rightSidebarOpen ? "25px" : "20px", 
            zIndex: 15,
            background: "rgba(230, 0, 130, 0.8)", 
            border: "none", 
            color: "white", 
            borderRadius: "4px", 
            width: "36px", 
            height: "36px", 
            cursor: "pointer", 
            fontWeight: "bold", 
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            transition: "right 0.3s ease, background 0.2s"
          }}
          title={rightSidebarOpen ? "Close Toolbar" : "Open Toolbar"}
        >
          {rightSidebarOpen ? "»" : "«"}
        </button>
      </div>

      {/* RIGHT SIDEBAR (The Dynamic Toolbar) */}
      <div style={{ 
        width: rightSidebarOpen ? "70px" : "0px", 
        background: "#161616", 
        borderLeft: rightSidebarOpen ? "1px solid #282828" : "none", 
        display: "flex", 
        flexDirection: "column", 
        padding: rightSidebarOpen ? "20px 10px" : "0px", 
        overflowY: "auto",
        overflowX: "hidden", 
        transition: "width 0.3s ease, padding 0.3s ease", 
        flexShrink: 0, 
        alignItems: "center", 
        gap: "15px",
        zIndex: 10
      }}>
        
        {rightSidebarOpen && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", alignItems: "center" }}>
              <ToolButton name="select" icon="🖱️" activeTool={activeTool} onClick={(tool) => setActiveTool(activeTool === "select" ? null : tool)} disabled={!selectedMap} title="Select element (S)" />
              <ToolButton name="move" icon="🖐️" activeTool={activeTool} onClick={(tool) => setActiveTool(activeTool === "move" ? null : tool)} disabled={!selectedMap} title="Drag/Move (M)" />
              <ToolButton name="pen" icon="✏️" activeTool={activeTool} onClick={(tool) => setActiveTool(activeTool === "pen" ? null : tool)} disabled={!selectedMap} title="Draw lines (P)" />
              <ToolButton name="eraser" icon="🧹" activeTool={activeTool} onClick={(tool) => setActiveTool(activeTool === "eraser" ? null : tool)} disabled={!selectedMap} title="Erase drawings (E)" />
            </div>

            <div style={{ height: "1px", background: "#333", width: "100%", margin: "5px 0" }} />

            {/* Undo / Redo UI Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", alignItems: "center" }}>
              <button 
                onClick={handleUndo} 
                disabled={historyIndex === 0}
                style={{
                  width: "40px", height: "40px", borderRadius: "8px", border: "none",
                  background: "#333", color: "white", cursor: historyIndex === 0 ? "not-allowed" : "pointer",
                  display: "flex", justifyContent: "center", alignItems: "center", fontSize: "16px",
                  opacity: historyIndex === 0 ? 0.3 : 1
                }}
                title="Undo (Ctrl+Z)"
              >
                ↩️
              </button>
              <button 
                onClick={handleRedo} 
                disabled={historyIndex >= history.length - 1}
                style={{
                  width: "40px", height: "40px", borderRadius: "8px", border: "none",
                  background: "#333", color: "white", cursor: historyIndex >= history.length - 1 ? "not-allowed" : "pointer",
                  display: "flex", justifyContent: "center", alignItems: "center", fontSize: "16px",
                  opacity: historyIndex >= history.length - 1 ? 0.3 : 1
                }}
                title="Redo (Ctrl+Y)"
              >
                ↪️
              </button>
            </div>

            <div style={{ height: "1px", background: "#333", width: "100%", margin: "5px 0" }} />

            <button 
              onClick={deleteSelectedElement}
              disabled={!selectedElement}
              style={{
                width: "40px", height: "40px", borderRadius: "8px", border: "none",
                background: selectedElement ? "#c4302b" : "#333", color: "white",
                cursor: selectedElement ? "pointer" : "not-allowed",
                display: "flex", justifyContent: "center", alignItems: "center", fontSize: "16px",
                transition: "transform 0.2s, background 0.2s",
                transform: selectedElement ? "scale(1)" : "scale(0.95)",
                boxShadow: selectedElement ? "0 4px 10px rgba(196, 48, 43, 0.3)" : "none"
              }}
              title="Delete selected item (Del)"
            >
              🗑️
            </button>
          </>
        )}
      </div>

      {/* MAP SELECTOR MODAL WITH HOVER PREVIEW */}
      {isMapSelectorOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0, 0, 0, 0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#161616", padding: "30px", borderRadius: "12px", border: "1px solid #282828", boxShadow: "0 0 30px rgba(230, 0, 130, 0.2)", width: "800px", maxWidth: "90vw", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <h3 style={{ color: "#f65dfb", marginBottom: "20px", fontSize: "22px", fontWeight: "750", textAlign: "center" }}>Select a Map</h3>
            <div style={{ display: "flex", flexGrow: 1, minHeight: 0, gap: "30px", overflow: "hidden", alignItems: "center" }}>
              <div style={{ flex: "1 1 50%", overflowY: "auto", paddingRight: "10px" }}>
                <div style={{ marginBottom: "20px", marginTop: selectedMode ? "0px" : "30px", transition: "margin-top 0.3s ease-in-out" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#aaa" }}>1. Game Mode</h4>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {gameModes.map((mode) => (
                      <button key={mode} onClick={() => { setSelectedMode(selectedMode === mode ? null : mode); setSelectedMap(null); setHoveredMap(null); }} style={{ padding: "8px 12px", background: selectedMode === mode ? "#e60082" : "#333", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>{mode}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "25px", opacity: selectedMode ? 1 : 0, transition: "opacity 0.4s ease-in-out", pointerEvents: selectedMode ? "auto" : "none" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#aaa" }}>2. Choose Map</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {!selectedMode ? <p style={{ color: "#666", fontSize: "13px" }}>Please select a game mode first.</p> : filteredMaps.length === 0 ? <p style={{ color: "#666", fontSize: "13px" }}>No maps found.</p> : filteredMaps.map((map) => (
                      <button key={map.map_id} onMouseEnter={() => setHoveredMap(map)} onMouseLeave={() => setHoveredMap(null)} onClick={() => { setSelectedMap(map.name); setHoveredMap(null); setIsMapSelectorOpen(false); }} style={{ padding: "6px 10px", background: selectedMap === map.name ? "#f65dfb" : "#444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>{map.name}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ width: "350px", height: "350px", background: "#111", borderRadius: "8px", border: "1px solid #333", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", position: "relative" }}>
                {hoveredMap?.image_path ? (
                  <img src={hoveredMap.image_path} alt={hoveredMap.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ color: "#555", fontSize: "14px" }}>Hover over a map to preview</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTHER MODALS */}
      <CustomModal isOpen={isNameModalOpen} title="Strategy Name" onConfirm={finalizeSave} onCancel={() => setIsNameModalOpen(false)} confirmText="Save">
        <input type="text" value={newStrategyName} onChange={(e) => setNewStrategyName(e.target.value)} placeholder="Enter name..." style={{ width: "100%", background: "#111", color: "white", border: "1px solid #444", borderRadius: "4px", padding: "10px" }} />
      </CustomModal>

      <CustomModal isOpen={isConfirmModalOpen} title="Success!" onConfirm={() => setIsConfirmModalOpen(false)} showCancel={false} confirmText="Awesome">
        <p style={{ color: "#aaa" }}>Strategy has been saved successfully!</p>
      </CustomModal>

      <CustomModal isOpen={isResetModalOpen} title="Reset Map?" onConfirm={clearCanvas} onCancel={() => setIsResetModalOpen(false)} confirmText="Reset" showCancel={true}>
        <p style={{ color: "#aaa" }}>This will clear all markers, drawings, and descriptions. Are you sure?</p>
      </CustomModal>
    </div>
  );
};

export default TacMap;