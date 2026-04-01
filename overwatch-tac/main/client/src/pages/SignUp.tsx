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
      // 1. STRICT EMAIL & USERNAME CHECK
      // We check our 'Users' table to see if this email is already "active"
      const { data: existingUser } = await supabase
        .from("Users")
        .select("email, username")
        .or(`email.eq.${email.toLowerCase()},username.ilike.${username}`)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.email.toLowerCase() === email.toLowerCase()) {
          alert("This email is already registered. Try logging in or resetting your password.");
        } else {
          alert("That username is already taken.");
        }
        return;
      }

      // 2. SIGN UP ATTEMPT
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      // 3. HANDLE RATE LIMITS OR "USER ALREADY EXISTS" ERRORS
      if (authError) {
        if (authError.message.includes("User already registered")) {
          alert("This email is already registered. Please check your inbox for the confirmation link.");
          return;
        }
        throw authError;
      }

      alert("Signup successful! Please check your email for a confirmation link.");
      navigate("/login");

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