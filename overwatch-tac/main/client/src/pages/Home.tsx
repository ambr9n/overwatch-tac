const Home = () => {
  return (
    
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>
        {/* HEADER */}
        Overwatch Tac Map {/* we can choose aa proper name in the future before final, delete comment before final */}
      </h1>

      <p style={{ fontSize: "18px", color: "#ccc" }}>
        {/* SUBHEADER */}
        {/* TEMPORARY, must change the temporary name, and the caption, delete this cimment before review, delete comment before final */}
        Overwatch Tactical Map is a tool built for Overwatch 2 players to strategize, coordinate, and develop plans to win! 
      </p>

      <div style={{ marginTop: "40px" }}>
        {/* BUTTON POINTING TO TAC MAP PAGE */}
        {/* href IS THE POINTER, delete before final */}
        <a
          href="/tacmap" 
          style={{
            padding: "15px 30px",
            background: "orange",
            color: "black",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: "bold",
          }}
        >
        {/* LABEL IN BUTTON */}
        {/* POTENTIALLY */}
          Get Started
        </a>
      </div>
    </div>
  );
};

export default Home;