import React from "react";
import AppShell from "../components/layout/AppShell";

const SettingsPage: React.FC = () => {
  return (
    <AppShell>
      <div className="page-placeholder">
        <h1>Settings</h1>
        <p>Gateway configuration, CC1310 nodes, and alert thresholds.</p>
      </div>
    </AppShell>
  );
};

export default SettingsPage;
