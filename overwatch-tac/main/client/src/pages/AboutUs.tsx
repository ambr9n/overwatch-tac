import React from "react";

const AboutUs: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        lineHeight: "1.7",
        color: "#ccc",
        // Pushes content down so the Navbar doesn't cover the header
        paddingTop: "80px",
        paddingBottom: "40px",
      }}
    >
      <h1 style={{ color: "#f65dfb", marginBottom: "20px", fontSize: "42px", fontWeight: "700" }}>
        About OWTAC
      </h1>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
        Developed by The OWTAC Team
      </p>

      <section style={{ marginBottom: "30px" }}>
        <p style={{ fontSize: "18px", marginBottom: "20px" }}>
          Welcome to <strong>OWTAC</strong>, a web application designed and developed by <strong>The OWTAC Team</strong> as part of our Software Engineering class at Stockton University. 
          This project represents our effort to build a functional, interactive, and user-friendly platform for the Stockton Esports community. 
        </p>
        <p style={{ fontSize: "18px" }}>
          OWTAC was created with the goal of helping esports players strategize, collaborate, and improve their gameplay. 
          It combines tools for tactical planning, team management, and community discussion, all in one centralized platform.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "#fff", fontSize: "28px", fontWeight: "600", marginBottom: "15px" }}>
          Key Features
        </h2>
        <p style={{ fontSize: "18px", marginBottom: "15px" }}>
          Our application offers several core features that enhance team coordination and strategy sharing:
        </p>
        <ul style={{ paddingLeft: "25px", marginTop: "10px", listStyleType: "disc", fontSize: "18px" }}>
          <li style={{ marginBottom: "10px" }}>
            <strong style={{ color: "#f65dfb" }}>TacMap:</strong> Plan your game strategies with interactive maps. Place markers, annotate positions, and visualize tactics with precision.
          </li>
          <li style={{ marginBottom: "10px" }}>
            <strong style={{ color: "#f65dfb" }}>Saves:</strong> Save your tactical maps and access them later. Perfect for reviewing strategies or collaborating with your team.
          </li>
          <li style={{ marginBottom: "10px" }}>
            <strong style={{ color: "#f65dfb" }}>Forum:</strong> Engage with the Stockton Esports community. Share tips, ask questions, and discuss gameplay strategies with other members.
          </li>
          <li style={{ marginBottom: "10px" }}>
            <strong style={{ color: "#f65dfb" }}>Teams:</strong> Manage your esports team efficiently. Assign roles, share strategies, and coordinate practice sessions all in one place.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "#fff", fontSize: "28px", fontWeight: "600", marginBottom: "15px" }}>
          Our Vision
        </h2>
        <p style={{ fontSize: "18px", marginBottom: "20px" }}>
          The vision behind OWTAC is to create a tool that not only helps players improve their in-game performance, but also strengthens the community through collaboration and communication. 
        </p>
        <p style={{ fontSize: "18px" }}>
          This project also serves as an opportunity for us, as students, to demonstrate our skills in software engineering, including front-end development with React, back-end integration with Supabase, and responsive design principles.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "#fff", fontSize: "28px", fontWeight: "600", marginBottom: "15px" }}>
          Join Us
        </h2>
        <p style={{ fontSize: "18px", marginBottom: "20px" }}>
          Whether you’re a member of Stockton Esports or just interested in tactical planning, OWTAC offers tools to help you strategize, save your progress, and collaborate with teammates.
        </p>
      </section>

      <div
        style={{
          padding: "20px",
          border: "1px solid #282828",
          borderRadius: "8px",
          background: "#161616",
          fontSize: "14px",
          textAlign: "center",
          marginTop: "40px"
        }}
      >
        <p style={{ color: "#888" }}>
          Thank you for visiting OWTAC! We’re proud to share the results of our Software Engineering project and look forward to seeing how the Stockton Esports community uses our platform.
        </p>
        <p style={{ color: "#666", fontSize: "12px", marginTop: "10px" }}>
          © 2026 The OWTAC Team - Group 1
        </p>
      </div>
    </div>
  );
};

export default AboutUs;