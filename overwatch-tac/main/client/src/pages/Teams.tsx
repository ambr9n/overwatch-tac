import React, { useEffect, useState } from "react";
import { supabase } from "../Supabase";
import { useNavigate } from "react-router-dom";

const ModalShell = ({ title, children, onClose, onConfirm, confirmText, isDelete = false, showButtons = true, globalFont }: any) => (
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

export default function Teams() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"my_teams" | "discover">("my_teams");
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamSaves, setTeamSaves] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const [hoveredSaveId, setHoveredSaveId] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isViewingMembers, setIsViewingMembers] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeletingSave, setIsDeletingSave] = useState<{ show: boolean; saveId: string | null }>({ show: false, saveId: null });
  const [isSuccess, setIsSuccess] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });
  const [nameConflict, setNameConflict] = useState<{ show: boolean; name: string }>({ show: false, name: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamIcon, setTeamIcon] = useState("");

  const [userSaves, setUserSaves] = useState<any[]>([]);
  const [isSharingSave, setIsSharingSave] = useState(false);
  const [selectedSaveToShare, setSelectedSaveToShare] = useState<string>("");

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

  const fetchUserSaves = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from("Saved_Maps")
      .select("save_id, name, description")
      .eq("user_id", currentUser.id);
    setUserSaves(data || []);
  };

  const fetchTeamData = async (team: any) => {
    if (!team?.team_id) return;
    
    const { data: freshTeam } = await supabase
      .from("Teams")
      .select(`team_id, name, description, profile_image_link, owner_id, Users!Teams_owner_id_fkey(username)`)
      .eq("team_id", team.team_id)
      .single();

    setSelectedTeam({ ...freshTeam, is_member: team.is_member });
    
    const { data: saves } = await supabase
      .from("Team_Saves")
      .select(`
        save_id, 
        Saved_Maps(save_id, name, description, map_id, Maps(name)), 
        Users(username)
      `)
      .eq("team_id", team.team_id);

    setTeamSaves(saves?.map((s: any) => ({
      id: s.save_id,
      map_name: s.Saved_Maps?.name || "Untitled",
      base_map: s.Saved_Maps?.Maps?.name || "Unknown Map",
      creator: s.Users?.username || "Unknown",
      description: s.Saved_Maps?.description || ""
    })) || []);

    const { data: members } = await supabase
        .from("User_Teams")
        .select(`user_id, Users(username)`)
        .eq("team_id", team.team_id);
    
    setTeamMembers(members || []);
  };

  const handleShareSave = async () => {
    if (!selectedSaveToShare || !selectedTeam || !currentUser) return;

    const { data: existing } = await supabase
      .from("Team_Saves")
      .select("save_id")
      .eq("team_id", selectedTeam.team_id)
      .eq("save_id", selectedSaveToShare)
      .maybeSingle();

    if (existing) {
      setIsSuccess({ show: true, msg: "This save is already shared!" });
      return;
    }

    const { error } = await supabase.from("Team_Saves").insert([{
      team_id: selectedTeam.team_id,
      save_id: selectedSaveToShare,
      owner_id: currentUser.id
    }]);

    if (!error) {
      setIsSharingSave(false);
      setSelectedSaveToShare("");
      setIsSuccess({ show: true, msg: "Save shared with the team!" });
      fetchTeamData(selectedTeam);
    }
  };

  const handleDeleteSharedSave = async () => {
    if (!isDeletingSave.saveId || !selectedTeam) return;

    const { error } = await supabase
      .from("Team_Saves")
      .delete()
      .eq("save_id", isDeletingSave.saveId)
      .eq("team_id", selectedTeam.team_id);
    
    if (!error) {
      setIsDeletingSave({ show: false, saveId: null });
      fetchTeamData(selectedTeam);
    }
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
    }
  };

  const confirmLeaveTeam = async () => {
    if (!selectedTeam || !currentUser) return;
    await supabase.from("Team_Saves").delete().eq("team_id", selectedTeam.team_id).eq("owner_id", currentUser.id);
    await supabase.from("User_Teams").delete().eq("team_id", selectedTeam.team_id).eq("user_id", currentUser.id);
    setIsLeaving(false);
    setSelectedTeam(null);
    fetchTeams();
  };

  const checkNameAvailability = async (name: string, excludeId?: string) => {
    let query = supabase.from("Teams").select("team_id").ilike("name", name.trim());
    if (excludeId) query = query.neq("team_id", excludeId);
    const { data } = await query;
    return data && data.length > 0;
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam?.team_id) return;

    const isTaken = await checkNameAvailability(teamName, selectedTeam.team_id);
    if (isTaken) {
      setNameConflict({ show: true, name: teamName.trim() });
      return;
    }
    const finalIcon = teamIcon.trim() === "" ? null : teamIcon.trim();
    const { error } = await supabase.from("Teams")
      .update({ name: teamName, description: teamDesc, profile_image_link: finalIcon })
      .eq("team_id", selectedTeam.team_id);
    
    if (!error) {
      setIsSettingsOpen(false);
      fetchTeams();
      setSelectedTeam({...selectedTeam, name: teamName, description: teamDesc, profile_image_link: finalIcon});
      setIsSuccess({ show: true, msg: "Team updated successfully!" });
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !currentUser) return;

    const isTaken = await checkNameAvailability(teamName);
    if (isTaken) {
      setNameConflict({ show: true, name: teamName.trim() });
      return;
    }
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
      setIsSuccess({ show: true, msg: `Team "${teamName.trim()}" created!` });
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam?.team_id) return;
    const { error } = await supabase.from("Teams").delete().eq("team_id", selectedTeam.team_id);
    if (!error) {
      setIsDeletingTeam(false);
      setIsSettingsOpen(false);
      setSelectedTeam(null);
      setIsSuccess({ show: true, msg: "Team deleted successfully." });
      fetchTeams();
    }
  };

  const myTeams = teams.filter(t => t.is_member);
  const discoverTeams = teams.filter(t => !t.is_member && t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const inputStyle = { width: '100%', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: 12, borderRadius: 6, marginBottom: 15 };
  const labelStyle = { display: 'block', color: '#666', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' as const };

  return (
    <div style={{ width: "100%", minHeight: "100vh", color: "white", fontFamily: globalFont }}>
      {!selectedTeam ? (
        <div style={{ maxWidth: 1000, margin: "100px auto", padding: "0 20px" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            {currentUser ? (
            <>
              <div style={{ display: 'flex', gap: 30 }}>
                <h1 onClick={() => setActiveTab("my_teams")} style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer', color: activeTab === "my_teams" ? "white" : "#333" }}>My Teams</h1>
                <h1 onClick={() => setActiveTab("discover")} style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer', color: activeTab === "discover" ? "white" : "#333" }}>Discover</h1>
              </div>
              <button onClick={() => { setTeamName(""); setTeamDesc(""); setTeamIcon(""); setIsCreating(true); }} style={{ background: "#f65dfb", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>+ Create Team</button>
            </>
            ) : (
              <div style={{ width: '100%', textAlign: 'center', padding: '40px 0' }}>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', fontWeight: 900 }}>Teams</h1>
                <p style={{ color: '#666', marginBottom: 25 }}>Log in to make and join teams with others</p>
                <button 
                  onClick={() => navigate('/login')} 
                  style={{ background: "#f65dfb", color: "white", border: "none", padding: "12px 30px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
                >
                  Login to Continue
                </button>
              </div>
            )}
          </div>

          {activeTab === "discover" && (
            <input type="text" placeholder="Search for teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...inputStyle, marginBottom: 25 }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {(activeTab === "my_teams" ? myTeams : discoverTeams).map(team => (
              <div key={team.team_id} onClick={() => fetchTeamData(team)} onMouseEnter={() => setHoveredTeamId(team.team_id)} onMouseLeave={() => setHoveredTeamId(null)} style={{ background: "#0a0a0a", border: hoveredTeamId === team.team_id ? "1px solid #f65dfb" : "1px solid #1a1a1a", padding: "20px 25px", borderRadius: 12, display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer' }}>
                {team.profile_image_link && (
                    <img src={team.profile_image_link} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} alt="Team Icon" />
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
                    <img src={selectedTeam.profile_image_link} style={{ width: 100, height: 100, borderRadius: 15, objectFit: 'cover' }} alt="Team Profile" />
                  )}
                  <div>
                    <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 900 }}>{selectedTeam.name}</h1>
                    <p style={{ color: '#aaa', margin: '5px 0 10px 0', fontSize: '1.1rem' }}>{selectedTeam.description || "No team description provided."}</p>
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

          {selectedTeam.is_member && (
            <div style={{ maxWidth: 1200, margin: "50px auto", padding: "0 40px" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>Team Strategies</h2>
                <button 
                  onClick={() => { fetchUserSaves(); setIsSharingSave(true); }}
                  style={{ background: '#f65dfb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  + Share Strategy
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: "25px" }}>
                {teamSaves.map((save) => {
                  const isHovered = hoveredSaveId === save.id;
                  return (
                    <div 
                      key={save.id} 
                      onMouseEnter={() => setHoveredSaveId(save.id)}
                      onMouseLeave={() => setHoveredSaveId(null)}
                      style={{ 
                        background: '#111', 
                        border: isHovered ? '1px solid #f65dfb' : '1px solid #222', 
                        borderRadius: 12, 
                        overflow: 'hidden',
                        transition: 'all 0.2s ease-in-out',
                        transform: isHovered ? 'translateY(-5px)' : 'none',
                        boxShadow: isHovered ? '0 10px 20px rgba(0,0,0,0.4)' : 'none'
                      }}
                    >
                      <div style={{ padding: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "#f65dfb" }}>{save.map_name}</h3>
                            <p style={{ margin: "5px 0 0 0", fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>{save.base_map}</p>
                          </div>
                          {(currentUser?.id === selectedTeam.owner_id || currentUser?.username === save.owner_id) && (
                            <button 
                              onClick={() => setIsDeletingSave({ show: true, saveId: save.id })}
                              style={{ background: "transparent", border: "none", color: "#ff0000", cursor: "pointer", fontSize: "18px", padding: 0 }}
                            >
                              x
                            </button>
                          )}
                        </div>
                        
                        <p style={{ color: "#aaa", fontSize: "13px", lineHeight: "1.4", margin: "0 0 20px 0", minHeight: "40px" }}>
                           Shared by <span style={{ color: "#f65dfb", fontWeight: "600" }}>{save.creator}</span>
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <button 
                            onClick={() => navigate(`/tacmap?load=${save.id}`)}
                            style={{ 
                              width: "100%", 
                              background: isHovered ? "#f65dfb" : "transparent", 
                              color: isHovered ? "white" : "#f65dfb",
                              border: "1px solid #f65dfb",
                              padding: "10px", 
                              borderRadius: "6px", 
                              fontWeight: "800", 
                              fontSize: "12px",
                              cursor: "pointer",
                              transition: "0.2s",
                              textTransform: "uppercase"
                            }}
                          >
                            View Strategy
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {teamSaves.length === 0 && (
                <div style={{ textAlign: "center", padding: "100px 0", color: "#444" }}>
                  <p style={{ fontSize: "1.2rem", fontWeight: "700" }}>No strategies shared yet.</p>
                  <p>Be the first to share a plan with the team!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isSharingSave && (
        <ModalShell title="Share Strategy" onClose={() => setIsSharingSave(false)} onConfirm={handleShareSave} confirmText="Share with Team" globalFont={globalFont}>
          <label style={labelStyle}>Select from your saves</label>
          <select 
            value={selectedSaveToShare} 
            onChange={(e) => setSelectedSaveToShare(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="">-- Choose a Strategy --</option>
            {userSaves.map(s => (
              <option key={s.save_id} value={s.save_id}>{s.name}</option>
            ))}
          </select>
          <p style={{ color: '#666', fontSize: 12, marginTop: 10 }}>Select a personal save to make it visible to all team members.</p>
        </ModalShell>
      )}

      {isDeletingSave.show && (
        <ModalShell title="Unshare Strategy?" onClose={() => setIsDeletingSave({ show: false, saveId: null })} onConfirm={handleDeleteSharedSave} confirmText="Remove from Team" isDelete={true} globalFont={globalFont}>
          <p style={{ color: '#888', textAlign: 'center' }}>Are you sure you want to unshare this strategy? It will no longer be visible to team members.</p>
        </ModalShell>
      )}

      {isSuccess.show && (
        <ModalShell title="Success" onClose={() => setIsSuccess({ show: false, msg: "" })} showButtons={false} globalFont={globalFont}>
          <p style={{ color: '#888', textAlign: 'center' }}>{isSuccess.msg}</p>
        </ModalShell>
      )}

      {isLeaving && (
        <ModalShell title="Leave Team?" onClose={() => setIsLeaving(false)} onConfirm={confirmLeaveTeam} confirmText="Leave" isDelete={true} globalFont={globalFont}>
            <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.5' }}>Are you sure you want to leave <b>{selectedTeam.name}</b>? All strategies you've shared with this team will be removed.</p>
        </ModalShell>
      )}

      {isViewingMembers && (
        <ModalShell title="Members" onClose={() => setIsViewingMembers(false)} showButtons={false} globalFont={globalFont}>
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
        <ModalShell title="Team Settings" onClose={() => setIsSettingsOpen(false)} onConfirm={handleUpdateTeam} confirmText="Save Changes" globalFont={globalFont}>
          <label style={labelStyle}>Team Name</label>
          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" style={inputStyle} />
          <label style={labelStyle}>Team Description (optional)</label>
          <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Description" style={{ ...inputStyle, height: 80, resize: 'none' }} />
          <label style={labelStyle}>Team Profile Picture (optional)</label>
          <input type="text" value={teamIcon} onChange={e => setTeamIcon(e.target.value)} placeholder="Profile Picture URL" style={{ ...inputStyle, marginBottom: 0 }} />
          <button onClick={() => setIsDeletingTeam(true)} style={{ width: '100%', background: '#331111', color: '#ff4d4d', border: '1px solid #552222', padding: 12, borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginTop: 25 }}>Delete Team</button>
        </ModalShell>
      )}

      {isDeletingTeam && (
        <ModalShell title="Delete Team?" onClose={() => setIsDeletingTeam(false)} onConfirm={handleDeleteTeam} confirmText="Delete Forever" isDelete={true} globalFont={globalFont}>
            <p style={{ color: '#888', textAlign: 'center' }}>This action is permanent. Are you sure you want to delete <b>{selectedTeam.name}</b>?</p>
        </ModalShell>
      )}

      {isCreating && (
        <ModalShell title="New Team" onClose={() => setIsCreating(false)} onConfirm={handleCreateTeam} confirmText="Create Team" globalFont={globalFont}>
          <label style={labelStyle}>Team Name</label>
          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" style={inputStyle} />
          <label style={labelStyle}>Description</label>
          <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Description" style={{ ...inputStyle, height: 80, resize: 'none' }} />
          <label style={labelStyle}>Icon URL</label>
          <input type="text" value={teamIcon} onChange={e => setTeamIcon(e.target.value)} placeholder="Icon URL" style={{ ...inputStyle, marginBottom: 0 }} />
        </ModalShell>
      )}

      {nameConflict.show && (
        <ModalShell title="Name Taken" onClose={() => setNameConflict({ show: false, name: "" })} showButtons={false} globalFont={globalFont} isDelete={true}>
          <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.6' }}>The team name "<b>{nameConflict.name}</b>" is already in use. Please choose a unique name for your team.</p>
        </ModalShell>
      )}
    </div>
  );
}