import React from "react";
import logoUrl from "./assets/DizAi_FullLogo.svg";

export default function Header({ version = "v1.0" }) {
  return (
    <header className="dizai-header">
      <img src={logoUrl} alt="DizAí Logo" className="logo" />
      <h1 className="title">DizAí {version}</h1>
    </header>
  );
}
