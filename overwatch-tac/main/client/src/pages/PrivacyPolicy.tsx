import React from "react";

const PrivacyPolicy: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        lineHeight: "1.7",
        color: "#ccc",
        // This padding prevents the Navbar from covering the header
        paddingTop: "80px", 
        paddingBottom: "40px",
      }}
    >
      <h1 style={{ color: "#f65dfb", marginBottom: "20px" }}>Privacy Policy</h1>
      <p style={{ fontSize: "14px", color: "#666" }}>Effective Date: April 9, 2026</p>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "#fff" }}>1. Information We Collect</h2>
        <p>
          As part of the OWTAC project for Stockton Esports, we collect minimal data 
          required to facilitate forum interaction and user accounts via Supabase:
        </p>
        <ul style={{ paddingLeft: "25px", marginTop: "10px", listStyleType: "disc" }}>
          <li>Basic account info (Username, Email address).</li>
          <li>Content you post (Forum posts, comments, profile bio).</li>
          <li>Usage data (IP addresses and browser types for security purposes).</li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "#fff" }}>2. Open Source Licensing</h2>
        <p>
          This application is licensed under the <strong>MIT License</strong>. 
          While the source code is public and available for modification, 
          your personal data and account information are kept private.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "#fff" }}>3. Data Security</h2>
        <p>
          We use Supabase for authentication and database management, which 
          employs industry-standard encryption to protect your information.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "#fff" }}>4. Contact Us</h2>
        <p>
          If you have questions regarding this policy or the development of 
          the Stockton Esports platform, please reach out via the contact page.
        </p>
      </section>

      <div
        style={{
          padding: "25px",
          border: "1px solid #282828",
          borderRadius: "8px",
          background: "#161616",
          fontSize: "12px",
          whiteSpace: "pre-wrap", // Maintains formatting of the MIT license
        }}
      >
        <p style={{ fontWeight: "bold", marginBottom: "10px", color: "#eee" }}>
          MIT License Notice:
        </p>
        <p style={{ margin: "0 0 10px 0" }}>© 2026 The OWTAC Team</p>
        <div style={{ color: "#888", fontStyle: "italic" }}>
          Permission is hereby granted, free of charge, to any person obtaining a copy
          of this software and associated documentation files (the "Software"), to deal
          in the Software without restriction, including without limitation the rights
          to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
          copies of the Software, and to permit persons to whom the Software is
          furnished to do so, subject to the following conditions:
          <br /><br />
          The above copyright notice and this permission notice shall be included in all
          copies or substantial portions of the Software.
          <br /><br />
          THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
          IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
          AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
          LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
          OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
          SOFTWARE.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;