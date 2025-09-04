import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';
import logoImage from '../assets/login_logo.png';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth-token');
    navigate('/login');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <img src={logoImage} alt="Viatic logo" className={styles.logo} />
        <h1 className={styles.title}>Viatic</h1>
      </div>

      <button onClick={handleLogout} className={styles.logoutButton}>
        Cerrar Sesión
      </button>
    </nav>
  );
};

export default Navbar;
