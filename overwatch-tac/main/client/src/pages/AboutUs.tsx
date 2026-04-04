import React from "react";

const AboutUs: React.FC = () => {
  return (
    <div style={{ maxWidth: "900px", margin: "80px auto", padding: "20px", color: "white" }}>
      <h1 style={{ fontSize: "36px", fontWeight: "700", marginBottom: "30px", color: "#f65dfb" }}>About Us</h1>
      
      <p style={{ fontSize: "16px", lineHeight: "1.8", marginBottom: "20px", color: "#ccc" }}>
        Welcome to <strong>OWTAC</strong> – your ultimate platform for strategizing, mapping, and sharing tactical plans. 
        We aim to create a collaborative environment for gamers, strategists, and enthusiasts to visualize and save their strategies.
      </p>

      <p style={{ fontSize: "16px", lineHeight: "1.8", marginBottom: "20px", color: "#ccc" }}>
        Our platform offers:
      </p>

      <ul style={{ listStyleType: "disc", paddingLeft: "20px", color: "#ccc" }}>
        <li>Interactive TacMap for planning and saving strategies</li>
        <li>Forums to share ideas and discuss tactics with the community</li>
        <li>User profiles to track and manage your saved strategies</li>
        <li>Secure authentication via email or username</li>
      </ul>

      <p style={{ fontSize: "16px", lineHeight: "1.8", marginTop: "30px", color: "#ccc" }}>
        <strong>Produced by Group 1.</strong> We hope OWTAC helps you take your strategic gameplay to the next level!
      </p>
    </div>
  );
};

export default AboutUs;