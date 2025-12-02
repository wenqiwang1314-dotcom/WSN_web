import React from "react";
import { NavLink } from "react-router-dom";

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="shell-left">
          <button className="icon-button" aria-label="Open navigation">
            ☰
          </button>
          <div className="shell-logo">
            <div className="logo-mark" />
            <span className="shell-logo-text">Greenhouse Digital Twin</span>
          </div>
        </div>

        <nav className="shell-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              "shell-nav-link" + (isActive ? " shell-nav-active" : "")
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              "shell-nav-link" + (isActive ? " shell-nav-active" : "")
            }
          >
            Analytics
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              "shell-nav-link" + (isActive ? " shell-nav-active" : "")
            }
          >
            Settings
          </NavLink>
        </nav>

        <div className="shell-right">
          <button className="icon-button" aria-label="More">
            ☰
          </button>
        </div>
      </header>

      <main className="shell-main">{children}</main>
    </div>
  );
};

export default AppShell;

