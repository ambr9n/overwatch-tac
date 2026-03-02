import { NavLink } from "react-router-dom";

const Navbar = () => {
  const linkStyle =
    "margin-right: 20px; text-decoration: none; font-weight: bold;";

  return (
    <div style={{ padding: "20px", background: "#111" }}>
      <NavLink to="/" style={{ marginRight: "20px", color: "white" }}>
        Home
      </NavLink>

      <NavLink to="/tacmap" style={{ marginRight: "20px", color: "white" }}>
        Tac Map
      </NavLink>

      <NavLink to="/saves" style={{ marginRight: "20px", color: "white" }}>
        Saves
      </NavLink>

      <NavLink to="/auth" style={{ color: "white" }}>
        Login
      </NavLink>
    </div>
  );
};

export default Navbar;