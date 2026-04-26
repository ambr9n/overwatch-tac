import React from "react";

const ContactUs: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        lineHeight: "1.7",
        color: "#ccc",
        paddingTop: "80px",
        paddingBottom: "40px",
      }}
    >
      <h1
        style={{
          color: "#f65dfb",
          marginBottom: "20px",
          fontSize: "42px",
          fontWeight: "700",
        }}
      >
        Contact OWTAC team
      </h1>

      <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
        Developed by OWTAC team
      </p>

      <section style={{ marginBottom: "30px" }}>
        <p style={{ fontSize: "18px", marginBottom: "20px" }}>
          Have questions, feedback, or suggestions? We’d love to hear from you.
          The OWTAC team is always looking for ways to improve the platform and
          better support the Stockton Esports community.
        </p>
        <p style={{ fontSize: "18px" }}>
          Whether you need help using the application, want to report a bug, or
          have ideas for new features, feel free to reach out to us using the
          contact information below.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2
          style={{
            color: "#fff",
            fontSize: "28px",
            fontWeight: "600",
            marginBottom: "15px",
          }}
        >
          Get in Touch
        </h2>

        <ul
          style={{
            paddingLeft: "25px",
            listStyleType: "disc",
            fontSize: "18px",
          }}
        >
          <li style={{ marginBottom: "10px" }}>
            <strong style={{ color: "#f65dfb" }}>Email:</strong>{" "}
            owtacteam@gmail.com
          </li>
          <li style={{ marginBottom: "10px" }}>
            <strong style={{ color: "#f65dfb" }}>Location:</strong>{" "}
            Stockton University, New Jersey
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2
          style={{
            color: "#fff",
            fontSize: "28px",
            fontWeight: "600",
            marginBottom: "15px",
          }}
        >
          Support & Feedback
        </h2>
        <p style={{ fontSize: "18px", marginBottom: "20px" }}>
          If you encounter any issues while using OWTAC, please include as much
          detail as possible when contacting us. This helps us diagnose and fix
          problems more efficiently.
        </p>
        <p style={{ fontSize: "18px" }}>
          We also welcome feature requests and general feedback. Your input plays
          a big role in shaping future updates and improvements to the platform.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2
          style={{
            color: "#fff",
            fontSize: "28px",
            fontWeight: "600",
            marginBottom: "15px",
          }}
        >
          Response Time
        </h2>
        <p style={{ fontSize: "18px" }}>
          Our team will do its best to respond to inquiries within 1–2 business
          days. Since this is a student-developed project, response times may
          vary during academic breaks or exam periods.
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
          marginTop: "40px",
        }}
      >
        <p style={{ color: "#888" }}>
          Thank you for reaching out to OWTAC. Your feedback helps us continue to
          improve and grow the platform for the esports community.
        </p>
        <p style={{ color: "#666", fontSize: "12px", marginTop: "10px" }}>
          © 2026 OWTAC - The OWTAC Team
        </p>
      </div>
    </div>
  );
};

export default ContactUs;