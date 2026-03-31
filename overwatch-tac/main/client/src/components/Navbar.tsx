// client/src/components/Navbar.tsx
import { NavLink } from "react-router-dom";
import { useState, useEffect, type FC } from "react";
import { supabase } from "../Supabase";
import "./Navbar.css";

const Navbar: FC = () => {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    // Get current user on mount
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUser(user);
    };
    fetchUser();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(session.user);
      else setUser(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="navbar">
      <div className="nav-left">
        <NavLink to="/" end className="nav-link">
          Home
        </NavLink>
        <NavLink to="/tacmap" className="nav-link">
          Tac Map
        </NavLink>
        <NavLink to="/saves" className="nav-link">
          Saves
        </NavLink>
        <NavLink to="/forum" className="nav-link">
          Forum
        </NavLink>
      </div>

      <div className="nav-right">
        {user ? (
          <NavLink to={`/profile/${user.id}`} className="nav-link login profile-link">
            {user.user_metadata.photoURL && (
              <img
                src={user.user_metadata.photoURL}
                alt={user.user_metadata.username || "Profile"}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  marginRight: 8,
                  objectFit: "cover",
                  verticalAlign: "middle",
                }}
              />
            )}
            {user.user_metadata.username || "Profile"}
          </NavLink>
        ) : (
          <>
            <NavLink to="/auth" className="nav-link signup">
              Sign Up
            </NavLink>
            <NavLink to="/login" className="nav-link login">
              Sign In
            </NavLink>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;