import React, { useEffect, useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { supabase } from "../Supabase";

const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

const ADMIN_USERS = [
  "06dceda7-8a9a-4ed5-8b65-f1a8fb85c528",
  "38750a9c-ad2a-442f-a553-a3116f548c31",
  "1ac8d6c6-0f6f-4171-b27f-ea08b941d6ae",
  "236ffca1-63de-44f4-bcd4-1772ab2ee94f",
  "48ce304b-ad93-4b60-a327-427939d7ff34"
];

interface ForumReply {
  reply_id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  parent_reply_id?: string;
  Users: { username: string; profile_image_link: string };
  Reply_Likes: { user_id: string }[];
}

interface ForumPost {
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  Users: { username: string; profile_image_link: string };
  Post_Likes: { user_id: string }[];
  Forum_Replies: ForumReply[];
}

interface UserProfile {
  user_id: string;
  username: string;
  email?: string;
  profile_image_link: string;
}

export default function Profile() {
  const { uid } = useParams<{ uid: string }>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<{ postId: string; replyId: string; username: string } | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({});

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from("Users").select("*").eq("user_id", userId).maybeSingle();
    if (!error && data) {
      setProfile(data);
      setProfileImageUrl(data.profile_image_link);
    }
  };

  const fetchPosts = async (userId: string) => {
    const { data, error } = await supabase
      .from("Forum_Posts")
      .select(`
        post_id, text, created_at, user_id,
        Users (username, profile_image_link),
        Post_Likes (user_id),
        Forum_Replies (
          reply_id, post_id, user_id, text, created_at, parent_reply_id,
          Users (username, profile_image_link),
          Reply_Likes (user_id)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (!error) setPosts(data as unknown as ForumPost[]);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      const profileId = uid || user?.id;
      if (profileId) {
        fetchProfile(profileId);
        fetchPosts(profileId);
      }
    };
    init();
  }, [uid]);

  const isOwnProfile = currentUser?.id === profile?.user_id;
  const isMod = currentUser ? ADMIN_USERS.includes(currentUser.id) : false;

  const handleProfileImageSave = async () => {
    if (!profileImageUrl.trim() || !profile) return;
    await supabase.from("Users").update({ profile_image_link: profileImageUrl }).eq("user_id", profile.user_id);
    setProfile(prev => prev ? { ...prev, profile_image_link: profileImageUrl } : prev);
    alert("Profile picture updated!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Permanent delete? This wipes the post and ALL replies.")) return;
    const { error } = await supabase.from("Forum_Posts").delete().eq("post_id", postId);
    if (error) alert(`Delete failed: ${error.message}`);
    else fetchPosts(profile!.user_id);
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm("Delete this reply and all sub-replies?")) return;
    const { error } = await supabase.from("Forum_Replies").delete().eq("reply_id", replyId);
    if (error) alert(`Delete failed: ${error.message}`);
    else fetchPosts(profile!.user_id);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const { data: existing } = await supabase.from("Post_Likes").select("*").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle();
    if (existing) await supabase.from("Post_Likes").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    else await supabase.from("Post_Likes").insert([{ post_id: postId, user_id: currentUser.id }]);
    fetchPosts(profile!.user_id);
  };

  const handleReplyLike = async (replyId: string) => {
    if (!currentUser) return;
    const { data: existing } = await supabase.from("Reply_Likes").select("*").eq("reply_id", replyId).eq("user_id", currentUser.id).maybeSingle();
    if (existing) await supabase.from("Reply_Likes").delete().eq("reply_id", replyId).eq("user_id", currentUser.id);
    else await supabase.from("Reply_Likes").insert([{ reply_id: replyId, user_id: currentUser.id }]);
    fetchPosts(profile!.user_id);
  };

  const AuthorHeader = ({ user, userId, createdAt, showDelete, onDelete }: any) => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      e.currentTarget.src = DEFAULT_AVATAR;
    };
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NavLink to={`/profile/${userId}`}>
            <img 
              src={user?.profile_image_link || DEFAULT_AVATAR} 
              onError={handleImageError} 
              style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", backgroundColor: '#222' }} 
            />
          </NavLink>
          <div>
            <div style={{ fontWeight: "bold", display: 'flex', alignItems: 'center', gap: 8 }}>
              {ADMIN_USERS.includes(userId) && <span style={{ background: "#ef4444", fontSize: 10, padding: "2px 6px", borderRadius: 4, color: 'white' }}>MOD</span>}
              <NavLink to={`/profile/${userId}`} style={{ color: 'white', textDecoration: 'none' }}>
                {user?.username}
              </NavLink>
            </div>
            <div style={{ fontSize: 11, color: "#555" }}>{new Date(createdAt).toLocaleString()}</div>
          </div>
        </div>
        {showDelete && (
          <button onClick={onDelete} style={{ background: "#1a1a1a", border: "1px solid #333", color: "white", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
            🗑️
          </button>
        )}
      </div>
    );
  };

  const RenderReplies = ({ allReplies, parentId, postId, depth = 0 }: { allReplies: ForumReply[], parentId: string | null, postId: string, depth?: number }) => {
    const children = allReplies.filter(r => r.parent_reply_id === parentId);
    if (children.length === 0) return null;

    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0, borderLeft: depth > 0 ? "2px solid #222" : "none", paddingLeft: depth > 0 ? 15 : 0 }}>
        {children.map(reply => {
          const isLiked = reply.Reply_Likes?.some(l => l.user_id === currentUser?.id);
          const canDelete = isMod || currentUser?.id === reply.user_id;
          return (
            <div key={reply.reply_id} style={{ marginTop: 15 }}>
              <div style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #222' }}>
                <AuthorHeader 
                  user={reply.Users} 
                  userId={reply.user_id} 
                  createdAt={reply.created_at} 
                  showDelete={canDelete} 
                  onDelete={() => handleDeleteReply(reply.reply_id)} 
                />
                <div style={{ margin: '14px 0' }}>
                  <p style={{ fontSize: 14, color: '#ccc', margin: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{reply.text}</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => handleReplyLike(reply.reply_id)} style={{ background: isLiked ? "#3b82f633" : "#222", border: isLiked ? "1px solid #3b82f6" : "1px solid #333", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", display: 'flex', alignItems: 'center', gap: 5 }}>
                    👍 {reply.Reply_Likes?.length || 0}
                  </button>
                  <button onClick={() => setReplyingTo({ postId, replyId: reply.reply_id, username: reply.Users.username })} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12 }}>Reply</button>
                </div>
              </div>
              <RenderReplies allReplies={allReplies} parentId={reply.reply_id} postId={postId} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  };

  if (!profile) return <div style={{ textAlign: "center", marginTop: 60, color: "white" }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: 850, margin: "80px auto", padding: "20px", color: "white", fontFamily: 'sans-serif' }}>
      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 40 }}>
        <img src={profile.profile_image_link || DEFAULT_AVATAR} alt="Profile" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid #1a1a1a" }} />
        <div>
           <h2 style={{ margin: 0 }}>{profile.username}</h2>
           {ADMIN_USERS.includes(profile.user_id) && <span style={{ background: "#ef4444", fontSize: 12, padding: "2px 8px", borderRadius: 4, color: 'white', marginTop: 4, display: 'inline-block' }}>MODERATOR</span>}
        </div>
        {isOwnProfile && <button onClick={() => setShowSettings(true)} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 8, background: "#1a1a1a", border: "1px solid #333", color: "white", cursor: "pointer" }}>Settings ⚙️</button>}
      </div>

      {showSettings && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#0a0a0a", padding: 30, borderRadius: 16, width: 400, position: "relative", border: "1px solid #1a1a1a" }}>
            <h3 style={{ marginBottom: 20 }}>Profile Settings</h3>
            <button onClick={() => setShowSettings(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "#aaa", fontSize: 18, cursor: "pointer" }}>✖️</button>
            <div style={{ marginBottom: 15 }}>
              <label style={{ fontSize: 13, color: "#888" }}>Email:</label>
              <p style={{ margin: "4px 0", fontSize: 14, color: '#ccc' }}>{profile.email}</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#888" }}>Profile Picture URL:</label>
              <input
                type="text"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                style={{ marginTop: 8, width: "100%", padding: 10, borderRadius: 8, border: "1px solid #333", background: "#000", color: "white", boxSizing: 'border-box' }}
              />
              <button onClick={handleProfileImageSave} style={{ marginTop: 10, width: "100%", padding: "10px", borderRadius: 8, background: "#3b82f6", color: "white", border: "none", cursor: "pointer", fontWeight: 'bold' }}>Save Changes</button>
            </div>
            <button onClick={handleLogout} style={{ width: "100%", padding: "10px", background: "#ef4444", color: "white", borderRadius: 8, cursor: "pointer", border: "none", fontWeight: 'bold' }}>
              Log Out
            </button>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: 20, borderBottom: '1px solid #1a1a1a', paddingBottom: 10 }}>{isOwnProfile ? "Your Activity" : `${profile.username}'s Activity`}</h3>
      {posts.length === 0 && <p style={{ color: "#888" }}>No posts yet.</p>}
      
      {posts.map(post => {
        const replyCount = post.Forum_Replies?.length || 0;
        const isExpanded = expandedPosts[post.post_id];
        const isLiked = post.Post_Likes?.some(l => l.user_id === currentUser?.id);
        const canDelete = isMod || currentUser?.id === post.user_id;

        return (
          <div key={post.post_id} style={{ background: "#0a0a0a", padding: 24, borderRadius: 12, border: "1px solid #1a1a1a", marginBottom: 20 }}>
            <AuthorHeader 
              user={post.Users} 
              userId={post.user_id} 
              createdAt={post.created_at} 
              showDelete={canDelete} 
              onDelete={() => handleDeletePost(post.post_id)} 
            />
            <div style={{ margin: "18px 0" }}>
              <p style={{ fontSize: '1rem', color: '#ddd', margin: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{post.text}</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => handleLike(post.post_id)} style={{ background: isLiked ? "#3b82f633" : "#1a1a1a", border: "1px solid #333", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", display: 'flex', alignItems: 'center', gap: 6 }}>
                👍 {post.Post_Likes?.length || 0}
              </button>
              <button onClick={() => setExpandedPosts(prev => ({ ...prev, [post.post_id]: !prev[post.post_id] }))} style={{ background: 'none', border: '1px solid #333', color: '#3b82f6', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                {isExpanded ? 'Hide Replies' : replyCount > 0 ? `See ${replyCount} Replies` : 'Reply'}
              </button>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 20, borderTop: '1px solid #1a1a1a', paddingTop: 10 }}>
                <RenderReplies allReplies={post.Forum_Replies || []} parentId={null} postId={post.post_id} />
                <div style={{ marginTop: 15 }}>
                  {replyingTo?.postId === post.post_id && (
                    <div style={{ fontSize: 12, color: '#3b82f6', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Replying to @{replyingTo.username}</span>
                      <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyText[post.post_id] || ""}
                      onChange={(e) => setReplyText({ ...replyText, [post.post_id]: e.target.value })}
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #222", background: "#000", color: "white" }}
                    />
                    <button onClick={async () => {
                      if (!currentUser) return;
                      const payload: any = { post_id: post.post_id, user_id: currentUser.id, text: replyText[post.post_id] };
                      if (replyingTo?.postId === post.post_id) payload.parent_reply_id = replyingTo.replyId;
                      await supabase.from("Forum_Replies").insert([payload]);
                      setReplyText({ ...replyText, [post.post_id]: "" });
                      setReplyingTo(null);
                      fetchPosts(profile!.user_id);
                    }} style={{ background: "#3b82f6", color: "white", padding: "8px 18px", borderRadius: "8px", border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                      Reply
                    </button>
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