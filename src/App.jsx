// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AddViaticoPage from './pages/AddViaticoPage';
import EditViaticosPage from './pages/EditViaticosPage'; // NUEVO
import EditViaticoDetailPage from './pages/EditViaticoDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/agregar-viatico" element={<AddViaticoPage />} />
        <Route path="/editar-viaticos" element={<EditViaticosPage />} /> {/* NUEVO */}
        <Route path="/editar-viaticos/:id" element={<EditViaticoDetailPage />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;
