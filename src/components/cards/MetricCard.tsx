import React from "react";

type MetricStatus = "ok" | "warn" | "alert";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  status?: MetricStatus;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  hint,
  status = "ok",
}) => {
  return (
    <div className={`metric-card metric-${status}`}>
      <div className="metric-header">
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value-row">
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {hint && <div className="metric-hint">{hint}</div>}
    </div>
  );
};

export default MetricCard;
