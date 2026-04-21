import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../Supabase";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

/**
 * TYPES & INTERFACES
 */
type Team = "ally" | "enemy";
type GameMode = "Control" | "Escort" | "Hybrid" | "Push" | "Flashpoint" | "Clash" | "Assault";
type ToolType = "select" | "pen" | "eraser";

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

interface HistoryState {
  markers: Marker[];
  drawings: DrawingLine[];
}

/**
 * REUSABLE COMPONENTS
 */
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
      justifyContent: "center", alignItems: "center", zIndex: 3000,
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

interface ToolButtonProps {
  name: ToolType;
  icon: React.ReactNode;
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
        width: "50px", height: "50px", borderRadius: "8px", border: "none",
        background: isActive ? "linear-gradient(45deg, #e60082, #f65dfb)" : "#333",
        color: "white", cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", justifyContent: "center", alignItems: "center", 
        transition: "transform 0.2s, background 0.2s, box-shadow 0.2s",
        transform: isActive ? "scale(1.05)" : "scale(1)",
        boxShadow: isActive ? "0 4px 10px rgba(246, 93, 251, 0.4)" : "none",
        opacity: disabled ? 0.5 : 1
      }}
    >
      <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
    </button>
  );
};

const gameModes: GameMode[] = ["Hybrid", "Escort", "Control", "Push", "Flashpoint", "Clash", "Assault"];
const roles = ["Damage", "Support", "Tank"];

  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
// SVG Icons
const SelectIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 3 10 21 13 13 21 10 3 3"/></svg>);
const PenIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>);
const EraserIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>);
const UndoIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15.5-6L3 13"/></svg>);
const RedoIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15.5-6L21 13"/></svg>);
const TrashIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>);

