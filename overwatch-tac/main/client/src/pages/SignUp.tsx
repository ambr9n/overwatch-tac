import { useState } from "react";
import { supabase } from "../Supabase";
import { useNavigate } from "react-router-dom";

const SignUp: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (error) throw error;

      alert("Signup success!");
      navigate("/"); 

    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "80px auto",
        padding: "30px",
        background: "#161616",
        borderRadius: "12px",
        border: "1px solid #282828",
        color: "white",
        textAlign: "center",
        boxShadow: "0 0 20px #e6008233",
      }}
    >
      <h2 style={{ fontSize: "28px", marginBottom: "30px", color: "#f65dfb" }}>
        Sign Up
      </h2>

      <form
        onSubmit={handleSignup}
        style={{ display: "flex", flexDirection: "column", gap: "18px" }}
      >
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#111",
            color: "white",
          }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#111",
            color: "white",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#111",
            color: "white",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "12px",
            borderRadius: "8px",
            background: "#e60082",
            border: "none",
            fontWeight: "bold",
            color: "white",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#f65dfb";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#e60082";
          }}
        >
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default SignUp;