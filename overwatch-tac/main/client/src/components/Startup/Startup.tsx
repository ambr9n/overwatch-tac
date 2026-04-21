import { useEffect, useState } from "react";
import "./Startup.css";

interface Props {
  onFinish: () => void;
}

const Startup = ({ onFinish }: Props) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");

    if (hasSeenIntro) {
      onFinish();
      return;
    }

    const timer = setTimeout(() => {
      setFadeOut(true);
      
      setTimeout(() => {
        sessionStorage.setItem("hasSeenIntro", "true");
        onFinish();
      }, 800); 
    }, 2000); 

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (typeof window !== "undefined" && sessionStorage.getItem("hasSeenIntro")) {
    return null;
  }

  return (
    <div className={`startup ${fadeOut ? "fade-out" : ""}`}>
      <h1 className="startup-logo">
        <p style={{ textAlign: 'center' }}>
          OWTac<br />
          <span></span>
        </p>
      </h1>
    </div>
  );
};

export default Startup;