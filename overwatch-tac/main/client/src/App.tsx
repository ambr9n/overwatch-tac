// client/src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Navbar from "./components/Navbar";
import Startup from "./components/Startup/Startup";

import Home from "./pages/Home";
import TacMap from "./pages/TacMap";
import Saves from "./pages/Saves";
import Auth from "./pages/SignUp";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Forum from "./pages/Forum";

const App = () => {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <>
      {/* Startup Animation */}
      {showIntro && <Startup onFinish={() => setShowIntro(false)} />}

      <Router>
        <div style={{ minHeight: "100vh", background: "#111", color: "white" }}>
          <Navbar />
          <main style={{ padding: "40px" }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tacmap" element={<TacMap />} />
              <Route path="/saves" element={<Saves />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile/:uid?" element={<Profile />} />
              <Route path="/forum" element={<Forum />} />
            </Routes>
          </main>
        </div>
      </Router>
    </>
  );
};

export default App;