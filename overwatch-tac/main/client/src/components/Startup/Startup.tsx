import { useEffect, useState } from "react";
import "./Startup.css";

interface Props {
  onFinish: () => void;
}

const Startup = ({ onFinish }: Props) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 800); // wait for fade animation
    }, 2500); // how long intro shows (2.5s)

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`startup ${fadeOut ? "fade-out" : ""}`}>
      <h1 className="startup-logo">
        Toptext<br />
        <span>Bottomtext</span>
      </h1>
    </div>
  );
};

export default Startup;