// src/components/Navbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // borra toda la sesión
    localStorage.removeItem("auth-token");
    localStorage.removeItem("userId");
    // redirige a login
    navigate("/login");
  };

  return (
    <nav className={styles.navbar}>
      <h1 className={styles.title}>Viatic App</h1>
      <button onClick={handleLogout} className={styles.logout}>
        Cerrar sesión
      </button>
    </nav>
  );
}

