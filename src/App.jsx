// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import AddViaticoPage from "./pages/AddViaticoPage";
import EditViaticosPage from "./pages/EditViaticosPage";
import EditViaticoDetailPage from "./pages/EditViaticoDetailPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* pública */}
        <Route path="/login" element={<LoginPage />} />
        {/* privadas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agregar-viatico"
          element={
            <ProtectedRoute>
              <AddViaticoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editar-viaticos"
          element={
            <ProtectedRoute>
              <EditViaticosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editar-viaticos/:id"
          element={
            <ProtectedRoute>
              <EditViaticoDetailPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}



