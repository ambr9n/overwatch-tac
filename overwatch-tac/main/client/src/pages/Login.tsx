import { useState } from "react";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let emailToUse = identifier;

      // If the identifier is a username, find the email
      if (!identifier.includes("@")) {
        // Check if current user exists in Firebase Auth with displayName
        const authInstance = getAuth();
        const users = authInstance.currentUser ? [authInstance.currentUser] : [];
        // Note: Firebase Auth doesn't allow querying all users from client
        // For a simple local dev solution, we can store username->email mapping in Firestore
        alert("Logging in with username requires storing username->email mapping in Firestore");
        return;
      }

      await signInWithEmailAndPassword(auth, emailToUse, password);
      navigate("/"); // redirect after login
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          type="text"
          placeholder="Email or Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          style={{ padding: "10px", borderRadius: "5px", background: "orange", border: "none", fontWeight: "bold" }}
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;