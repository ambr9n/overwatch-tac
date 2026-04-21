import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialIds, setSocialIds] = useState<string[]>([]);
  const PAGE_SIZE = 10;

  const observer = useRef<IntersectionObserver | null>(null);
  const isFetchingRef = useRef(false);
  const pageRef = useRef(0);

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
  const [duplicateSave, setDuplicateSave] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamIcon, setTeamIcon] = useState("");
  
  const [userSaves, setUserSaves] = useState<any[]>([]);
  const [isSharingSave, setIsSharingSave] = useState(false);
  const [selectedSaveToShare, setSelectedSaveToShare] = useState<string>("");

  const [pendingMemberAction, setPendingMemberAction] = useState<{ 
    show: boolean; 
    userId: string; 
    username: string; 
    action: 'kick' | 'promote' | 'demote' | null 
}>({ show: false, userId: "", username: "", action: null });

  const globalFont = "'Inter', 'Segoe UI', Roboto, sans-serif";

  const extractUsername = (obj: any) => {
    if (!obj?.Users) return "Unknown";
    return Array.isArray(obj.Users) ? obj.Users[0]?.username : obj.Users?.username || "Unknown";
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const [following, followers] = await Promise.all([
          supabase.from("Follows").select("following_id").eq("follower_id", user.id),
          supabase.from("Follows").select("follower_id").eq("following_id", user.id)
        ]);
        const combined = new Set([
          ...(following.data?.map(f => f.following_id) || []),
          ...(followers.data?.map(f => f.follower_id) || [])
        ]);
        setSocialIds(Array.from(combined));
      }
    };
    init();
  }, []);

  const fetchTeams = useCallback(async (reset = false) => {
    if (isFetchingRef.current || !currentUser) return;
    isFetchingRef.current = true;
    setLoading(true);

    if (reset) {
        pageRef.current = 0;
        setHasMore(true);
    }
    
    const from = pageRef.current * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const baseQuery = supabase
        .from("Teams")
        .select(`
            team_id, name, description, profile_image_link, 
            User_Teams(user_id, role, Users(username))
        `);

    if (activeTab === "my_teams") {
      const { data: membershipData } = await supabase
        .from("User_Teams")
        .select("team_id")
        .eq("user_id", currentUser.id);

      const teamIds = membershipData?.map(m => m.team_id) || [];

      if (teamIds.length === 0) {
        setTeams([]);
        setHasMore(false);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const { data, error } = await baseQuery.in("team_id", teamIds);

      if (!error && data) {
        const processed = data.map(t => {
          const ownerEntry = t.User_Teams.find((ut: any) => ut.role === 'owner');
          return {
            ...t,
            owner_name: extractUsername(ownerEntry),
            member_count: t.User_Teams?.length || 0,
            is_member: true 
          };
        });
        setTeams(processed);
        setHasMore(false);
      }
    } else {
      let query = baseQuery.range(from, to).order('name', { ascending: true });

      if (searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        const processed = data.map(t => {
          const members = t.User_Teams || [];
          const isFriendInside = members.some((m: any) => socialIds.includes(m.user_id));
          const isMember = members.some((m: any) => m.user_id === currentUser.id);
          const ownerEntry = members.find((m: any) => m.role === 'owner');
          
          return {
            ...t,
            owner_name: extractUsername(ownerEntry),
            member_count: members.length,
            has_social: isFriendInside,
            is_member: isMember
          };
        });

        const discoverOnly = processed.filter(t => !t.is_member);
        setTeams(prev => reset ? discoverOnly : [...prev, ...discoverOnly]);
        setHasMore(data.length === PAGE_SIZE);
        pageRef.current += 1;
      }
    }
    setLoading(false);
    isFetchingRef.current = false;
  }, [activeTab, currentUser, socialIds, searchQuery]);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (activeTab !== "discover" || loading || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchTeams();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchTeams, activeTab]);

  useEffect(() => {
    if (currentUser && !selectedTeam) {
      fetchTeams(true);
    }
  }, [activeTab, currentUser, selectedTeam, searchQuery, fetchTeams]);

  const fetchUserSaves = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from("Saved_Maps")
      .select("save_id, name, description")
      .eq("user_id", currentUser.id);
    setUserSaves(data || []);
  };

  const fetchTeamData = async (team: any) => {
    if (!team?.team_id || !currentUser) return;
    
    const { data: freshTeam } = await supabase
      .from("Teams")
      .select(`team_id, name, description, profile_image_link`)
      .eq("team_id", team.team_id)
      .single();

    const { data: members } = await supabase
        .from("User_Teams")
        .select(`user_id, role, Users(username)`)
        .eq("team_id", team.team_id);
    
    const teamMembersList = members || [];
    setTeamMembers(teamMembersList);

    const myEntry = teamMembersList.find(m => m.user_id === currentUser.id);
    const ownerEntry = teamMembersList.find(m => m.role === 'owner');

    setSelectedTeam({ 
      ...freshTeam, 
      is_member: !!myEntry,
      user_role: myEntry?.role || null,
      owner_name: extractUsername(ownerEntry)
    });
    
    const { data: saves } = await supabase
      .from("Team_Saves")
      .select(`save_id, owner_id, Saved_Maps(save_id, name, description, Maps(name)), Users(username)`)
      .eq("team_id", team.team_id);

    setTeamSaves(saves?.map((s: any) => ({
      id: s.save_id,
      owner_id: s.owner_id,
      map_name: s.Saved_Maps?.name || "Untitled",
      base_map: s.Saved_Maps?.Maps?.name || "Unknown Map",
      creator: extractUsername(s)
    })) || []);
  };

  const handleMemberAction = async (targetUserId: string, action: 'kick' | 'promote' | 'demote') => {
    if (!selectedTeam) return;

    if (action === 'kick') {
      await supabase.from("User_Teams").delete().eq("team_id", selectedTeam.team_id).eq("user_id", targetUserId);
      await supabase.from("Team_Saves").delete().eq("team_id", selectedTeam.team_id).eq("owner_id", targetUserId);
    } else if (action === 'promote') {
      await supabase.from("User_Teams").update({ role: 'manager' }).eq("team_id", selectedTeam.team_id).eq("user_id", targetUserId);
    } else if (action === 'demote') {
      await supabase.from("User_Teams").update({ role: 'member' }).eq("team_id", selectedTeam.team_id).eq("user_id", targetUserId);
    }
    
    fetchTeamData(selectedTeam);
  };

  const handleShareSave = async () => {
    if (!selectedSaveToShare || !selectedTeam || !currentUser) return;
    
    const { data: existing } = await supabase
        .from("Team_Saves")
        .select("save_id")
        .eq("team_id", selectedTeam.team_id)
        .eq("save_id", selectedSaveToShare);

    if (existing && existing.length > 0) {
        setDuplicateSave(true);
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
    // Issue #4: Delete from Team_Saves specifically by team_id and save_id
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
    const { error } = await supabase.from("User_Teams").insert([{ team_id: selectedTeam.team_id, user_id: currentUser.id, role: 'member' }]);
    if (!error) {
        setIsSuccess({ show: true, msg: `Joined ${selectedTeam.name}!` });
        await fetchTeams(true); 
        await fetchTeamData({ ...selectedTeam, is_member: true }); 
    }
  };

  const confirmLeaveTeam = async () => {
    if (!selectedTeam || !currentUser) return;
    // Issue #1: Ensure clean removal from both tables and update local state to refresh the UI
    await supabase.from("Team_Saves").delete().eq("team_id", selectedTeam.team_id).eq("owner_id", currentUser.id);
    const { error } = await supabase.from("User_Teams").delete().eq("team_id", selectedTeam.team_id).eq("user_id", currentUser.id);
    
    if (!error) {
      setIsLeaving(false);
      setSelectedTeam(null);
      fetchTeams(true);
    }
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam?.team_id) return;
    const { error } = await supabase.from("Teams").update({ 
      name: teamName, 
      description: teamDesc, 
      profile_image_link: teamIcon.trim() || null 
    }).eq("team_id", selectedTeam.team_id);

    if (!error) {
      setIsSettingsOpen(false);
      fetchTeams(true);
      setSelectedTeam({...selectedTeam, name: teamName, description: teamDesc, profile_image_link: teamIcon});
      setIsSuccess({ show: true, msg: "Team updated successfully!" });
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !currentUser) return;
    
    const { data: newTeam, error: teamError } = await supabase
      .from("Teams")
      .insert([{ 
        name: teamName.trim(), 
        description: teamDesc, 
        profile_image_link: teamIcon.trim() || null
      }])
      .select()
      .single();

    if (teamError) {
        if (teamError.code === '23505') {
            setNameConflict({ show: true, name: teamName.trim() });
        }
        return;
    }

    if (newTeam) {
      const { error: memberError } = await supabase.from("User_Teams").insert([{ 
        team_id: newTeam.team_id, 
        user_id: currentUser.id, 
        role: 'owner' 
      }]);
      
      if (!memberError) {
        setIsCreating(false);
        setTeamName(""); setTeamDesc(""); setTeamIcon("");
        setIsSuccess({ show: true, msg: `Team "${newTeam.name}" created successfully!` });
        fetchTeams(true);
      }
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam?.team_id) return;
    const { error } = await supabase.from("Teams").delete().eq("team_id", selectedTeam.team_id);
    if (!error) { 
        setIsDeletingTeam(false); 
        setIsSettingsOpen(false); 
        setSelectedTeam(null); 
        setIsSuccess({ show: true, msg: "Team deleted." }); 
        fetchTeams(true); 
    }
  };

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
                <button onClick={() => navigate('/login')} style={{ background: "#f65dfb", color: "white", border: "none", padding: "12px 30px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>Login to Continue</button>
              </div>
            )}
          </div>

          {activeTab === "discover" && (
            <input type="text" placeholder="Search for teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...inputStyle, marginBottom: 25 }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {teams.map((team, index) => (
              <div 
                key={team.team_id} 
                ref={index === teams.length - 1 ? lastElementRef : null}
                onClick={() => fetchTeamData(team)} 
                onMouseEnter={() => setHoveredTeamId(team.team_id)} 
                onMouseLeave={() => setHoveredTeamId(null)} 
                style={{ background: "#0a0a0a", border: hoveredTeamId === team.team_id ? "1px solid #f65dfb" : "1px solid #1a1a1a", padding: "20px 25px", borderRadius: 12, display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer' }}
              >
                {team.profile_image_link && <img src={team.profile_image_link} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} alt="Team Icon" />}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, color: '#f65dfb' }}>{team.name}</h3>
                  {team.has_social && activeTab === 'discover' && (
                    <span style={{ fontSize: 9, background: '#f65dfb22', color: '#f65dfb', padding: '2px 6px', borderRadius: 4, fontWeight: 800, verticalAlign: 'middle', marginLeft: 8 }}>SOCIAL MATCH</span>
                  )}
                  <p style={{ color: '#666', fontSize: 13, margin: '4px 0' }}>{team.description || "No description."}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#444', fontWeight: 800 }}>{team.member_count} MEMBERS</div>
                    <div style={{ fontSize: 10, color: '#f65dfb', fontWeight: 700, marginTop: 4 }}>OWNER: {team.owner_name}</div>
                </div>
              </div>
            ))}
            {loading && <p style={{ textAlign: 'center', color: '#666' }}>Loading...</p>}
            {!loading && teams.length === 0 && <p style={{ textAlign: 'center', color: '#444', marginTop: 40 }}>No teams found.</p>}
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
                    <p style={{ color: '#888', fontSize: 14 }}>Owned by <span style={{ color: '#f65dfb' }}>{selectedTeam.owner_name}</span></p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setIsViewingMembers(true)} style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Members</button>
                  {!selectedTeam.is_member ? (
                     <button onClick={handleJoinTeam} style={{ background: '#f65dfb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Join Team</button>
                  ) : (
                    <>
                      {(selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'manager') && (
                        <button onClick={() => { setTeamName(selectedTeam.name); setTeamDesc(selectedTeam.description || ""); setTeamIcon(selectedTeam.profile_image_link || ""); setIsSettingsOpen(true); }} style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' }}>⚙️</button>
                      )}
                      {selectedTeam.user_role !== 'owner' && (
                        <button onClick={() => setIsLeaving(true)} style={{ background: '#331111', border: '1px solid #552222', color: '#ff4d4d', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Leave Team</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          {selectedTeam.is_member && (
            <div style={{ maxWidth: 1200, margin: "50px auto", padding: "0 40px" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>Team Strategies</h2>
                <button onClick={() => { fetchUserSaves(); setIsSharingSave(true); }} style={{ background: '#f65dfb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>+ Share Strategy</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: "25px" }}>
                {teamSaves.map((save) => (
                  <div 
                    key={save.id} 
                    onMouseEnter={() => setHoveredSaveId(save.id)}
                    onMouseLeave={() => setHoveredSaveId(null)}
                    style={{ 
                      background: '#111', 
                      border: hoveredSaveId === save.id ? '1px solid #f65dfb' : '1px solid #222', 
                      borderRadius: 12, 
                      padding: 20,
                      transition: 'all 0.2s ease-in-out',
                      transform: hoveredSaveId === save.id ? 'translateY(-5px)' : 'translateY(0)',
                      cursor: 'default'
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <h3 style={{ margin: 0, color: "#f65dfb" }}>{save.map_name}</h3>
                      {(selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'manager' || save.owner_id === currentUser.id) && (
                        <button 
                          onClick={() => setIsDeletingSave({ show: true, saveId: save.id })} 
                          style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: '18px' }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#666", marginBottom: 5 }}>{save.base_map}</p>
                    <p style={{ fontSize: 11, color: "#444", fontStyle: 'italic' }}>Shared by {save.creator}</p>
                    <button 
                      onClick={() => navigate(`/tacmap?load=${save.id}`)} 
                      style={{ 
                        width: "100%", 
                        marginTop: 15, 
                        background: hoveredSaveId === save.id ? "#f65dfb" : "none", 
                        border: "1px solid #f65dfb", 
                        color: hoveredSaveId === save.id ? "white" : "#f65dfb", 
                        padding: 8, 
                        borderRadius: 6, 
                        cursor: "pointer",
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      View Strategy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isSharingSave && (
        <ModalShell title="Share Strategy" onClose={() => setIsSharingSave(false)} onConfirm={handleShareSave} confirmText="Share with Team" globalFont={globalFont}>
          <label style={labelStyle}>Select from your saves</label>
          <select value={selectedSaveToShare} onChange={(e) => setSelectedSaveToShare(e.target.value)} style={{ ...inputStyle }}>
            <option value="">-- Select Save --</option>
            {userSaves.map(s => <option key={s.save_id} value={s.save_id}>{s.name}</option>)}
          </select>
        </ModalShell>
      )}

      {duplicateSave && (
        <ModalShell title="Already Shared" onClose={() => setDuplicateSave(false)} showButtons={false} globalFont={globalFont} isDelete={true}>
          <p style={{ color: '#888', textAlign: 'center' }}>This strategy is already shared with the team.</p>
        </ModalShell>
      )}

      {isDeletingSave.show && (
        <ModalShell title="Unshare Strategy?" onClose={() => setIsDeletingSave({ show: false, saveId: null })} onConfirm={handleDeleteSharedSave} confirmText="Remove from Team" isDelete={true} globalFont={globalFont}>
          <p style={{ color: '#888', textAlign: 'center' }}>Are you sure you want to unshare this strategy?</p>
        </ModalShell>
      )}

      {isSuccess.show && (
        <ModalShell title="Success" onClose={() => setIsSuccess({ show: false, msg: "" })} showButtons={false} globalFont={globalFont}>
          <p style={{ color: '#888', textAlign: 'center' }}>{isSuccess.msg}</p>
        </ModalShell>
      )}

      {isLeaving && (
        <ModalShell title="Leave Team?" onClose={() => setIsLeaving(false)} onConfirm={confirmLeaveTeam} confirmText="Leave" isDelete={true} globalFont={globalFont}>
            <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.5' }}>Are you sure you want to leave <b>{selectedTeam.name}</b>?</p>
        </ModalShell>
      )}

      {isViewingMembers && (
        <ModalShell title="Members" onClose={() => setIsViewingMembers(false)} showButtons={false} globalFont={globalFont}>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {teamMembers.map((m) => {
               const memberUsername = extractUsername(m);
               const isTargetOwner = m.role === 'owner';
               const isTargetManager = m.role === 'manager';
               const canIKick = (selectedTeam.user_role === 'owner' && m.user_id !== currentUser.id) || 
                                (selectedTeam.user_role === 'manager' && !isTargetOwner && !isTargetManager);

               return (
                <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 10px', borderBottom: '1px solid #222' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{memberUsername}</div>
                    <div style={{ color: isTargetOwner ? '#f65dfb' : '#666', fontSize: 10, fontWeight: 800 }}>
                      {m.role?.toUpperCase()}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selectedTeam.user_role === 'owner' && !isTargetOwner && (
                      <button 
                        onClick={() => setPendingMemberAction({ 
                          show: true, 
                          userId: m.user_id, 
                          username: memberUsername, 
                          action: isTargetManager ? 'demote' : 'promote' 
                        })}
                        style={{ background: '#222', border: '1px solid #333', color: '#f65dfb', fontSize: 10, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                      >
                        {isTargetManager ? 'DEMOTE' : 'PROMOTE'}
                      </button>
                    )}
                    {canIKick && (
                      <button 
                        onClick={() => setPendingMemberAction({ 
                          show: true, 
                          userId: m.user_id, 
                          username: memberUsername, 
                          action: 'kick' 
                        })}
                        style={{ background: '#331111', border: 'none', color: '#ff4d4d', fontSize: 10, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                      >
                        KICK
                      </button>
                    )}
                  </div>
                </div>
               );
            })}
          </div>
        </ModalShell>
      )}
      
      {isSettingsOpen && (
        <ModalShell title="Team Settings" onClose={() => setIsSettingsOpen(false)} onConfirm={handleUpdateTeam} confirmText="Save Changes" globalFont={globalFont}>
          <label style={labelStyle}>Team Name</label>
          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" style={inputStyle} />
          <label style={labelStyle}>Team Description</label>
          <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} style={{ ...inputStyle, height: 80, resize: 'none' }} />
          <label style={labelStyle}>Team Icon (URL)</label>
          <input type="text" value={teamIcon} onChange={e => setTeamIcon(e.target.value)} placeholder="Icon URL" style={inputStyle} />
          
          {selectedTeam.user_role === 'owner' && (
            <button onClick={() => setIsDeletingTeam(true)} style={{ width: '100%', background: '#331111', color: '#ff4d4d', border: '1px solid #552222', padding: 12, borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginTop: 25 }}>Delete Team</button>
          )}
        </ModalShell>
      )}

      {pendingMemberAction.show && (
        <ModalShell 
          title={`${pendingMemberAction.action?.toUpperCase()} User?`} 
          onClose={() => setPendingMemberAction({ show: false, userId: "", username: "", action: null })} 
          onConfirm={() => {
            handleMemberAction(pendingMemberAction.userId, pendingMemberAction.action!);
            setPendingMemberAction({ show: false, userId: "", username: "", action: null });
          }} 
          confirmText="Confirm" 
          isDelete={pendingMemberAction.action === 'kick'} 
          globalFont={globalFont}
        >
          <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.5' }}>
            Are you sure you want to <b>{pendingMemberAction.action}</b> 
            <span style={{ color: '#f65dfb' }}> {pendingMemberAction.username}</span>?
          </p>
        </ModalShell>
      )}

      {isDeletingTeam && (
        <ModalShell title="Delete Team?" onClose={() => setIsDeletingTeam(false)} onConfirm={handleDeleteTeam} confirmText="Delete Forever" isDelete={true} globalFont={globalFont}>
            <p style={{ color: '#888', textAlign: 'center' }}>Are you sure you want to delete <b>{selectedTeam.name}</b>?</p>
        </ModalShell>
      )}

      {isCreating && (
        <ModalShell title="New Team" onClose={() => setIsCreating(false)} onConfirm={handleCreateTeam} confirmText="Create Team" globalFont={globalFont}>
          <label style={labelStyle}>Team Name</label>
          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" style={inputStyle} />
          <label style={labelStyle}>Team Description</label>
          <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Description" style={{ ...inputStyle, height: 80, resize: 'none' }} />
          <label style={labelStyle}>Team Icon (URL)</label>
          <input type="text" value={teamIcon} onChange={e => setTeamIcon(e.target.value)} placeholder="Icon URL" style={inputStyle} />
        </ModalShell>
      )}

      {nameConflict.show && (
        <ModalShell title="Name Taken" onClose={() => setNameConflict({ show: false, name: "" })} showButtons={false} globalFont={globalFont} isDelete={true}>
          <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.6' }}>The team name "<b>{nameConflict.name}</b>" is already in use.</p>
        </ModalShell>
      )}
    </div>
  );
}