import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../store/AuthContext";
import "./SignInForm.css";

export default function SignInForm() {
  const { login } = useAuth();
  const [username, setUser] = useState("");
  const [password, setPass] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      login(data.token, data.username);
      window.location.href = "/CC1310_WEB/dashboard";
    } catch (err) {
      console.error(err);
      setError("Network error");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">GT</div>
        <h1 className="auth-title">Greenhouse Digital Twin</h1>
        <p className="auth-subtitle">
          Smart IoT & Digital Twin for Modern Greenhouses
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Username
            <input
              className="auth-input"
              value={username}
              onChange={(e) => setUser(e.target.value)}
              placeholder="admin"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-button" type="submit">
            Sign in
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">
            Demo account: <strong>admin / admin123</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
