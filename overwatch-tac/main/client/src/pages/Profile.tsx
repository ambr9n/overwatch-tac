import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

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
      <p>Username: {user.displayName}</p>
      <p>Email: {user.email}</p>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "15px",
          padding: "10px",
          borderRadius: "5px",
          background: "red",
          color: "white",
          border: "none",
          fontWeight: "bold"
        }}
      >
        Log Out
      </button>
    </div>
  );
};

export default Profile;