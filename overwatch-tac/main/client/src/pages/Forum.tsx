import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc
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

export default function Forum() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});

  // REALTIME POSTS
  useEffect(() => {
    const q = query(
      collection(db, "forumPosts"),
      orderBy("timestamp", "desc")
    );

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
  };

  // LIKE
  const likePost = async (post: ForumPost) => {
    await updateDoc(doc(db, "forumPosts", post.id), {
      likes: post.likes + 1
    });
  };

  // DISLIKE
  const dislikePost = async (post: ForumPost) => {
    await updateDoc(doc(db, "forumPosts", post.id), {
      dislikes: post.dislikes + 1
    });
  };

  // REPLY
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
    <div style={{ maxWidth: 900, margin: "auto" }}>
      <h1>Forum</h1>

      {/* CREATE POST */}
      <div style={{ marginBottom: 40 }}>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Write a post..."
          style={{
            width: "100%",
            padding: 12,
            background: "#222",
            color: "white",
            border: "1px solid #444"
          }}
        />

        <button
          onClick={createPost}
          style={{
            marginTop: 10,
            padding: "10px 20px",
            cursor: "pointer"
          }}
        >
          Post
        </button>
      </div>

      {/* POSTS */}
      {posts.map((post) => (
        <div
          key={post.id}
          style={{
            border: "1px solid #333",
            padding: 20,
            marginBottom: 30,
            background: "#1a1a1a"
          }}
        >
          {/* AUTHOR */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to={`/profile/${post.authorId}`}>
              <img
                src={
                  post.authorPhoto ||
                  "https://i.imgur.com/HeIi0wU.png"
                }
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
                style={{ color: "white", fontWeight: "bold" }}
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

          {/* MESSAGE */}
          <p style={{ marginTop: 15 }}>{post.message}</p>

          {/* LIKE DISLIKE */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => likePost(post)}>
              👍 {post.likes}
            </button>

            <button onClick={() => dislikePost(post)}>
              👎 {post.dislikes}
            </button>
          </div>

          {/* REPLIES */}
          <div style={{ marginTop: 20 }}>
            {post.replies.map((reply) => (
              <div
                key={reply.id}
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 10
                }}
              >
                <Link to={`/profile/${reply.authorId}`}>
                  <img
                    src={
                      reply.authorPhoto ||
                      "https://i.imgur.com/HeIi0wU.png"
                    }
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
                    style={{ color: "white", fontWeight: "bold" }}
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

          {/* REPLY BOX */}
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
                background: "#222",
                color: "white",
                border: "1px solid #444"
              }}
            />

            <button
              onClick={() => addReply(post)}
              style={{ marginTop: 5 }}
            >
              Reply
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}