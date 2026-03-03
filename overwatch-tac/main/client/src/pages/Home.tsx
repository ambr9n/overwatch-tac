const Home = () => {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>
        Overwatch Tactical Map
      </h1>

      <p style={{ fontSize: "18px", color: "#ccc" }}>
        Plan team comps. Draw strategies. Coordinate ult rotations.
      </p>

      <div style={{ marginTop: "40px" }}>
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
          Start Planning
        </a>
      </div>
    </div>
  );
};

export default Home;