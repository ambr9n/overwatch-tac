import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../Supabase";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const tacMapStyles = `
@keyframes mapCardPopIn {
  0%   { opacity: 0; transform: translateY(30px) scale(0.92); }
  60%  { transform: translateY(-4px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dragSelectPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}
`;

type Team = "ally" | "enemy";
type GameMode = "Control" | "Escort" | "Hybrid" | "Push" | "Flashpoint" | "Clash" | "Assault";
type ToolType = "select" | "pen" | "eraser" | "line" | "arrow" | "circle";

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
  hasArrow?: boolean;
  isCircle?: boolean;
}

interface HistoryState {
  markers: Marker[];
  drawings: DrawingLine[];
}

interface PlayStep {
  id: number;
  label: string;
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
        width: "40px", height: "40px", borderRadius: "8px", border: "none",
        background: isActive ? "linear-gradient(45deg, #e60082, #f65dfb)" : "#333",
        color: "white", cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", justifyContent: "center", alignItems: "center", 
        transition: "transform 0.2s, background 0.2s, box-shadow 0.2s",
        transform: isActive ? "scale(1.05)" : "scale(1)",
        boxShadow: isActive ? "0 4px 10px rgba(246, 93, 251, 0.4)" : "none",
        opacity: disabled ? 0.5 : 1
      }}
    >
      <div style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
    </button>
  );
};

const gameModes: GameMode[] = ["Hybrid", "Escort", "Control", "Push", "Flashpoint", "Clash", "Assault"];
const roles = ["Damage", "Support", "Tank"];

const SelectIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 3 10 21 13 13 21 10 3 3"/></svg>);
const PenIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>);
const EraserIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>);
const UndoIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15.5-6L3 13"/></svg>);
const RedoIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15.5-6L21 13"/></svg>);
const TrashIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>);
const LineIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="19" x2="19" y2="5"/><circle cx="5" cy="19" r="2" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="2" fill="currentColor" stroke="none"/></svg>);
const ArrowIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></svg>);
const CircleIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/></svg>);

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
  const [drawColor, setDrawColor] = useState<string>("#007bff");
  const [isAnimating, setIsAnimating] = useState(false);

  // Drag-select refs so handlers always see current value
  const [dragSelectStart, setDragSelectStartState] = useState<{x: number, y: number} | null>(null);
  const dragSelectStartRef = useRef<{x: number, y: number} | null>(null);
  const setDragSelectStart = (v: {x: number, y: number} | null) => { dragSelectStartRef.current = v; setDragSelectStartState(v); };
  const justFinishedDragSelect = useRef(false);
  const [dragSelectRect, setDragSelectRect] = useState<{x1: number, y1: number, x2: number, y2: number} | null>(null);
  const [selectedMarkerIds, setSelectedMarkerIds] = useState<number[]>([]);
  const [isDragSelectingGroup, setIsDragSelectingGroup] = useState(false);
  const [groupDragStart, setGroupDragStart] = useState<{x: number, y: number} | null>(null);
  const [groupOriginalPositions, setGroupOriginalPositions] = useState<{id: number, x: number, y: number}[]>([]);

  // Line tool
  const [lineStart, setLineStartState] = useState<{x: number, y: number} | null>(null);
  const lineStartRef = useRef<{x: number, y: number} | null>(null);
  const setLineStart = (v: {x: number, y: number} | null) => { lineStartRef.current = v; setLineStartState(v); };
  const [linePreview, setLinePreview] = useState<{x: number, y: number} | null>(null);

  // Circle tool
  const [circleStart, setCircleStartState] = useState<{x: number, y: number} | null>(null);
  const circleStartRef = useRef<{x: number, y: number} | null>(null);
  const setCircleStart = (v: {x: number, y: number} | null) => { circleStartRef.current = v; setCircleStartState(v); };
  const [circlePreview, setCirclePreview] = useState<{x: number, y: number} | null>(null);

  const [modeAnimKey, setModeAnimKey] = useState(0);
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
  const [isTitleTooLongModalOpen, setIsTitleTooLongModalOpen] = useState(false);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [hoveredMap, setHoveredMap] = useState<MapData | null>(null);
  const [isMapButtonHovered, setIsMapButtonHovered] = useState(false);

  // Play-by-play
  const [playSteps, setPlaySteps] = useState<PlayStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [isPlayByPlayOpen, setIsPlayByPlayOpen] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalMapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Marker[]>([]);
  const drawingsRef = useRef<DrawingLine[]>([]);

  // Keep refs in sync with state
  useEffect(() => { markersRef.current = markers; }, [markers]);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);

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
    if (selectedMode) setModeAnimKey(k => k + 1);
  }, [selectedMode]);

  useEffect(() => {
    if (loadId && mapList.length > 0 && heroAssets.length > 0 && !isDataLoaded) {
      loadSavedStrategy(loadId);
      setIsDataLoaded(true);
    }
  }, [loadId, mapList, heroAssets, isDataLoaded]);

  useEffect(() => {
    drawCanvas();
  }, [drawings, selectedElement, activeTool, mousePos, brushSize, isSlidingBrush, linePreview, lineStart, circlePreview, circleStart, dragSelectRect, selectedMarkerIds]);

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
      if (e.key === 'Escape') {
        setLineStart(null); setLinePreview(null);
        setCircleStart(null); setCirclePreview(null);
        setDragSelectStart(null); setDragSelectRect(null);
      }
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
        if (selectedElement || selectedMarkerIds.length > 0) { e.preventDefault(); deleteSelectedElement(); }
      } else if (!modifier && selectedMap) {
        switch (e.key.toLowerCase()) {
          case 's': setActiveTool('select'); break;
          case 'p': setActiveTool('pen'); break;
          case 'e': setActiveTool('eraser'); break;
          case 'l': setActiveTool('line'); setLineStart(null); setLinePreview(null); break;
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
  }, [historyIndex, history, selectedElement, selectedMarkerIds, selectedMap]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 1000, 600);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const drawArrowhead = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string) => {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.max(12, width * 3.5);
      const headAngle = Math.PI / 6;
      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - headAngle), y2 - headLen * Math.sin(angle - headAngle));
      ctx.lineTo(x2 - headLen * Math.cos(angle + headAngle), y2 - headLen * Math.sin(angle + headAngle));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    drawings.forEach(drawing => {
      if (drawing.isCircle) {
        if (drawing.points.length < 2) return;
        const [p1, p2] = drawing.points;
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = drawing.width;
        ctx.stroke();
      } else {
        if (drawing.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
        const isStraightLine = drawing.points.length === 2;
        if (isStraightLine) {
          ctx.lineTo(drawing.points[1].x, drawing.points[1].y);
          ctx.strokeStyle = drawing.color;
          ctx.lineWidth = drawing.width;
          // line and arrow tools use dashed style matching the pen's aesthetic
          ctx.setLineDash([drawing.width * 2.5, drawing.width * 1.5]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
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
        }

        if (drawing.hasArrow && drawing.points.length >= 2) {
          const last = drawing.points[drawing.points.length - 1];
          const prev = drawing.points[drawing.points.length - 2];
          drawArrowhead(ctx, prev.x, prev.y, last.x, last.y, drawing.width, drawing.color);
        }
      }

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

    // Line / Arrow tool preview
    if ((activeTool === "line" || activeTool === "arrow") && lineStartRef.current && linePreview) {
      ctx.beginPath();
      ctx.moveTo(lineStartRef.current.x, lineStartRef.current.y);
      ctx.lineTo(linePreview.x, linePreview.y);
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(lineStartRef.current.x, lineStartRef.current.y, brushSize / 2 + 2, 0, Math.PI * 2);
      ctx.fillStyle = drawColor; ctx.fill();
      ctx.beginPath(); ctx.arc(linePreview.x, linePreview.y, brushSize / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
      if (activeTool === "arrow") {
        drawArrowhead(ctx, lineStartRef.current.x, lineStartRef.current.y, linePreview.x, linePreview.y, brushSize, drawColor);
      }
    }

    // Circle tool preview
    if (activeTool === "circle" && circleStartRef.current && circlePreview) {
      const p1 = circleStartRef.current;
      const p2 = circlePreview;
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const rx = Math.abs(p2.x - p1.x) / 2;
      const ry = Math.abs(p2.y - p1.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Drag-select rectangle
    if (dragSelectRect) {
      const { x1, y1, x2, y2 } = dragSelectRect;
      ctx.save();
      ctx.strokeStyle = "#f65dfb";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
      ctx.fillStyle = "rgba(246, 93, 251, 0.08)";
      ctx.fillRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
      ctx.restore();
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
          loadedMarkers = assets.map((a: any, idx: number) => {
            const hero = heroAssets.find(h => h.asset_id === a.asset_id);
            return {
              id: a.id || (Date.now() + idx), x: a.x_position, y: a.y_position, team: a.hero_team as Team,
              type: a.asset_id ? "asset" : "player", iconUrl: hero?.image_path,
              heroName: hero?.name, label: a.asset_id ? undefined : (a.hero_team === "ally" ? "A" : "E")
            };
          });
          setMarkers(loadedMarkers); 
        }

        let loadedDrawings: DrawingLine[] = [];
        const { data: drawing } = await supabase.from("Map_Drawings").select("path").eq("save_id", id).maybeSingle();
        if (drawing?.path) {
          try {
            const parsed = JSON.parse(drawing.path);
            // New format: { drawings: [...], playSteps: [...] }
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.drawings) {
              loadedDrawings = parsed.drawings;
              if (parsed.playSteps) setPlaySteps(parsed.playSteps);
            } else {
              // Old format: plain array
              loadedDrawings = parsed;
            }
            setDrawings(loadedDrawings);
          } catch(e) { console.error("Parse fail"); }
        }
        setHistory([{ markers: loadedMarkers, drawings: loadedDrawings }]);
        setHistoryIndex(0);
      }
    } catch (err) { console.error("Load failed:", err); } finally { setLoading(false); }
  };

  const getCoords = (e: React.MouseEvent | React.DragEvent) => {
    const rect = internalMapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (e.clientX - rect.left) / rect.width * 1000;
    const y = (e.clientY - rect.top) / rect.height * 600;
    return { x, y };
  };

  const finalizeSave = async () => {
    if (!newStrategyName && !activeSaveId) return;

    if (newStrategyName.length > 30) {
      setIsNameModalOpen(false);
      setIsTitleTooLongModalOpen(true);
      return;
    }
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
        save_id: currentId,
        path: JSON.stringify({ drawings, playSteps }),
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
    setPlaySteps([]); setCurrentStepIndex(null); setIsPlayByPlayOpen(false);
  };

  // --- Play-by-play helpers ---
  const addPlayStep = () => {
    const newStep: PlayStep = {
      id: Date.now(),
      label: `Step ${playSteps.length + 1}`,
      markers: markers.map(m => ({ ...m })),
      drawings: drawings.map(d => ({ ...d, points: d.points.map(p => ({ ...p })) })),
    };
    const newSteps = [...playSteps, newStep];
    setPlaySteps(newSteps);
    setCurrentStepIndex(newSteps.length - 1);
    setIsPlayByPlayOpen(true);
  };

  const goToStep = (index: number) => {
    // Save current edits back into current step before navigating
    if (currentStepIndex !== null) {
      setPlaySteps(prev => prev.map((s, i) =>
        i === currentStepIndex
          ? { ...s, markers: markers.map(m => ({ ...m })), drawings: drawings.map(d => ({ ...d, points: d.points.map(p => ({ ...p })) })) }
          : s
      ));
    }
    const step = playSteps[index];
    setIsAnimating(true);
    setMarkers(step.markers.map(m => ({ ...m })));
    setDrawings(step.drawings.map(d => ({ ...d, points: d.points.map(p => ({ ...p })) })));
    setHistory([{ markers: step.markers, drawings: step.drawings }]);
    setHistoryIndex(0);
    setSelectedElement(null);
    setCurrentStepIndex(index);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const deletePlayStep = (index: number) => {
    const newSteps = playSteps.filter((_, i) => i !== index);
    setPlaySteps(newSteps);
    if (newSteps.length === 0) {
      setCurrentStepIndex(null);
    } else {
      const newIndex = Math.min(index, newSteps.length - 1);
      const step = newSteps[newIndex];
      setMarkers(step.markers.map(m => ({ ...m })));
      setDrawings(step.drawings.map(d => ({ ...d, points: d.points.map(p => ({ ...p })) })));
      setHistory([{ markers: step.markers, drawings: step.drawings }]);
      setHistoryIndex(0);
      setSelectedElement(null);
      setCurrentStepIndex(newIndex);
    }
  };

  const renamePlayStep = (index: number, label: string) => {
    setPlaySteps(prev => prev.map((s, i) => i === index ? { ...s, label } : s));
  };

  // Sync current step's state when markers/drawings change while in a step
  useEffect(() => {
    if (currentStepIndex === null) return;
    setPlaySteps(prev => prev.map((s, i) =>
      i === currentStepIndex
        ? { ...s, markers: markers.map(m => ({ ...m })), drawings: drawings.map(d => ({ ...d, points: d.points.map(p => ({ ...p })) })) }
        : s
    ));
  }, [markers, drawings]);

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
    let nextMarkers = [...markers];
    let nextDrawings = [...drawings];
    if (selectedMarkerIds.length > 0) {
      nextMarkers = markers.filter(m => !selectedMarkerIds.includes(m.id));
      setMarkers(nextMarkers);
      setSelectedMarkerIds([]);
    } else if (selectedElement) {
      if (selectedElement.type === "marker") {
        nextMarkers = markers.filter(m => m.id !== selectedElement.id);
        setMarkers(nextMarkers);
      } else if (selectedElement.type === "drawing") {
        nextDrawings = drawings.filter(d => d.id !== selectedElement.id);
        setDrawings(nextDrawings);
      }
      setSelectedElement(null);
    } else {
      return;
    }
    pushToHistory(nextMarkers, nextDrawings);
  };

  const isPointNearLine = (px: number, py: number, line: DrawingLine): boolean => {
    if (line.isCircle && line.points.length >= 2) {
      const [p1, p2] = line.points;
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const rx = Math.abs(p2.x - p1.x) / 2;
      const ry = Math.abs(p2.y - p1.y) / 2;
      if (rx === 0 || ry === 0) return false;
      const nx = (px - cx) / rx;
      const ny = (py - cy) / ry;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const threshold = (line.width + 8) / Math.min(rx, ry);
      return Math.abs(dist - 1) < threshold;
    }
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
        color: drawColor, width: brushSize
      };
      setDrawings(prev => [...prev, newLine]);
      return;
    }
    if (activeTool === "line" || activeTool === "arrow") {
      if (!lineStartRef.current) {
        // First click — set start point
        setLineStart({ x, y });
        setLinePreview({ x, y });
      } else {
        // Second click — commit the line
        const newLine: DrawingLine = {
          id: Date.now(), points: [lineStartRef.current, { x, y }],
          color: drawColor, width: brushSize,
          hasArrow: activeTool === "arrow"
        };
        setLineStart(null);
        setLinePreview(null);
        setDrawings(prev => {
          const next = [...prev, newLine];
          drawingsRef.current = next;
          return next;
        });
        // push to history after state settles
        setTimeout(() => pushToHistory(markersRef.current, drawingsRef.current), 0);
      }
      return;
    }
    if (activeTool === "circle") {
      if (!circleStartRef.current) {
        setCircleStart({ x, y });
        setCirclePreview({ x, y });
      } else {
        const newCircle: DrawingLine = {
          id: Date.now(), points: [circleStartRef.current, { x, y }],
          color: drawColor, width: brushSize, isCircle: true
        };
        setCircleStart(null);
        setCirclePreview(null);
        setDrawings(prev => {
          const next = [...prev, newCircle];
          drawingsRef.current = next;
          return next;
        });
        setTimeout(() => pushToHistory(markersRef.current, drawingsRef.current), 0);
      }
      return;
    }
    if (activeTool === "select") {
      const clickedMarker = markersRef.current.find(m => Math.sqrt((m.x - x)**2 + (m.y - y)**2) < 25);
      if (clickedMarker) return; // handled by the marker div's onMouseDown
      const clickedDrawing = drawingsRef.current.find(d => isPointNearLine(x, y, d));
      if (clickedDrawing) {
        setSelectedMarkerIds([]);
        setIsDraggingElement(true);
        setDragStartCoords({ x, y });
        setOriginalPoints(clickedDrawing.points.map(p => ({ ...p })));
        setSelectedElement({ type: "drawing", id: clickedDrawing.id });
        return;
      }
      // Empty area — start drag-select
      setSelectedElement(null);
      setSelectedMarkerIds([]);
      setDragSelectStart({ x, y });
      setDragSelectRect({ x1: x, y1: y, x2: x, y2: y });
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
    if ((activeTool === "line" || activeTool === "arrow") && lineStartRef.current) {
      setLinePreview({ x, y });
      return;
    }
    if (activeTool === "circle" && circleStartRef.current) {
      setCirclePreview({ x, y });
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
    // Drag-select rect update
    if (dragSelectStartRef.current && activeTool === "select") {
      const ds = dragSelectStartRef.current;
      setDragSelectRect({ x1: ds.x, y1: ds.y, x2: x, y2: y });
      const x1 = Math.min(ds.x, x), x2 = Math.max(ds.x, x);
      const y1 = Math.min(ds.y, y), y2 = Math.max(ds.y, y);
      const inside = markersRef.current.filter(m => m.x >= x1 && m.x <= x2 && m.y >= y1 && m.y <= y2).map(m => m.id);
      setSelectedMarkerIds(inside);
      return;
    }
    // Group drag
    if (isDragSelectingGroup && groupDragStart) {
      const dx = x - groupDragStart.x, dy = y - groupDragStart.y;
      setMarkers(prev => prev.map(m => {
        const orig = groupOriginalPositions.find(o => o.id === m.id);
        return orig ? { ...m, x: orig.x + dx, y: orig.y + dy } : m;
      }));
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

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) { setIsPanning(false); return; }
    // Commit drag-select — release mouse to finalise selection
    if (dragSelectStartRef.current && activeTool === "select") {
      justFinishedDragSelect.current = true;
      setDragSelectStart(null);
      setDragSelectRect(null);
      return;
    }
    if (isDragSelectingGroup) {
      pushToHistory(markers, drawings);
      setIsDragSelectingGroup(false);
      setGroupDragStart(null);
      return;
    }
    if ((isDrawing && activeTool === "pen") || (isDraggingElement && selectedElement)) { pushToHistory(markers, drawings); }
    setIsDrawing(false); setIsDraggingElement(false); setDragStartCoords(null);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (e.button === 2 || !selectedMap || spacePressed || isPanning) return;
    const { x, y } = getCoords(e);
    if (activeTool === "line" || activeTool === "arrow" || activeTool === "circle") return; // handled entirely in mouseDown
    if (activeTool === "select") {
      if (justFinishedDragSelect.current) { justFinishedDragSelect.current = false; return; }
      const clickedMarker = markersRef.current.find(m => Math.sqrt((m.x - x)**2 + (m.y - y)**2) < 25);
      if (clickedMarker) { setSelectedElement({ type: "marker", id: clickedMarker.id }); setSelectedMarkerIds([]); return; }
      const clickedDrawing = drawingsRef.current.find(d => isPointNearLine(x, y, d));
      if (clickedDrawing) { setSelectedElement({ type: "drawing", id: clickedDrawing.id }); setSelectedMarkerIds([]); return; }
      setSelectedElement(null); setSelectedMarkerIds([]);
    }
    if (activeTool === "eraser") {
      const lineToErase = drawingsRef.current.find(d => isPointNearLine(x, y, d));
      if (lineToErase) {
        const nextDrawings = drawingsRef.current.filter(d => d.id !== lineToErase.id);
        setDrawings(nextDrawings); pushToHistory(markersRef.current, nextDrawings);
      }
    }
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

  const filteredMaps = mapList.filter(m => m.map_type?.toLowerCase() === selectedMode?.toLowerCase()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ color: "white", backgroundColor: "#111", position: "fixed", top: "60px", left: 0, height: "calc(100vh - 60px)", width: "100vw", display: "flex", overflow: "hidden", zIndex: 50 }}>
      <style>{tacMapStyles}</style>
      <div style={{ 
        width: sidebarOpen ? "350px" : "0px", background: "#161616", 
        borderRight: sidebarOpen ? "1px solid #282828" : "none", display: "flex", 
        flexDirection: "column", padding: sidebarOpen ? "20px" : "0px", overflowY: "auto",
        transition: "width 0.3s ease", flexShrink: 0
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

          <div style={{ background: "#222", padding: "15px", borderRadius: "8px", border: "1px solid #444", opacity: selectedMap ? 1 : 0.5, pointerEvents: selectedMap ? "auto" : "none", display: "flex", flexDirection: "column", maxHeight: "520px" }}>
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
                    <img src={asset.image_path} alt={asset.name} style={{ width: "36px", height: "36px", borderRadius: "4px" }} />
                    <div style={{ fontSize: "10px", marginTop: "4px" }}>{asset.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div 
        ref={mapRef} 
        onWheel={handleWheel} 
        onDragOver={(e) => e.preventDefault()} 
        onDrop={handleDrop}
        onClick={handleMapClick} 
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ flex: 1, display: "flex", backgroundColor: "#000000", position: "relative", minWidth: 0, justifyContent: "center", alignItems: "center", overflow: "hidden", cursor: spacePressed || isPanning ? "grabbing" : selectedMap ? "default" : "not-allowed" }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setSidebarOpen(!sidebarOpen); }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: "absolute", top: "20px", left: "10px", zIndex: 15, background: "linear-gradient(45deg, #e60082, #f65dfb)", border: "none", color: "white", borderRadius: "4px", width: "36px", height: "36px", cursor: "pointer", fontWeight: "bold", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(230, 0, 130, 0.3)" }}
        >
          {sidebarOpen ? "«" : "»"}
        </button>

        <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{ 
          position: "absolute", top: "20px", right: "10px", zIndex: 15, 
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" 
        }}>
          {!rightSidebarOpen && (
            <button
              onClick={() => setRightSidebarOpen(true)}
              style={{ 
                background: "linear-gradient(45deg, #e60082, #f65dfb)", 
                border: "none", color: "white", borderRadius: "4px", 
                width: "36px", height: "36px", cursor: "pointer", 
                fontWeight: "bold", fontSize: "18px", display: "flex", 
                alignItems: "center", justifyContent: "center", 
                boxShadow: "0 4px 10px rgba(230, 0, 130, 0.3)" 
              }}
            >
              «
            </button>
          )}

          <div style={{ 
            background: "rgba(0,0,0,0.7)", padding: "6px 10px", borderRadius: "6px", 
            fontSize: "12px", fontWeight: "bold", color: "#aaa", 
            border: "1px solid #333", backdropFilter: "blur(4px)" 
          }}>
            {Math.round(zoom * 100)}%
          </div>

          {selectedMap && (
            <button
              onClick={() => {
                if (!isPlayByPlayOpen) {
                  setIsPlayByPlayOpen(true);
                  if (playSteps.length === 0) addPlayStep();
                } else {
                  setIsPlayByPlayOpen(false);
                }
              }}
              title="Play-by-Play"
              style={{
                background: isPlayByPlayOpen
                  ? "linear-gradient(45deg, #e60082, #f65dfb)"
                  : "rgba(0,0,0,0.7)",
                border: isPlayByPlayOpen ? "none" : "1px solid #555",
                color: "white", borderRadius: "6px",
                padding: "6px 12px", cursor: "pointer",
                fontWeight: "bold", fontSize: "12px",
                backdropFilter: "blur(4px)",
                boxShadow: isPlayByPlayOpen ? "0 2px 10px rgba(246,93,251,0.4)" : "none"
              }}
            >
              ▶ Play-by-Play {playSteps.length > 0 ? `(${playSteps.length})` : ""}
            </button>
          )}
        </div>

        <div 
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", transition: "all 0.3s ease-in-out"
          }}
        >
          <div 
            ref={internalMapRef}
            style={{ 
              width: "1000px", height: "600px", position: "relative",
              backgroundImage: `url("${mapList.find(m => m.name === selectedMap)?.image_path}")`,
              backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
              backgroundColor: "#000000", opacity: selectedMap ? 1 : 0.6,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center", transition: isPanning ? "none" : "transform 0.05s ease-out",
              pointerEvents: selectedMap ? "auto" : "none",
              flexShrink: 0
            }}
          >
            <canvas ref={canvasRef} width={1000} height={600} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 5, pointerEvents: "none" }} />
            {markers.map(marker => (
              <div
                key={marker.id}
                style={{
                  position: "absolute", left: `${(marker.x / 1000) * 100}%`, top: `${(marker.y / 600) * 100}%`,
                  width: "15px", height: "15px", borderRadius: "50%",
                  border: selectedElement?.id === marker.id || selectedMarkerIds.includes(marker.id) ? "3px solid #f65dfb" : `2px solid ${marker.team === "ally" ? "#007bff" : "#dc3545"}`,
                  boxShadow: selectedMarkerIds.includes(marker.id) ? "0 0 15px rgba(246,93,251,0.6)" : marker.team === "ally" ? "0 0 15px rgba(0, 123, 255, 0.5)" : "0 0 15px rgba(220, 53, 69, 0.5)",
                  backgroundImage: `url(${marker.iconUrl})`, backgroundSize: "cover", transform: "translate(-50%, -50%)",
                  zIndex: 10, cursor: activeTool === "select" ? "grab" : "default",
                  transition: isAnimating ? "left 0.5s cubic-bezier(0.4,0,0.2,1), top 0.5s cubic-bezier(0.4,0,0.2,1)" : "none"
                }}
                onMouseDown={(e) => {
                  if (activeTool !== "select") return;
                  e.stopPropagation();
                  const { x, y } = getCoords(e);
                  if (selectedMarkerIds.includes(marker.id) && selectedMarkerIds.length > 1) {
                    // Start group drag
                    setIsDragSelectingGroup(true);
                    setGroupDragStart({ x, y });
                    setGroupOriginalPositions(markersRef.current.filter(m => selectedMarkerIds.includes(m.id)).map(m => ({ id: m.id, x: m.x, y: m.y })));
                  } else {
                    // Single marker drag
                    setSelectedMarkerIds([]);
                    setSelectedElement({ type: "marker", id: marker.id });
                    setIsDraggingElement(true);
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
        </div>

        {/* Play-by-Play Panel */}
        {isPlayByPlayOpen && selectedMap && (
          <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{
            position: "absolute", bottom: "130px", left: "50%", transform: "translateX(-50%)",
            background: "rgba(18, 18, 18, 0.97)", border: "1px solid #333",
            borderRadius: "14px", padding: "14px 18px", zIndex: 20,
            backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            display: "flex", flexDirection: "column", gap: "10px",
            minWidth: "360px", maxWidth: "680px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: "bold", color: "#f65dfb", textTransform: "uppercase", letterSpacing: "1px" }}>
                Play-by-Play
              </span>
              <button
                onClick={() => setIsPlayByPlayOpen(false)}
                style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
              >✕</button>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              {playSteps.map((step, i) => (
                <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    onClick={() => goToStep(i)}
                    style={{
                      padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
                      fontWeight: "bold", fontSize: "13px",
                      background: currentStepIndex === i
                        ? "linear-gradient(45deg, #e60082, #f65dfb)"
                        : "#2a2a2a",
                      color: currentStepIndex === i ? "white" : "#aaa",
                      boxShadow: currentStepIndex === i ? "0 2px 10px rgba(246,93,251,0.4)" : "none",
                      transition: "all 0.15s"
                    }}
                  >
                    {step.label}
                  </button>
                  <button
                    onClick={() => deletePlayStep(i)}
                    title="Delete step"
                    style={{
                      background: "transparent", border: "none", color: "#555", cursor: "pointer",
                      fontSize: "13px", padding: "0 2px", lineHeight: 1
                    }}
                  >✕</button>
                </div>
              ))}
              <button
                onClick={addPlayStep}
                title="Add step from current state"
                style={{
                  padding: "6px 12px", borderRadius: "20px",
                  border: "1px dashed #555", background: "transparent",
                  color: "#888", cursor: "pointer", fontSize: "13px", fontWeight: "bold"
                }}
              >+ Add Step</button>
            </div>
            {currentStepIndex !== null && playSteps[currentStepIndex] && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#666" }}>Label:</span>
                <input
                  type="text"
                  value={playSteps[currentStepIndex].label}
                  onChange={(e) => renamePlayStep(currentStepIndex, e.target.value)}
                  style={{
                    background: "#1a1a1a", border: "1px solid #444", borderRadius: "4px",
                    color: "white", padding: "4px 8px", fontSize: "12px", width: "160px"
                  }}
                />
                <span style={{ fontSize: "11px", color: "#555", marginLeft: "auto" }}>
                  Step {currentStepIndex + 1} of {playSteps.length}
                </span>
                <button
                  disabled={currentStepIndex === 0}
                  onClick={() => goToStep(currentStepIndex - 1)}
                  style={{ background: "#222", border: "1px solid #444", color: currentStepIndex === 0 ? "#444" : "#aaa", borderRadius: "6px", width: "28px", height: "28px", cursor: currentStepIndex === 0 ? "not-allowed" : "pointer", fontSize: "14px" }}
                >‹</button>
                <button
                  disabled={currentStepIndex === playSteps.length - 1}
                  onClick={() => goToStep(currentStepIndex + 1)}
                  style={{ background: "#222", border: "1px solid #444", color: currentStepIndex === playSteps.length - 1 ? "#444" : "#aaa", borderRadius: "6px", width: "28px", height: "28px", cursor: currentStepIndex === playSteps.length - 1 ? "not-allowed" : "pointer", fontSize: "14px" }}
                >›</button>
              </div>
            )}
          </div>
        )}

        <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", background: "rgba(22, 22, 22, 0.9)", padding: "8px 14px", borderRadius: "12px", border: "1px solid #333", backdropFilter: "blur(10px)", zIndex: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", opacity: selectedMap ? 1 : 0.5, pointerEvents: selectedMap ? "auto" : "none", alignItems: "center" }}>
          <ToolButton name="select" icon={<SelectIcon />} activeTool={activeTool} onClick={setActiveTool} title="Select (S)" />
          <ToolButton name="pen" icon={<PenIcon />} activeTool={activeTool} onClick={setActiveTool} title="Pen (P)" />
          <ToolButton name="line" icon={<LineIcon />} activeTool={activeTool} onClick={(t) => { setActiveTool(t); setLineStart(null); setLinePreview(null); }} title="Line (L)" />
          <ToolButton name="arrow" icon={<ArrowIcon />} activeTool={activeTool} onClick={(t) => { setActiveTool(t); setLineStart(null); setLinePreview(null); }} title="Arrow Line" />
          <ToolButton name="circle" icon={<CircleIcon />} activeTool={activeTool} onClick={(t) => { setActiveTool(t); setCircleStart(null); setCirclePreview(null); }} title="Circle / Ellipse" />
          <ToolButton name="eraser" icon={<EraserIcon />} activeTool={activeTool} onClick={setActiveTool} title="Eraser (E)" />
          <div style={{ width: "1px", background: "#444", margin: "0 3px", alignSelf: "stretch" }} />
          <button onClick={handleUndo} disabled={historyIndex === 0} style={{ width: "40px", height: "40px", borderRadius: "8px", border: "none", background: "#333", color: "white", cursor: historyIndex === 0 ? "not-allowed" : "pointer", opacity: historyIndex === 0 ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}><UndoIcon /></button>
          <button onClick={handleRedo} disabled={historyIndex === history.length - 1} style={{ width: "40px", height: "40px", borderRadius: "8px", border: "none", background: "#333", color: "white", cursor: historyIndex === history.length - 1 ? "not-allowed" : "pointer", opacity: historyIndex === history.length - 1 ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}><RedoIcon /></button>
          <div style={{ width: "1px", background: "#444", margin: "0 3px", alignSelf: "stretch" }} />
          <button onClick={deleteSelectedElement} disabled={!selectedElement && selectedMarkerIds.length === 0} style={{ width: "40px", height: "40px", borderRadius: "8px", border: "none", background: (selectedElement || selectedMarkerIds.length > 0) ? "#c4302b" : "#333", color: "white", cursor: (selectedElement || selectedMarkerIds.length > 0) ? "pointer" : "not-allowed", opacity: (selectedElement || selectedMarkerIds.length > 0) ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center" }}><TrashIcon /></button>
          <div style={{ width: "1px", background: "#444", margin: "0 3px", alignSelf: "stretch" }} />
          {/* Color wheel */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }} title="Drawing color">
            <div style={{
              width: "40px", height: "40px", borderRadius: "8px", background: "#333",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `3px solid ${drawColor}`, boxSizing: "border-box",
              boxShadow: `0 0 8px ${drawColor}88`, cursor: "pointer", overflow: "hidden",
              position: "relative"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={drawColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a10 10 0 0 1 0 20"/>
                <path d="M2 12h20"/>
              </svg>
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                style={{
                  position: "absolute", inset: 0, opacity: 0, cursor: "pointer",
                  width: "100%", height: "100%", border: "none", padding: 0
                }}
                title="Pick drawing color"
              />
            </div>
          </div>
        </div>

        {(activeTool === "pen" || activeTool === "line" || activeTool === "arrow" || activeTool === "circle") && (
          <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: isPlayByPlayOpen ? "280px" : "80px", left: "50%", transform: "translateX(-50%)", background: "rgba(22, 22, 22, 0.95)", padding: "10px 18px", borderRadius: "30px", border: "1px solid #f65dfb", display: "flex", alignItems: "center", gap: "12px", zIndex: 25, transition: "bottom 0.2s" }}>
            {(activeTool === "line" || activeTool === "arrow") && lineStartRef.current && (
              <span style={{ fontSize: "11px", color: "#f65dfb", fontWeight: "bold" }}>Click to place end point · ESC to cancel</span>
            )}
            {activeTool === "circle" && circleStartRef.current && (
              <span style={{ fontSize: "11px", color: "#f65dfb", fontWeight: "bold" }}>Click to place opposite corner · ESC to cancel</span>
            )}
             <span style={{ fontSize: "12px", fontWeight: "bold", color: "#f65dfb" }}>{brushSize}px</span>
             <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} onMouseDown={() => setIsSlidingBrush(true)} onMouseUp={() => setIsSlidingBrush(false)} style={{ cursor: "pointer", accentColor: "#f65dfb" }} />
          </div>
        )}
      </div>

      <div style={{ width: rightSidebarOpen ? "320px" : "0px", background: "#161616", borderLeft: rightSidebarOpen ? "1px solid #282828" : "none", display: "flex", flexDirection: "column", transition: "width 0.3s ease", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "20px", minWidth: "320px", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "18px", color: "#f65dfb", margin: 0 }}>Team Overview</h3>
            <button 
              onClick={() => setRightSidebarOpen(false)} 
              style={{ background: "rgba(230, 0, 130, 0.1)", border: "1px solid #e60082", color: "#f65dfb", borderRadius: "4px", width: "28px", height: "28px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              »
            </button>
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

      {isMapSelectorOpen && (
        <div style={{ position: "fixed", top: "60px", left: 0, width: "100vw", height: "calc(100vh - 60px)", backgroundColor: "rgba(0, 0, 0, 0.94)", display: "flex", flexDirection: "column", zIndex: 2000, padding: "40px", backdropFilter: "blur(8px)" }}>
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
              <div key={modeAnimKey} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "25px", paddingBottom: "40px" }}>
                {filteredMaps.map((m, idx) => (
                  <div key={m.map_id} onClick={() => { setSelectedMap(m.name); setIsMapSelectorOpen(false); }} onMouseEnter={() => setHoveredMap(m)} onMouseLeave={() => setHoveredMap(null)}
                    style={{ position: "relative", height: "160px", borderRadius: "12px", overflow: "hidden", cursor: "pointer", border: "2px solid #282828",
                      animation: `mapCardPopIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both`,
                      animationDelay: `${idx * 50}ms`
                    }}>
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
      <CustomModal 
        isOpen={isTitleTooLongModalOpen} 
        title="Title Too Long" 
        onConfirm={() => {
          setIsTitleTooLongModalOpen(false);
          setIsNameModalOpen(true);
        }} 
        showCancel={false} 
        confirmText="Try Again"
      >
        <p style={{ color: "#aaa" }}>
          Strategy titles must be <strong>30 characters</strong> or less. 
          Current length: {newStrategyName.length}
        </p>
      </CustomModal>
    </div>
  );
};

export default TacMap;