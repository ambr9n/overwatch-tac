import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const SignUp: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create user with email/password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update displayName with username
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: username });
      }

      navigate("/"); // redirect after signup
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default SignUp;