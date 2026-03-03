import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import TacMap from "./pages/TacMap";
import Saves from "./pages/Saves";
import Auth from "./pages/Auth";

const App = () => {
  return (
    <Router>
      <div style={{ minHeight: "100vh", background: "#111", color: "white" }}>
        <Navbar />
        <main style={{ padding: "40px" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tacmap" element={<TacMap />} />
            <Route path="/saves" element={<Saves />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;