const TacMap: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const loadId = searchParams.get("load");
  const navigate = useNavigate();

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
  
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [brushSize, setBrushSize] = useState<number>(4);
  const [selectedElement, setSelectedElement] = useState<{ type: "marker" | "drawing"; id: number } | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragStartCoords, setDragStartCoords] = useState<{x: number, y: number} | null>(null);
  const [originalPoints, setOriginalPoints] = useState<{x: number, y: number}[]>([]);
  const [isSlidingBrush, setIsSlidingBrush] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 500, y: 300 });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [history, setHistory] = useState<HistoryState[]>([{ markers: [], drawings: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  const [isMapSelectorOpen, setIsMapSelectorOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isDuplicateNameModalOpen, setIsDuplicateNameModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
    if (selectedMap) {
      setMarkers([]);
      setDrawings([]);
      setHistory([{ markers: [], drawings: [] }]);
      setHistoryIndex(0);
      setSelectedElement(null);
    }
  }, [selectedMap]);

  useEffect(() => {
    if (loadId && mapList.length > 0 && heroAssets.length > 0 && !isDataLoaded) {
      loadSavedStrategy(loadId);
      setIsDataLoaded(true);
    }
  }, [loadId, mapList, heroAssets, isDataLoaded]);

  useEffect(() => {
    drawCanvas();
  }, [drawings, selectedElement, activeTool, mousePos, brushSize, isSlidingBrush]);

  const pushToHistory = (newMarkers: Marker[], newDrawings: DrawingLine[]) => {
    const nextState = { markers: newMarkers, drawings: newDrawings };
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(nextState);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSpacePressed(true);
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((modifier && e.key.toLowerCase() === 'y') || (modifier && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElement) { e.preventDefault(); deleteSelectedElement(); }
      } else if (!modifier && selectedMap) {
        switch (e.key.toLowerCase()) {
          case 's': setActiveTool('select'); break;
          case 'p': setActiveTool('pen'); break;
          case 'e': setActiveTool('eraser'); break;
          default: break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') { setSpacePressed(false); setIsPanning(false); }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [historyIndex, history, selectedElement, selectedMap]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 1000, 600);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    drawings.forEach(drawing => {
      if (drawing.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
      let i;
      for (i = 1; i < drawing.points.length - 2; i++) {
        const xc = (drawing.points[i].x + drawing.points[i + 1].x) / 2;
        const yc = (drawing.points[i].y + drawing.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(drawing.points[i].x, drawing.points[i].y, xc, yc);
      }
      if (i < drawing.points.length - 1) {
         ctx.quadraticCurveTo(drawing.points[i].x, drawing.points[i].y, drawing.points[i + 1].x, drawing.points[i + 1].y);
      }
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.width;
      ctx.stroke();

      if (selectedElement?.type === "drawing" && selectedElement.id === drawing.id) {
        const xs = drawing.points.map(p => p.x);
        const ys = drawing.points.map(p => p.y);
        const minX = Math.min(...xs) - 10;
        const maxX = Math.max(...xs) + 10;
        const minY = Math.min(...ys) - 10;
        const maxY = Math.max(...ys) + 10;
        ctx.save();
        ctx.strokeStyle = "#f65dfb";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.restore();
      }
    });

    if (selectedMap && (activeTool === "pen" || isSlidingBrush)) {
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(246, 93, 251, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(246, 93, 251, 0.15)";
      ctx.fill();
    }
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
              id: a.id, x: a.x_position, y: a.y_position, team: a.hero_team as Team,
              type: a.asset_id ? "asset" : "player", iconUrl: hero?.image_path,
              heroName: hero?.name, label: a.asset_id ? undefined : (a.hero_team === "ally" ? "A" : "E")
            };
          });
          setMarkers(loadedMarkers); 
        }

        let loadedDrawings: DrawingLine[] = [];
        const { data: drawing } = await supabase.from("Map_Drawings").select("path").eq("save_id", id).maybeSingle();
        if (drawing?.path) {
          try { loadedDrawings = JSON.parse(drawing.path); setDrawings(loadedDrawings); } catch(e) { console.error("Parse fail"); }
        }
        setHistory([{ markers: loadedMarkers, drawings: loadedDrawings }]);
        setHistoryIndex(0);
      }
    } catch (err) { console.error("Load failed:", err); } finally { setLoading(false); }
  };

  const getCoords = (e: React.MouseEvent | React.DragEvent) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const originX = rect.width / 2;
    const originY = rect.height / 2;
    const x = ((clientX - originX - pan.x) / zoom) + originX;
    const y = ((clientY - originY - pan.y) / zoom) + originY;
    return { x: (x / rect.width) * 1000, y: (y / rect.height) * 600 };
  };

  const finalizeSave = async () => {
    if (!newStrategyName && !activeSaveId) return;
    setIsNameModalOpen(false);
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAuthModalOpen(true); setIsSaving(false); return; }

      let currentId = activeSaveId;
      if (!currentId) {
        const { data: header, error: headerError } = await supabase.from("Saved_Maps").insert([{
          map_id: mapList.find(m => m.name === selectedMap)?.map_id,
          user_id: user.id, name: newStrategyName, description: description 
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
          x_position: Math.round(m.x), y_position: Math.round(m.y), hero_team: m.team 
        })));
      }

      await supabase.from("Map_Drawings").upsert({
        save_id: currentId, path: JSON.stringify(drawings),
        color: activeTeam === "ally" ? "#007bff" : "#dc3545", width: brushSize
      }, { onConflict: 'save_id' });
      setIsConfirmModalOpen(true);
    } catch (err) { console.error("Save failed:", err); } finally { setIsSaving(false); }
  };

  const clearCanvas = () => {
    setDrawings([]); setMarkers([]); setDescription(""); setActiveSaveId(null);
    setSelectedElement(null); setSearchParams({}, { replace: true });
    setIsResetModalOpen(false); setHistory([{ markers: [], drawings: [] }]);
    setHistoryIndex(0); setZoom(1); setPan({ x: 0, y: 0 });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedMap) return;
    const assetData = e.dataTransfer.getData("assetData");
    if (!assetData) return;
    const asset = JSON.parse(assetData);
    const coords = getCoords(e);

    const teamMarkers = activeTeam === "ally" ? allyMarkers : enemyMarkers;
    if (teamMarkers.length >= 5 || teamMarkers.some(m => m.heroName === asset.name)) return;

    const newMarker: Marker = {
      id: Date.now(), x: coords.x, y: coords.y,
      team: activeTeam, type: "asset", iconUrl: asset.image_path, heroName: asset.name
    };

    const nextMarkers = [...markers, newMarker];
    setMarkers(nextMarkers);
    pushToHistory(nextMarkers, drawings);
    setSelectedElement({ type: "marker", id: newMarker.id });
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
      const x1 = line.points[i].x, y1 = line.points[i].y;
      const x2 = line.points[i+1].x, y2 = line.points[i+1].y;
      const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
      const dot = A * C + B * D, len_sq = C * C + D * D;
      let param = -1;
      if (len_sq !== 0) param = dot / len_sq;
      let xx, yy;
      if (param < 0) { xx = x1; yy = y1; }
      else if (param > 1) { xx = x2; yy = y2; }
      else { xx = x1 + param * C; yy = y1 + param * D; }
      const dx = px - xx, dy = py - yy;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) return true;
    }
    return false;
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (e.button === 2 || !selectedMap || spacePressed || isPanning) return;
    const { x, y } = getCoords(e);

    if (activeTool === "select") {
      const clickedMarker = markers.find(m => Math.sqrt((m.x - x)**2 + (m.y - y)**2) < 25);
      if (clickedMarker) { setSelectedElement({ type: "marker", id: clickedMarker.id }); return; }
      const clickedDrawing = drawings.find(d => isPointNearLine(x, y, d));
      if (clickedDrawing) { setSelectedElement({ type: "drawing", id: clickedDrawing.id }); return; }
      setSelectedElement(null);
    }

    if (activeTool === "eraser") {
      const lineToErase = drawings.find(d => isPointNearLine(x, y, d));
      if (lineToErase) {
        const nextDrawings = drawings.filter(d => d.id !== lineToErase.id);
        setDrawings(nextDrawings); pushToHistory(markers, nextDrawings);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedMap) return;
    if (spacePressed || e.button === 1 || e.button === 2) {
      e.preventDefault(); setIsPanning(true); return;
    }
    const { x, y } = getCoords(e);

    if (activeTool === "pen") {
      setIsDrawing(true);
      const newLine: DrawingLine = {
        id: Date.now(), points: [{ x, y }],
        color: activeTeam === "ally" ? "#007bff" : "#dc3545", width: brushSize
      };
      setDrawings(prev => [...prev, newLine]);
      return;
    }

    if (activeTool === "select") {
      const clickedMarker = markers.find(m => Math.sqrt((m.x - x)**2 + (m.y - y)**2) < 25);
      if (clickedMarker) {
        setIsDraggingElement(true);
        setSelectedElement({ type: "marker", id: clickedMarker.id });
        return;
      }
      const clickedDrawing = drawings.find(d => isPointNearLine(x, y, d));
      if (clickedDrawing) {
        setIsDraggingElement(true); setDragStartCoords({ x, y });
        setOriginalPoints(clickedDrawing.points.map(p => ({ ...p })));
        setSelectedElement({ type: "drawing", id: clickedDrawing.id });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedMap) return;
    const { x, y } = getCoords(e);
    setMousePos({ x, y }); 

    if (isPanning) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      return;
    }
    if (isDrawing && activeTool === "pen") {
      setDrawings(prev => {
        const updated = [...prev];
        const lastLine = updated[updated.length - 1];
        lastLine.points = [...lastLine.points, { x, y }];
        return updated;
      });
      return;
    }
    if (isDraggingElement && selectedElement) {
      if (selectedElement.type === "marker") {
        setMarkers(prev => prev.map(m => m.id === selectedElement.id ? { ...m, x, y } : m));
      } else if (selectedElement.type === "drawing" && dragStartCoords) {
        const dx = x - dragStartCoords.x, dy = y - dragStartCoords.y;
        setDrawings(prev => prev.map(d => 
          d.id === selectedElement.id ? { ...d, points: originalPoints.map(p => ({ x: p.x + dx, y: p.y + dy })) } : d
        ));
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) { setIsPanning(false); return; }
    if ((isDrawing && activeTool === "pen") || (isDraggingElement && selectedElement)) { pushToHistory(markers, drawings); }
    setIsDrawing(false); setIsDraggingElement(false); setDragStartCoords(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!selectedMap) return;
    e.preventDefault();
    const zoomSpeed = 0.1, minZoom = 0.5, maxZoom = 5;
    const delta = e.deltaY < 0 ? 1 : -1;
    setZoom(prev => {
      const newZoom = Math.min(Math.max(prev + delta * zoomSpeed, minZoom), maxZoom);
      if (newZoom === 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const filteredMaps = mapList.filter(m => m.map_type?.toLowerCase() === selectedMode?.toLowerCase());

  return (
    <div style={{ color: "white", backgroundColor: "#111", position: "fixed", top: "60px", left: 0, height: "calc(100vh - 60px)", width: "100vw", display: "flex", overflow: "hidden", zIndex: 50 }}>
      
      {/* LEFT SIDEBAR */}
      <div style={{ 
        width: sidebarOpen ? "350px" : "0px", background: "#161616", 
        borderRight: sidebarOpen ? "1px solid #282828" : "none", display: "flex", 
        flexDirection: "column", padding: sidebarOpen ? "20px" : "0px", overflowY: "auto",
        transition: "width 0.3s ease, padding 0.3s ease", flexShrink: 0
      }}>
        <div style={{ minWidth: "310px" }}>
          <div style={{ fontSize: "20px", marginBottom: "20px", fontWeight: "bold" }}>
            Map: <span style={{ color: "#f65dfb" }}>{selectedMap || "None Selected"}</span>
          </div>
          <button
            onClick={() => setIsMapSelectorOpen(true)}
            onMouseEnter={() => setIsMapButtonHovered(true)}
            onMouseLeave={() => setIsMapButtonHovered(false)}
            style={{
              width: "100%", padding: "14px", background: "linear-gradient(45deg, #e60082, #f65dfb)",
              color: "white", border: "none", borderRadius: "8px", cursor: "pointer",
              fontWeight: "bolder", fontSize: "16px", marginBottom: "15px", display: "flex",
              alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "transform 0.2s, box-shadow 0.2s",
              transform: isMapButtonHovered ? "scale(1.02)" : "scale(1)",
              boxShadow: isMapButtonHovered ? "0 6px 15px rgba(246, 93, 251, 0.5)" : "0 4px 10px rgba(230, 0, 130, 0.35)",
            }}
          >
            {selectedMap ? "Change Map" : "Select Map"}
          </button>

          <div style={{ display: "flex", gap: "10px", marginBottom: "15px", opacity: selectedMap ? 1 : 0.5, pointerEvents: selectedMap ? "auto" : "none" }}>
            <button onClick={() => setIsResetModalOpen(true)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #c4302b", borderRadius: "4px", color: "#c4302b", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>Reset Map</button>
            <button onClick={() => (activeSaveId ? finalizeSave() : setIsNameModalOpen(true))} disabled={isSaving || !selectedMap} style={{ flex: 1, padding: "10px", background: (isSaving || !selectedMap) ? "#444" : "#28a745", border: "none", borderRadius: "4px", color: "white", cursor: selectedMap ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: "13px" }}>{isSaving ? "Saving..." : activeSaveId ? "Update Plan" : "Save Plan"}</button>
          </div>

          <div style={{ background: "#222", padding: "15px", borderRadius: "8px", border: "1px solid #444", marginBottom: "20px", opacity: selectedMap ? 1 : 0.5, pointerEvents: selectedMap ? "auto" : "none" }}>
            <h4 style={{ color: "#f65dfb", fontSize: "12px", textTransform: "uppercase", marginBottom: "10px" }}>Description</h4>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", height: "60px", background: "#111", color: "white", border: "1px solid #444", borderRadius: "4px", padding: "10px", resize: "none" }} />
          </div>

          <div style={{ background: "#222", padding: "15px", borderRadius: "8px", border: "1px solid #444", opacity: selectedMap ? 1 : 0.5, pointerEvents: selectedMap ? "auto" : "none", display: "flex", flexDirection: "column", maxHeight: "380px" }}>
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
              {heroAssets.filter(h => h.hero_roles === activeRoleTab).map(asset => {
                const isOnCurrentTeam = (activeTeam === "ally" ? allyMarkers : enemyMarkers).some(m => m.heroName === asset.name);
                return (
                  <div key={asset.asset_id} draggable={!!selectedMap && !isOnCurrentTeam} onDragStart={(e) => e.dataTransfer.setData("assetData", JSON.stringify(asset))} style={{ cursor: (selectedMap && !isOnCurrentTeam) ? "grab" : "not-allowed", textAlign: "center", padding: "5px", background: "#333", borderRadius: "4px", border: "1px solid #444", opacity: isOnCurrentTeam ? 0.3 : 1 }}>
                    <img src={asset.image_path} alt={asset.name} style={{ width: "50px", height: "50px", borderRadius: "4px" }} />
                    <div style={{ fontSize: "10px", marginTop: "4px" }}>{asset.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* VIEWPORT */}
      <div 
        ref={mapRef} onWheel={handleWheel} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
        onClick={handleMapClick} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ flex: 1, display: "flex", backgroundColor: "#000000", position: "relative", minWidth: 0, justifyContent: "center", alignItems: "center", overflow: "hidden", cursor: spacePressed || isPanning ? "grabbing" : selectedMap ? "default" : "not-allowed" }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ position: "absolute", top: "20px", left: "10px", zIndex: 15, background: "rgba(230, 0, 130, 0.8)", border: "none", color: "white", borderRadius: "4px", width: "36px", height: "36px", cursor: "pointer", fontWeight: "bold", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}
        >
          {sidebarOpen ? "«" : "»"}
        </button>

        <div style={{ 
          width: "100%", height: "100%", position: "relative",
          backgroundImage: `url("${mapList.find(m => m.name === selectedMap)?.image_path}")`,
          backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
          backgroundColor: "#000000", opacity: selectedMap ? 1 : 0.6,
          aspectRatio: "1000 / 600", maxHeight: "100%", maxWidth: "100%", margin: "auto",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center", transition: isPanning ? "none" : "transform 0.05s ease-out",
          pointerEvents: selectedMap ? "auto" : "none"
        }}>
          <canvas ref={canvasRef} width={1000} height={600} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 5, pointerEvents: "none" }} />
          {markers.map(marker => (
            <div
              key={marker.id}
              style={{
                position: "absolute", left: `${(marker.x / 1000) * 100}%`, top: `${(marker.y / 600) * 100}%`,
                width: "44px", height: "44px", borderRadius: "50%",
                border: selectedElement?.id === marker.id ? "3px solid #f65dfb" : `2px solid ${marker.team === "ally" ? "#007bff" : "#dc3545"}`,
                boxShadow: marker.team === "ally" ? "0 0 15px rgba(0, 123, 255, 0.5)" : "0 0 15px rgba(220, 53, 69, 0.5)",
                backgroundImage: `url(${marker.iconUrl})`, backgroundSize: "cover", transform: "translate(-50%, -50%)",
                zIndex: 10, cursor: activeTool === "select" ? "grab" : "default"
              }}
              onMouseDown={(e) => {
                if (activeTool === "select") {
                  e.stopPropagation(); setSelectedElement({ type: "marker", id: marker.id }); setIsDraggingElement(true);
                }
              }}
            >
              {marker.label && (
                <div style={{ position: "absolute", bottom: "-18px", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.7)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {marker.label}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div style={{ position: "absolute", bottom: "30px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "15px", background: "rgba(22, 22, 22, 0.9)", padding: "10px 20px", borderRadius: "12px", border: "1px solid #333", backdropFilter: "blur(10px)", zIndex: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", opacity: selectedMap ? 1 : 0.5, pointerEvents: selectedMap ? "auto" : "none" }}>
          <ToolButton name="select" icon={<SelectIcon />} activeTool={activeTool} onClick={setActiveTool} title="Select (S)" />
          <ToolButton name="pen" icon={<PenIcon />} activeTool={activeTool} onClick={setActiveTool} title="Pen (P)" />
          <ToolButton name="eraser" icon={<EraserIcon />} activeTool={activeTool} onClick={setActiveTool} title="Eraser (E)" />
          <div style={{ width: "1px", background: "#444", margin: "0 5px" }} />
          <button onClick={handleUndo} disabled={historyIndex === 0} style={{ width: "50px", height: "50px", borderRadius: "8px", border: "none", background: "#333", color: "white", cursor: historyIndex === 0 ? "not-allowed" : "pointer", opacity: historyIndex === 0 ? 0.5 : 1 }}><UndoIcon /></button>
          <button onClick={handleRedo} disabled={historyIndex === history.length - 1} style={{ width: "50px", height: "50px", borderRadius: "8px", border: "none", background: "#333", color: "white", cursor: historyIndex === history.length - 1 ? "not-allowed" : "pointer", opacity: historyIndex === history.length - 1 ? 0.5 : 1 }}><RedoIcon /></button>
          <div style={{ width: "1px", background: "#444", margin: "0 5px" }} />
          <button onClick={deleteSelectedElement} disabled={!selectedElement} style={{ width: "50px", height: "50px", borderRadius: "8px", border: "none", background: selectedElement ? "#c4302b" : "#333", color: "white", cursor: selectedElement ? "pointer" : "not-allowed", opacity: selectedElement ? 1 : 0.5 }}><TrashIcon /></button>
        </div>

        {activeTool === "pen" && (
          <div style={{ position: "absolute", bottom: "100px", left: "50%", transform: "translateX(-50%)", background: "rgba(22, 22, 22, 0.95)", padding: "12px 20px", borderRadius: "30px", border: "1px solid #f65dfb", display: "flex", alignItems: "center", gap: "15px", zIndex: 25 }}>
             <span style={{ fontSize: "12px", fontWeight: "bold", color: "#f65dfb" }}>{brushSize}px</span>
             <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} onMouseDown={() => setIsSlidingBrush(true)} onMouseUp={() => setIsSlidingBrush(false)} style={{ cursor: "pointer", accentColor: "#f65dfb" }} />
          </div>
        )}

        <div style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(0,0,0,0.6)", padding: "8px 12px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", color: "#aaa", zIndex: 10 }}>
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ width: rightSidebarOpen ? "320px" : "0px", background: "#161616", borderLeft: rightSidebarOpen ? "1px solid #282828" : "none", display: "flex", flexDirection: "column", transition: "width 0.3s ease", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "20px", minWidth: "320px", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "18px", color: "#f65dfb", margin: 0 }}>Team Overview</h3>
            <button onClick={() => setRightSidebarOpen(false)} style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: "18px" }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
             <div style={{ marginBottom: "25px" }}>
                <h4 style={{ fontSize: "12px", color: "#888", textTransform: "uppercase", marginBottom: "15px", borderBottom: "1px solid #333", paddingBottom: "5px" }}>Ally Team</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {allyMarkers.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", background: "#222", padding: "8px", borderRadius: "6px", borderLeft: "3px solid #007bff" }}>
                      <img src={m.iconUrl} style={{ width: "32px", height: "32px", borderRadius: "4px" }} alt="" />
                      <span style={{ fontSize: "14px", fontWeight: "500" }}>{m.heroName}</span>
                    </div>
                  ))}
                </div>
             </div>
             <div>
                <h4 style={{ fontSize: "12px", color: "#888", textTransform: "uppercase", marginBottom: "15px", borderBottom: "1px solid #333", paddingBottom: "5px" }}>Enemy Team</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {enemyMarkers.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", background: "#222", padding: "8px", borderRadius: "6px", borderLeft: "3px solid #dc3545" }}>
                      <img src={m.iconUrl} style={{ width: "32px", height: "32px", borderRadius: "4px" }} alt="" />
                      <span style={{ fontSize: "14px", fontWeight: "500" }}>{m.heroName}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>

      {!rightSidebarOpen && (
        <button onClick={() => setRightSidebarOpen(true)} style={{ position: "absolute", top: "20px", right: "10px", zIndex: 15, background: "rgba(23, 23, 23, 0.8)", border: "1px solid #333", color: "#f65dfb", borderRadius: "4px", width: "36px", height: "36px", cursor: "pointer", fontWeight: "bold" }}>📋</button>
      )}

      {/* MAP SELECTOR - FIXED FOR OVERLAP */}
      {isMapSelectorOpen && (
        <div style={{ 
            position: "fixed", 
            top: "60px", // Starts below the 60px navbar
            left: 0, 
            width: "100vw", 
            height: "calc(100vh - 60px)", // Fills remaining space
            backgroundColor: "rgba(0, 0, 0, 0.94)", 
            display: "flex", 
            flexDirection: "column", 
            zIndex: 2000, 
            padding: "40px",
            backdropFilter: "blur(8px)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", maxWidth: "1200px", width: "100%", margin: "0 auto 30px auto" }}>
            <h2 style={{ fontSize: "32px", fontWeight: "800", background: "linear-gradient(45deg, #fff, #f65dfb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Select a map</h2>
            <button onClick={() => setIsMapSelectorOpen(false)} style={{ background: "#333", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Back to Map</button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "30px", justifyContent: "center", flexWrap: "wrap" }}>
            {gameModes.map(mode => (
              <button key={mode} onClick={() => setSelectedMode(mode)} style={{ padding: "12px 24px", background: selectedMode === mode ? "linear-gradient(45deg, #e60082, #f65dfb)" : "#1a1a1a", color: "white", border: selectedMode === mode ? "none" : "1px solid #333", borderRadius: "30px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}>{mode}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
            {selectedMode ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "25px", paddingBottom: "40px" }}>
                {filteredMaps.map(m => (
                  <div key={m.map_id} onClick={() => { setSelectedMap(m.name); setIsMapSelectorOpen(false); }} onMouseEnter={() => setHoveredMap(m)} onMouseLeave={() => setHoveredMap(null)} style={{ position: "relative", height: "160px", borderRadius: "12px", overflow: "hidden", cursor: "pointer", border: "2px solid #282828" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: `url(${m.image_path})`, backgroundSize: "cover", backgroundPosition: "center", transition: "transform 0.5s ease", transform: hoveredMap?.map_id === m.map_id ? "scale(1.1)" : "scale(1)" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", padding: "20px", background: "linear-gradient(transparent, rgba(0,0,0,0.9))", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <span style={{ fontSize: "18px", fontWeight: "bold" }}>{m.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#444" }}>
                <div style={{ fontSize: "60px", marginBottom: "20px" }}>✵</div>
                <h3 style={{ fontSize: "24px" }}>Choose a Game Mode to see maps</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      <CustomModal isOpen={isDuplicateNameModalOpen} title="Name Taken" onConfirm={() => setIsDuplicateNameModalOpen(false)} showCancel={false}>
        <p style={{ color: "#aaa" }}>Strategy named "<strong>{newStrategyName}</strong>" already exists.</p>
      </CustomModal>
      <CustomModal isOpen={isNameModalOpen} title="Strategy Name" onConfirm={finalizeSave} onCancel={() => setIsNameModalOpen(false)} confirmText="Save">
        <input type="text" value={newStrategyName} onChange={(e) => setNewStrategyName(e.target.value)} placeholder="Enter name..." style={{ width: "100%", background: "#111", color: "white", border: "1px solid #444", borderRadius: "4px", padding: "10px" }} />
      </CustomModal>
      <CustomModal isOpen={isConfirmModalOpen} title="Success!" onConfirm={() => setIsConfirmModalOpen(false)} showCancel={false} confirmText="Awesome">
        <p style={{ color: "#aaa" }}>Strategy saved!</p>
      </CustomModal>
      <CustomModal isOpen={isResetModalOpen} title="Reset Map?" onConfirm={clearCanvas} onCancel={() => setIsResetModalOpen(false)} confirmText="Reset">
        <p style={{ color: "#aaa" }}>Clear everything on this map?</p>
      </CustomModal>
      <CustomModal isOpen={isAuthModalOpen} title="Not Signed In" onConfirm={() => navigate("/login")} showCancel={true} confirmText="Log In">
        <p style={{ color: "#aaa" }}>Sign in to save plans.</p>
      </CustomModal>
    </div>
  );
};

export default TacMap;