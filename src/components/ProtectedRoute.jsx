// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('auth-token');
  const location = useLocation();

  // Si NO hay sesión, manda al login y recuerda de dónde venía
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  // Si hay sesión, renderiza la ruta privada
  return children;
}
