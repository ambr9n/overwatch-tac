import { NavLink } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  return (
    <div className="navbar">
      
      {/* Left side navigation */}
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

      {/* Right side auth buttons */}
      <div className="nav-right">
        <NavLink to="/auth" className="nav-link signup">
          Sign Up
        </NavLink>

        <NavLink to="/login" className="nav-link login">
          Sign In
        </NavLink>
      </div>

    </div>
  );
};

export default Navbar;