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

  useEffect(() => {
    const sessionUser = supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user as SupabaseUser);
        setPhotoURL(user.user_metadata?.photoURL || null);
      }
    });

    // Optional: Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user as SupabaseUser);
          setPhotoURL(session.user.user_metadata?.photoURL || null);
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
      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, photoURL: photoURLInput },
      });
      if (error) throw error;
      setPhotoURL(photoURLInput);
      setPhotoURLInput("");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, photoURL: null },
      });
      if (error) throw error;
      setPhotoURL(null);
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

      {photoURL && (
        <div style={{ marginBottom: "15px" }}>
          <img
            src={photoURL}
            alt="Profile"
            style={{ width: 120, borderRadius: "50%" }}
          />
        </div>
      )}

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
          }}
        >
          Save
        </button>

        {photoURL && (
          <button
            onClick={handleRemovePhoto}
            style={{
              padding: "8px 12px",
              borderRadius: "5px",
              background: "#6c446dff",
              color: "white",
              border: "none",
              fontWeight: "bold",
            }}
          >
            Remove
          </button>
        )}
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
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Profile;