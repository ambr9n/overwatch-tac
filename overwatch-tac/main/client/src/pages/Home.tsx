import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Home.css";

const gifs = ["/images/owtacstrat1.gif", "/images/owtacstrat2.gif"];

const Home = () => {
  const [currentGif, setCurrentGif] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGif((prev) => (prev + 1) % gifs.length);
    }, 5000); // switches every 5 seconds, adjust as needed

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home">
      <img
        className="home-bg-gif"
        src={gifs[currentGif]}
        alt=""
        aria-hidden="true"
      />
      <div className="home-overlay" />

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