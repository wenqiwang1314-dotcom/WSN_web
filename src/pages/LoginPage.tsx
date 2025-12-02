import React from "react";
import SignInForm from "../components/auth/SignInForm";

const LoginPage: React.FC = () => {
  return (
    <div className="app-root app-login">
      <div className="login-card">
        <div className="logo-row">
          <div className="logo-mark" />
          <div className="logo-text">
            <div className="logo-title">Greenhouse</div>
            <div className="logo-subtitle">Digital Twin</div>
          </div>
        </div>

        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">
          Smart IoT &amp; Digital Twin for Modern Greenhouses
        </p>

        <SignInForm />
      </div>
    </div>
  );
};

export default LoginPage;
