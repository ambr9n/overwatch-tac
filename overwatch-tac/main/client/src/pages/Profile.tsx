import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "../Supabase";
import { useNavigate } from "react-router-dom";

interface SupabaseUser {
  id: string;
  email: string | null;
  user_metadata: { username?: string; photoURL?: string };
}

const Profile = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [photoURLInput, setPhotoURLInput] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const navigate = useNavigate();

  const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user as SupabaseUser);
        const { data: dbUser } = await supabase
          .from("Users")
          .select("profile_image_link")
          .eq("user_id", user.id)
          .single();
        
        setPhotoURL(dbUser?.profile_image_link || user.user_metadata?.photoURL || DEFAULT_AVATAR);
      }
    };

    fetchProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user as SupabaseUser);
        } else {
          setUser(null);
          setPhotoURL(null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handlePhotoURLChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhotoURLInput(e.target.value);
  };

  const handleSavePhoto = async () => {
    if (!user || !photoURLInput) return;
    
    try {
      const { error: dbError } = await supabase
        .from("Users")
        .update({ profile_image_link: photoURLInput })
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      await supabase.auth.updateUser({
        data: { ...user.user_metadata, photoURL: photoURLInput },
      });

      setPhotoURL(photoURLInput);
      setPhotoURLInput("");
      alert("Success! Profile updated.");
      window.location.reload();

    } catch (error: any) {
      alert("Update failed: " + error.message);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    try {
      await supabase.auth.updateUser({
        data: { ...user.user_metadata, photoURL: DEFAULT_AVATAR },
      });

      const { error: dbError } = await supabase
        .from("Users")
        .update({ profile_image_link: DEFAULT_AVATAR })
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      setPhotoURL(DEFAULT_AVATAR);
      alert("Profile picture reset to default.");
      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login");
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <h2>Profile</h2>
        <p>Not logged in</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h1>Profile</h1>

      <div style={{ marginBottom: "15px" }}>
        <img
          src={photoURL || DEFAULT_AVATAR}
          alt="Profile"
          style={{ 
            width: 150,
            height: 150,
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid #e66feaff",
            display: "block"
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
          }}
        />
      </div>

      <p style={{ marginBottom: "10px" }}>Username: {user.user_metadata?.username}</p>
      <p style={{ marginBottom: "10px" }}>Email: {user.email}</p>

      <h3 style={{ marginTop: "20px" }}>Profile Image</h3>
      <input
        type="text"
        placeholder="Paste profile image URL"
        value={photoURLInput}
        onChange={handlePhotoURLChange}
        style={{ padding: "5px", width: "250px", marginBottom: "10px" }}
      />

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <button
          onClick={handleSavePhoto}
          style={{
            padding: "8px 12px",
            borderRadius: "5px",
            background: "#e66feaff",
            color: "white",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          Save
        </button>

        <button
          onClick={handleRemovePhoto}
          style={{
            padding: "8px 12px",
            borderRadius: "5px",
            background: "#6c446dff",
            color: "white",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          Remove
        </button>
      </div>

      <div>
        <button
          onClick={handleLogout}
          style={{
            marginTop: "15px",
            padding: "10px",
            borderRadius: "5px",
            background: "rgba(177, 46, 103, 1)",
            color: "white",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Profile;