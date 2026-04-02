import React, { useEffect, useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { supabase } from "../Supabase";

const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

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
    
    // Fixed the TS error using a double assertion here
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

  const AuthorHeader = ({ user, createdAt }: { user: any; createdAt: string }) => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      e.currentTarget.src = DEFAULT_AVATAR;
    };
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <NavLink to={`/profile/${user?.user_id}`}>
          <img src={user?.profile_image_link || DEFAULT_AVATAR} onError={handleImageError} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
        </NavLink>
        <div>
          <div style={{ fontWeight: "bold", color: "#fff" }}>{user?.username}</div>
          <div style={{ fontSize: 11, color: "#555" }}>{new Date(createdAt).toLocaleString()}</div>
        </div>
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
          return (
            <div key={reply.reply_id} style={{ background: '#111', padding: 12, borderRadius: 12, border: "1px solid #333", marginTop: 10 }}>
              <AuthorHeader user={reply.Users} createdAt={reply.created_at} />
              <p style={{ color: '#ccc', fontSize: 14, margin: '6px 0' }}>{reply.text}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleReplyLike(reply.reply_id)} style={{ background: isLiked ? "#3b82f633" : "#222", border: "1px solid #333", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                  👍 {reply.Reply_Likes?.length || 0}
                </button>
                <button onClick={() => setReplyingTo({ postId, replyId: reply.reply_id, username: reply.Users.username })} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12 }}>Reply</button>
              </div>
              <RenderReplies allReplies={allReplies} parentId={reply.reply_id} postId={postId} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  };

  if (!profile) return <div style={{ textAlign: "center", marginTop: 60 }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: 800, margin: "60px auto", padding: 20, color: "white", fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 30 }}>
        <img src={profile.profile_image_link || DEFAULT_AVATAR} alt="Profile" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
        <h2>{profile.username}</h2>
        {isOwnProfile && <button onClick={() => setShowSettings(true)} style={{ marginLeft: "auto", padding: "6px 12px", cursor: "pointer" }}>Settings ⚙️</button>}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#111", padding: 30, borderRadius: 12, width: 400, position: "relative" }}>
            <h3 style={{ marginBottom: 20 }}>Profile Settings</h3>
            <button onClick={() => setShowSettings(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "#aaa", fontSize: 18, cursor: "pointer" }}>✖️</button>

            {/* Read-only Email */}
            <div style={{ marginBottom: 15 }}>
              <label>Email:</label>
              <p style={{ marginLeft: 10, fontSize: 14, color: '#ccc' }}>{profile.email}</p>
            </div>

            {/* Profile Image URL */}
            <div style={{ marginBottom: 15 }}>
              <label>Profile Picture URL:</label>
              <input
                type="text"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                style={{ marginLeft: 10, width: "calc(100% - 20px)", padding: 6, borderRadius: 4, border: "1px solid #333", background: "#000", color: "white" }}
              />
              <button onClick={handleProfileImageSave} style={{ marginLeft: 8, padding: "6px 12px", cursor: "pointer" }}>Save</button>
            </div>

            <button onClick={handleLogout} style={{ padding: "6px 12px", background: "#ef4444", color: "white", borderRadius: 6, cursor: "pointer", border: "none" }}>
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      <h3>{isOwnProfile ? "Your Posts" : `${profile.username}'s Posts`}</h3>
      {posts.length === 0 && <p style={{ color: "#888" }}>No posts yet.</p>}
      {posts.map(post => {
        const replyCount = post.Forum_Replies?.length || 0;
        const isExpanded = expandedPosts[post.post_id];
        const isLiked = post.Post_Likes?.some(l => l.user_id === currentUser?.id);

        return (
          <div key={post.post_id} style={{ background: "#111", padding: 16, borderRadius: 12, border: "1px solid #333", marginBottom: 16 }}>
            <AuthorHeader user={post.Users} createdAt={post.created_at} />
            <p style={{ color: '#ddd', fontSize: 14 }}>{post.text}</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <button onClick={() => handleLike(post.post_id)} style={{ background: isLiked ? "#3b82f633" : "#222", border: "1px solid #333", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
                👍 {post.Post_Likes?.length || 0}
              </button>
              <button onClick={() => setExpandedPosts(prev => ({ ...prev, [post.post_id]: !prev[post.post_id] }))} style={{ background: 'none', border: '1px solid #333', color: '#3b82f6', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                {isExpanded ? 'Hide Replies' : replyCount > 0 ? `See ${replyCount} Replies` : 'Reply'}
              </button>
            </div>

            {/* Replies */}
            {isExpanded && (
              <div style={{ marginTop: 10 }}>
                <RenderReplies allReplies={post.Forum_Replies || []} parentId={null} postId={post.post_id} />

                {/* Reply Input */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input
                    type="text"
                    placeholder={replyingTo?.postId === post.post_id ? `Replying to @${replyingTo.username}` : "Write a reply..."}
                    value={replyText[post.post_id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [post.post_id]: e.target.value })}
                    style={{ flex: 1, padding: "8px", borderRadius: 6, border: "1px solid #222", background: "#000", color: "white" }}
                  />
                  <button onClick={async () => {
                    if (!currentUser) return;
                    const payload: any = { post_id: post.post_id, user_id: currentUser.id, text: replyText[post.post_id] };
                    if (replyingTo?.postId === post.post_id) payload.parent_reply_id = replyingTo.replyId;
                    await supabase.from("Forum_Replies").insert([payload]);
                    setReplyText({ ...replyText, [post.post_id]: "" });
                    setReplyingTo(null);
                    fetchPosts(profile!.user_id);
                  }} style={{ background: "#3b82f6", color: "white", padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer" }}>
                    Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}