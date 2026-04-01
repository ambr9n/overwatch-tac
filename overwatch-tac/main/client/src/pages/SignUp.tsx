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
      const { data: existingUser } = await supabase
        .from("Users")
        .select("username, email")
        .or(`username.ilike.${username},email.eq.${email}`) 
        .maybeSingle();

      if (existingUser) {
        if (existingUser.username.toLowerCase() === username.toLowerCase()) {
          alert("That username is already taken.");
        } else {
          alert("This email is already registered. Try logging in instead!");
        }
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }, 
        },
      });

      if (authError) throw authError;

      alert("Signup successful! Please check your email for a confirmation link.");
      navigate("/login");

    } catch (error: any) {
      console.error("Signup error:", error);
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