import React from "react";
import { useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import MetricCard from "../components/cards/MetricCard";
import { useSensorData } from "../hooks/useSensorData";

const ZonePage: React.FC = () => {
  const { zoneId } = useParams<{ zoneId: string }>();
  const { getNodeByZoneId } = useSensorData();
  const node = getNodeByZoneId(zoneId);

  if (!node) {
    return (
      <AppShell>
        <div className="zone-root">
          <h1 className="zone-title">{zoneLabel}</h1>
          <p>No live data for this zone yet. Waiting for CC1310 node...</p>
        </div>
      </AppShell>
    );
  }

  const temperatureC = node.temperatureC;
  const humidity = node.humidityPct;
  const vpd = node.vpdKpa;
  const soilMoisture = node.soilPct;
  const light = node.lightLux;


  const heatStress = vpd > 1.3 || temperatureC > 28 ? "Yes" : "No";

  return (
    <AppShell>
      <div className="zone-root">
        <div className="zone-header-row">
          <div className="zone-title-block">
            <h1 className="zone-title">{zoneLabel}</h1>
            {node && (
              <p className="zone-subtitle">
                Node ID {node.nodeId} · RSSI {node.rssiDbm} dBm
              </p>
            )}
          </div>
          <div className="zone-greenhouse-thumb">
            <div className="zone-greenhouse-image" />
          </div>
        </div>

        <div className="zone-metrics-row">
          <div className="zone-metric-grid">
            <MetricCard
              label="Temperature"
              value={temperatureF.toFixed(1)}
              unit="°F"
              hint="Canopy air temperature"
            />
            <MetricCard
              label="Humidity"
              value={humidity.toFixed(1)}
              unit="%"
              hint="Relative humidity"
            />
            <MetricCard
              label="Soil Moisture"
              value={soilMoisture.toFixed(1)}
              unit="%"
              hint={`Soil sensor · raw ${node?.soilRaw ?? 0}`}
            />
            <MetricCard
              label="Light Intensity"
              value={light.toFixed(0)}
              unit="lx"
              hint={`Raw light index ${node?.lightRaw ?? 0}`}
            />
          </div>
        </div>

        <div className="zone-bottom-row">
          <div className="zone-info-card">
            <div className="zone-info-title">VPD</div>
            <div className="zone-info-value">{vpd.toFixed(2)} kPa</div>
            <div className="zone-info-hint">Target: 0.8–1.2 kPa</div>
          </div>

          <div className="zone-info-card">
            <div className="zone-info-title">Heat Stress</div>
            <div className="zone-info-value">{heatStress}</div>
            <div className="zone-info-hint">
              Based on VPD and temperature thresholds
            </div>
          </div>

          <div className="zone-info-card zone-info-icon">
            <div className="zone-info-title">Plant Health Index</div>
            <div className="zone-info-value">
              {heatStress === "No" ? "Normal" : "At risk"}
            </div>
            <div className="zone-info-gauge" />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default ZonePage;
