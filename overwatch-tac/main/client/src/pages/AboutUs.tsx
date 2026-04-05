import React from "react";

const AboutUs: React.FC = () => {
  return (
    <div style={{ maxWidth: "900px", margin: "60px auto", padding: "0 20px", color: "white", lineHeight: "1.8" }}>
      
      <h1 style={{ fontSize: "42px", fontWeight: "700", marginBottom: "30px" }}>About OWTAC</h1>

      <p style={{ fontSize: "18px", marginBottom: "20px" }}>
        Welcome to <strong>OWTAC</strong>, a web application designed and developed by <strong>Group 1</strong> as part of our Software Engineering class at Stockton University. 
        This project represents our effort to build a functional, interactive, and user-friendly platform for the Stockton Esports community. 
      </p>

      <p style={{ fontSize: "18px", marginBottom: "20px" }}>
        OWTAC was created with the goal of helping esports players strategize, collaborate, and improve their gameplay. 
        It combines tools for tactical planning, team management, and community discussion, all in one centralized platform.
      </p>

      <h2 style={{ fontSize: "28px", fontWeight: "600", marginTop: "30px", marginBottom: "15px" }}>Key Features</h2>

      <p style={{ fontSize: "18px", marginBottom: "15px" }}>
        Our application offers several core features that enhance team coordination and strategy sharing:
      </p>

      <ul style={{ fontSize: "18px", marginBottom: "25px", paddingLeft: "25px" }}>
        <li style={{ marginBottom: "10px" }}>
          <strong>TacMap:</strong> Plan your game strategies with interactive maps. Place markers, annotate positions, and visualize tactics with precision.
        </li>
        <li style={{ marginBottom: "10px" }}>
          <strong>Saves:</strong> Save your tactical maps and access them later. Perfect for reviewing strategies or collaborating with your team.
        </li>
        <li style={{ marginBottom: "10px" }}>
          <strong>Forum:</strong> Engage with the Stockton Esports community. Share tips, ask questions, and discuss gameplay strategies with other members.
        </li>
        <li style={{ marginBottom: "10px" }}>
          <strong>Teams:</strong> Manage your esports team efficiently. Assign roles, share strategies, and coordinate practice sessions all in one place.
        </li>
      </ul>

      <h2 style={{ fontSize: "28px", fontWeight: "600", marginTop: "30px", marginBottom: "15px" }}>Our Vision</h2>

      <p style={{ fontSize: "18px", marginBottom: "20px" }}>
        The vision behind OWTAC is to create a tool that not only helps players improve their in-game performance, but also strengthens the community through collaboration and communication. 
        By integrating mapping tools, save functionality, forums, and team management, we provide a complete solution for both casual and competitive players.
      </p>

      <p style={{ fontSize: "18px", marginBottom: "20px" }}>
        This project also serves as an opportunity for us, as students, to demonstrate our skills in software engineering, including front-end development with React, back-end integration with Supabase, user authentication, and responsive design principles.
      </p>

      <h2 style={{ fontSize: "28px", fontWeight: "600", marginTop: "30px", marginBottom: "15px" }}>Join Us</h2>

      <p style={{ fontSize: "18px", marginBottom: "20px" }}>
        Whether you’re a member of Stockton Esports or just interested in tactical planning, OWTAC offers tools to help you strategize, save your progress, and collaborate with teammates. 
        We hope this platform becomes a valuable resource for players to enhance their gameplay and connect with the community.
      </p>

      <p style={{ fontSize: "18px", marginBottom: "40px" }}>
        Thank you for visiting OWTAC! We’re proud to share the results of our Software Engineering project and look forward to seeing how the Stockton Esports community uses our platform to achieve success.
      </p>
    </div>
  );
};

export default AboutUs;