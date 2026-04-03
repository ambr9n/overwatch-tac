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
  is_deleted: boolean;
  parent_reply_id?: string;
  Users: { username: string; profile_image_link: string };
  Reply_Likes: { user_id: string }[];
  Reply_Dislikes: { user_id: string }[];
}

interface ForumPost {
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  is_deleted: boolean;
  Users: { username: string; profile_image_link: string };
  Post_Likes: { user_id: string }[];
  Post_Dislikes: { user_id: string }[];
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
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  const fetchProfile = async (userId: string, currentUserId?: string) => {
    const { data, error } = await supabase.from("Users").select("*").eq("user_id", userId).maybeSingle();
    if (!error && data) {
      setProfile(data);
      setProfileImageUrl(data.profile_image_link || "");
    }

    if (currentUserId && userId !== currentUserId) {
      const { data: followData } = await supabase
        .from("User_Follows")
        .select("*")
        .eq("follower_id", currentUserId)
        .eq("following_id", userId)
        .maybeSingle();
      setIsFollowing(!!followData);
    }
  };

  const fetchPosts = async (userId: string) => {
    const { data } = await supabase
      .from("Forum_Posts")
      .select(`
        post_id, user_id, text, created_at, is_deleted,
        Users (username, profile_image_link),
        Post_Likes (user_id),
        Post_Dislikes (user_id), 
        Forum_Replies (
          reply_id, user_id, text, created_at, is_deleted, parent_reply_id,
          Users (username, profile_image_link),
          Reply_Likes (user_id),
          Reply_Dislikes (user_id)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setPosts((data as any) || []);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      const profileId = uid || user?.id;
      if (profileId) {
        await fetchProfile(profileId, user?.id);
        await fetchPosts(profileId);
      }
    };
    init();
  }, [uid]);

  const isOwnProfile = currentUser?.id === profile?.user_id;

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) return;
    if (isFollowing) {
      await supabase.from("User_Follows").delete().eq("follower_id", currentUser.id).eq("following_id", profile.user_id);
    } else {
      await supabase.from("User_Follows").insert([{ follower_id: currentUser.id, following_id: profile.user_id }]);
    }
    setIsFollowing(!isFollowing);
  };

  const handleUpdateAvatar = async () => {
    if (!profile) return;
    const { error } = await supabase.from("Users").update({ profile_image_link: profileImageUrl }).eq("user_id", profile.user_id);
    if (!error) {
      setProfile({ ...profile, profile_image_link: profileImageUrl });
      setShowSettings(false);
      alert("Profile updated!");
    }
  };

  const AuthorHeader = ({ user, userId, createdAt }: any) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <NavLink to={`/profile/${userId}`}>
        <img src={user?.profile_image_link || DEFAULT_AVATAR} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: 'cover' }} />
      </NavLink>
      <div>
        <div style={{ fontWeight: "bold" }}>
          <NavLink to={`/profile/${userId}`} style={{ color: 'white', textDecoration: 'none' }}>{user?.username}</NavLink>
        </div>
        <div style={{ fontSize: 11, color: "#555" }}>{new Date(createdAt).toLocaleString()}</div>
      </div>
    </div>
  );

  const RenderReplies = ({ allReplies, parentId, postId, depth = 0 }: { allReplies: ForumReply[], parentId: string | null, postId: string, depth?: number }) => {
    const children = allReplies.filter(r => r.parent_reply_id === parentId);
    if (!children.length) return null;

    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0, borderLeft: depth > 0 ? "2px solid #222" : "none", paddingLeft: depth > 0 ? 15 : 0 }}>
        {children.map(reply => {
          const isLiked = reply.Reply_Likes.some(l => l.user_id === currentUser?.id);
          const isDisliked = reply.Reply_Dislikes.some(d => d.user_id === currentUser?.id);
          return (
            <div key={reply.reply_id} style={{ marginTop: 12, background: "#111", padding: 14, borderRadius: 12, border: '1px solid #222' }}>
              <AuthorHeader user={reply.Users} userId={reply.user_id} createdAt={reply.created_at} />
              <p style={{ fontSize: 14, color: '#ccc', margin: '8px 0' }}>{reply.text}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => {
                  if (!currentUser) return;
                  const { data: existing } = await supabase.from("Reply_Likes").select("*").eq("reply_id", reply.reply_id).eq("user_id", currentUser.id).maybeSingle();
                  if (existing) await supabase.from("Reply_Likes").delete().eq("reply_id", reply.reply_id).eq("user_id", currentUser.id);
                  else await supabase.from("Reply_Likes").insert([{ reply_id: reply.reply_id, user_id: currentUser.id }]);
                  fetchPosts(profile!.user_id);
                }} style={{ background: isLiked ? "#3b82f633" : "#222", color: 'white', padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>👍 {reply.Reply_Likes.length}</button>
                
                <button onClick={async () => {
                  if (!currentUser) return;
                  const { data: existing } = await supabase.from("Reply_Dislikes").select("*").eq("reply_id", reply.reply_id).eq("user_id", currentUser.id).maybeSingle();
                  if (existing) await supabase.from("Reply_Dislikes").delete().eq("reply_id", reply.reply_id).eq("user_id", currentUser.id);
                  else await supabase.from("Reply_Dislikes").insert([{ reply_id: reply.reply_id, user_id: currentUser.id }]);
                  fetchPosts(profile!.user_id);
                }} style={{ background: isDisliked ? "#ef444433" : "#222", color: 'white', padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>👎 {reply.Reply_Dislikes.length}</button>
                
                <button onClick={() => setReplyingTo({ postId, replyId: reply.reply_id, username: reply.Users.username })} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12 }}>Reply</button>
              </div>
              <RenderReplies allReplies={allReplies} parentId={reply.reply_id} postId={postId} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  };

  if (!profile) return <div style={{ textAlign: "center", marginTop: 60, color: 'white' }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: 850, margin: "80px auto", padding: 20, color: "white", fontFamily: 'sans-serif' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={profile.profile_image_link || DEFAULT_AVATAR} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #333' }} alt="Avatar" />
          <div>
            <h2 style={{ margin: 0 }}>{profile.username}</h2>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!isOwnProfile && (
            <button onClick={handleFollowToggle} style={{ padding: "8px 18px", borderRadius: 8, background: "#3b82f6", color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
          {isOwnProfile && (
            <button onClick={() => setShowSettings(true)} style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>
              Settings ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#111', padding: 30, borderRadius: 12, width: 400, border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0 }}>Account Settings</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
              <div style={{ color: '#ccc', fontSize: 14, marginTop: 4, padding: '10px', background: '#000', borderRadius: 6, border: '1px solid #222' }}>
                {profile.email || "No email linked"}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profile Image URL</label>
              <input 
                type="text" 
                value={profileImageUrl} 
                onChange={(e) => setProfileImageUrl(e.target.value)} 
                style={{ width: '100%', padding: 10, marginTop: 4, borderRadius: 6, border: '1px solid #333', background: '#000', color: 'white', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleUpdateAvatar} style={{ flex: 1, padding: 10, background: '#3b82f6', border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
              <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: 10, background: '#333', border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
            </div>
            
            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #222' }} />

            <button 
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} 
              style={{ width: '100%', padding: 10, background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, cursor: 'pointer' }}
            >
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* Posts Section */}
      {posts.map(post => {
        const replyCount = post.Forum_Replies.length;
        const isExpanded = expandedPosts[post.post_id];
        const isLiked = post.Post_Likes.some(l => l.user_id === currentUser?.id);
        const isDisliked = post.Post_Dislikes.some(d => d.user_id === currentUser?.id);

        return (
          <div key={post.post_id} style={{ background: '#0a0a0a', padding: 24, borderRadius: 12, border: '1px solid #1a1a1a', marginBottom: 20 }}>
            <AuthorHeader user={post.Users} userId={post.user_id} createdAt={post.created_at} />
            <p style={{ fontSize: 16, color: '#ddd', margin: '14px 0' }}>{post.text}</p>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={async () => {
                if (!currentUser) return;
                const { data: existing } = await supabase.from("Post_Likes").select("*").eq("post_id", post.post_id).eq("user_id", currentUser.id).maybeSingle();
                if (existing) await supabase.from("Post_Likes").delete().eq("post_id", post.post_id).eq("user_id", currentUser.id);
                else await supabase.from("Post_Likes").insert([{ post_id: post.post_id, user_id: currentUser.id }]);
                fetchPosts(profile.user_id);
              }} style={{ background: isLiked ? "#3b82f633" : "#1a1a1a", color: 'white', padding: '6px 14px', borderRadius: 8, border: '1px solid #333', cursor: 'pointer' }}>👍 {post.Post_Likes.length}</button>

              <button onClick={async () => {
                if (!currentUser) return;
                const { data: existing } = await supabase.from("Post_Dislikes").select("*").eq("post_id", post.post_id).eq("user_id", currentUser.id).maybeSingle();
                if (existing) await supabase.from("Post_Dislikes").delete().eq("post_id", post.post_id).eq("user_id", currentUser.id);
                else await supabase.from("Post_Dislikes").insert([{ post_id: post.post_id, user_id: currentUser.id }]);
                fetchPosts(profile.user_id);
              }} style={{ background: isDisliked ? "#ef444433" : "#1a1a1a", color: 'white', padding: '6px 14px', borderRadius: 8, border: '1px solid #333', cursor: 'pointer' }}>👎 {post.Post_Dislikes.length}</button>

              <button onClick={() => setExpandedPosts(prev => ({ ...prev, [post.post_id]: !prev[post.post_id] }))} style={{ background: 'none', border: '1px solid #333', color: '#3b82f6', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>
                {isExpanded ? 'Hide Replies' : replyCount > 0 ? `See ${replyCount} Replies` : 'Reply'}
              </button>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 16, borderTop: '1px solid #1a1a1a', paddingTop: 10 }}>
                <RenderReplies allReplies={post.Forum_Replies} parentId={null} postId={post.post_id} />
                
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <input 
                    type="text" 
                    placeholder={replyingTo?.postId === post.post_id ? `Replying to ${replyingTo.username}...` : "Write a reply..."} 
                    value={replyText[post.post_id] || ""} 
                    onChange={e => setReplyText({ ...replyText, [post.post_id]: e.target.value })} 
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #222', background: '#000', color: 'white' }} 
                  />
                  <button onClick={() => {
                    if (!currentUser) return;
                    const payload: any = { post_id: post.post_id, user_id: currentUser.id, text: replyText[post.post_id] };
                    if (replyingTo?.postId === post.post_id) payload.parent_reply_id = replyingTo.replyId;
                    
                    supabase.from("Forum_Replies").insert([payload]).then(() => { 
                      setReplyText({ ...replyText, [post.post_id]: '' }); 
                      setReplyingTo(null); 
                      fetchPosts(profile.user_id); 
                    });
                  }} style={{ padding: '8px 18px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
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