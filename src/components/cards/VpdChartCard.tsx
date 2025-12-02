import React from "react";

interface VpdChartCardProps {
  currentVpd: number;
}

const VpdChartCard: React.FC<VpdChartCardProps> = ({ currentVpd }) => {
  return (
    <div className="vpd-card">
      <div className="vpd-header">
        <div>
          <div className="vpd-title">VPD (kPa)</div>
          <div className="vpd-subtitle">Vapor Pressure Deficit</div>
        </div>
        <div className="vpd-current">
          <span className="vpd-value">{currentVpd.toFixed(2)}</span>
          <span className="vpd-unit">kPa</span>
        </div>
      </div>

      {/* 这里后面会接 Chart.js，现在先留一个占位区域 */}
      <div className="vpd-chart-placeholder">
        <div className="vpd-chart-lines">
          <span className="vpd-chart-label">Last 24h trend (mock)</span>
        </div>
      </div>
    </div>
  );
};

export default VpdChartCard;
