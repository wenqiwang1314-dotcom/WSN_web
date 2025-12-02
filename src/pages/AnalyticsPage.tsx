import React from "react";
import AppShell from "../components/layout/AppShell";

const AnalyticsPage: React.FC = () => {
  return (
    <AppShell>
      <div className="page-placeholder">
        <h1>Analytics</h1>
        <p>
          Historical trends, yield predictions and AI-based recommendations will
          be shown here.
        </p>
      </div>
    </AppShell>
  );
};

export default AnalyticsPage;
