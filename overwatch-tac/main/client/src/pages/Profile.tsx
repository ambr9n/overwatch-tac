import { useEffect, useState, type ChangeEvent } from "react";
import type { User } from "firebase/auth";
import { auth } from "../firebase";
import { onAuthStateChanged, updateProfile, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [photoURLInput, setPhotoURLInput] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.photoURL) setPhotoURL(currentUser.photoURL);
    });
    return () => unsubscribe();
  }, []);

  const handlePhotoURLChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhotoURLInput(e.target.value);
  };

  const handleSavePhoto = async () => {
    if (!user || !photoURLInput) return;
    try {
      await updateProfile(user, { photoURL: photoURLInput });
      setPhotoURL(photoURLInput);
      setPhotoURLInput("");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { photoURL: null });
      setPhotoURL(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
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

      <p style={{ marginBottom: "10px" }}>Username: {user.displayName}</p>
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
            background: "green",
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
              background: "gray",
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
            background: "red",
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