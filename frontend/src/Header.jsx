import React from "react";
import FullLogo from "./assets/DizAi_FullLogo.svg?react";

export default function Header() {
  return (
    <header>
      <div style={{ marginLeft: 24 }}>
        <FullLogo style={{ height: 44, verticalAlign: "middle" }} />
      </div>
      <div>
        <span style={{
          fontFamily: "'Nunito Sans', Poppins, Arial, sans-serif",
          fontWeight: 800,
          fontSize: 28,
          color: "#0033A0",
          letterSpacing: 1
        }}>
          DizAí
        </span>
        <span style={{
          fontFamily: "'Nunito Sans', Poppins, Arial, sans-serif",
          fontWeight: 800,
          color: "#D1495B",
          marginLeft: 3,
          fontSize: 34,
          verticalAlign: "middle"
        }}>
          í
        </span>
      </div>
    </header>
  );
}
