// Header.jsx – DizAí v1.5.1 header component
import React from "react";
import logoUrl from "./assets/DizAi_FullLogo.svg";

export default function Header({ version, theme, onThemeChange, onThemeKeyDown }) {
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
      <div className="flex items-center space-x-3">
        <img src={logoUrl} alt="DizAí logo" className="h-10" />
        <span className="text-2xl font-extrabold">DizAí {version}</span>
      </div>
      <div className="flex items-center space-x-2">
        <label htmlFor="theme" className="text-sm font-medium text-muted-foreground">
          Theme:
        </label>
        <input
          id="theme"
          type="text"
          value={theme}
          onChange={onThemeChange}
          onKeyDown={onThemeKeyDown}
          className="border rounded px-2 py-1 text-sm"
          placeholder="Enter theme"
        />
      </div>
    </header>
  );
}
