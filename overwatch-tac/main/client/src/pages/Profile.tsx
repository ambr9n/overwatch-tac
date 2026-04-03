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
  bio?: string;
}

export default function Profile() {
  const { uid } = useParams<{ uid: string }>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [bio, setBio] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<{ postId: string; replyId: string; username: string } | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({});

  // Follow States
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<UserProfile[]>([]);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);
  const [currentUserFollowingIds, setCurrentUserFollowingIds] = useState<string[]>([]);

  const fetchCurrentUserRelations = async (authId: string) => {
    const { data } = await supabase
      .from("User_Follows")
      .select("following_id")
      .eq("follower_id", authId);
    if (data) setCurrentUserFollowingIds(data.map((f) => f.following_id));
  };

  const fetchFollowData = async (userId: string, currentUserId?: string) => {
    const { data: followers } = await supabase.from("User_Follows").select("follower_id").eq("following_id", userId);
    const { data: following } = await supabase.from("User_Follows").select("following_id").eq("follower_id", userId);

    setFollowerCount(followers?.length || 0);
    setFollowingCount(following?.length || 0);

    if (currentUserId) {
      setIsFollowing(followers?.some((f) => f.follower_id === currentUserId) || false);
      await fetchCurrentUserRelations(currentUserId);
    }
  };

  const fetchFollowersList = async (userId: string) => {
    const { data } = await supabase
      .from("User_Follows")
      .select("follower:Users!fk_follower(user_id, username, profile_image_link)")
      .eq("following_id", userId);
    if (data) setFollowersList(data.map((f: any) => f.follower).filter(Boolean));
    setShowFollowersModal(true);
  };

  const fetchFollowingList = async (userId: string) => {
    const { data } = await supabase
      .from("User_Follows")
      .select("following:Users!fk_following(user_id, username, profile_image_link)")
      .eq("follower_id", userId);
    if (data) setFollowingList(data.map((f: any) => f.following).filter(Boolean));
    setShowFollowingModal(true);
  };

  const fetchProfile = async (userId: string, currentUserId?: string) => {
    const { data, error } = await supabase.from("Users").select("*").eq("user_id", userId).maybeSingle();
    if (!error && data) {
      setProfile(data);
      setProfileImageUrl(data.profile_image_link || "");
      setBio(data.bio || "");
    }
    await fetchFollowData(userId, currentUserId);
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

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser) return;
    const isCurrentlyFollowing = currentUserFollowingIds.includes(targetUserId);
    if (isCurrentlyFollowing) {
      await supabase.from("User_Follows").delete().eq("follower_id", currentUser.id).eq("following_id", targetUserId);
      setCurrentUserFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
    } else {
      await supabase.from("User_Follows").insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
      setCurrentUserFollowingIds((prev) => [...prev, targetUserId]);
    }
    if (profile && targetUserId === profile.user_id) {
      setIsFollowing(!isCurrentlyFollowing);
      fetchFollowData(profile.user_id, currentUser.id);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from("Users")
      .update({ 
        profile_image_link: profileImageUrl,
        bio: bio 
      })
      .eq("user_id", profile.user_id);

    if (!error) {
      setProfile({ ...profile, profile_image_link: profileImageUrl, bio: bio });
      setShowSettings(false);
      alert("Profile updated!");
    }
  };

  const AuthorHeader = ({ user, userId, createdAt }: any) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <NavLink to={`/profile/${userId}`}>
        <img src={user?.profile_image_link || DEFAULT_AVATAR} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} alt="Avatar" />
      </NavLink>
      <div>
        <div style={{ fontWeight: "bold" }}>
          <NavLink to={`/profile/${userId}`} style={{ color: "white", textDecoration: "none" }}>{user?.username}</NavLink>
        </div>
        <div style={{ fontSize: 11, color: "#555" }}>{new Date(createdAt).toLocaleString()}</div>
      </div>
    </div>
  );

  const ModalUserRow = ({ user }: { user: UserProfile }) => {
    const isFollowingThisUser = currentUserFollowingIds.includes(user.user_id);
    const isMe = currentUser?.id === user.user_id;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <NavLink to={`/profile/${user.user_id}`} onClick={() => { setShowFollowersModal(false); setShowFollowingModal(false); }} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "white" }}>
          <img src={user.profile_image_link || DEFAULT_AVATAR} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} alt={user.username} />
          <span style={{ fontWeight: "500" }}>{user.username}</span>
        </NavLink>
        {!isMe && currentUser && (
          <button onClick={() => handleFollowToggle(user.user_id)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: isFollowingThisUser ? "1px solid #444" : "none", background: isFollowingThisUser ? "transparent" : "#3b82f6", color: "white" }}>
            {isFollowingThisUser ? "Unfollow" : "Follow"}
          </button>
        )}
      </div>
    );
  };

  const UserModal = ({ isOpen, onClose, title, list }: { isOpen: boolean; onClose: () => void; title: string; list: UserProfile[] }) => {
    if (!isOpen) return null;
    return (
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1100 }}>
        <div style={{ background: "#111", padding: 24, borderRadius: 12, width: 380, border: "1px solid #333", maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
          {list.length === 0 ? <p style={{ color: "#555", textAlign: "center" }}>No users found.</p> : list.map((u) => <ModalUserRow key={u.user_id} user={u} />)}
        </div>
      </div>
    );
  };

  const RenderReplies = ({ allReplies, parentId, postId, depth = 0 }: any) => {
    const children = allReplies.filter((r: any) => r.parent_reply_id === parentId);
    if (!children.length) return null;
    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0, borderLeft: depth > 0 ? "2px solid #222" : "none", paddingLeft: depth > 0 ? 15 : 0 }}>
        {children.map((reply: any) => {
          const isLiked = reply.Reply_Likes.some((l: any) => l.user_id === currentUser?.id);
          const isDisliked = reply.Reply_Dislikes.some((d: any) => d.user_id === currentUser?.id);
          return (
            <div key={reply.reply_id} style={{ marginTop: 12, background: "#111", padding: 14, borderRadius: 12, border: "1px solid #222" }}>
              <AuthorHeader user={reply.Users} userId={reply.user_id} createdAt={reply.created_at} />
              <p style={{ fontSize: 14, color: "#ccc", margin: "8px 0", overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{reply.text}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => { if (!currentUser) return; const { data: existing } = await supabase.from("Reply_Likes").select("*").eq("reply_id", reply.reply_id).eq("user_id", currentUser.id).maybeSingle(); if (existing) await supabase.from("Reply_Likes").delete().eq("reply_id", reply.reply_id).eq("user_id", currentUser.id); else await supabase.from("Reply_Likes").insert([{ reply_id: reply.reply_id, user_id: currentUser.id }]); fetchPosts(profile!.user_id); }} style={{ background: isLiked ? "#3b82f633" : "#222", color: "white", padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer" }}>👍 {reply.Reply_Likes.length}</button>
                <button onClick={async () => { if (!currentUser) return; const { data: existing } = await supabase.from("Reply_Dislikes").select("*").eq("reply_id", reply.reply_id).eq("user_id", currentUser.id).maybeSingle(); if (existing) await supabase.from("Reply_Dislikes").delete().eq("reply_id", reply.reply_id).eq("user_id", currentUser.id); else await supabase.from("Reply_Dislikes").insert([{ reply_id: reply.reply_id, user_id: currentUser.id }]); fetchPosts(profile!.user_id); }} style={{ background: isDisliked ? "#ef444433" : "#222", color: "white", padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer" }}>👎 {reply.Reply_Dislikes.length}</button>
                <button onClick={() => setReplyingTo({ postId, replyId: reply.reply_id, username: reply.Users.username })} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 12 }}>Reply</button>
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
    <div style={{ maxWidth: 850, margin: "80px auto", padding: 20, color: "white", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <img src={profile.profile_image_link || DEFAULT_AVATAR} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid #333" }} alt="Avatar" />
          <div>
            <h2 style={{ margin: 0 }}>{profile.username}</h2>
            <div style={{ display: "flex", gap: 15, marginTop: 8 }}>
              <span onClick={() => fetchFollowersList(profile.user_id)} style={{ cursor: "pointer", fontSize: 14 }}><strong style={{ color: "#3b82f6" }}>{followerCount}</strong> Followers</span>
              <span onClick={() => fetchFollowingList(profile.user_id)} style={{ cursor: "pointer", fontSize: 14 }}><strong style={{ color: "#3b82f6" }}>{followingCount}</strong> Following</span>
            </div>
            {profile.bio && (
              <p style={{ marginTop: 12, color: "#aaa", fontSize: 14, maxWidth: 500, lineHeight: "1.4", whiteSpace: "pre-wrap" }}>
                {profile.bio}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {!isOwnProfile && <button onClick={() => handleFollowToggle(profile.user_id)} style={{ padding: "8px 24px", borderRadius: 8, background: isFollowing ? "#1a1a1a" : "#3b82f6", color: "white", border: isFollowing ? "1px solid #333" : "none", cursor: "pointer", fontWeight: "bold" }}>{isFollowing ? "Unfollow" : "Follow"}</button>}
          {isOwnProfile && <button onClick={() => setShowSettings(true)} style={{ background: "#1a1a1a", border: "1px solid #333", color: "white", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}>Settings ⚙️</button>}
        </div>
      </div>

      <UserModal isOpen={showFollowersModal} onClose={() => setShowFollowersModal(false)} title="Followers" list={followersList} />
      <UserModal isOpen={showFollowingModal} onClose={() => setShowFollowingModal(false)} title="Following" list={followingList} />

      {showSettings && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#111", padding: 30, borderRadius: 12, width: 400, border: "1px solid #333" }}>
            <h3 style={{ marginTop: 0 }}>Account Settings</h3>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>Email Address</label>
              <div style={{ color: "#ccc", fontSize: 14, marginTop: 4, padding: "10px", background: "#000", borderRadius: 6, border: "1px solid #222" }}>{profile.email || "No email linked"}</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>Profile Image URL</label>
              <input type="text" value={profileImageUrl} onChange={(e) => setProfileImageUrl(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 4, borderRadius: 6, border: "1px solid #333", background: "#000", color: "white", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." style={{ width: "100%", padding: 10, marginTop: 4, borderRadius: 6, border: "1px solid #333", background: "#000", color: "white", boxSizing: "border-box", minHeight: 80, resize: "vertical", fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleUpdateProfile} style={{ flex: 1, padding: 10, background: "#3b82f6", border: "none", color: "white", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>Save Changes</button>
              <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: 10, background: "#333", border: "none", color: "white", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
            </div>
            <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #222" }} />
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} style={{ width: "100%", padding: 10, background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 6, cursor: "pointer" }}>Log Out</button>
          </div>
        </div>
      )}

      {posts.map((post) => {
        const isLiked = post.Post_Likes.some((l) => l.user_id === currentUser?.id);
        const isDisliked = post.Post_Dislikes.some((d) => d.user_id === currentUser?.id);
        return (
          <div key={post.post_id} style={{ background: "#0a0a0a", padding: 24, borderRadius: 12, border: "1px solid #1a1a1a", marginBottom: 20 }}>
            <AuthorHeader user={post.Users} userId={post.user_id} createdAt={post.created_at} />
            <p style={{ fontSize: 16, color: "#ddd", margin: "14px 0", overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{post.text}</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={async () => { if (!currentUser) return; const { data: existing } = await supabase.from("Post_Likes").select("*").eq("post_id", post.post_id).eq("user_id", currentUser.id).maybeSingle(); if (existing) await supabase.from("Post_Likes").delete().eq("post_id", post.post_id).eq("user_id", currentUser.id); else await supabase.from("Post_Likes").insert([{ post_id: post.post_id, user_id: currentUser.id }]); fetchPosts(profile.user_id); }} style={{ background: isLiked ? "#3b82f633" : "#1a1a1a", color: "white", padding: "6px 14px", borderRadius: 8, border: "1px solid #333", cursor: "pointer" }}>👍 {post.Post_Likes.length}</button>
              <button onClick={async () => { if (!currentUser) return; const { data: existing } = await supabase.from("Post_Dislikes").select("*").eq("post_id", post.post_id).eq("user_id", currentUser.id).maybeSingle(); if (existing) await supabase.from("Post_Dislikes").delete().eq("post_id", post.post_id).eq("user_id", currentUser.id); else await supabase.from("Post_Dislikes").insert([{ post_id: post.post_id, user_id: currentUser.id }]); fetchPosts(profile.user_id); }} style={{ background: isDisliked ? "#ef444433" : "#1a1a1a", color: "white", padding: "6px 14px", borderRadius: 8, border: "1px solid #333", cursor: "pointer" }}>👎 {post.Post_Dislikes.length}</button>
              <button onClick={() => setExpandedPosts((prev) => ({ ...prev, [post.post_id]: !prev[post.post_id] }))} style={{ background: "none", border: "1px solid #333", color: "#3b82f6", padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>{expandedPosts[post.post_id] ? "Hide Replies" : post.Forum_Replies.length > 0 ? `See ${post.Forum_Replies.length} Replies` : "Reply"}</button>
            </div>
            {expandedPosts[post.post_id] && (
              <div style={{ marginTop: 16, borderTop: "1px solid #1a1a1a", paddingTop: 10 }}>
                <RenderReplies allReplies={post.Forum_Replies} parentId={null} postId={post.post_id} />
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <input type="text" placeholder={replyingTo?.postId === post.post_id ? `Replying to ${replyingTo.username}...` : "Write a reply..."} value={replyText[post.post_id] || ""} onChange={(e) => setReplyText({ ...replyText, [post.post_id]: e.target.value })} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #222", background: "#000", color: "white" }} />
                  <button onClick={() => { if (!currentUser) return; const payload: any = { post_id: post.post_id, user_id: currentUser.id, text: replyText[post.post_id] }; if (replyingTo?.postId === post.post_id) payload.parent_reply_id = replyingTo.replyId; supabase.from("Forum_Replies").insert([payload]).then(() => { setReplyText({ ...replyText, [post.post_id]: "" }); setReplyingTo(null); fetchPosts(profile.user_id); }); }} style={{ padding: "8px 18px", borderRadius: 8, background: "#3b82f6", border: "none", color: "white", cursor: "pointer", fontWeight: "bold" }}>Reply</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}