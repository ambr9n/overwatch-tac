import React, { useEffect, useState } from 'react';
import { supabase } from '../Supabase';

// --- 1. TYPES & INTERFACES ---
interface ForumReply {
  reply_id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  Users: { username: string; profile_image_link: string; };
  Reply_Likes: { user_id: string }[]; // Changed from 'count' to 'user_id' for checking
}

interface ForumPost {
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  Users: { username: string; profile_image_link: string; };
  Post_Likes: { user_id: string }[]; // Changed from 'count' to 'user_id' for checking
  Forum_Replies: ForumReply[];
}

const ADMIN_USERS = ["06dceda7-8a9a-4ed5-8b65-f1a8fb85c528", "38750a9c-ad2a-442f-a553-a3116f548c31"];

export default function Forum({ currentUser }: { currentUser: any }) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("Forum_Posts")
      .select(`
        post_id, user_id, text, created_at,
        Users (username, profile_image_link),
        Post_Likes (user_id), 
        Forum_Replies (
          reply_id, user_id, text, created_at,
          Users (username, profile_image_link),
          Reply_Likes (user_id)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) console.error("Fetch error:", error.message);
    else setPosts((data as any) || []);
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase.channel('forum_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Forum_Posts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Forum_Replies' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Post_Likes' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Reply_Likes' }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- ACTIONS ---
  const handleLike = async (postId: string) => {
    if (!currentUser) return alert("Log in to like!");
    const { data: existing } = await supabase.from("Post_Likes").select("*").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle();
    if (existing) await supabase.from("Post_Likes").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    else await supabase.from("Post_Likes").insert([{ post_id: postId, user_id: currentUser.id }]);
    fetchPosts();
  };

  const handleReplyLike = async (replyId: string) => {
    if (!currentUser) return;
    const { data: existing } = await supabase.from("Reply_Likes").select("*").eq("reply_id", replyId).eq("user_id", currentUser.id).maybeSingle();
    if (existing) await supabase.from("Reply_Likes").delete().eq("reply_id", replyId).eq("user_id", currentUser.id);
    else await supabase.from("Reply_Likes").insert([{ reply_id: replyId, user_id: currentUser.id }]);
    fetchPosts();
  };

  const handleReply = async (postId: string) => {
    const text = replyText[postId];
    if (!text?.trim() || !currentUser) return;
    const { error } = await supabase.from("Forum_Replies").insert([{ post_id: postId, user_id: currentUser.id, text: text.trim() }]);
    if (!error) { setReplyText(prev => ({ ...prev, [postId]: "" })); fetchPosts(); }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px", color: "white" }}>
      <h2>Forum</h2>
      
      <div style={{ marginBottom: 40, display: "flex", gap: 10 }}>
        <input 
          value={newPostText} 
          onChange={(e) => setNewPostText(e.target.value)}
          placeholder="What's on your mind?"
          style={{ flex: 1, padding: 12, borderRadius: 8, background: "#111", border: "1px solid #333", color: "white" }}
        />
        <button onClick={() => {
            if (!newPostText.trim() || !currentUser) return;
            supabase.from("Forum_Posts").insert([{ text: newPostText, user_id: currentUser.id }]).then(() => {setNewPostText(""); fetchPosts();});
        }} style={{ padding: "10px 20px", borderRadius: 8, background: "#3b82f6", color: "white", border: "none", cursor: "pointer" }}>Post</button>
      </div>

      {posts.map((post) => {
        // CHECK IF USER LIKED POST
        const isPostLiked = post.Post_Likes?.some(l => l.user_id === currentUser?.id);

        return (
          <div key={post.post_id} style={{ background: "#111", padding: 24, borderRadius: 12, border: "1px solid #2e2e2e", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={post.Users?.profile_image_link || "https://i.imgur.com/HeIi0wU.png"} style={{ width: 45, height: 45, borderRadius: "50%" }} />
              <div>
                <div style={{ fontWeight: "bold" }}>{post.Users?.username || "Anonymous"}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{new Date(post.created_at).toLocaleString()}</div>
              </div>
            </div>

            <p style={{ margin: "20px 0", fontSize: '1.1rem', color: '#eee' }}>{post.text}</p>

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button 
                onClick={() => handleLike(post.post_id)} 
                style={{ 
                  background: isPostLiked ? "#444" : "#222", // LIGHTER BACKGROUND IF LIKED
                  border: isPostLiked ? "1px solid #3b82f6" : "1px solid #333", // BLUE BORDER IF LIKED
                  color: "white", padding: "5px 12px", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" 
                }}
              >
                👍 {post.Post_Likes?.length || 0}
              </button>
            </div>

            <div style={{ borderTop: "1px solid #222", paddingTop: 20 }}>
              {post.Forum_Replies?.map((reply) => {
                  const isReplyLiked = reply.Reply_Likes?.some(l => l.user_id === currentUser?.id);

                  return (
                    <div key={reply.reply_id} style={{ display: "flex", gap: 12, marginBottom: 15, paddingLeft: 10 }}>
                      {/* Reply Avatar */}
                      <img 
                        src={reply.Users?.profile_image_link || "https://i.imgur.com/HeIi0wU.png"} 
                        style={{ width: 35, height: 35, borderRadius: "50%" }} 
                      />
                      
                      <div style={{ flex: 1 }}>
                        {/* Reply Bubble */}
                        <div style={{ background: '#181818', padding: '12px 16px', borderRadius: '12px' }}>
                          {/* Header matching Main Post style */}
                          <div style={{ marginBottom: 4 }}>
                            <div style={{ fontWeight: "bold", fontSize: 13, color: '#eee' }}>
                              {reply.Users?.username || "Anonymous"}
                            </div>
                            <div style={{ fontSize: 11, color: "#666" }}>
                              {new Date(reply.created_at).toLocaleString()}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div style={{ fontSize: 14, color: '#ccc', marginTop: 8 }}>
                            {reply.text}
                          </div>
                        </div>
                        
                        {/* Unified Like Button */}
                        <button 
                          onClick={() => handleReplyLike(reply.reply_id)}
                          style={{ 
                            background: isReplyLiked ? "#444" : "#222", 
                            border: isReplyLiked ? "1px solid #3b82f6" : "1px solid #333", 
                            color: "white", 
                            padding: "5px 12px", 
                            borderRadius: 6, 
                            cursor: "pointer", 
                            fontSize: "0.85rem", 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 5, 
                            marginTop: 8,
                            transition: "all 0.2s" 
                          }}
                        >
                          <span>👍</span> 
                          <span>{reply.Reply_Likes?.length || 0}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <input
                  type="text" placeholder="Write a reply..."
                  value={replyText[post.post_id] || ""}
                  onChange={(e) => setReplyText({ ...replyText, [post.post_id]: e.target.value })}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #333", background: "#050505", color: "white" }}
                />
                <button onClick={() => handleReply(post.post_id)} style={{ background: "#3b82f6", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}>Reply</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}