import React, { useEffect, useState } from "react";
import { supabase } from "../Supabase";
import { useNavigate } from "react-router-dom";

interface SavedStrategy {
  save_id: string;
  name: string;
  created_at: string;
  Maps: {
    name: string;
  };
}

// Reusable Modal Component to match TacMap
const CustomModal: React.FC<{
  isOpen: boolean;
  title: string;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmColor?: string;
}> = ({ isOpen, title, children, onConfirm, onCancel, confirmText = "OK", confirmColor = "#e60082" }) => {
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
        border: "1px solid #282828", boxShadow: `0 0 30px ${confirmColor}33`,
        width: "400px", textAlign: "center"
      }}>
        <h3 style={{ color: "#f65dfb", marginBottom: "20px", fontSize: "22px", fontWeight: "750" }}>{title}</h3>
        <div style={{ marginBottom: "25px", color: "#aaa", fontSize: "14px", lineHeight: "1.5" }}>{children}</div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button onClick={onCancel} style={{
            background: "transparent", color: "#888", border: "1px solid #444",
            padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold"
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            background: confirmColor, color: "white", border: "none",
            padding: "10px 24px", borderRadius: "6px", cursor: "pointer", 
            fontWeight: "bold", boxShadow: `0 4px 10px ${confirmColor}4d`
          }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const Saves: React.FC = () => {
  const [saves, setSaves] = useState<SavedStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const navigate = useNavigate();

  const gridLayout = "1.5fr 1fr 1fr 1.5fr"; 

  useEffect(() => {
    fetchUserSaves();
  }, []);

  const fetchUserSaves = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("Saved_Maps")
        .select(`save_id, name, created_at, Maps ( name )`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSaves(data as any || []);
    } catch (err) {
      console.error("Error fetching saves:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await supabase.from("Map_Drawings").delete().eq("save_id", deleteTarget);
      await supabase.from("Map_Assets").delete().eq("save_id", deleteTarget);
      const { error } = await supabase.from("Saved_Maps").delete().eq("save_id", deleteTarget);
      if (error) throw error;
      
      setSaves(saves.filter((s) => s.save_id !== deleteTarget));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleRowClick = (saveId: string) => {
    navigate(`/tacmap?load=${saveId}`);
  };

  return (
    <div style={{ padding: "120px 40px 40px", color: "white", backgroundColor: "#111", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "40px", fontSize: "36px", fontWeight: "750", letterSpacing: "-1px" }}>Saved Strategies</h2>

        {loading ? (
          <p style={{ color: "#888" }}>Loading your tactics...</p>
        ) : saves.length === 0 ? (
          /* Empty State View */
          <div style={{ 
            textAlign: "center", padding: "60px", background: "#161616", 
            borderRadius: "12px", border: "1px solid #282828" 
          }}>
            <p style={{ color: "#777", fontSize: "18px", marginBottom: "20px" }}>
              No saves found. Save a map in the tacmap to start strategizing.
            </p>
            <button 
              onClick={() => navigate('/tacmap')}
              style={{ background: "#e60082", color: "white", border: "none", padding: "12px 24px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              Go to TacMap
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Header Row - Only shows if there are saves */}
            <div style={{ display: "grid", gridTemplateColumns: gridLayout, padding: "12px 25px", background: "#0a0a0a", borderRadius: "8px", border: "1px solid #222", marginBottom: "5px" }}>
              <div style={{ color: "#555", fontSize: "11px", fontWeight: "bold", letterSpacing: "1px" }}>STRATEGY NAME</div>
              <div style={{ color: "#555", fontSize: "11px", fontWeight: "bold", letterSpacing: "1px" }}>MAP</div>
              <div style={{ color: "#555", fontSize: "11px", fontWeight: "bold", letterSpacing: "1px" }}>CREATED ON</div>
              <div></div>
            </div>

            {/* Strategy Items */}
            {saves.map((save) => (
              <div 
                key={save.save_id} onClick={() => handleRowClick(save.save_id)}
                style={{ 
                  display: "grid", gridTemplateColumns: gridLayout, padding: "22px 25px", background: "#161616", borderRadius: "10px", 
                  border: "1px solid #282828", cursor: "pointer", alignItems: "center", transition: "all 0.2s ease-in-out" 
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#e60082"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#282828"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "18px", letterSpacing: "0.5px" }}>{save.name}</div>
                <div style={{ color: "#e0e0e0", fontSize: "14px", fontWeight: "500" }}>{save.Maps?.name || "Unknown"}</div>
                <div style={{ color: "#777", fontSize: "12px", fontFamily: "monospace" }}>{new Date(save.created_at).toLocaleDateString()}</div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(save.save_id); }}
                    style={{ background: "transparent", color: "#ff4d4d", border: "1px solid #ff4d4d", padding: "6px 14px", borderRadius: "4px", cursor: "pointer", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#ff4d4d"; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ff4d4d"; }}
                  >
                    Delete Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <CustomModal
        isOpen={!!deleteTarget}
        title="Delete Strategy?"
        confirmText="Delete Forever"
        confirmColor="#ff4d4d"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        Are you sure you want to delete this save? This action cannot be undone!
      </CustomModal>
    </div>
  );
};

export default Saves;