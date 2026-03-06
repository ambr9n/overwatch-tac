import { NavLink } from "react-router-dom";
import { useState, useEffect, type FC } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import "./Navbar.css";

const Navbar: FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
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
      </div>

      <div className="nav-right">
        {user ? (
          <NavLink to="/profile" className="nav-link login profile-link">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="Profile"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  marginRight: "8px",
                  objectFit: "cover",
                  verticalAlign: "middle",
                }}
              />
            )}
            {user.displayName || "Profile"}
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