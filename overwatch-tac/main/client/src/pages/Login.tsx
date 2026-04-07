import { useState } from "react";
import { supabase } from "../Supabase";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let emailToUse = identifier;

      if (!identifier.includes("@")) {
        const { data: userRow, error: fetchError } = await supabase
          .from("Users")
          .select("email")
          .eq("username", identifier)
          .single();

        if (fetchError || !userRow?.email) {
          console.error("Fetch error:", fetchError);
          alert("Username not found");
          return;
        }

        emailToUse = userRow.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) throw error;
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
        Login
      </h2>

      <form
        onSubmit={handleLogin}
        style={{ display: "flex", flexDirection: "column", gap: "18px" }}
      >
        <input
          type="text"
          placeholder="Email or Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;