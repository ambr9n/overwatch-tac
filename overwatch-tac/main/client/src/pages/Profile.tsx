import React, { useEffect, useState } from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../Supabase";

const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

/**
 * CUSTOM MODAL COMPONENT (Direct Copy from Forum.tsx)
 */
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

export default function Profile() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [enrichedUser, setEnrichedUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({});
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<{ postId: string; replyId: string; username: string } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  // --- SETTINGS STATE ---
  const [showSettings, setShowSettings] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newAvatar, setNewAvatar] = useState("");

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'post' | 'reply'; id: string | null }>({
    isOpen: false,
    type: 'post',
    id: null
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: userData } = await supabase.from("Users").select("*").eq("user_id", user.id).maybeSingle();
        setEnrichedUser(userData);
      }
      const profileId = uid || user?.id;
      if (profileId) {
        const { data: pData } = await supabase.from("Users").select("*").eq("user_id", profileId).maybeSingle();
        setProfile(pData);
        if (pData) {
            setNewUsername(pData.username || "");
            setNewBio(pData.bio || "");
            setNewAvatar(pData.profile_image_link || "");
        }
        if (user && user.id !== profileId) {
            const { data: followData } = await supabase
              .from("User_Follows")
              .select("*")
              .eq("follower_id", user.id)
              .eq("following_id", profileId)
              .maybeSingle();

            setIsFollowing(!!followData);
        }
        fetchPosts(profileId);
      }
    };
    init();
  }, [uid]);

  const fetchPosts = async (userId: string) => {
    const { data } = await supabase.from("Forum_Posts")
      .select(`post_id, user_id, text, created_at, is_deleted, Users (username, profile_image_link, is_mod), Post_Likes (user_id), Post_Dislikes (user_id), Forum_Replies (reply_id, user_id, text, created_at, is_deleted, parent_reply_id, Users (username, profile_image_link, is_mod), Reply_Likes (user_id), Reply_Dislikes (user_id))`)
      .eq("user_id", userId).order("created_at", { ascending: false });
    setPosts((data as any) || []);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    const { error } = await supabase.from("Users").update({
      username: newUsername,
      bio: newBio,
      profile_image_link: newAvatar
    }).eq("user_id", currentUser.id);

    if (!error) {
      setShowSettings(false);
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    window.location.reload();
  };

  const handlePostAction = async (postId: string, type: 'like' | 'dislike') => {
    if (!currentUser) return;
    const table = type === 'like' ? 'Post_Likes' : 'Post_Dislikes';
    const other = type === 'like' ? 'Post_Dislikes' : 'Post_Likes';
    await supabase.from(other).delete().eq('post_id', postId).eq('user_id', currentUser.id);
    const { data: existing } = await supabase.from(table).select('*').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle();
    if (existing) await supabase.from(table).delete().eq('post_id', postId).eq('user_id', currentUser.id);
    else await supabase.from(table).insert([{ post_id: postId, user_id: currentUser.id }]);
    fetchPosts(profile.user_id);
  };

  const handleReplyAction = async (replyId: string, type: 'like' | 'dislike') => {
    if (!currentUser) return;
    const table = type === 'like' ? 'Reply_Likes' : 'Reply_Dislikes';
    const other = type === 'like' ? 'Reply_Dislikes' : 'Reply_Likes';
    await supabase.from(other).delete().eq('reply_id', replyId).eq('user_id', currentUser.id);
    const { data: existing } = await supabase.from(table).select('*').eq('reply_id', replyId).eq('user_id', currentUser.id).maybeSingle();
    if (existing) await supabase.from(table).delete().eq('reply_id', replyId).eq('user_id', currentUser.id);
    else await supabase.from(table).insert([{ reply_id: replyId, user_id: currentUser.id }]);
    fetchPosts(profile.user_id);
  };

  const handleInsertReply = async (postId: string) => {
    if (!replyText[postId]?.trim() || !currentUser) return;
    const payload: any = { post_id: postId, user_id: currentUser.id, text: replyText[postId] };
    if (replyingTo?.postId === postId) payload.parent_reply_id = replyingTo.replyId;
    const { error } = await supabase.from("Forum_Replies").insert([payload]);
    if (!error) {
      setReplyText({ ...replyText, [postId]: "" });
      setReplyingTo(null);
      fetchPosts(profile.user_id);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    if (deleteModal.type === 'post') {
      const { error } = await supabase.from("Forum_Posts").delete().eq("post_id", deleteModal.id);
      if (!error && profile) fetchPosts(profile.user_id);
    } else {
      const { error } = await supabase.from("Forum_Replies").delete().eq("reply_id", deleteModal.id);
      if (!error && profile) fetchPosts(profile.user_id);
    }
    setDeleteModal({ isOpen: false, type: 'post', id: null });
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) return;
      if (isFollowing) {
        // Unfollow logic
        const { error } = await supabase
          .from("User_Follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", profile.user_id);
        
        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow logic
        const { error } = await supabase
          .from("User_Follows")
          .insert([{ 
            follower_id: currentUser.id, 
            following_id: profile.user_id 
          }]);
        
        if (error) throw error;
        setIsFollowing(true);
      }
  };

  const AuthorHeader = ({ user, userId, createdAt, showDelete, onDelete }: any) => {
    const userData = Array.isArray(user) ? user[0] : user;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', width: '100%' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NavLink to={`/profile/${userId}`}>
            <img src={userData?.profile_image_link || DEFAULT_AVATAR} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: 'cover' }} alt="avatar" />
          </NavLink>
          <div>
            <div style={{ fontWeight: "bold", display: 'flex', alignItems: 'center', gap: 8 }}>
              {userData?.is_mod && (
                <span style={{ 
                  background: "linear-gradient(45deg, #e60082, #f65dfb)", 
                  fontSize: 10, padding: "2px 6px", borderRadius: 4, color: 'white',
                  fontWeight: 'bold', textTransform: 'uppercase',
                  position: "relative", top: "-2px"
                }}>MOD</span>
              )}
              <NavLink to={`/profile/${userId}`} style={{ color: 'white', textDecoration: 'none' }}>{userData?.username}</NavLink>
            </div>
            <div style={{ fontSize: 11, color: "#555" }}>{new Date(createdAt).toLocaleString()}</div>
          </div>
        </div>
        {showDelete && <button onClick={onDelete} style={{ background: "#1a1a1a", border: "1px solid #333", color: "white", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>🗑️</button>}
      </div>
    );
  };

  const RenderReplies = ({ allReplies, parentId, postId, depth = 0 }: any) => {
    const children = allReplies.filter((r: any) => r.parent_reply_id === parentId);
    if (!children.length) return null;
    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0, borderLeft: depth > 0 ? "2px solid #222" : "none", paddingLeft: depth > 0 ? 15 : 0 }}>
        {children.map((reply: any) => {
          const isLiked = reply.Reply_Likes?.some((l: any) => l.user_id === currentUser?.id);
          const isDisliked = reply.Reply_Dislikes?.some((d: any) => d.user_id === currentUser?.id);
          return (
            <div key={reply.reply_id} style={{ marginTop: 15, background: "#111", padding: 16, borderRadius: 12, border: "1px solid #222" }}>
              <AuthorHeader 
                user={reply.Users} userId={reply.user_id} createdAt={reply.created_at} 
                showDelete={enrichedUser?.is_mod || currentUser?.id === reply.user_id} 
                onDelete={() => setDeleteModal({ isOpen: true, type: 'reply', id: reply.reply_id })} 
              />
              <p style={{ fontSize: 14, color: "#ccc", margin: "14px 0", overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{reply.text}</p>
              
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={() => handleReplyAction(reply.reply_id, 'like')} style={{ background: isLiked ? "#dd65fb33" : "#222", border: isLiked ? "1px solid #253aefff" : "1px solid #333", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem" }}>👍 {reply.Reply_Likes?.length || 0}</button>
                <button onClick={() => handleReplyAction(reply.reply_id, 'dislike')} style={{ background: isDisliked ? "#ef444433" : "#222", border: isDisliked ? "1px solid #ef4444" : "1px solid #333", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem" }}>👎 {reply.Reply_Dislikes?.length || 0}</button>
                <button onClick={() => setReplyingTo({ postId, replyId: reply.reply_id, username: reply.Users?.username })} style={{ background: 'none', border: 'none', color: '#dd65fb', cursor: 'pointer', fontSize: 12 }}>Reply</button>
              </div>

              <RenderReplies allReplies={allReplies} parentId={reply.reply_id} postId={postId} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  };

  if (!profile) return null;

  return (
    <div style={{ maxWidth: 850, margin: "80px auto", padding: 20, color: "white", fontFamily: 'sans-serif' }}>
      
      {/* DELETE MODAL */}
      <CustomModal 
        isOpen={deleteModal.isOpen} 
        title={deleteModal.type === 'post' ? "Delete Post?" : "Delete Reply?"} 
        confirmText="Delete Forever" 
        confirmColor="#ff4d4d" 
        onConfirm={confirmDelete} 
        onCancel={() => setDeleteModal({ isOpen: false, type: 'post', id: null })}
      >
        {deleteModal.type === 'post' ? "Are you sure? This will permanently delete this post and ALL replies." : "Are you sure? This will permanently delete this reply and all sub-replies."}
      </CustomModal>

      {/* SETTINGS POPUP MODAL */}
      <CustomModal
        isOpen={showSettings}
        title="Account Settings"
        confirmText="Save Changes"
        onConfirm={handleUpdateProfile}
        onCancel={() => setShowSettings(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 15, textAlign: 'left' }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 5 }}>Username</label>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} style={{ width: "94%", padding: 10, background: "#000", border: "1px solid #333", borderRadius: 6, color: "white" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 5 }}>Avatar URL</label>
              <input type="text" value={newAvatar} onChange={(e) => setNewAvatar(e.target.value)} style={{ width: "94%", padding: 10, background: "#000", border: "1px solid #333", borderRadius: 6, color: "white" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 5 }}>Bio</label>
              <textarea value={newBio} onChange={(e) => setNewBio(e.target.value)} style={{ width: "94%", padding: 10, background: "#000", border: "1px solid #333", borderRadius: 6, color: "white", minHeight: 80, resize: 'none' }} />
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #282828', margin: '10px 0' }} />
            <button 
                onClick={handleLogout}
                style={{ background: "#ff4d4d22", color: "#ff4d4d", border: "1px solid #ff4d4d", padding: "10px", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}
            >
                Log Out
            </button>
        </div>
      </CustomModal>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={profile.profile_image_link || DEFAULT_AVATAR} style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid #333", objectFit: 'cover' }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {profile.is_mod && <span style={{ background: "linear-gradient(45deg, #e60082, #f65dfb)", fontSize: 12, padding: "3px 8px", borderRadius: 4, color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}>MOD</span>}
              <h2 style={{ margin: 0 }}>{profile.username}</h2>
            </div>
            <p style={{ color: "#aaa", marginTop: 8 }}>{profile.bio}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "12px" }}>
          {currentUser && currentUser.id !== profile.user_id && (
            <button 
              onClick={handleFollowToggle}
              style={{ 
                background: isFollowing ? "transparent" : "linear-gradient(45deg, #e60082, #f65dfb)", 
                color: "white", 
                border: isFollowing ? "1px solid #444" : "none",
                width: "110px",
                height: "36px",
                borderRadius: 8, 
                cursor: "pointer", 
                fontWeight: "bold",
                fontSize: "0.8rem",
                transition: "all 0.2s"
              }}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        
        {/* GEAR ICON TOGGLE (Only for owner) */}
        {currentUser?.id === profile.user_id && (
          <button 
            onClick={() => setShowSettings(true)}
            style={{ background: "#1a1a1a", border: "1px solid #333", color: "white", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: '20px' }}
          >
            ⚙️
          </button>
        )}
      </div>
    </div>

      {posts.map((post) => {
        const isLiked = post.Post_Likes?.some((l: any) => l.user_id === currentUser?.id);
        const isDisliked = post.Post_Dislikes?.some((d: any) => d.user_id === currentUser?.id);
        const isExpanded = expandedPosts[post.post_id];

        return (
          <div key={post.post_id} style={{ background: "#0a0a0a", padding: 24, borderRadius: 12, border: "1px solid #1a1a1a", marginBottom: 20 }}>
            <AuthorHeader 
              user={post.Users} userId={post.user_id} createdAt={post.created_at} 
              showDelete={enrichedUser?.is_mod || currentUser?.id === post.user_id} 
              onDelete={() => setDeleteModal({ isOpen: true, type: 'post', id: post.post_id })} 
            />
            <p style={{ fontSize: '1rem', color: '#ddd', margin: "18px 0", overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{post.text}</p>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={() => handlePostAction(post.post_id, 'like')} style={{ background: isLiked ? "#dd65fb33" : "#1a1a1a", border: isLiked ? "1px solid #253aefff" : "1px solid #333", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>👍 {post.Post_Likes?.length || 0}</button>
              <button onClick={() => handlePostAction(post.post_id, 'dislike')} style={{ background: isDisliked ? "#ef444433" : "#1a1a1a", border: isDisliked ? "1px solid #ef4444" : "1px solid #333", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>👎 {post.Post_Dislikes?.length || 0}</button>
              <button onClick={() => setExpandedPosts(prev => ({ ...prev, [post.post_id]: !prev[post.post_id] }))} style={{ background: 'none', border: '1px solid #333', color: '#dd65fbff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>{isExpanded ? 'Hide Replies' : (post.Forum_Replies?.length || 0) > 0 ? `See ${post.Forum_Replies.length} Replies` : 'Reply'}</button>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 20, borderTop: '1px solid #1a1a1a', paddingTop: 10 }}>
                <RenderReplies allReplies={post.Forum_Replies} parentId={null} postId={post.post_id} />
                <div style={{ marginTop: 15 }}>
                  {replyingTo?.postId === post.post_id && (
                    <div style={{ fontSize: 12, color: '#dd65fb', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Replying to @{replyingTo?.username}</span>
                      <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" placeholder="Write a reply..." value={replyText[post.post_id] || ""} onChange={(e) => setReplyText({ ...replyText, [post.post_id]: e.target.value })} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #222", background: "#000", color: "white" }} />
                    <button onClick={() => handleInsertReply(post.post_id)} style={{ background: "#dd65fb", color: "white", padding: "8px 18px", borderRadius: "8px", border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Reply</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}