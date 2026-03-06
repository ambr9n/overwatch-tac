import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link } from "react-router-dom";

interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  message: string;
  timestamp: any;
}

interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  message: string;
  timestamp: any;
  likes: number;
  dislikes: number;
  replies: Reply[];
}

//admin list
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

  const currentUser = auth.currentUser;
  const isAdmin = currentUser ? ADMIN_USERS.includes(currentUser.uid) : false;

  // real-time posts
  useEffect(() => {
    const q = query(collection(db, "forumPosts"), orderBy("timestamp", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const loadedPosts: ForumPost[] = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data();

        return {
          id: docSnap.id,
          authorId: data.authorId,
          authorName: data.authorName,
          authorPhoto: data.authorPhoto || null,
          message: data.message,
          timestamp:
            data.timestamp ||
            { toDate: () => data.clientTimestamp || new Date() },
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          replies: data.replies || []
        };
      });

      setPosts(loadedPosts);
    });

    return () => unsub();
  }, []);

  // CREATE POST
  const createPost = async () => {
    if (!auth.currentUser || !newMessage.trim()) return;

    await addDoc(collection(db, "forumPosts"), {
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || "Anonymous",
      authorPhoto: auth.currentUser.photoURL || null,
      message: newMessage,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date(),
      likes: 0,
      dislikes: 0,
      replies: []
    });

    setNewMessage("");
    setShowPostBox(false);
  };

  // DELETE POST
  const deletePost = async (post: ForumPost) => {
    if (!window.confirm("Delete this post?")) return;

    if (
      auth.currentUser?.uid === post.authorId ||
      ADMIN_USERS.includes(auth.currentUser?.uid || "")
    ) {
      await deleteDoc(doc(db, "forumPosts", post.id));
    }
  };

  // like
  const likePost = async (post: ForumPost) => {
    await updateDoc(doc(db, "forumPosts", post.id), {
      likes: post.likes + 1
    });
  };

  // dislike
  const dislikePost = async (post: ForumPost) => {
    await updateDoc(doc(db, "forumPosts", post.id), {
      dislikes: post.dislikes + 1
    });
  };

  // reply
  const addReply = async (post: ForumPost) => {
    if (!auth.currentUser) return;

    const replyText = replyInputs[post.id];
    if (!replyText?.trim()) return;

    const newReply: Reply = {
      id: crypto.randomUUID(),
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || "Anonymous",
      authorPhoto: auth.currentUser.photoURL || null,
      message: replyText,
      timestamp: new Date()
    };

    await updateDoc(doc(db, "forumPosts", post.id), {
      replies: [...post.replies, newReply]
    });

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
            {/* MESSAGE WITHIN TEXTBOX */}
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Whats on your mind..."
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
        {/* CREATE POST BUTTON (IN POST CREATION BOX) */}
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
        const isOwner = auth.currentUser?.uid === post.authorId;
        const canDelete = isOwner || isAdmin;
        const deletingOthers = isAdmin && !isOwner;

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
            {/* AUTHOR */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link to={`/profile/${post.authorId}`}>
                <img
                  src={post.authorPhoto || "https://i.imgur.com/HeIi0wU.png"}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%"
                  }}
                />
              </Link>

              <div>
                <Link
                  to={`/profile/${post.authorId}`}
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    textDecoration: "none"
                  }}
                >
                  {post.authorName}
                </Link>

                <div style={{ fontSize: 12, color: "#aaa" }}>
                  {post.timestamp?.toDate
                    ? post.timestamp.toDate().toLocaleString()
                    : ""}
                </div>
              </div>
            </div>

            <p style={{ marginTop: 15 }}>{post.message}</p>

            {/* ACTIONS */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => likePost(post)}>👍 {post.likes}</button>
              <button onClick={() => dislikePost(post)}>👎 {post.dislikes}</button>

              {canDelete && (
                <button
                  onClick={() => deletePost(post)}
                  style={{
                    marginLeft: 10,
                    background: deletingOthers ? "#7b3fe4" : "#aa2222",
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
                  <Link to={`/profile/${reply.authorId}`}>
                    <img
                      src={reply.authorPhoto || "https://i.imgur.com/HeIi0wU.png"}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%"
                      }}
                    />
                  </Link>

                  <div>
                    <Link
                      to={`/profile/${reply.authorId}`}
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        textDecoration: "none"
                      }}
                    >
                      {reply.authorName}
                    </Link>

                    <div style={{ fontSize: 12, color: "#aaa" }}>
                      {reply.timestamp
                        ? new Date(reply.timestamp).toLocaleString()
                        : ""}
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
                onChange={(e) =>
                  setReplyInputs({
                    ...replyInputs,
                    [post.id]: e.target.value
                  })
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