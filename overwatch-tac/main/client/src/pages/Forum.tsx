import { useEffect, useState } from "react";
import type { ChangeEvent } from "react"; // type-only import
import { supabase } from "../Supabase";
import { Link } from "react-router-dom";

interface Reply {
  id: string;
  author_id: string;
  author_name: string;
  author_photo: string | null;
  message: string;
  timestamp: string;
}

interface ForumPost {
  id: string;
  author_id: string;
  author_name: string;
  author_photo: string | null;
  message: string;
  timestamp: string;
  likes: number;
  dislikes: number;
  replies: Reply[];
}

// Admin user IDs
const ADMIN_USERS = [
  "fXfFd71NClZdewsTF8ViDQXpYq42",
  "NvwzEQ1kk6h1uOU1Kt25ozDhnFT2",
  "3qNLKWK0UfU5pPpUUYD6lTiyeI83",
  "xoSjO0lQU7eiqnYgGON8RLgd4pt2"
];

export default function Forum() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});
  const [showPostBox, setShowPostBox] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null); // Supabase user

  // Load current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: user } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Load posts & subscribe to real-time changes
  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("forumPosts")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) console.error(error);
      else setPosts(data || []);
    };

    fetchPosts();

    // Real-time subscription
    const postSub = supabase
      .channel("public:forumPosts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forumPosts" },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postSub);
    };
  }, []);

  // CREATE POST
  const createPost = async () => {
    if (!currentUser || !newMessage.trim()) return;

    const { error } = await supabase.from("forumPosts").insert([
      {
        author_id: currentUser.id,
        author_name: currentUser.user_metadata.username || "Anonymous",
        author_photo: currentUser.user_metadata.photoURL || null,
        message: newMessage,
        timestamp: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        replies: []
      }
    ]);

    if (error) console.error(error);
    setNewMessage("");
    setShowPostBox(false);
  };

  // DELETE POST
  const deletePost = async (post: ForumPost) => {
    if (!window.confirm("Delete this post?")) return;
    if (!currentUser) return;

    if (post.author_id === currentUser.id || ADMIN_USERS.includes(currentUser.id)) {
      const { error } = await supabase
        .from("forumPosts")
        .delete()
        .eq("id", post.id);

      if (error) console.error(error);
    }
  };

  // LIKE / DISLIKE
  const likePost = async (post: ForumPost) => {
    await supabase
      .from("forumPosts")
      .update({ likes: post.likes + 1 })
      .eq("id", post.id);
  };

  const dislikePost = async (post: ForumPost) => {
    await supabase
      .from("forumPosts")
      .update({ dislikes: post.dislikes + 1 })
      .eq("id", post.id);
  };

  // ADD REPLY
  const addReply = async (post: ForumPost) => {
    if (!currentUser) return;

    const replyText = replyInputs[post.id];
    if (!replyText?.trim()) return;

    const newReply: Reply = {
      id: crypto.randomUUID(),
      author_id: currentUser.id,
      author_name: currentUser.user_metadata.username || "Anonymous",
      author_photo: currentUser.user_metadata.photoURL || null,
      message: replyText,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from("forumPosts")
      .update({ replies: [...post.replies, newReply] })
      .eq("id", post.id);

    if (error) console.error(error);

    setReplyInputs({ ...replyInputs, [post.id]: "" });
  };

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h1 style={{ marginBottom: 30 }}>Forum</h1>

      {/* CREATE POST BUTTON */}
      <button
        onClick={() => setShowPostBox(!showPostBox)}
        style={{
          padding: "10px 20px",
          borderRadius: 6,
          border: "1px solid #444",
          background: "#222",
          color: "white",
          cursor: "pointer",
          marginBottom: 20
        }}
      >
        {showPostBox ? "Cancel" : "Create Post"}
      </button>

      {/* POST CREATION BOX */}
      {showPostBox && (
        <div
          style={{
            border: "1px solid #333",
            padding: 20,
            borderRadius: 8,
            background: "#1b1b1b",
            marginBottom: 30
          }}
        >
          <textarea
            value={newMessage}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.currentTarget.value)}
            placeholder="What's on your mind..."
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 6,
              border: "1px solid #444",
              background: "#111",
              color: "white",
              minHeight: 80
            }}
          />
          <button
            onClick={createPost}
            style={{
              marginTop: 10,
              padding: "10px 18px",
              borderRadius: 6,
              border: "none",
              background: "#d600a1ff",
              color: "white",
              cursor: "pointer"
            }}
          >
            Post
          </button>
        </div>
      )}

      {/* POSTS */}
      {posts.map((post) => {
        const canDelete = currentUser && (post.author_id === currentUser.id || ADMIN_USERS.includes(currentUser.id));

        return (
          <div
            key={post.id}
            style={{
              border: "1px solid #2e2e2e",
              borderRadius: 10,
              padding: 20,
              marginBottom: 25,
              background: "#181818",
              boxShadow: "0 0 10px rgba(0,0,0,0.4)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link to={`/profile/${post.author_id}`}>
                <img
                  src={post.author_photo || "https://i.imgur.com/HeIi0wU.png"}
                  style={{ width: 40, height: 40, borderRadius: "50%" }}
                />
              </Link>
              <div>
                <Link
                  to={`/profile/${post.author_id}`}
                  style={{ color: "white", fontWeight: "bold", textDecoration: "none" }}
                >
                  {post.author_name}
                </Link>
                <div style={{ fontSize: 12, color: "#aaa" }}>
                  {new Date(post.timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            <p style={{ marginTop: 15 }}>{post.message}</p>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => likePost(post)}>👍 {post.likes}</button>
              <button onClick={() => dislikePost(post)}>👎 {post.dislikes}</button>

              {canDelete && (
                <button
                  onClick={() => deletePost(post)}
                  style={{
                    marginLeft: 10,
                    background: "#aa2222",
                    color: "white",
                    border: "none",
                    padding: "5px 12px",
                    borderRadius: 4,
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              )}
            </div>

            {/* REPLIES */}
            <div style={{ marginTop: 20 }}>
              {post.replies.map((reply) => (
                <div
                  key={reply.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 10,
                    padding: 10,
                    borderLeft: "2px solid #333"
                  }}
                >
                  <Link to={`/profile/${reply.author_id}`}>
                    <img
                      src={reply.author_photo || "https://i.imgur.com/HeIi0wU.png"}
                      style={{ width: 30, height: 30, borderRadius: "50%" }}
                    />
                  </Link>
                  <div>
                    <Link
                      to={`/profile/${reply.author_id}`}
                      style={{ color: "white", fontWeight: "bold", textDecoration: "none" }}
                    >
                      {reply.author_name}
                    </Link>
                    <div style={{ fontSize: 12, color: "#aaa" }}>
                      {new Date(reply.timestamp).toLocaleString()}
                    </div>
                    <div>{reply.message}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* REPLY INPUT */}
            <div style={{ marginTop: 15 }}>
              <input
                value={replyInputs[post.id] || ""}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setReplyInputs({ ...replyInputs, [post.id]: e.currentTarget.value })
                }
                placeholder="Reply..."
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #444",
                  background: "#111",
                  color: "white"
                }}
              />
              <button
                onClick={() => addReply(post)}
                style={{
                  marginTop: 6,
                  padding: "6px 14px",
                  borderRadius: 4,
                  background: "#3a7afe",
                  border: "none",
                  color: "white"
                }}
              >
                Reply
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}