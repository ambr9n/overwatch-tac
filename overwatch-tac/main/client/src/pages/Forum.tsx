import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../Supabase';
import { NavLink, useNavigate } from 'react-router-dom';

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

interface ForumReply {
  reply_id: string; post_id: string; user_id: string; text: string;
  created_at: string; is_deleted: boolean; parent_reply_id?: string;
  Users: any; Reply_Likes: { user_id: string }[]; Reply_Dislikes: { user_id: string }[];
}

interface ForumPost {
  post_id: string; user_id: string; text: string; created_at: string;
  is_deleted: boolean; Users: any; Post_Likes: { user_id: string }[];
  Post_Dislikes: { user_id: string }[]; Forum_Replies: ForumReply[]; score?: number; 
}

interface ExtendedUser { id: string; is_mod?: boolean; [key: string]: any; }

const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

export default function Forum({ currentUser }: { currentUser: ExtendedUser | any }) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<{ postId: string, replyId: string, username: string } | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({});
  
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const isFetchingRef = useRef(false);
  const pageRef = useRef(0);

  const [enrichedUser, setEnrichedUser] = useState<ExtendedUser | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'following' | 'algorithmic'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  
  const PAGE_SIZE = 20;

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'post' | 'reply'; id: string | null }>({
    isOpen: false, type: 'post', id: null
  });

  const navigate = useNavigate();
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (userSearch.trim().length > 1) {
        const { data } = await supabase
          .from("Users")
          .select("user_id, username, profile_image_link")
          .ilike("username", `%${userSearch}%`)
          .limit(5);
        setSearchResults(data || []);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearch]);

  const calculateAlgorithmicScore = (post: ForumPost) => {
    const likes = post.Post_Likes?.length || 0;
    const dislikes = post.Post_Dislikes?.length || 0;
    const replies = post.Forum_Replies?.length || 0;
    const engagement = (likes * 1) + (replies * 3) - (dislikes * 1);
    const postDate = new Date(post.created_at).getTime();
    const now = new Date().getTime();
    const hoursSincePosted = Math.max(1, (now - postDate) / (1000 * 60 * 60));
    return engagement / Math.pow((hoursSincePosted + 2), 1.5);
  };

  const fetchPosts = useCallback(async (reset = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetchingMore(true);

    if (reset) pageRef.current = 0;
    const from = pageRef.current * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("Forum_Posts")
      .select(`
        post_id, user_id, text, created_at, is_deleted,
        Users (username, profile_image_link, is_mod),
        Post_Likes (user_id),
        Post_Dislikes (user_id), 
        Forum_Replies (
          reply_id, user_id, text, created_at, is_deleted, parent_reply_id,
          Users (username, profile_image_link, is_mod),
          Reply_Likes (user_id),
          Reply_Dislikes (user_id)
        )
      `);

    if (sortBy === 'newest' || activeTab === 'algorithmic') {
      query = query.order("created_at", { ascending: false });
    }

    if (activeTab === 'following' && currentUser) {
      const { data: followingData } = await supabase.from("User_Follows").select("following_id").eq("follower_id", currentUser.id);
      const followingIds = followingData?.map(f => f.following_id) || [];
      query = query.in("user_id", followingIds);
    }

    const { data, error } = await query;

    if (!error && data) {
      let processedData = (data as unknown as ForumPost[]).map(post => ({
        ...post,
        score: calculateAlgorithmicScore(post)
      }));
      
      if (activeTab === 'algorithmic') {
        processedData.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else if (sortBy === 'popular') {
        processedData.sort((a, b) => {
          const likesA = a.Post_Likes?.length || 0;
          const likesB = b.Post_Likes?.length || 0;
          if (likesB !== likesA) return likesB - likesA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      const paginatedData = processedData.slice(from, to + 1);
      setPosts(prev => reset ? paginatedData : [...prev, ...paginatedData]);
      setHasMore(paginatedData.length === PAGE_SIZE);
      pageRef.current += 1;
    }
    
    setLoading(false);
    setIsFetchingMore(false);
    isFetchingRef.current = false;
  }, [activeTab, sortBy, currentUser]);

  useEffect(() => { fetchPosts(true); }, [activeTab, sortBy]);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPosts();
      }
    });
    if (node) observer.current.observe(node);
  }, [isFetchingMore, hasMore, fetchPosts]);

  useEffect(() => {
    const syncUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('Users').select('is_mod').eq('user_id', user.id).maybeSingle();
        setEnrichedUser({ ...(user || {}), id: user.id, is_mod: profile?.is_mod || false });
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    };
    syncUser();
  }, []);

  const getUserData = (userField: any) => Array.isArray(userField) ? userField[0] : userField;

  const handleLike = async (postId: string) => {
    await supabase.from("Post_Dislikes").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    const { data: existing } = await supabase.from("Post_Likes").select("*").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle();
    if (existing) {
      await supabase.from("Post_Likes").delete().eq("post_id", postId).eq("user_id", currentUser.id);
      setPosts(prev => prev.map(p => p.post_id !== postId ? p : {
        ...p,
        Post_Likes: p.Post_Likes.filter(l => l.user_id !== currentUser.id),
        Post_Dislikes: p.Post_Dislikes.filter(d => d.user_id !== currentUser.id),
      }));
    } else {
      await supabase.from("Post_Likes").insert([{ post_id: postId, user_id: currentUser.id }]);
      setPosts(prev => prev.map(p => p.post_id !== postId ? p : {
        ...p,
        Post_Likes: [...p.Post_Likes, { user_id: currentUser.id }],
        Post_Dislikes: p.Post_Dislikes.filter(d => d.user_id !== currentUser.id),
      }));
    }
  };

  const handleDislike = async (postId: string) => {
    await supabase.from("Post_Likes").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    const { data: existing } = await supabase.from("Post_Dislikes").select("*").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle();
    if (existing) {
      await supabase.from("Post_Dislikes").delete().eq("post_id", postId).eq("user_id", currentUser.id);
      setPosts(prev => prev.map(p => p.post_id !== postId ? p : {
        ...p,
        Post_Likes: p.Post_Likes.filter(l => l.user_id !== currentUser.id),
        Post_Dislikes: p.Post_Dislikes.filter(d => d.user_id !== currentUser.id),
      }));
    } else {
      await supabase.from("Post_Dislikes").insert([{ post_id: postId, user_id: currentUser.id }]);
      setPosts(prev => prev.map(p => p.post_id !== postId ? p : {
        ...p,
        Post_Likes: p.Post_Likes.filter(l => l.user_id !== currentUser.id),
        Post_Dislikes: [...p.Post_Dislikes, { user_id: currentUser.id }],
      }));
    }
  };

  const handleReplyLike = async (replyId: string, postId: string) => {
    await supabase.from("Reply_Dislikes").delete().eq("reply_id", replyId).eq("user_id", currentUser.id);
    const { data: existing } = await supabase.from("Reply_Likes").select("*").eq("reply_id", replyId).eq("user_id", currentUser.id).maybeSingle();
    const updateReply = (reply: ForumReply): ForumReply => {
      if (reply.reply_id !== replyId) return reply;
      return {
        ...reply,
        Reply_Likes: existing ? reply.Reply_Likes.filter(l => l.user_id !== currentUser.id) : [...reply.Reply_Likes, { user_id: currentUser.id }],
        Reply_Dislikes: reply.Reply_Dislikes.filter(d => d.user_id !== currentUser.id),
      };
    };
    if (existing) {
      await supabase.from("Reply_Likes").delete().eq("reply_id", replyId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("Reply_Likes").insert([{ reply_id: replyId, user_id: currentUser.id }]);
    }
    setPosts(prev => prev.map(p => p.post_id !== postId ? p : {
      ...p, Forum_Replies: p.Forum_Replies.map(updateReply)
    }));
  };

  const handleReplyDislike = async (replyId: string, postId: string) => {
    await supabase.from("Reply_Likes").delete().eq("reply_id", replyId).eq("user_id", currentUser.id);
    const { data: existing } = await supabase.from("Reply_Dislikes").select("*").eq("reply_id", replyId).eq("user_id", currentUser.id).maybeSingle();
    const updateReply = (reply: ForumReply): ForumReply => {
      if (reply.reply_id !== replyId) return reply;
      return {
        ...reply,
        Reply_Likes: reply.Reply_Likes.filter(l => l.user_id !== currentUser.id),
        Reply_Dislikes: existing ? reply.Reply_Dislikes.filter(d => d.user_id !== currentUser.id) : [...reply.Reply_Dislikes, { user_id: currentUser.id }],
      };
    };
    if (existing) {
      await supabase.from("Reply_Dislikes").delete().eq("reply_id", replyId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("Reply_Dislikes").insert([{ reply_id: replyId, user_id: currentUser.id }]);
    }
    setPosts(prev => prev.map(p => p.post_id !== postId ? p : {
      ...p, Forum_Replies: p.Forum_Replies.map(updateReply)
    }));
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    if (deleteModal.type === 'post') {
      const { error } = await supabase.from("Forum_Posts").delete().eq("post_id", deleteModal.id);
      if (!error) setPosts(prev => prev.filter(p => p.post_id !== deleteModal.id));
    } else {
      await supabase.from("Forum_Replies").delete().eq("reply_id", deleteModal.id);
      fetchPosts(true);
    }
    setDeleteModal({ isOpen: false, type: 'post', id: null });
  };

  const AuthorHeader = ({ user, userId, createdAt, showDelete, onDelete }: any) => {
    const userData = getUserData(user);
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NavLink to={`/profile/${userId}`}>
            <img src={userData?.profile_image_link || DEFAULT_AVATAR} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: 'cover' }} />
          </NavLink>
          <div>
            <div style={{ fontWeight: "bold", display: 'flex', alignItems: 'center', gap: 8 }}>
              {userData?.is_mod && <span style={{ background: "linear-gradient(45deg, #e60082, #f65dfb)", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>MOD</span>}
              <NavLink to={`/profile/${userId}`} style={{ color: 'white', textDecoration: 'none' }}>{userData?.username}</NavLink>
            </div>
            <div style={{ fontSize: 11, color: "#555" }}>{new Date(createdAt).toLocaleString()}</div>
          </div>
        </div>
        {showDelete && <button onClick={onDelete} style={{ background: "#1a1a1a", border: "1px solid #333", color: "white", padding: "6px 10px", borderRadius: 8, cursor: "pointer" }}>🗑️</button>}
      </div>
    );
  };

  const RenderReplies = ({ allReplies, parentId, postId, depth = 0 }: { allReplies: ForumReply[], parentId: string | null, postId: string, depth?: number }) => {
    const children = allReplies.filter(r => r.parent_reply_id === parentId);
    if (children.length === 0) return null;
    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0, borderLeft: depth > 0 ? "2px solid #222" : "none", paddingLeft: depth > 0 ? 15 : 0 }}>
        {children.map(reply => {
          const isReplyLiked = reply.Reply_Likes?.some(l => l.user_id === currentUser.id);
          const isReplyDisliked = reply.Reply_Dislikes?.some(d => d.user_id === currentUser.id);
          const canDeleteReply = enrichedUser?.is_mod || enrichedUser?.id === reply.user_id;
          const replyUserData = getUserData(reply.Users);
          return (
            <div key={reply.reply_id} style={{ marginTop: 15 }}>
              <div style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #222' }}>
                <AuthorHeader user={reply.Users} userId={reply.user_id} createdAt={reply.created_at} showDelete={canDeleteReply} onDelete={() => setDeleteModal({ isOpen: true, type: 'reply', id: reply.reply_id })} />
                <div style={{ margin: '14px 0' }}><p style={{ fontSize: 14, color: '#ccc', margin: 0, overflowWrap: 'anywhere' }}>{reply.text}</p></div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => handleReplyLike(reply.reply_id, postId)} style={{ background: isReplyLiked ? "#dd65fb33" : "#222", border: isReplyLiked ? "1px solid #253aefff" : "1px solid #333", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>👍 {reply.Reply_Likes?.length || 0}</button>
                  <button onClick={() => handleReplyDislike(reply.reply_id, postId)} style={{ background: isReplyDisliked ? "#ef444433" : "#222", border: isReplyDisliked ? "1px solid #ef4444" : "1px solid #333", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>👎 {reply.Reply_Dislikes?.length || 0}</button>
                  <button onClick={() => setReplyingTo({ postId, replyId: reply.reply_id, username: replyUserData?.username || "user" })} style={{ background: 'none', border: 'none', color: '#dd65fb', cursor: 'pointer', fontSize: 12 }}>Reply</button>
                </div>
              </div>
              <RenderReplies allReplies={allReplies} parentId={reply.reply_id} postId={postId} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoggedIn === false) {
    return (
      <div style={{ padding: "120px 40px 40px", color: "white", backgroundColor: "#111", minHeight: "100vh" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2 style={{ marginBottom: "40px", fontSize: "36px", fontWeight: "750", letterSpacing: "-1px" }}>Forum</h2>
          <div style={{
            textAlign: "center", padding: "60px",
            background: "#161616", borderRadius: "12px", border: "1px solid #282828",
          }}>
            <p style={{ color: "#777", fontSize: "18px", marginBottom: "20px" }}>
              Sign in or sign up to join the conversation.
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

  if (loading && pageRef.current === 0) return null;

  return (
    <div style={{ maxWidth: 850, margin: "80px auto 0 auto", padding: "20px", color: "white", background: '#000', minHeight: '100vh' }}>
      
      <h2 style={{ marginBottom: 20 }}>Forum</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {['all', 'following', 'algorithmic'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ 
              background: 'none', border: 'none', color: activeTab === tab ? '#f29fffff' : '#888', 
              padding: '10px 5px', cursor: 'pointer', fontWeight: 'bold', 
              borderBottom: activeTab === tab ? '2px solid #e856c6ff' : '2px solid transparent'
            }}>{tab === 'algorithmic' ? 'Feed' : tab === 'all' ? 'All Posts' : 'Following'}</button>
          ))}
        </div>
        {activeTab !== 'algorithmic' && (
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ background: '#111', color: '#ccc', border: '1px solid #333', padding: '5px 10px', borderRadius: '6px' }}>
            <option value="newest">Newest First</option>
            <option value="popular">Most Liked</option>
          </select>
        )}
      </div>

      <div style={{ marginBottom: 15, display: "flex", gap: 10 }}>
        <input value={newPostText} onChange={(e) => setNewPostText(e.target.value)} placeholder="What's on your mind?" style={{ flex: 1, padding: 12, borderRadius: 8, background: "#0a0a0a", border: "1px solid #333", color: "white" }} />
        <button onClick={() => { if (!newPostText.trim()) return; supabase.from("Forum_Posts").insert([{ text: newPostText, user_id: currentUser.id }]).then(() => {setNewPostText(""); fetchPosts(true);}); }} style={{ padding: "10px 24px", borderRadius: 8, background: "#dd65fb", color: "white", cursor: "pointer", border: 'none' }}>Post</button>
      </div>

      <CustomModal isOpen={deleteModal.isOpen} title="Delete?" confirmColor="#ff4d4d" onConfirm={confirmDelete} onCancel={() => setDeleteModal({ isOpen: false, type: 'post', id: null })}>Permanently delete this?</CustomModal>

      {posts.map((post, index) => {
        const isExpanded = expandedPosts[post.post_id];
        const isLiked = post.Post_Likes?.some(l => l.user_id === currentUser.id);
        const isDisliked = post.Post_Dislikes?.some(d => d.user_id === currentUser.id);
        
        return (
          <div key={post.post_id} ref={index === posts.length - 1 ? lastElementRef : null} style={{ background: "#0a0a0a", padding: 24, borderRadius: 12, border: "1px solid #1a1a1a", marginBottom: 20 }}>
            <AuthorHeader user={post.Users} userId={post.user_id} createdAt={post.created_at} showDelete={enrichedUser?.is_mod || enrichedUser?.id === post.user_id} onDelete={() => setDeleteModal({ isOpen: true, type: 'post', id: post.post_id })} />
            <div style={{ margin: "18px 0" }}><p style={{ fontSize: '1rem', color: '#ddd', overflowWrap: 'anywhere' }}>{post.text}</p></div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={() => handleLike(post.post_id)} style={{ background: isLiked ? "#dd65fb33" : "#1a1a1a", border: isLiked ? "1px solid #253aefff" : "1px solid #333", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>👍 {post.Post_Likes?.length || 0}</button>
              <button onClick={() => handleDislike(post.post_id)} style={{ background: isDisliked ? "#ef444433" : "#1a1a1a", border: isDisliked ? "1px solid #ef4444" : "1px solid #333", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>👎 {post.Post_Dislikes?.length || 0}</button>
              <button onClick={() => setExpandedPosts(prev => ({ ...prev, [post.post_id]: !prev[post.post_id] }))} style={{ background: 'none', border: '1px solid #333', color: '#dd65fbff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>{isExpanded ? 'Hide' : (post.Forum_Replies?.length || 0) > 0 ? `Replies (${post.Forum_Replies.length})` : 'Reply'}</button>
            </div>
            {isExpanded && (
              <div style={{ marginTop: 20, borderTop: '1px solid #1a1a1a', paddingTop: 10 }}>
                <RenderReplies allReplies={post.Forum_Replies || []} parentId={null} postId={post.post_id} />
                <div style={{ marginTop: 15, display: "flex", gap: 8 }}>
                  <input type="text" placeholder="Write a reply..." value={replyText[post.post_id] || ""} onChange={(e) => setReplyText({ ...replyText, [post.post_id]: e.target.value })} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #222", background: "#000", color: "white" }} />
                  <button onClick={() => {
                    const payload: any = { post_id: post.post_id, user_id: currentUser.id, text: replyText[post.post_id] };
                    if (replyingTo?.postId === post.post_id) payload.parent_reply_id = replyingTo.replyId;
                    supabase.from("Forum_Replies").insert([payload]).then(() => { setReplyText({...replyText, [post.post_id]: ""}); setReplyingTo(null); fetchPosts(true); });
                  }} style={{ background: "#dd65fb", color: "white", padding: "8px 18px", borderRadius: "8px", border: 'none', cursor: 'pointer' }}>Reply</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {isFetchingMore && <div style={{ textAlign: 'center', color: '#dd65fb' }}>Loading more...</div>}
    </div>
  );
}