import { useState } from "react";
import type { MouseEvent } from "react";

interface Marker {
  x: number;
  y: number;
}

const TacMap: React.FC = () => {
  const [markers, setMarkers] = useState<Marker[]>([]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMarkers([...markers, { x, y }]);
  };

  return (
    <div>
      <h2>Tac Map</h2>
      <div
        onClick={handleClick}
        style={{
          width: "100%",
          height: "500px",
          background: "#222",
          position: "relative",
        }}
      >
        {markers.map((m, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: "10px",
              height: "10px",
              background: "orange",
              borderRadius: "50%",
              left: m.x,
              top: m.y,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default TacMap;