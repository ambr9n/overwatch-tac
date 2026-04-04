import { Link } from "react-router-dom";

const Footer: React.FC = () => {
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
        gap: "8px",
      }}
    >
      {/* Links row */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          to="/"
          style={{ color: "#aaa", textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f65dfb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
        >
          Home
        </Link>
        <Link
          to="/forum"
          style={{ color: "#aaa", textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f65dfb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
        >
          Forum
        </Link>
        <Link
          to="/about-us"
          style={{ color: "#aaa", textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f65dfb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
        >
          About Us
        </Link>
        <Link
          to="/privacy"
          style={{ color: "#aaa", textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f65dfb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
        >
          Privacy Policy
        </Link>
        <Link
          to="/contact"
          style={{ color: "#aaa", textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f65dfb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
        >
          Contact
        </Link>
      </div>

      {/* Copyright row */}
      <div style={{ color: "#666" }}>
        © {new Date().getFullYear()} OWTAC - Stockton Esports - Group 1
      </div>
    </footer>
  );
};

export default Footer;