// LoginForm.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaLock } from 'react-icons/fa';
import axios from 'axios';
import logoImage from '../assets/login_logo.png';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('${import.meta.env.VITE_API_URL}/api/login', {
        username,
        password,
      });

      // --- 1. AQUÍ ESTÁ LA CORRECCIÓN ---
      // Extraemos tanto el token como el userId de la respuesta.
      const { token, userId } = response.data;

      // --- 2. GUARDAMOS AMBOS DATOS ---
      // Guardamos el token para futuras peticiones autenticadas.
      localStorage.setItem('auth-token', token);
      // Guardamos el userId para saber qué usuario es.
      localStorage.setItem('userId', userId);

      // Redirigimos al usuario a la página principal
      navigate('/');

    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      alert('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <motion.div className="card-container">
      {/* ...el resto de tu código JSX no cambia... */}
      <div 
        className="logo-container"
        style={{ backgroundImage: `url(${logoImage})` }}
      />
      <header className="card-header">
        <h1>LOG IN</h1>
      </header>
      <form className="form-container" onSubmit={handleSubmit}>
        <div className="input-group">
          <FaUser className="input-icon" size={16} />
          <input 
            type="text" 
            placeholder="Username" 
            required 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="input-group">
          <FaLock className="input-icon" size={16} />
          <input 
            type="password" 
            placeholder="Password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="extra-options">
          <label className="remember-me">
            <input type="checkbox" />
            Remember me
          </label>
        </div>
        <motion.button
          type="submit"
          className="submit-button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Login
        </motion.button>
      </form>
      <a href="#" className="forgot-password" style={{marginTop: '1.5rem', display: 'inline-block'}}>
        Forgot Password?
      </a>
    </motion.div>
  );
};



export default LoginForm;