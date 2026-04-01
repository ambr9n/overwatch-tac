import React, { useEffect, useState } from 'react';
import { supabase } from '../Supabase';

interface ForumReply {
  reply_id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  is_deleted: boolean;
  parent_reply_id?: string;
  Users: { username: string; profile_image_link: string; };
  Reply_Likes: { user_id: string }[];
}

interface ForumPost {
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  is_deleted: boolean;
  Users: { username: string; profile_image_link: string; };
  Post_Likes: { user_id: string }[];
  Forum_Replies: ForumReply[];
}

// MOD LIST
const ADMIN_USERS = ["06dceda7-8a9a-4ed5-8b65-f1a8fb85c528", "38750a9c-ad2a-442f-a553-a3116f548c31"];

export default function Forum({ currentUser }: { currentUser: any }) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<{ postId: string, replyId: string, username: string } | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({});

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("Forum_Posts")
      .select(`
        post_id, user_id, text, created_at, is_deleted,
        Users (username, profile_image_link),
        Post_Likes (user_id), 
        Forum_Replies (
          reply_id, user_id, text, created_at, is_deleted, parent_reply_id,
          Users (username, profile_image_link),
          Reply_Likes (user_id)
        )
      `)
      .order("created_at", { ascending: false });

    if (!error) setPosts((data as any) || []);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
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

  const AuthorHeader = ({ user, userId, createdAt, showDelete, onDelete }: any) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center' }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img 
          src={user?.profile_image_link || "https://i.imgur.com/HeIi0wU.png"} 
          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: 'cover' }} 
        />
        <div>
          <div style={{ fontWeight: "bold", display: 'flex', alignItems: 'center', gap: 8 }}>
            {ADMIN_USERS.includes(userId) && <span style={{ background: "#ef4444", fontSize: 10, padding: "2px 6px", borderRadius: 4, color: 'white' }}>MOD</span>}
            <span style={{ color: 'white' }}>{user?.username}</span>
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>{new Date(createdAt).toLocaleString()}</div>
        </div>
      </div>
      {showDelete && <button onClick={onDelete} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}>🗑️</button>}
    </div>
  );

  const RenderReplies = ({ allReplies, parentId, postId, depth = 0 }: { allReplies: ForumReply[], parentId: string | null, postId: string, depth?: number }) => {
    const children = allReplies.filter(r => r.parent_reply_id === parentId);
    if (children.length === 0) return null;

    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0, borderLeft: depth > 0 ? "2px solid #222" : "none", paddingLeft: depth > 0 ? 15 : 0 }}>
        {children.map(reply => {
          const isReplyLiked = reply.Reply_Likes?.some(l => l.user_id === currentUser?.id);
          return (
            <div key={reply.reply_id} style={{ marginTop: 15 }}>
              <div style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #222' }}>
                <AuthorHeader 
                  user={reply.Users} 
                  userId={reply.user_id} 
                  createdAt={reply.created_at}
                  showDelete={currentUser?.id === reply.user_id && !reply.is_deleted}
                  onDelete={() => { if(window.confirm("Delete?")) supabase.from("Forum_Replies").update({is_deleted: true}).eq("reply_id", reply.reply_id).then(fetchPosts)}}
                />
                
                <div style={{ margin: '14px 0' }}>
                  {reply.is_deleted ? (
                    <p style={{ color: "#444", fontSize: 14, fontStyle: "italic", margin: 0 }}>[Reply deleted]</p>
                  ) : (
                    <p style={{ fontSize: 14, color: '#ccc', margin: 0 }}>{reply.text}</p>
                  )}
                </div>

                {!reply.is_deleted && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button onClick={() => handleReplyLike(reply.reply_id)} style={{ background: isReplyLiked ? "#3b82f633" : "#222", border: isReplyLiked ? "1px solid #3b82f6" : "1px solid #333", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", display: 'flex', alignItems: 'center', gap: 5 }}>
                      👍 {reply.Reply_Likes?.length || 0}
                    </button>
                    <button onClick={() => setReplyingTo({ postId, replyId: reply.reply_id, username: reply.Users.username })} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12 }}>Reply</button>
                  </div>
                )}
              </div>
              <RenderReplies allReplies={allReplies} parentId={reply.reply_id} postId={postId} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px", color: "white", fontFamily: 'sans-serif', scrollbarGutter: 'stable' } as any}>
      <h2 style={{ marginBottom: 20 }}>Forum</h2>
      
      <div style={{ marginBottom: 30, display: "flex", gap: 10 }}>
        <input value={newPostText} onChange={(e) => setNewPostText(e.target.value)} placeholder="What's on your mind?" style={{ flex: 1, padding: 12, borderRadius: 8, background: "#0a0a0a", border: "1px solid #333", color: "white" }} />
        <button onClick={() => { if (!newPostText.trim() || !currentUser) return; supabase.from("Forum_Posts").insert([{ text: newPostText, user_id: currentUser.id }]).then(() => {setNewPostText(""); fetchPosts();}); }} style={{ padding: "10px 24px", borderRadius: 8, background: "#3b82f6", color: "white", cursor: "pointer", border: 'none', fontWeight: 'bold' }}>Post</button>
      </div>

      {posts.map((post) => {
        const replyCount = post.Forum_Replies?.filter(r => !r.is_deleted).length || 0;
        const isExpanded = expandedPosts[post.post_id];

        return (
          <div key={post.post_id} style={{ background: "#0a0a0a", padding: 24, borderRadius: 12, border: "1px solid #1a1a1a", marginBottom: 20 }}>
            <AuthorHeader 
              user={post.Users} 
              userId={post.user_id} 
              createdAt={post.created_at}
              showDelete={currentUser?.id === post.user_id && !post.is_deleted}
              onDelete={() => { if(window.confirm("Delete?")) supabase.from("Forum_Posts").update({is_deleted: true}).eq("post_id", post.post_id).then(fetchPosts)}}
            />

            <div style={{ margin: "18px 0" }}>
              {post.is_deleted ? (
                <p style={{ color: "#444", fontStyle: "italic", margin: 0 }}>[This post has been removed by the author]</p>
              ) : (
                <p style={{ fontSize: '1rem', color: '#ddd', margin: 0 }}>{post.text}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                {!post.is_deleted && (
                  <button onClick={() => handleLike(post.post_id)} style={{ background: post.Post_Likes?.some(l => l.user_id === currentUser?.id) ? "#3b82f633" : "#1a1a1a", border: "1px solid #333", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", display: 'flex', alignItems: 'center', gap: 6 }}>
                    👍 {post.Post_Likes?.length || 0}
                  </button>
                )}
                
                <button 
                    onClick={() => setExpandedPosts(prev => ({ ...prev, [post.post_id]: !prev[post.post_id] }))}
                    style={{ background: 'none', border: '1px solid #333', color: '#3b82f6', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem' }}
                >
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
                    <input type="text" placeholder="Write a reply..." value={replyText[post.post_id] || ""} onChange={(e) => setReplyText({ ...replyText, [post.post_id]: e.target.value })} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #222", background: "#000", color: "white" }} />
                    <button onClick={() => {
                      const payload: any = { post_id: post.post_id, user_id: currentUser.id, text: replyText[post.post_id] };
                      if (replyingTo?.postId === post.post_id) payload.parent_reply_id = replyingTo.replyId;
                      supabase.from("Forum_Replies").insert([payload]).then(() => { setReplyText({...replyText, [post.post_id]: ""}); setReplyingTo(null); fetchPosts(); });
                    }} style={{ background: "#3b82f6", color: "white", padding: "8px 18px", borderRadius: "8px", border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Reply</button>
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