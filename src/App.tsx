import { Routes, Route, Navigate } from "react-router-dom";
import SignInForm from "./components/auth/SignInForm";
import ProtectedRoute from "./routes/ProtectedRoute";

import DashboardPage from "./pages/DashboardPage";
import ZonePage from "./pages/ZonePage";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<SignInForm />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/zones/:zoneId"
        element={
          <ProtectedRoute>
            <ZonePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Catch-all: any unknown path back to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
