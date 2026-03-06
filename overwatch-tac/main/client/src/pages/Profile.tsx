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
      <div>
        <h2>Profile</h2>
        <p>Not logged in</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Profile</h2>
      {photoURL && (
        <div>
          <img
            src={photoURL}
            alt="Profile"
            style={{ width: 120, borderRadius: "50%", marginBottom: "15px" }}
          />
        </div>
      )}
      <p>Username: {user.displayName}</p>
      <p>Email: {user.email}</p>

      <input
        type="text"
        placeholder="Paste profile image URL"
        value={photoURLInput}
        onChange={handlePhotoURLChange}
        style={{ padding: "5px", width: "250px", marginTop: "10px" }}
      />
      <button
        onClick={handleSavePhoto}
        style={{
          marginLeft: "10px",
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