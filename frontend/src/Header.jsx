// frontend/src/Header.jsx

import React from "react";

const Header = ({ userId, setUserId }) => {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "#e0e0e0" }}>
      <h2>DizAí v1.0</h2>
      <div>
        <label>User:&nbsp;</label>
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="johan">Johan</option>
          <option value="petra">Petra</option>
        </select>
      </div>
    </header>
  );
};

export default Header;
