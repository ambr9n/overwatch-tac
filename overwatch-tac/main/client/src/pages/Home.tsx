import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  return (
    <div className="home">
      <div className="hero-content">
        <h1 className="hero-title">
          Dominate Overwatch <br />
          <span className="gradient-text">with Tactical Precision</span>
        </h1>

        <p className="hero-subtitle">
          Overwatch Tactical Map is a tool built for Overwatch 2 players to
          strategize, coordinate, and develop winning plans with precision.
        </p>

        <div className="hero-buttons">
          <Link to="/tacmap" className="primary-btn">
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;