import { useEffect, useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { supabase } from "../Supabase";

interface User {
  user_id: string;
  username: string;
  profile_image_link: string;
  is_mod?: boolean;
  bio?: string;
}

interface ForumPost {
  post_id: string;
  text: string;
  created_at: string;
  user_id: string;
  Users: User;
  Post_Likes: { user_id: string }[];
  Post_Dislikes: { user_id: string }[];
  Forum_Replies: any[];
}

const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

/**
 * CUSTOM MODAL COMPONENT (Direct Copy from Forum/Profile)
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

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [enrichedUser, setEnrichedUser] = useState<any>(null);
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({});
  
  // Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'post' | 'reply'; id: string | null }>({
    isOpen: false,
    type: 'post',
    id: null
  });

  useEffect(() => {
    const fetchSessionUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase.from("Users").select("*").eq("user_id", authUser.id).maybeSingle();
        setEnrichedUser(userData);
      }
    };
    fetchSessionUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchUserPosts();
    }
  }, [userId]);

  const fetchUserData = async () => {
    const { data, error } = await supabase.from("Users").select("*").eq("user_id", userId).maybeSingle();
    if (!error && data) setUser(data);
  };

  const fetchUserPosts = async () => {
    const { data } = await supabase.from("Forum_Posts")
      .select(`*, Users (*), Post_Likes (user_id), Post_Dislikes (user_id), Forum_Replies (*)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setPosts((data as any) || []);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    const table = deleteModal.type === 'post' ? "Forum_Posts" : "Forum_Replies";
    const column = deleteModal.type === 'post' ? "post_id" : "reply_id";
    
    await supabase.from(table).delete().eq(column, deleteModal.id);
    setDeleteModal({ isOpen: false, type: 'post', id: null });
    fetchUserPosts();
  };

  if (!user) return <div style={{ color: 'white', padding: '100px', textAlign: 'center' }}>Loading Profile...</div>;

  return (
    <div style={{ maxWidth: 850, margin: "80px auto", padding: 20, color: "white", fontFamily: 'sans-serif' }}>
      
      <CustomModal 
        isOpen={deleteModal.isOpen} 
        title={deleteModal.type === 'post' ? "Delete Post?" : "Delete Reply?"} 
        confirmText="Delete Forever" 
        confirmColor="#ff4d4d" 
        onConfirm={handleDeleteConfirm} 
        onCancel={() => setDeleteModal({ isOpen: false, type: 'post', id: null })}
      >
        {deleteModal.type === 'post' ? "Are you sure? This will permanently delete this post and ALL replies." : "Are you sure? This will permanently delete this reply."}
      </CustomModal>

      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
        <img src={user.profile_image_link || DEFAULT_AVATAR} style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid #333", objectFit: 'cover' }} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user.is_mod && (
              <span style={{ 
                background: "linear-gradient(45deg, #e60082, #f65dfb)", 
                fontSize: 12, padding: "3px 8px", borderRadius: 4, color: 'white', fontWeight: 'bold', textTransform: 'uppercase' 
              }}>MOD</span>
            )}
            <h2 style={{ margin: 0 }}>{user.username}</h2>
          </div>
          <p style={{ color: "#aaa", marginTop: 8 }}>{user.bio || "No bio yet."}</p>
        </div>
      </div>

      <h2 style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: "10px", marginBottom: "30px", fontSize: '1.2rem' }}>Forum Posts</h2>

      {posts.map(post => {
        const isMod = enrichedUser?.is_mod;
        const isOwner = enrichedUser?.user_id === post.user_id;
        const isExpanded = expandedPosts[post.post_id];

        return (
          <div key={post.post_id} style={{ background: "#0a0a0a", padding: 24, borderRadius: 12, border: "1px solid #1a1a1a", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center' }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={user.profile_image_link || DEFAULT_AVATAR} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: 'cover' }} />
                <div>
                  <div style={{ fontWeight: "bold", fontSize: 14 }}>{user.username}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{new Date(post.created_at).toLocaleString()}</div>
                </div>
              </div>
              {(isMod || isOwner) && (
                <button onClick={() => setDeleteModal({ isOpen: true, type: 'post', id: post.post_id })} style={{ background: "#1a1a1a", border: "1px solid #333", color: "white", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>🗑️</button>
              )}
            </div>

            <p style={{ fontSize: '1rem', color: '#ddd', margin: "18px 0", overflowWrap: 'anywhere' }}>{post.text}</p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button style={{ background: "#1a1a1a", border: "1px solid #333", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: '0.8rem' }}>👍 {post.Post_Likes?.length || 0}</button>
              <button style={{ background: "#1a1a1a", border: "1px solid #333", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: '0.8rem' }}>👎 {post.Post_Dislikes?.length || 0}</button>
              <button 
                onClick={() => setExpandedPosts(prev => ({ ...prev, [post.post_id]: !prev[post.post_id] }))} 
                style={{ background: 'none', border: '1px solid #333', color: '#dd65fbff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {isExpanded ? 'Hide Replies' : (post.Forum_Replies?.length || 0) > 0 ? `See ${post.Forum_Replies.length} Replies` : 'Reply'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserProfilePage;