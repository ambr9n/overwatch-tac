import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import TacMap from "./pages/TacMap";
import Saves from "./pages/Saves";
import Auth from "./pages/Auth";

const App: React.FC = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tacmap" element={<TacMap />} />
        <Route path="/saves" element={<Saves />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </Router>
  );
};

export default App;