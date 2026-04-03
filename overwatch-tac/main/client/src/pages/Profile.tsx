import React, { useEffect, useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { supabase } from "../Supabase";

const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

interface UserProfile {
  user_id: string;
  username: string;
  email?: string;
  profile_image_link: string;
}

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

  // Follow States
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<UserProfile[]>([]);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);
  const [currentUserFollowingIds, setCurrentUserFollowingIds] = useState<string[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // --- DATA FETCHING ---

  const fetchPosts = async (userId: string) => {
    // We specify the relationship explicitly using Users!Forum_Posts_user_id_fkey 
    // if there are multiple FKs, but usually Users(...) is enough if it's unique.
    const { data, error } = await supabase
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
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      setPosts((data as any) || []);
    }
  };

  const fetchFollowData = async (userId: string, currentUserId?: string) => {
    const { data: followers } = await supabase.from("User_Follows").select("follower_id").eq("following_id", userId);
    const { data: following } = await supabase.from("User_Follows").select("following_id").eq("follower_id", userId);

    setFollowerCount(followers?.length || 0);
    setFollowingCount(following?.length || 0);

    if (currentUserId) {
      setIsFollowing(followers?.some((f) => f.follower_id === currentUserId) || false);
      const { data: relations } = await supabase.from("User_Follows").select("following_id").eq("follower_id", currentUserId);
      if (relations) setCurrentUserFollowingIds(relations.map((f) => f.following_id));
    }
  };

  const fetchProfile = async (userId: string, currentUserId?: string) => {
    const { data, error } = await supabase.from("Users").select("*").eq("user_id", userId).maybeSingle();
    if (!error && data) {
      setProfile(data);
      setProfileImageUrl(data.profile_image_link || "");
      await fetchFollowData(userId, currentUserId);
      await fetchPosts(userId); // Load posts AFTER profile is confirmed
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      const profileId = uid || user?.id;
      if (profileId) {
        await fetchProfile(profileId, user?.id);
      }
    };
    init();
  }, [uid]);

  // --- HANDLERS ---

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser) return;
    const isCurrentlyFollowing = currentUserFollowingIds.includes(targetUserId);

    if (isCurrentlyFollowing) {
      await supabase.from("User_Follows").delete().eq("follower_id", currentUser.id).eq("following_id", targetUserId);
      setCurrentUserFollowingIds(prev => prev.filter(id => id !== targetUserId));
    } else {
      await supabase.from("User_Follows").insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
      setCurrentUserFollowingIds(prev => [...prev, targetUserId]);
    }
    if (profile) fetchFollowData(profile.user_id, currentUser.id);
  };

  const fetchFollowersList = async (userId: string) => {
    setModalLoading(true);
    setShowFollowersModal(true);
    const { data } = await supabase
      .from("User_Follows")
      .select("follower:Users!fk_follower(user_id, username, profile_image_link)")
      .eq("following_id", userId);
    if (data) setFollowersList(data.map((f: any) => f.follower).filter(Boolean));
    setModalLoading(false);
  };

  const fetchFollowingList = async (userId: string) => {
    setModalLoading(true);
    setShowFollowingModal(true);
    const { data } = await supabase
      .from("User_Follows")
      .select("following:Users!fk_following(user_id, username, profile_image_link)")
      .eq("follower_id", userId);
    if (data) setFollowingList(data.map((f: any) => f.following).filter(Boolean));
    setModalLoading(false);
  };

  // --- COMPONENTS ---

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
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <NavLink to={`/profile/${user.user_id}`} onClick={() => { setShowFollowersModal(false); setShowFollowingModal(false); }} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "white" }}>
          <img src={user.profile_image_link || DEFAULT_AVATAR} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} alt={user.username} />
          <span style={{ fontWeight: "500" }}>{user.username}</span>
        </NavLink>
        {currentUser?.id !== user.user_id && (
          <button onClick={() => handleFollowToggle(user.user_id)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: isFollowingThisUser ? "1px solid #444" : "none", background: isFollowingThisUser ? "transparent" : "#3b82f6", color: "white" }}>
            {isFollowingThisUser ? "Unfollow" : "Follow"}
          </button>
        )}
      </div>
    );
  };

  const UserModal = ({ isOpen, onClose, title, list }: any) => {
    if (!isOpen) return null;
    return (
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1100 }}>
        <div style={{ background: "#111", padding: 24, borderRadius: 12, width: 380, border: "1px solid #333", maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
          {modalLoading ? <p style={{ textAlign: "center", color: "#555" }}>Loading...</p> : list.length === 0 ? <p style={{ color: "#555", textAlign: "center" }}>No users found.</p> : list.map((u: any) => <ModalUserRow key={u.user_id} user={u} />)}
        </div>
      </div>
    );
  };

  if (!profile) return <div style={{ textAlign: "center", marginTop: 60, color: "white" }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: 850, margin: "80px auto", padding: 20, color: "white", fontFamily: "sans-serif" }}>
      {/* Profile Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={profile.profile_image_link || DEFAULT_AVATAR} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid #333" }} alt="Avatar" />
          <div>
            <h2 style={{ margin: 0 }}>{profile.username}</h2>
            <div style={{ display: "flex", gap: 15, marginTop: 8 }}>
              <span onClick={() => fetchFollowersList(profile.user_id)} style={{ cursor: "pointer", fontSize: 14 }}><strong style={{ color: "#3b82f6" }}>{followerCount}</strong> Followers</span>
              <span onClick={() => fetchFollowingList(profile.user_id)} style={{ cursor: "pointer", fontSize: 14 }}><strong style={{ color: "#3b82f6" }}>{followingCount}</strong> Following</span>
            </div>
          </div>
        </div>
        {currentUser?.id !== profile.user_id ? (
          <button onClick={() => handleFollowToggle(profile.user_id)} style={{ padding: "8px 24px", borderRadius: 8, background: isFollowing ? "#1a1a1a" : "#3b82f6", color: "white", border: isFollowing ? "1px solid #333" : "none", cursor: "pointer", fontWeight: "bold" }}>
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
        ) : (
          <button onClick={() => setShowSettings(true)} style={{ background: "#1a1a1a", border: "1px solid #333", color: "white", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}>Settings ⚙️</button>
        )}
      </div>

      <UserModal isOpen={showFollowersModal} onClose={() => setShowFollowersModal(false)} title="Followers" list={followersList} />
      <UserModal isOpen={showFollowingModal} onClose={() => setShowFollowingModal(false)} title="Following" list={followingList} />

      {/* Posts Section */}
      <h3 style={{ borderBottom: "1px solid #222", paddingBottom: 10, marginBottom: 20 }}>Posts</h3>
      {posts.length === 0 ? (
        <p style={{ color: "#555", textAlign: "center", marginTop: 40 }}>No posts yet.</p>
      ) : (
        posts.map((post) => (
          <div key={post.post_id} style={{ background: "#0a0a0a", padding: 24, borderRadius: 12, border: "1px solid #1a1a1a", marginBottom: 20 }}>
            <AuthorHeader user={post.Users} userId={post.user_id} createdAt={post.created_at} />
            <p style={{ fontSize: 16, color: "#ddd", margin: "14px 0" }}>{post.text}</p>
            <div style={{ display: "flex", gap: 12 }}>
               <button style={{ background: post.Post_Likes.some(l => l.user_id === currentUser?.id) ? "#3b82f633" : "#1a1a1a", color: "white", padding: "6px 14px", borderRadius: 8, border: "1px solid #333", cursor: "pointer" }}>
                👍 {post.Post_Likes.length}
              </button>
              <button onClick={() => setExpandedPosts(prev => ({ ...prev, [post.post_id]: !prev[post.post_id] }))} style={{ background: "none", border: "1px solid #333", color: "#3b82f6", padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>
                {expandedPosts[post.post_id] ? "Hide Replies" : `See ${post.Forum_Replies.length} Replies`}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}