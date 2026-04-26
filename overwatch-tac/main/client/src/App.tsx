import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "./Supabase";

import Navbar from "./components/Navbar";
import Startup from "./components/Startup/Startup";
import Footer from "./components/Footer"; 

import Home from "./pages/Home";
import TacMap from "./pages/TacMap";
import Saves from "./pages/Saves";
import Auth from "./pages/SignUp";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ProfileRedirect from "./pages/ProfileRedirect";
import Teams from "./pages/Teams";
import Forum from "./pages/Forum";
import AboutUs from "./pages/AboutUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ContactUs from "./pages/Contact";

const App = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      {/* Startup Animation */}
      {showIntro && <Startup onFinish={() => setShowIntro(false)} />}

      <Router>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#111", color: "white" }}>
          <Navbar />
          <main style={{ flex: 1, padding: "40px" }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tacmap" element={<TacMap />} />
              <Route path="/saves" element={<Saves />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<ProfileRedirect />} />
              <Route path="/profile/:uid" element={<Profile />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/forum" element={<Forum currentUser={user} />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />

              {/* ✅ ADD THIS */}
              <Route path="/contact" element={<ContactUs />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </>
  );
};

export default App;