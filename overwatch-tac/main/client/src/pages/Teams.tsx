import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../Supabase";
import { useNavigate } from "react-router-dom";

const ModalShell = ({ title, children, onClose, onConfirm, confirmText, isDelete = false, showButtons = true, globalFont, zIndex = 2000 }: any) => (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: zIndex }}>
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
  const [activeTab, setActiveTab] = useState<"my_teams" | "discover" | "invites">("my_teams");
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
  const [authChecked, setAuthChecked] = useState(false);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const [hoveredSaveId, setHoveredSaveId] = useState<string | null>(null);

  const LIMITS = { name: 30, desc: 100 };
  const [isErrorModalOpen, setIsErrorModalOpen] = useState({ show: false, msg: "" });
  const previousImageRef = useRef<string | null>(null);

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

  const [invites, setInvites] = useState<any[]>([]); 
  const [visibility, setVisibility] = useState<"public" | "invite_only" | "closed">("public");
  const getVisibilityLabel = (visibility: string) => {
    if (visibility === 'invite_only') return 'Invite Only';
    return visibility.charAt(0).toUpperCase() + visibility.slice(1);
  };
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [pendingRevoke, setPendingRevoke] = useState<{ show: boolean; userId: string; username: string }>({ 
    show: false, 
    userId: "", 
    username: "" 
  });

  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamIcon, setTeamIcon] = useState("");

  const [myAvailableSaves, setMyAvailableSaves] = useState<any[]>([]);
  const [isSharingSave, setIsSharingSave] = useState(false);
  const [selectedSaveToShare, setSelectedSaveToShare] = useState<string>("");

  const [viewingFolder, setViewingFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderTargetSave, setFolderTargetSave] = useState("");
  
  const [isMovingStrategy, setIsMovingStrategy] = useState<{show: boolean, saveId: string | null, targetFolder: string, isNew: boolean}>({ show: false, saveId: null, targetFolder: "", isNew: false });
  const [isDeletingFolder, setIsDeletingFolder] = useState<{show: boolean, folderName: string | null}>({ show: false, folderName: null });

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

  const isValidUrl = (url: string) => {
    try { new URL(url); return true; } catch (e) { return false; }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setAuthChecked(true);
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

  useEffect(() => {
    if (selectedTeam) {
      setTeamName(selectedTeam.name || "");
      setTeamDesc(selectedTeam.description || "");
      setTeamIcon(selectedTeam.profile_image_link || "");
      setVisibility(selectedTeam.visibility || "public");
    }
  }, [selectedTeam]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setUserSearchResults([]);
        setUserSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchTeams = useCallback(async (reset = false) => {
    if (isFetchingRef.current || !currentUser) return;
    isFetchingRef.current = true;
    setLoading(true);

    if (reset) { pageRef.current = 0; setHasMore(true); }
    const from = pageRef.current * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (activeTab === "invites") {
      const { data } = await supabase.from("User_Teams")
        .select(`team_id, Teams(team_id, name, description, visibility, profile_image_link)`)
        .eq("user_id", currentUser.id)
        .eq("status", "pending");
      
      const validInvites = data?.filter(i => {
        const t = Array.isArray(i.Teams) ? i.Teams[0] : i.Teams;
        return t?.visibility === 'invite_only';
      }).map(i => Array.isArray(i.Teams) ? i.Teams[0] : i.Teams) || [];

      setInvites(validInvites);
      setHasMore(false);
    } else if (activeTab === "my_teams") {
      const { data: membershipData } = await supabase.from("User_Teams")
        .select("team_id")
        .eq("user_id", currentUser.id)
        .eq("status", "accepted");
      
      const teamIds = membershipData?.map(m => m.team_id) || [];
      
      if (teamIds.length === 0) { 
        setTeams([]); 
        setHasMore(false); 
      } else {
        const { data } = await supabase.from("Teams")
          .select(`*, User_Teams(count)`)
          .eq('User_Teams.status', 'accepted')
          .in("team_id", teamIds);
        
        setTeams(data?.map(t => ({ 
          ...t, 
          is_member: true,
          member_count: t.User_Teams?.[0]?.count || 0
        })) || []);
        setHasMore(false);
      }
    } else {
      let query = supabase.from("Teams")
        .select(`
          *, 
          User_Teams(count),
          membership:User_Teams(user_id) 
        `)
        .eq('User_Teams.status', 'accepted')
        .range(from, to)
        .order('name');

        if (searchQuery.trim()) {
          query = query.ilike('name', `%${searchQuery}%`);
        }

      const { data } = await query;
      if (data) {
        const processed = data.map(t => {
          const isMember = t.membership?.some((m: any) => m.user_id === currentUser.id);
          
          return { 
            ...t, 
            is_member: isMember,
            member_count: t.User_Teams?.[0]?.count || 0 
          };
        });

        const discoverable = processed.filter(t => !t.is_member && t.visibility !== 'closed');
        
        setTeams(prev => reset ? discoverable : [...prev, ...discoverable]);
        setHasMore(data.length === PAGE_SIZE);
        pageRef.current += 1;
      }
    }
    setLoading(false);
    isFetchingRef.current = false;
  }, [activeTab, currentUser, searchQuery]);

  const handleKickMember = async (targetUserId: string) => {
    if (!selectedTeam) return;

    const { error } = await supabase
      .from("User_Teams")
      .delete()
      .eq("team_id", selectedTeam.team_id)
      .eq("user_id", targetUserId);

    if (error) {
      console.error("Error updating role:", error.message);
      setIsErrorModalOpen({ show: true, msg: "Failed to update member role." });
    } else {
      fetchTeamData(selectedTeam); 
    }
  };

  const searchUsers = async (query: string) => {
    setUserSearchQuery(query);
    
    if (query.trim().length < 1) {
      setUserSearchResults([]);
      return;
    }

    const { data: members } = await supabase
      .from("User_Teams")
      .select("user_id")
      .eq("team_id", selectedTeam.team_id);

    const existingIds = members?.map(m => m.user_id) || [];
    const pendingIds = (pendingInvites || []).map(p => p.user_id);
    const excludeIds = [...existingIds, ...pendingIds];

    const { data: searchData } = await supabase
      .from("Users")
      .select("user_id, username")
      .ilike("username", `%${query}%`)
      .not("user_id", "in", `(${excludeIds.length > 0 ? excludeIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .limit(5);

    setUserSearchResults(searchData || []);
  };

  const handleSendInvite = async (targetUserId: string) => {
    const { error } = await supabase
      .from("User_Teams")
      .insert([{ 
        team_id: selectedTeam.team_id, 
        user_id: targetUserId, 
        role: 'member', 
        status: 'pending' 
      }]);

    if (!error) {
      setIsSuccess({ show: true, msg: "Invite sent!" });
      setUserSearchQuery("");
      setUserSearchResults([]);
      fetchTeamData(selectedTeam); 
    }
  };

  const handleCancelInvite = async (targetUserId: string) => {
    await supabase
      .from("User_Teams")
      .delete()
      .eq("team_id", selectedTeam.team_id)
      .eq("user_id", targetUserId)
      .eq("status", "pending");

    fetchTeamData(selectedTeam);
  };

  const handleAcceptInvite = async (teamId: string) => {
    const { error } = await supabase.from("User_Teams")
      .update({ status: 'accepted' })
      .eq("team_id", teamId)
      .eq("user_id", currentUser.id);
    
    if (!error) {
      setIsSuccess({ show: true, msg: "Invite accepted!" });
      fetchTeams(true);
    }
  };

  const handleDeclineInvite = async (teamId: string) => {
    const { error } = await supabase.from("User_Teams")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", currentUser.id);
    
    if (!error) {
      setIsSuccess({ show: true, msg: "Invite declined." });
      fetchTeams(true);
    }
  };

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (activeTab !== "discover" || loading || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore) fetchTeams(); });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchTeams, activeTab]);

  useEffect(() => { 
    if (currentUser && !selectedTeam) fetchTeams(true); 
  }, [activeTab, currentUser, selectedTeam, searchQuery, fetchTeams]);

  const fetchMySaves = useCallback(async () => {
    if (!currentUser?.id) return;
    
    const { data, error } = await supabase
      .from("Saved_Maps")
      .select(`save_id, name, description, Maps(name)`)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error(error);
      return;
    }
    setMyAvailableSaves(data || []);
  }, [currentUser]);

  const fetchTeamData = async (team: any) => {
    if (!team?.team_id || !currentUser) return;
    
    const [{ data: freshTeam }, { data: allMembersData }, { data: saves }, { data: myPrivateSaves } ] = await Promise.all([
      supabase.from("Teams")
        .select(`team_id, name, description, profile_image_link, visibility`)
        .eq("team_id", team.team_id)
        .single(),
      supabase.from("User_Teams")
        .select(`user_id, role, status, Users(username)`) 
        .eq("team_id", team.team_id),
      supabase.from("Team_Saves")
        .select(`save_id, owner_id, is_pinned, folder_name, Saved_Maps(save_id, name, description, Maps(name)), Users(username)`)
        .eq("team_id", team.team_id),
      supabase.from("Saved_Maps")
        .select(`save_id, name, description, Maps(name)`)
        .eq("user_id", currentUser.id)
    ]);

    const membersArray = (allMembersData as any[]) || [];
    
    const acceptedMembers = membersArray.filter(m => m.status === 'accepted');
    const pendingInvitesList = membersArray.filter(m => m.status === 'pending');

    setTeamMembers(acceptedMembers);
    setPendingInvites(pendingInvitesList);

    const myEntry = acceptedMembers.find(m => m.user_id === currentUser.id);
    const ownerEntry = acceptedMembers.find(m => m.role === 'owner');

    const processedSaves = (saves || []).map((s: any) => ({
      id: s.save_id,
      owner_id: s.owner_id,
      is_pinned: s.is_pinned,
      folder: s.folder_name || null,
      map_name: s.Saved_Maps?.name || "Untitled",
      base_map: s.Saved_Maps?.Maps?.name || "Unknown Map",
      creator: extractUsername(s)
    }));
    
    setTeamSaves(processedSaves);
    
    setSelectedTeam({ 
      ...team,
      ...freshTeam,
      is_member: !!myEntry,
      user_role: myEntry?.role || null,
      owner_name: extractUsername(ownerEntry)
    });

    if (freshTeam?.profile_image_link) {
      previousImageRef.current = freshTeam.profile_image_link;
    }
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

  const togglePin = async (saveId: string, currentPinnedStatus: boolean) => {
    if (!selectedTeam) return;
    const { error } = await supabase.from("Team_Saves").update({ is_pinned: !currentPinnedStatus }).eq("save_id", saveId).eq("team_id", selectedTeam.team_id);
    if (!error) fetchTeamData(selectedTeam);
  };

  const handleShareSave = async () => {
    if (!selectedSaveToShare || !selectedTeam || !currentUser) return;
    const { data: existing } = await supabase.from("Team_Saves").select("save_id").eq("team_id", selectedTeam.team_id).eq("save_id", selectedSaveToShare);
    if (existing && existing.length > 0) { setDuplicateSave(true); return; }
    const { error } = await supabase.from("Team_Saves").insert([{ team_id: selectedTeam.team_id, save_id: selectedSaveToShare, owner_id: currentUser.id, is_pinned: false }]);
    if (!error) {
      setIsSharingSave(false); setSelectedSaveToShare("");
      setIsSuccess({ show: true, msg: "Save shared with the team!" });
      fetchTeamData(selectedTeam);
    }
  };

  const handleDeleteSharedSave = async () => {
    if (!isDeletingSave.saveId || !selectedTeam) return;
    const { error } = await supabase.from("Team_Saves").delete().eq("save_id", isDeletingSave.saveId).eq("team_id", selectedTeam.team_id);
    if (!error) { setIsDeletingSave({ show: false, saveId: null }); fetchTeamData(selectedTeam); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !folderTargetSave || !selectedTeam) return;
    
    if (newFolderName.length > LIMITS.name) {
      setIsErrorModalOpen({ show: true, msg: `The folder name is too long (Max ${LIMITS.name} chars).` });
      return;
    }

    const isAlreadyShared = teamSaves.find(s => s.id === folderTargetSave);

    let error;

    if (isAlreadyShared) {
      const { error: updateError } = await supabase
        .from("Team_Saves")
        .update({ folder_name: newFolderName.trim() })
        .eq("save_id", folderTargetSave)
        .eq("team_id", selectedTeam.team_id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("Team_Saves")
        .insert([{
          team_id: selectedTeam.team_id,
          save_id: folderTargetSave,
          owner_id: currentUser.id,
          folder_name: newFolderName.trim(),
          is_pinned: false
        }]);
      error = insertError;
    }

    if (!error) {
      setIsCreatingFolder(false);
      setNewFolderName("");
      setFolderTargetSave("");
      setIsSuccess({ show: true, msg: `Folder "${newFolderName}" created.` });
      fetchTeamData(selectedTeam);
    }
  };

  const confirmMoveToFolder = async () => {
    if (!isMovingStrategy.saveId || !selectedTeam) return;

    if (isMovingStrategy.targetFolder.length > LIMITS.name) {
      setIsErrorModalOpen({ show: true, msg: `The folder name is too long (Max ${LIMITS.name} chars).` });
      return;
    }

    if (selectedTeam.user_role !== 'owner' && selectedTeam.user_role !== 'manager') {
      alert("Only owners and managers can move strategies.");
      return;
    }
    
    const { error } = await supabase
      .from("Team_Saves")
      .update({ folder_name: isMovingStrategy.targetFolder.trim() || null })
      .eq("save_id", isMovingStrategy.saveId)
      .eq("team_id", selectedTeam.team_id);

    if (!error) {
        setIsMovingStrategy({ show: false, saveId: null, targetFolder: "", isNew: false });
        fetchTeamData(selectedTeam);
    }
  };

  const handleDeleteFolder = async () => {
    if (!isDeletingFolder.folderName || !selectedTeam) return;
    
    if (selectedTeam.user_role !== 'owner' && selectedTeam.user_role !== 'manager') {
      alert("Only owners and managers can delete folders.");
      return;
    }
    
    const { error } = await supabase
      .from("Team_Saves")
      .update({ folder_name: null })
      .eq("folder_name", isDeletingFolder.folderName)
      .eq("team_id", selectedTeam.team_id);

    if (!error) {
        setIsDeletingFolder({ show: false, folderName: null });
        setViewingFolder(null);
        fetchTeamData(selectedTeam);
        setIsSuccess({ show: true, msg: "Folder removed. Strategies moved back to root." });
    }
  };

  const handleJoinTeam = async () => {
    if (!currentUser || !selectedTeam) return;
    const { error } = await supabase.from("User_Teams").insert([{ team_id: selectedTeam.team_id, user_id: currentUser.id, role: 'member', status: 'accepted' }]);
    if (!error) {
        setIsSuccess({ show: true, msg: `Joined ${selectedTeam.name}!` });
        await fetchTeams(true); await fetchTeamData({ ...selectedTeam, is_member: true }); 
    }
  };

  const confirmLeaveTeam = async () => {
    if (!selectedTeam || !currentUser) return;
    await supabase.from("Team_Saves").delete().eq("team_id", selectedTeam.team_id).eq("owner_id", currentUser.id);
    const { error } = await supabase.from("User_Teams").delete().eq("team_id", selectedTeam.team_id).eq("user_id", currentUser.id);
    if (!error) { setIsLeaving(false); setSelectedTeam(null); fetchTeams(true); }
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam?.team_id) return;
    
    if (teamName.length > LIMITS.name) {
      setIsErrorModalOpen({ show: true, msg: `The team name is too long (Max ${LIMITS.name} chars).` });
      return;
    }
    if (teamDesc.length > LIMITS.desc) {
      setIsErrorModalOpen({ show: true, msg: `The description is too long (Max ${LIMITS.desc} chars).` });
      return;
    }

    if (teamIcon.trim()) {
      try {
        const response = await fetch(teamIcon, { method: 'HEAD' });
        if (!response.ok) throw new Error('Image URL is invalid.');
      } catch (e) {
        setTeamIcon(previousImageRef.current || "");
        setIsErrorModalOpen({ show: true, msg: "The profile image URL you provided is invalid. Reverting to the last valid image." });
        return; 
      }
    }

    const { error } = await supabase
      .from("Teams")
      .update({ 
        name: teamName, 
        description: teamDesc, 
        profile_image_link: teamIcon.trim() || null,
        visibility: visibility
      }).eq("team_id", selectedTeam.team_id);

      if (!error && (visibility === 'public' || visibility === 'closed')) {
        await supabase
          .from("User_Teams")
          .delete()
          .eq("team_id", selectedTeam.team_id)
          .eq("status", "pending");
      }

    if (!error) {
      setIsSettingsOpen(false);
      const updatedTeam = { ...selectedTeam, name: teamName, description: teamDesc, profile_image_link: teamIcon, visibility: visibility };
      setSelectedTeam(updatedTeam);
      setTeams(prevTeams => prevTeams.map(t => t.team_id === selectedTeam.team_id ? { ...t, ...updatedTeam } : t));
      await fetchTeamData(updatedTeam);
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
        profile_image_link: teamIcon.trim() || null,
        visibility: visibility 
      }])
      .select()
      .single();

    if (teamError) { 
      if (teamError.code === '23505') setNameConflict({ show: true, name: teamName.trim() }); 
      return; 
    }

    if (newTeam) {
      const { error: memberError } = await supabase
        .from("User_Teams")
        .insert([{ 
          team_id: newTeam.team_id, 
          user_id: currentUser.id, 
          role: 'owner', 
          status: 'accepted' 
        }]);

      if (!memberError) {
        setIsCreating(false);
        setTeamName("");
        setTeamDesc("");
        setTeamIcon("");
        
        await fetchTeams(true);
        
        setIsSuccess({ show: true, msg: `Team created!` });
      }
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam?.team_id) return;
    const { error } = await supabase.from("Teams").delete().eq("team_id", selectedTeam.team_id);
    if (!error) { setIsDeletingTeam(false); setIsSettingsOpen(false); setSelectedTeam(null); setIsSuccess({ show: true, msg: "Team deleted." }); fetchTeams(true); }
  };

  const inputStyle = { width: '100%', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: 12, borderRadius: 6, marginBottom: 15 };
  const labelStyle = { display: 'block', color: '#666', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' as const };

  const folderNames = Array.from(new Set(teamSaves.map(s => s.folder))).filter(f => f !== null);

  const StrategyCard = ({ save }: { save: any }) => (
    <div 
      key={save.id} 
      onMouseEnter={() => setHoveredSaveId(save.id)} 
      onMouseLeave={() => setHoveredSaveId(null)} 
      style={{ 
        background: '#111', 
        border: save.is_pinned ? '1px solid #f65dfb' : (hoveredSaveId === save.id ? '1px solid #333' : '1px solid #222'), 
        borderRadius: 12, 
        padding: '20px', 
        position: 'relative',
        height: '180px', 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'start' }}>
        <div style={{ overflow: 'hidden' }}>
          <h3 style={{ 
            margin: 0, 
            color: save.is_pinned ? "#f65dfb" : "white", 
            fontSize: '1.1rem',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden' 
          }}>
            {save.map_name}
          </h3>
          <p style={{ fontSize: 11, color: "#444", marginTop: 4 }}>by {save.creator}</p>
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {(selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'manager') && (
            <>
              <button onClick={() => setIsMovingStrategy({ show: true, saveId: save.id, targetFolder: save.folder || "", isNew: false })} title="Move to Folder" style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>📁</button>
              <button onClick={() => togglePin(save.id, save.is_pinned)} style={{ background: 'none', border: 'none', color: save.is_pinned ? '#f65dfb' : '#333', cursor: 'pointer', fontSize: 18 }}>
                {save.is_pinned ? '★' : '☆'}
              </button>
            </>
          )}
          {(selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'manager' || save.owner_id === currentUser.id) && (
            <button onClick={() => setIsDeletingSave({ show: true, saveId: save.id })} style={{ background: "none", border: "none", color: "#ff0000", cursor: "pointer", fontSize: 18 }}>×</button>
          )}
        </div>
      </div>
      <button onClick={() => navigate(`/tacmap?load=${save.id}`)} style={{ width: "100%", background: "#f65dfb", border: "none", color: "white", padding: '10px', borderRadius: 6, cursor: "pointer", fontWeight: 'bold' }}>
        View Strategy
      </button>
    </div>
  );

  // Splashscreen for logged-out users
  if (authChecked && !currentUser) {
    return (
      <div style={{ padding: "120px 40px 40px", color: "white", backgroundColor: "#111", minHeight: "100vh", fontFamily: globalFont }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2 style={{ marginBottom: "40px", fontSize: "36px", fontWeight: "750", letterSpacing: "-1px" }}>Teams</h2>
          <div style={{
            textAlign: "center", padding: "60px",
            background: "#161616", borderRadius: "12px", border: "1px solid #282828",
          }}>
            <p style={{ color: "#777", fontSize: "18px", marginBottom: "20px" }}>
              Sign in or sign up to create and join teams.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button
                onClick={() => navigate("/login")}
                style={{ background: "#e60082", color: "white", border: "none", padding: "12px 24px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
              >
                Log In
              </button>
              <button
                onClick={() => navigate("/")}
                style={{ background: "#555", color: "white", border: "none", padding: "12px 24px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", color: "white", fontFamily: globalFont }}>
      {!selectedTeam ? (
        <div style={{ maxWidth: 1000, margin: "100px auto", padding: "0 20px" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <div style={{ display: 'flex', gap: 30 }}>
              <h1 onClick={() => setActiveTab("my_teams")} style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer', color: activeTab === "my_teams" ? "white" : "#333" }}>My Teams</h1>
              <h1 onClick={() => setActiveTab("discover")} style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer', color: activeTab === "discover" ? "white" : "#333" }}>Discover</h1>
              <h1 onClick={() => setActiveTab("invites")} style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer', color: activeTab === "invites" ? "white" : "#333" }}>Invites</h1>
            </div>
            <button onClick={() => { setTeamName(""); setTeamDesc(""); setTeamIcon(""); setVisibility("public"); setIsCreating(true); }} style={{ background: "#f65dfb", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>+ Create Team</button>
          </div>
          {activeTab === "discover" && <input type="text" placeholder="Search for teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...inputStyle, marginBottom: 25 }} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {activeTab === "invites" ? (
              invites.map((team) => (
                <div key={team.team_id} style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "20px 25px", borderRadius: 12, display: 'flex', alignItems: 'center', gap: 20 }}>
                  {team.profile_image_link && <img src={team.profile_image_link} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} alt="Team Icon" />}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: '#f65dfb' }}>{team.name}</h3>
                    <p style={{ color: '#666', fontSize: 13, margin: '4px 0' }}>{team.description || "No description."}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => handleAcceptInvite(team.team_id)} style={{ background: '#f65dfb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>Accept</button>
                    <button onClick={() => handleDeclineInvite(team.team_id)} style={{ background: '#222', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>Decline</button>
                  </div>
                </div>
              ))
            ) : (
              teams.map((team, index) => (
                <div key={team.team_id} ref={index === teams.length - 1 ? lastElementRef : null} onClick={() => fetchTeamData(team)} onMouseEnter={() => setHoveredTeamId(team.team_id)} onMouseLeave={() => setHoveredTeamId(null)} style={{ background: "#0a0a0a", border: hoveredTeamId === team.team_id ? "1px solid #f65dfb" : "1px solid #1a1a1a", padding: "20px 25px", borderRadius: 12, display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer' }}>
                  {team.profile_image_link && <img src={team.profile_image_link} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} alt="Team Icon" />}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: '#f65dfb' }}>{team.name}</h3>
                    <p style={{ color: '#666', fontSize: 13, margin: '4px 0' }}>{team.description || "No description."}</p>
                  </div>
                  <span style={{ 
                    marginLeft: 10, 
                    fontSize: 10, 
                    color: '#666', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    border: '1px solid #333',
                    padding: '2px 6px',
                    borderRadius: 4
                  }}>
                    {getVisibilityLabel(team.visibility)}
                  </span>

                  <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#444', fontWeight: 800 }}>{team.member_count || 0} MEMBERS</div>
                  </div>
                </div>
              ))
            )}
            {loading && <p style={{ textAlign: 'center', color: '#666' }}>Loading...</p>}
            {!loading && currentUser && (activeTab === "invites" ? invites.length === 0 : teams.length === 0) && <p style={{ textAlign: 'center', color: '#444', marginTop: 40 }}>No teams found.</p>}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ 
            width: "100vw", 
            position: "relative",
            left: "50%",
            right: "50%",
            marginLeft: "-50vw",
            marginRight: "-50vw",
            background: "linear-gradient(to bottom, #111, #000)", 
            borderBottom: "1px solid #222", 
            padding: "100px 0 50px 0" 
          }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
              <button onClick={() => { setSelectedTeam(null); setViewingFolder(null); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginBottom: 20, fontWeight: 700 }}>← BACK</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 25, alignItems: 'center' }}>
                  {selectedTeam.profile_image_link && <img src={selectedTeam.profile_image_link} style={{ width: 100, height: 100, borderRadius: 15, objectFit: 'cover' }} alt="Team Profile" />}
                  <div>
                    <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 900 }}>{selectedTeam.name}</h1>
                    <p style={{ color: '#aaa', margin: '5px 0 10px 0', fontSize: '1.1rem', wordBreak: 'break-word' }}>{selectedTeam.description || "No team description provided."}</p>
                    <p style={{ color: '#888', fontSize: 14 }}>Owned by <span style={{ color: '#f65dfb' }}>{selectedTeam.owner_name}</span></p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: "center" }}>
                  {(selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'manager') && 
                    (selectedTeam.visibility === 'invite_only') && (
                      <div 
                        ref={searchContainerRef}
                        style={{ position: 'relative' }}>
                        <input 
                          type="text"
                          placeholder="🔍 Invite users..."
                          value={userSearchQuery}
                          onChange={(e) => searchUsers(e.target.value)}
                          style={{ ...inputStyle, width: '180px', marginBottom: 0, padding: '10px' }}
                        />
                        {userSearchResults.length > 0 && (
                          <div style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            width: '220px', 
                            background: '#0a0a0a', 
                            border: '2px solid #333', 
                            borderRadius: 8, 
                            zIndex: 9999, 
                            marginTop: 10,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                            overflow: 'hidden'
                          }}>
                            {userSearchResults.map(user => (
                              <div 
                                key={user.user_id}
                                onClick={() => {
                                  handleSendInvite(user.user_id);
                                  setUserSearchResults([]);
                                  setUserSearchQuery("");
                                }}
                                style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', fontSize: 13, color: '#eee' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#111'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                + <span style={{ color: '#f65dfb', fontWeight: 'bold' }}>{user.username}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  <button onClick={() => setIsViewingMembers(true)} style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Members</button>
                  {!selectedTeam.is_member ? (
                    selectedTeam.visibility === 'invite_only' ? (
                      <div style={{ 
                        font: 'global',
                        background: '#3e163f', 
                        color: 'white', 
                        border: '1px solid #333',
                        padding: '7px 16px', 
                        borderRadius: 8, 
                        fontWeight: 600, 
                        cursor: 'not-allowed',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        Invite Only
                      </div>
                    ) : (
                      <button onClick={handleJoinTeam} style={{ background: '#f65dfb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                        Join Team
                      </button>
                    )
                  ) : (
                    <>
                      {(selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'manager') && (
                        <button onClick={() => { setTeamName(selectedTeam.name); setTeamDesc(selectedTeam.description || ""); setTeamIcon(selectedTeam.profile_image_link || ""); setIsSettingsOpen(true); }} style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' }}>⚙️</button>
                      )}
                      {selectedTeam.user_role !== 'owner' && <button onClick={() => setIsLeaving(true)} style={{ background: '#331111', border: '1px solid #552222', color: '#ff4d4d', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Leave Team</button>}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          {selectedTeam.is_member && (
            <div style={{ maxWidth: 1200, margin: "50px auto", padding: "0 40px" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>
                    {viewingFolder ? (
                        <span><span onClick={() => setViewingFolder(null)} style={{cursor: 'pointer', color: '#444'}}>Team Strategies</span> / {viewingFolder}</span>
                    ) : "Team Strategies"}
                </h2>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'manager') && (
                    <button 
                      onClick={() => {
                        fetchMySaves();
                        setIsCreatingFolder(true);
                      }}
                    style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '12px 24px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>+ New Folder</button>
                  )}
                  <button 
                    onClick={() => {
                      fetchMySaves();
                      setIsSharingSave(true);
                    }}
                    style={{ background: '#f65dfb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>+ Share Strategy</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: "25px" }}>
                {!viewingFolder && teamSaves.filter(s => s.is_pinned && !s.folder).map(save => (
                        <StrategyCard key={save.id} save={save} />
                ))}

                {!viewingFolder && folderNames.map(folder => (
                  <div 
                    key={folder} 
                    style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: '30px 0px', textAlign: 'center', cursor: 'pointer', transition: '0.2s', position: 'relative' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f65dfb'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
                  >
                    <div onClick={() => setViewingFolder(folder)}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>📁</div>
                        <h3 style={{ margin: 0 }}>{folder}</h3>
                        <p style={{ color: '#666', fontSize: 12, marginTop: 5 }}>
                        {teamSaves.filter(s => s.folder === folder).length} Strategies
                        </p>
                    </div>
                    {(selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'manager') && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsDeletingFolder({ show: true, folderName: folder }); }} 
                            style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#ff0000', fontSize: 18, cursor: 'pointer' }}
                        >
                            ×
                        </button>
                    )}
                  </div>
                ))}

                {viewingFolder && teamSaves.filter(s => s.folder === viewingFolder && s.is_pinned).map(save => (
                        <StrategyCard key={save.id} save={save} />
                ))}

                {teamSaves.filter(s => viewingFolder ? (s.folder === viewingFolder && !s.is_pinned) : (!s.folder && !s.is_pinned)).map((save) => (
                        <StrategyCard key={save.id} save={save} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isCreatingFolder && (
        <ModalShell 
          title="Create New Folder" 
          onClose={() => setIsCreatingFolder(false)} 
          onConfirm={handleCreateFolder} 
          confirmText="Initialize Folder" 
          globalFont={globalFont}
        >
          <label style={labelStyle}>Folder Name (Max 30)</label>
          <input 
            type="text" 
            value={newFolderName} 
            onChange={e => setNewFolderName(e.target.value)} 
            placeholder="e.g. Scrim Practice" 
            style={inputStyle} 
          />

          <label style={labelStyle}>Move a strategy to start folder</label>
          <select 
            value={folderTargetSave} 
            onChange={e => setFolderTargetSave(e.target.value)} 
            style={inputStyle}
          >
            <option value="">-- Choose Strategy --</option>
            
            <optgroup label="Shared with Team">
              {teamSaves.filter(s => !s.folder).map((save: any) => (
                <option key={save.id} value={save.id}>
                  {save.map_name} (Shared)
                </option>
              ))}
            </optgroup>
            <optgroup label="Your Private Saves">
              {myAvailableSaves
                .filter(ms => !teamSaves.some(ts => ts.id === ms.save_id))
                .map((save: any) => (
                  <option key={save.save_id} value={save.save_id}>
                    {save.name}
                  </option>
              ))}
            </optgroup>
          </select>
        </ModalShell>
      )}

      {isMovingStrategy.show && (
        <ModalShell title="Move Strategy" onClose={() => setIsMovingStrategy({ show: false, saveId: null, targetFolder: "", isNew: false })} onConfirm={confirmMoveToFolder} confirmText="Update" globalFont={globalFont}>
          <label style={labelStyle}>Target Folder</label>
          {!isMovingStrategy.isNew ? (
              <>
                <select value={isMovingStrategy.targetFolder} onChange={e => setIsMovingStrategy({...isMovingStrategy, targetFolder: e.target.value})} style={inputStyle}>
                    <option value="">Root (No Folder)</option>
                    {folderNames.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <button onClick={() => setIsMovingStrategy({...isMovingStrategy, isNew: true, targetFolder: ""})} style={{ background: 'none', border: 'none', color: '#f65dfb', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>+ CREATE NEW FOLDER</button>
              </>
          ) : (
              <>
                <input type="text" value={isMovingStrategy.targetFolder} onChange={e => setIsMovingStrategy({...isMovingStrategy, targetFolder: e.target.value})} placeholder="Enter new folder name (Max 30)..." style={inputStyle} autoFocus />
                <button onClick={() => setIsMovingStrategy({...isMovingStrategy, isNew: false, targetFolder: ""})} style={{ background: 'none', border: 'none', color: '#666', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>CANCEL NEW FOLDER</button>
              </>
          )}
        </ModalShell>
      )}

      {isDeletingFolder.show && (
          <ModalShell title="Delete Folder?" onClose={() => setIsDeletingFolder({ show: false, folderName: null })} onConfirm={handleDeleteFolder} confirmText="Remove Folder" isDelete={true} globalFont={globalFont}>
            <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.5' }}>Are you sure you want to delete "<b>{isDeletingFolder.folderName}</b>"? Strategies inside will be moved to the main list.</p>
          </ModalShell>
      )}

      {isSharingSave && (
        <ModalShell 
          title="Share Strategy" 
          onClose={() => setIsSharingSave(false)} 
          onConfirm={handleShareSave} 
          confirmText="Share with Team" 
          globalFont={globalFont}
        >
          <label style={labelStyle}>Select from your saves</label>
          <select 
            value={selectedSaveToShare} 
            onChange={(e) => setSelectedSaveToShare(e.target.value)} 
            style={{ ...inputStyle }}
          >
            <option value="">-- Select Save --</option>
            {myAvailableSaves.map((s: any) => (
              <option key={s.save_id} value={s.save_id}>
                {s.name}
              </option>
            ))}
          </select>
        </ModalShell>
      )}

      {duplicateSave && <ModalShell title="Already Shared" onClose={() => setDuplicateSave(false)} showButtons={false} globalFont={globalFont} isDelete={true}><p style={{ color: '#888', textAlign: 'center' }}>This strategy is already shared with the team.</p></ModalShell>}
      {isDeletingSave.show && <ModalShell title="Unshare Strategy?" onClose={() => setIsDeletingSave({ show: false, saveId: null })} onConfirm={handleDeleteSharedSave} confirmText="Remove from Team" isDelete={true} globalFont={globalFont}><p style={{ color: '#888', textAlign: 'center' }}>Are you sure you want to unshare this strategy?</p></ModalShell>}
      {isSuccess.show && <ModalShell title="Success" zIndex={4000} onClose={() => setIsSuccess({ show: false, msg: "" })} showButtons={false} globalFont={globalFont}><p style={{ color: '#888', textAlign: 'center' }}>{isSuccess.msg}</p></ModalShell>}
      {isLeaving && <ModalShell title="Leave Team?" onClose={() => setIsLeaving(false)} onConfirm={confirmLeaveTeam} confirmText="Leave" isDelete={true} globalFont={globalFont}><p style={{ color: '#888', textAlign: 'center', lineHeight: '1.5' }}>Are you sure you want to leave <b>{selectedTeam.name}</b>?</p></ModalShell>}

      {isViewingMembers && (
        <ModalShell title="Team Members" onClose={() => setIsViewingMembers(false)} showButtons={false} globalFont={globalFont}>
          {teamMembers.map((member: any) => {
            const isOwner = selectedTeam.user_role === 'owner';
            const isManager = selectedTeam.user_role === 'manager';
            const isSelf = member.user_id === currentUser?.id;
            
            const canManage = isOwner && !isSelf;
            const canKick = !isSelf && (isOwner || (isManager && member.role === 'member'));

            return (
              <div key={member.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #222' }}>
                <div>
                  <span style={{ color: '#eee', fontWeight: 600 }}>{member.Users?.username}</span>
                  <span style={{ color: '#888', fontSize: 11, marginLeft: 10 }}>{member.role.toUpperCase()}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {canManage && member.role === 'member' && (
                    <button 
                      onClick={() => handleMemberAction(member.user_id, 'promote')}
                      style={{ background: 'none', border: '1px solid #f65dfb', color: '#f65dfb', padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}
                    >
                      PROMOTE
                    </button>
                  )}
                  {canManage && member.role === 'manager' && (
                    <button 
                      onClick={() => handleMemberAction(member.user_id, 'demote')}
                      style={{ background: 'none', border: '1px solid #888', color: '#888', padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}
                    >
                      DEMOTE
                    </button>
                  )}
                  {canKick && (
                    <button 
                      onClick={() => setPendingMemberAction({ 
                        show: true, 
                        userId: member.user_id, 
                        username: member.Users?.username || "this user", 
                        action: 'kick' 
                      })}
                      style={{ background: 'none', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}
                    >
                      KICK
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {(selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'manager') && pendingInvites.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <label style={labelStyle}>Pending Invites</label>
              {pendingInvites.map((invite: any) => (
                <div key={invite.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ color: '#eee', fontSize: 13 }}>{invite.Users?.username}</span>
                  <button 
                    onClick={() => setPendingRevoke({ show: true, userId: invite.user_id, username: invite.Users?.username })} 
                    style={{ 
                      background: 'none', 
                      border: '1px solid #ff4d4d', 
                      color: '#ff4d4d', 
                      padding: '4px 8px', 
                      borderRadius: 4, 
                      fontSize: 10, 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    REVOKE
                  </button>
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      )}

      {isSettingsOpen && (
        <ModalShell title="Team Settings" onClose={() => setIsSettingsOpen(false)} onConfirm={handleUpdateTeam} confirmText="Save Changes" globalFont={globalFont}>
          <label style={labelStyle}>Team Name (Max {LIMITS.name})</label>
          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" style={inputStyle} />
          <label style={labelStyle}>Team Description (Max {LIMITS.desc})</label>
          <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} style={{ ...inputStyle, height: 80, resize: 'none' }} />
          <label style={labelStyle}>Team Icon (URL)</label>
          <input type="text" value={teamIcon} onChange={e => setTeamIcon(e.target.value)} placeholder="Icon URL" style={inputStyle} />
          {selectedTeam.user_role === 'owner' && (
            <>
              <label style={labelStyle}>Team Visibility</label>
              <select 
                value={visibility} 
                onChange={(e: any) => setVisibility(e.target.value)} 
                style={inputStyle}
              >
                <option value="public">Public (Anyone can join)</option>
                <option value="invite_only">Invite Only (Must be invited)</option>
                <option value="closed">Closed (Hidden from Discovery)</option>
              </select>
            </>
          )}
          {selectedTeam.user_role === 'owner' && <button onClick={() => setIsDeletingTeam(true)} style={{ width: '100%', background: '#331111', color: '#ff4d4d', border: '1px solid #552222', padding: 12, borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginTop: 25 }}>Delete Team</button>}
        </ModalShell>
      )}

      {pendingMemberAction.show && (
        <ModalShell 
          title="Confirm Action" 
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
            Are you sure you want to <b style={{ color: '#ff4d4d' }}>{pendingMemberAction.action}</b> 
            <span style={{ color: '#f65dfb' }}> {pendingMemberAction.username}</span>?
            <br/><br/>
            This action cannot be undone.
          </p>
        </ModalShell>
      )}
      {isDeletingTeam && <ModalShell title="Delete Team?" onClose={() => setIsDeletingTeam(false)} onConfirm={handleDeleteTeam} confirmText="Delete Forever" isDelete={true} globalFont={globalFont}><p style={{ color: '#888', textAlign: 'center' }}>Are you sure you want to delete <b>{selectedTeam.name}</b>?</p></ModalShell>}
      {isCreating && (
        <ModalShell 
          title="New Team" 
          zIndex={2000}
          onClose={() => setIsCreating(false)} 
          onConfirm={handleCreateTeam} 
          confirmText="Create Team" 
          globalFont={globalFont}
        >
          <label style={labelStyle}>Team Name (Max {LIMITS.name})</label>
          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" style={inputStyle} />
          <label style={labelStyle}>Team Description (Max {LIMITS.desc})</label>
          <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Description" style={{ ...inputStyle, height: 80, resize: 'none' }} />
          <label style={labelStyle}>Team Icon (URL)</label>
          <input type="text" value={teamIcon} onChange={e => setTeamIcon(e.target.value)} placeholder="Icon URL" style={inputStyle} />
          <label style={labelStyle}>Team Visibility</label>
          <select value={visibility} onChange={(e: any) => setVisibility(e.target.value)} style={inputStyle}>
            <option value="public">Public (Anyone can join)</option>
            <option value="invite_only">Invite Only (Must be invited)</option>
            <option value="closed">Closed (Hidden from Discovery)</option>
          </select>
        </ModalShell>
      )}

      {pendingRevoke.show && (
        <ModalShell 
          title="Revoke Invite?" 
          onClose={() => setPendingRevoke({ show: false, userId: "", username: "" })} 
          onConfirm={async () => {
            await handleCancelInvite(pendingRevoke.userId);
            setPendingRevoke({ show: false, userId: "", username: "" });
          }} 
          confirmText="Revoke" 
          isDelete={true} 
          globalFont={globalFont}
        >
          <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.5' }}>
            Are you sure you want to revoke the invite for <b style={{ color: '#f65dfb' }}>{pendingRevoke.username}</b>?
          </p>
        </ModalShell>
      )}

      {nameConflict.show && (
        <ModalShell 
          title="Name Taken" 
          zIndex={3000}
          onClose={() => setNameConflict({ show: false, name: "" })} 
          showButtons={false} 
          globalFont={globalFont} 
          isDelete={true}
        >
          <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.6' }}>
            The team name "<b>{nameConflict.name}</b>" is already in use.
          </p>
        </ModalShell>
      )}

      {isErrorModalOpen.show && (
        <ModalShell title="Error" zIndex={4000} onClose={() => setIsErrorModalOpen({ show: false, msg: "" })} showButtons={false} globalFont={globalFont} isDelete={true}>
          <p style={{ color: '#888', textAlign: 'center', lineHeight: '1.5' }}>{isErrorModalOpen.msg}</p>
        </ModalShell>
      )}
    </div>
  );
}