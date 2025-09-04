import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // Verificamos si existe el token en localStorage
  const token = localStorage.getItem('auth-token');

  if (!token) {
    // Si no hay token, redirigimos al login
    return <Navigate to="/login" />;
  }

  // Si hay un token, mostramos el componente hijo (en este caso, HomePage)
  return children;
};

export default ProtectedRoute;