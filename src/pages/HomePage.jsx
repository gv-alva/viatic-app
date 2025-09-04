// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import background from '../assets/background_home.png';
import styles from './HomePage.module.css';

const HomePage = () => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    fetch(`${import.meta.env.VITE_API_URL}/api/user/${userId}`)
      .then(r => r.json())
      .then(d => d?.name && setUsername(d.name))
      .catch(() => {});
  }, []);

  const goAdd = () => navigate('/agregar-viatico');
  const goEdit = () => navigate('/editar-viaticos');

  return (
    <div
      className={styles.homeContainer}
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className={styles.overlay} />
      <Navbar />

      <main className={styles.card}>
        <h1 className={styles['welcome-tag']}>
          Bienvenido: <span className={styles.name}>{username || '...'}</span>
        </h1>

        <p className={styles.subtitle}>¿Qué quieres hacer hoy?</p>

        <div className={styles.ctaRow}>
          <button type="button" className={styles['add-viatic']} onClick={goAdd}>
            Agregar Viatico
          </button>
          <button type="button" className={styles['edit-viatic']} onClick={goEdit}>
            Editar Viaticos
          </button>
        </div>

        <p className={styles.helper}>
          Tip: Pega tu mensaje y autocompletamos Folio, CR, Sucursal y Fecha.
        </p>
      </main>
    </div>
  );
};

export default HomePage;

