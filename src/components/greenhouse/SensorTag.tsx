import React from "react";

interface SensorTagProps {
  label: string;
  value: string;
  unit?: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

const SensorTag: React.FC<SensorTagProps> = ({
  label,
  value,
  unit,
  position,
}) => {
  return (
    <div className={`sensor-tag sensor-${position}`}>
      <div className="sensor-tag-label">{label}</div>
      <div className="sensor-tag-value-row">
        <span className="sensor-tag-value">{value}</span>
        {unit && <span className="sensor-tag-unit">{unit}</span>}
      </div>
    </div>
  );
};

export default SensorTag;
