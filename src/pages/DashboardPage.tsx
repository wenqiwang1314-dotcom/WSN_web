import React from "react";
import AppShell from "../components/layout/AppShell";
import MetricCard from "../components/cards/MetricCard";
import VpdChartCard from "../components/cards/VpdChartCard";
import GreenhouseView from "../components/greenhouse/GreenhouseView";
import { useSensorData } from "../hooks/useSensorData";

const DashboardPage: React.FC = () => {
  const { nodeList, isConnected } = useSensorData();

  const mainNode = nodeList.find((n) => n.nodeId === "0x1") ?? nodeList[0];

  if (!mainNode) {
    return (
      <AppShell>
        <div className="dashboard-root">
          <div className="dashboard-status-row">
            <span className="topbar-badge">
              {isConnected ? "Waiting" : "Offline"}
            </span>
            <span className="topbar-text">
              Waiting for data from CC1310 node (CSV history or MQTT live)...
            </span>
          </div>
        </div>
      </AppShell>
    );
  }

  const temperature = mainNode.temperatureC;
  const humidity = mainNode.humidityPct;
  const soilPct = mainNode.soilPct;
  const lightLux = mainNode.lightLux;
  const vpd = mainNode.vpdKpa;

  return (
    <AppShell>
      <div className="dashboard-root">
        <div className="dashboard-status-row">
          <span className="topbar-badge">{isConnected ? "Live" : "Offline"}</span>
          <span className="topbar-text">
            Nodes: {nodeList.length} · Gateway: {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <main className="dashboard-main">
          <section className="dashboard-grid">
            <div className="dashboard-left">
              <div className="metric-grid">
                <MetricCard
                  label="Temperature"
                  value={temperature.toFixed(1)}
                  unit="°C"
                  hint="Air temperature near canopy"
                />
                <MetricCard
                  label="Humidity"
                  value={humidity.toFixed(1)}
                  unit="%"
                  hint="Relative humidity"
                />
                <MetricCard
                  label="Soil Moisture"
                  value={soilPct.toFixed(1)}
                  unit="%"
                  status={soilPct < 25 ? "warn" : "ok"}
                  hint={`Soil sensor · raw ${mainNode.soilRaw ?? 0}`}
                />
                <MetricCard
                  label="Light Intensity"
                  value={lightLux.toFixed(0)}
                  unit="lx"
                  status="ok"
                  hint={`Raw light index ${mainNode.lightRaw ?? 0}`}
                />
              </div>

              <div className="vpd-section">
                <VpdChartCard currentVpd={vpd} />
              </div>
            </div>

            <aside className="dashboard-right">
              {/* 如果你还没改 GreenhouseView props，就先删掉 registryByExt 这个 prop */}
              <GreenhouseView nodes={nodeList} />
            </aside>
          </section>
        </main>
      </div>
    </AppShell>
  );
};

export default DashboardPage;
