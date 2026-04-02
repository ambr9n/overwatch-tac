import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../Supabase";

interface User {
  user_id: string;
  username: string;
  profile_image_link: string;
}

interface ForumPost {
  post_id: string;
  text: string;
  created_at: string;
}

const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchUserProfile = async () => {
      setLoading(true);
      const { data: userData, error: userError } = await supabase
        .from("Users")
        .select("user_id, username, profile_image_link")
        .eq("user_id", userId)
        .maybeSingle();

      if (!userError && userData) setUser(userData);

      const { data: postData, error: postError } = await supabase
        .from("Forum_Posts")
        .select("post_id, text, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!postError && postData) setPosts(postData);
      setLoading(false);
    };

    fetchUserProfile();
  }, [userId]);

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (!user) return <div style={{ padding: "2rem" }}>User not found</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <img
          src={user.profile_image_link || DEFAULT_AVATAR}
          alt="Profile"
          style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "2px solid #e66feaff" }}
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
        />
        <h1>{user.username}</h1>
      </div>

      <h2>Forum Posts</h2>
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <ul>
          {posts.map(post => (
            <li key={post.post_id} style={{ marginBottom: "1rem", padding: "0.5rem", border: "1px solid #555", borderRadius: "5px" }}>
              <p>{post.text}</p>
              <small>{new Date(post.created_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserProfilePage;