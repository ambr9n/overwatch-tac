import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  const linkStyle = {
    color: "#aaa",
    textDecoration: "none",
    transition: "0.2s",
  };

  const hoverStyle = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = "#f65dfb";
  };

  const leaveStyle = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = "#aaa";
  };

  return (
    <footer
      style={{
        backgroundColor: "#161616",
        color: "#aaa",
        fontSize: "13px",
        padding: "20px 40px",
        borderTop: "1px solid #282828",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {/* Links row */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link to="/" style={linkStyle} onMouseEnter={hoverStyle} onMouseLeave={leaveStyle}>
          Home
        </Link>

        <Link to="/forum" style={linkStyle} onMouseEnter={hoverStyle} onMouseLeave={leaveStyle}>
          Forum
        </Link>

        <Link to="/about-us" style={linkStyle} onMouseEnter={hoverStyle} onMouseLeave={leaveStyle}>
          About Us
        </Link>

        <Link to="/privacy" style={linkStyle} onMouseEnter={hoverStyle} onMouseLeave={leaveStyle}>
          Privacy Policy
        </Link>

        <Link to="/contact" style={linkStyle} onMouseEnter={hoverStyle} onMouseLeave={leaveStyle}>
          Contact
        </Link>
      </div>

      <div style={{ color: "#666", textAlign: "center" }}>
        © {new Date().getFullYear()} OWTAC - The OWTAC Team
      </div>
    </footer>
  );
};

export default Footer;