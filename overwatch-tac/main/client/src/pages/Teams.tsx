import React, { useEffect, useState } from "react";
import { supabase } from "../Supabase";

export default function Teams() {
  const [activeTab, setActiveTab] = useState<"my_teams" | "discover">("my_teams");
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamSaves, setTeamSaves] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isViewingMembers, setIsViewingMembers] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamIcon, setTeamIcon] = useState("");

  const globalFont = "'Inter', 'Segoe UI', Roboto, sans-serif";

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      fetchTeams(user?.id);
    };
    init();
  }, []);

  const fetchTeams = async (userId?: string) => {
    const idToUse = userId || currentUser?.id;
    const { data: teamsData } = await supabase
      .from("Teams")
      .select(`
        team_id, name, description, profile_image_link, owner_id, 
        Users!Teams_owner_id_fkey(username), 
        User_Teams(user_id)
      `);

    if (teamsData) {
      setTeams(teamsData.map(t => {
        const isOwner = t.owner_id === idToUse;
        const isMemberOfBridge = t.User_Teams?.some((ut: any) => ut.user_id === idToUse);
        return {
          ...t,
          member_count: t.User_Teams?.length || 0,
          is_member: isOwner || isMemberOfBridge 
        };
      }));
    }
  };

  const fetchTeamData = async (team: any) => {
    if (!team?.team_id) return;
    
    // We update the local selectedTeam reference to ensure is_member status is fresh
    const { data: freshTeam } = await supabase
      .from("Teams")
      .select(`team_id, name, description, profile_image_link, owner_id, Users!Teams_owner_id_fkey(username)`)
      .eq("team_id", team.team_id)
      .single();

    setSelectedTeam({ ...freshTeam, is_member: team.is_member });
    
    const { data: saves } = await supabase
      .from("Team_Saves")
      .select(`save_id, Saved_Maps(save_id, name, description, map_id), Users(username)`)
      .eq("team_id", team.team_id);

    setTeamSaves(saves?.map((s: any) => ({
      id: s.save_id,
      map_name: s.Saved_Maps?.name || "Untitled",
      creator: s.Users?.username || "Unknown",
      description: s.Saved_Maps?.description || ""
    })) || []);

    const { data: members } = await supabase
        .from("User_Teams")
        .select(`user_id, Users(username)`)
        .eq("team_id", team.team_id);
    
    setTeamMembers(members || []);
  };

  const handleJoinTeam = async () => {
    if (!currentUser || !selectedTeam) return;

    const { error } = await supabase.from("User_Teams").insert([{ 
        team_id: selectedTeam.team_id, 
        user_id: currentUser.id 
    }]);

    if (!error) {
        setIsSuccess({ show: true, msg: `Joined ${selectedTeam.name}!` });
        await fetchTeams(); 
        await fetchTeamData({ ...selectedTeam, is_member: true }); 
    } else {
        alert("Error joining team: " + error.message);
    }
  };

  const confirmLeaveTeam = async () => {
    if (!selectedTeam || !currentUser) return;
    await supabase.from("Team_Saves").delete().eq("team_id", selectedTeam.team_id).eq("user_id", currentUser.id);
    await supabase.from("User_Teams").delete().eq("team_id", selectedTeam.team_id).eq("user_id", currentUser.id);
    setIsLeaving(false);
    setSelectedTeam(null);
    fetchTeams();
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam?.team_id) return;
    const finalIcon = teamIcon.trim() === "" ? null : teamIcon.trim();
    const { error } = await supabase.from("Teams")
      .update({ name: teamName, description: teamDesc, profile_image_link: finalIcon })
      .eq("team_id", selectedTeam.team_id);
    
    if (!error) {
      setIsSettingsOpen(false);
      fetchTeams();
      setSelectedTeam({...selectedTeam, name: teamName, description: teamDesc, profile_image_link: finalIcon});
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !currentUser) return;
    const finalIcon = teamIcon.trim() === "" ? null : teamIcon.trim();
    const { data: newTeam } = await supabase.from("Teams").insert([{ 
      name: teamName.trim(), 
      description: teamDesc, 
      profile_image_link: finalIcon, 
      owner_id: currentUser.id 
    }]).select().single();

    if (newTeam) {
      await supabase.from("User_Teams").insert([{ team_id: newTeam.team_id, user_id: currentUser.id }]);
      setIsCreating(false);
      fetchTeams();
    }
  };

  const myTeams = teams.filter(t => t.is_member);
  const discoverTeams = teams.filter(t => !t.is_member && t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const ModalShell = ({ title, children, onClose, onConfirm, confirmText, isDelete = false, showButtons = true }: any) => (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ background: '#111', padding: 35, borderRadius: 12, border: `2px solid ${isDelete ? '#ff4d4d' : '#f65dfb'}`, width: '450px', fontFamily: globalFont }}>
        <h2 style={{ margin: '0 0 25px 0', textAlign: "center", color: isDelete ? '#ff4d4d' : '#f65dfb', fontWeight: 800 }}>{title}</h2>
        {children}
        <div style={{ display: 'flex', gap: 15, marginTop: 25 }}>
          {showButtons ? (
            <>
              <button onClick={onConfirm} style={{ flex: 1, background: isDelete ? '#ff4d4d' : '#f65dfb', color: 'white', border: 'none', padding: '14px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>{confirmText}</button>
              <button onClick={onClose} style={{ flex: 1, background: '#222', color: 'white', border: 'none', padding: '14px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            </>
          ) : (
            <button onClick={onClose} style={{ width: '100%', background: '#222', color: 'white', border: 'none', padding: '14px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", minHeight: "100vh", color: "white", fontFamily: globalFont }}>
      {!selectedTeam ? (
        <div style={{ maxWidth: 1000, margin: "100px auto", padding: "0 20px" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <div style={{ display: 'flex', gap: 30 }}>
              <h1 onClick={() => setActiveTab("my_teams")} style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer', color: activeTab === "my_teams" ? "white" : "#333" }}>My Teams</h1>
              <h1 onClick={() => setActiveTab("discover")} style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer', color: activeTab === "discover" ? "white" : "#333" }}>Discover</h1>
            </div>
            <button onClick={() => { setTeamName(""); setTeamDesc(""); setTeamIcon(""); setIsCreating(true); }} style={{ background: "#f65dfb", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>+ Create Team</button>
          </div>

          {activeTab === "discover" && (
            <input type="text" placeholder="Search for teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '15px', borderRadius: 8, color: 'white', marginBottom: 25 }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {(activeTab === "my_teams" ? myTeams : discoverTeams).map(team => (
              <div key={team.team_id} onClick={() => fetchTeamData(team)} onMouseEnter={() => setHoveredTeamId(team.team_id)} onMouseLeave={() => setHoveredTeamId(null)} style={{ background: "#0a0a0a", border: hoveredTeamId === team.team_id ? "1px solid #f65dfb" : "1px solid #1a1a1a", padding: "20px 25px", borderRadius: 12, display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer' }}>
                {team.profile_image_link && (
                    <img src={team.profile_image_link} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, color: '#f65dfb' }}>{team.name}</h3>
                  <p style={{ color: '#666', fontSize: 13, margin: '4px 0' }}>{team.description || "No description."}</p>
                </div>
                <div style={{ fontSize: 10, color: '#444', fontWeight: 800 }}>{team.member_count} MEMBERS</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ width: "100%", background: "linear-gradient(to bottom, #111, #000)", borderBottom: "1px solid #222", padding: "100px 0 50px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
              <button onClick={() => setSelectedTeam(null)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginBottom: 20, fontWeight: 700 }}>← BACK</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 25, alignItems: 'center' }}>
                  {selectedTeam.profile_image_link && (
                    <img src={selectedTeam.profile_image_link} style={{ width: 100, height: 100, borderRadius: 15 }} />
                  )}
                  <div>
                    <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 900 }}>{selectedTeam.name}</h1>
                    <p style={{ color: '#888', fontSize: 14 }}>Owned by <span style={{ color: '#f65dfb' }}>{selectedTeam.Users?.username || "Unknown"}</span></p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setIsViewingMembers(true)} style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Members</button>
                  
                  {!selectedTeam.is_member ? (
                     <button onClick={handleJoinTeam} style={{ background: '#f65dfb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Join Team</button>
                  ) : (
                    currentUser?.id === selectedTeam.owner_id ? (
                        <button onClick={() => { setTeamName(selectedTeam.name); setTeamDesc(selectedTeam.description || ""); setTeamIcon(selectedTeam.profile_image_link || ""); setIsSettingsOpen(true); }} style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' }}>⚙️</button>
                      ) : (
                        <button onClick={() => setIsLeaving(true)} style={{ background: '#331111', border: '1px solid #552222', color: '#ff4d4d', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Leave Team</button>
                      )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSuccess.show && (
        <ModalShell title="Success" onClose={() => setIsSuccess({ show: false, msg: "" })} showButtons={false}>
          <p style={{ color: '#888', textAlign: 'center' }}>{isSuccess.msg}</p>
        </ModalShell>
      )}

      {isLeaving && (
        <ModalShell title="Leave Team?" onClose={() => setIsLeaving(false)} onConfirm={confirmLeaveTeam} confirmText="Leave" isDelete={true}>
            <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.5' }}>Are you sure you want to leave <b>{selectedTeam.name}</b>? All strategies you've shared with this team will be removed.</p>
        </ModalShell>
      )}

      {isViewingMembers && (
        <ModalShell title="Members" onClose={() => setIsViewingMembers(false)} showButtons={false}>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {teamMembers.map((m) => (
              <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 10px', borderBottom: '1px solid #222' }}>
                <span style={{ fontWeight: 600 }}>{m.Users?.username}</span>
                <span style={{ color: m.user_id === selectedTeam.owner_id ? '#f65dfb' : '#666', fontSize: 10, fontWeight: 800 }}>{m.user_id === selectedTeam.owner_id ? "OWNER" : "MEMBER"}</span>
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {isSettingsOpen && (
        <ModalShell title="Team Settings" onClose={() => setIsSettingsOpen(false)} onConfirm={handleUpdateTeam} confirmText="Save Changes">
          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: 12, borderRadius: 6, marginBottom: 15 }} />
          <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Description" style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: 12, borderRadius: 6, marginBottom: 15, height: 80, resize: 'none' }} />
          <input type="text" value={teamIcon} onChange={e => setTeamIcon(e.target.value)} placeholder="Icon URL" style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: 12, borderRadius: 6 }} />
        </ModalShell>
      )}

      {isCreating && (
        <ModalShell title="New Team" onClose={() => setIsCreating(false)} onConfirm={handleCreateTeam} confirmText="Create Team">
          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: 12, borderRadius: 6, marginBottom: 15 }} />
          <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Description" style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: 12, borderRadius: 6, marginBottom: 15, height: 80, resize: 'none' }} />
          <input type="text" value={teamIcon} onChange={e => setTeamIcon(e.target.value)} placeholder="Icon URL" style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: 12, borderRadius: 6 }} />
        </ModalShell>
      )}
    </div>
  );
}