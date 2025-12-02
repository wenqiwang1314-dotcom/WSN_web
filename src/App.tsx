import { Routes, Route, Navigate } from "react-router-dom";
import SignInForm from "./components/auth/SignInForm";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage"; // 假设你有

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<SignInForm />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
