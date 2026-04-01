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

      // If user entered a username, map it to email
      if (!identifier.includes("@")) {
        const { data: userRow, error: fetchError } = await supabase
          .from("Users") // Change this from "profiles" to "Users"
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

      // Login with Supabase
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