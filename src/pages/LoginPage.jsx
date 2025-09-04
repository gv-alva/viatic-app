import React, { useEffect } from 'react';
import LoginForm from '../components/LoginForm';
import '../index.css';
import bgImage from '../assets/background_Login.png';

const LoginPage = () => {
  // Bloquea el scroll global mientras está montado el Login
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, []);

  const pageStyle = {
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div className="login-page-background" style={pageStyle}>
      <LoginForm />
    </div>
  );
};

export default LoginPage;
