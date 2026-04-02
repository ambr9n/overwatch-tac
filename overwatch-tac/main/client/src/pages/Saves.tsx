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

const Saves: React.FC = () => {
  const [saves, setSaves] = useState<SavedStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Grid sizing: 1.5fr (Name) | 1fr (Map) | 1fr (Date) | 1.5fr (Delete)
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

  const handleDelete = async (e: React.MouseEvent, saveId: string) => {
    e.stopPropagation();
    const confirmed = window.confirm("Are you sure you want to delete this save? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await supabase.from("Map_Drawings").delete().eq("save_id", saveId);
      await supabase.from("Map_Assets").delete().eq("save_id", saveId);
      const { error } = await supabase.from("Saved_Maps").delete().eq("save_id", saveId);
      if (error) throw error;
      setSaves(saves.filter((s) => s.save_id !== saveId));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
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
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Header Row */}
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
                <div style={{ fontWeight: "700", color: "#f65dfb", fontSize: "18px", letterSpacing: "0.5px" }}>{save.name}</div>
                <div style={{ color: "#e0e0e0", fontSize: "14px", fontWeight: "500" }}>{save.Maps?.name || "Unknown"}</div>
                <div style={{ color: "#777", fontSize: "12px", fontFamily: "monospace" }}>{new Date(save.created_at).toLocaleDateString()}</div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={(e) => handleDelete(e, save.save_id)}
                    style={{ background: "transparent", color: "#ff4d4d", border: "1px solid #ff4d4d", padding: "6px 14px", borderRadius: "4px", cursor: "pointer", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#ff4d4d"; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ff4d4d"; }}
                  >
                    Remove Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Saves;