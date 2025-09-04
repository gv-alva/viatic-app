import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import styles from './AddViaticoPage.module.css'; // reusamos estilos del form "Agregar"
import bgHome from '../assets/background_home.png';

const CR_MAP = {
  '1265': 'Tequila', '1266': 'Amatitan', '1262': 'Ahualulco', '1263': 'Etzatlan', '1264': 'Amatitan',
  '0587': 'Ameca', '1756': 'Pyme Ameca', '3021': 'Dz Ameca', '1206': 'Cocula', '1249': 'Acatlan',
  '0451': 'Zacoalco', '1207': 'San Martín Hidalgo', '0687': 'Banca Gobierno Ameca',
};
const getTipoFromFolio = (folio) => {
  if (!folio) return '';
  const f = String(folio).toUpperCase();
  if (f.startsWith('REI') || f.startsWith('INC0')) return 'Field Services';
  return 'Instalaciones';
};

export default function EditViaticoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState('gasolina'); // 'gasolina' | 'viaticos'
  const isGasolina = tipo === 'gasolina';

  const [form, setForm] = useState({
    // comunes
    nombre: '', fechaGasto: '', motivoGasto: '', cr: '', sucursal: '', folio: '', observaciones: '',
    tipoServicio: '',
    // gasolina
    origen: '', destino: '', kmInicial: '', kmFinal: '', km: '',
    // viáticos
    montoComprobar: '',
  });

  // cargar
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    axios.get(`${import.meta.env.VITE_API_URL}/api/viaticos/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      const v = res.data;
      setTipo(v.tipo);
      setForm({
        nombre: v.nombre || '',
        fechaGasto: v.fechaGasto ? new Date(v.fechaGasto).toISOString().slice(0, 10) : '',
        motivoGasto: v.motivoGasto || (v.tipo === 'gasolina' ? 'Gasolina' : ''),
        cr: v.cr || '',
        sucursal: v.sucursal || '',
        folio: v.folio || '',
        observaciones: v.observaciones || '',
        tipoServicio: v.tipoServicio || getTipoFromFolio(v.folio),
        origen: v.origen || '',
        destino: v.destino || '',
        kmInicial: v.kmInicial ?? '',
        kmFinal: v.kmFinal ?? '',
        km: v.km ?? '',
        montoComprobar: v.montoComprobar ?? '',
      });
    }).catch(() => {
      alert('No se pudo cargar el viático');
      navigate('/editar-viaticos');
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  const calcKm = (a, b) => {
    const x = parseFloat(a), y = parseFloat(b);
    if (Number.isNaN(x) || Number.isNaN(y)) return '';
    const d = y - x;
    return d < 0 ? '' : Number(d.toFixed(1));
  };

  const onChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cr') {
      setForm((f) => ({ ...f, cr: value, sucursal: CR_MAP[value] ?? f.sucursal }));
      return;
    }
    if (name === 'kmInicial' || name === 'kmFinal') {
      setForm((f) => {
        const next = { ...f, [name]: value };
        next.km = calcKm(next.kmInicial, next.kmFinal);
        return next;
      });
      return;
    }
    if (name === 'folio') {
      const nextTipo = getTipoFromFolio(value);
      setForm((f) => ({ ...f, folio: value, tipoServicio: nextTipo || f.tipoServicio }));
      return;
    }

    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleToggleTipo = () => {
    setTipo((t) => {
      const next = t === 'gasolina' ? 'viaticos' : 'gasolina';
      setForm((f) => ({
        ...f,
        motivoGasto: next === 'gasolina' ? 'Gasolina' : '',
        origen: next === 'gasolina' ? f.origen : '',
        destino: next === 'gasolina' ? f.destino : '',
        kmInicial: next === 'gasolina' ? f.kmInicial : '',
        kmFinal: next === 'gasolina' ? f.kmFinal : '',
        km: next === 'gasolina' ? f.km : '',
        montoComprobar: next === 'viaticos' ? f.montoComprobar : '',
      }));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('auth-token');

    const comunesReq = ['nombre', 'fechaGasto', 'motivoGasto', 'cr', 'sucursal', 'folio', 'tipoServicio'];
    const reqGasolina = [...comunesReq, 'origen', 'destino', 'kmInicial', 'kmFinal'];
    const reqViaticos = [...comunesReq, 'montoComprobar'];
    const required = isGasolina ? reqGasolina : reqViaticos;
    const missing = required.filter((k) => !String(form[k] ?? '').trim());
    if (missing.length) return alert('Faltan: ' + missing.join(', '));

    if (isGasolina) {
      const kmCalc = calcKm(form.kmInicial, form.kmFinal);
      if (kmCalc === '' || kmCalc < 0) return alert('KM final debe ser ≥ KM inicial');
    }

    const base = {
      tipo, nombre: form.nombre, fechaGasto: form.fechaGasto, motivoGasto: form.motivoGasto,
      cr: form.cr, sucursal: form.sucursal, folio: form.folio, observaciones: form.observaciones,
      tipoServicio: form.tipoServicio,
    };
    const payload = isGasolina
      ? { ...base, origen: form.origen, destino: form.destino,
          kmInicial: Number(form.kmInicial || 0), kmFinal: Number(form.kmFinal || 0),
          km: Number(calcKm(form.kmInicial, form.kmFinal) || 0) }
      : { ...base, montoComprobar: Number(form.montoComprobar || 0) };

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/viaticos/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Viático actualizado');
      navigate('/editar-viaticos');
    } catch (err) {
      alert(err?.response?.data?.message || 'No se pudo actualizar');
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.container}><div className={styles.info}>Cargando…</div></div>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${bgHome})` }}>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h1>Editar Viático</h1>
          <button className={styles.backBtn} onClick={() => navigate('/editar-viaticos')}>Volver</button>
        </div>

        {/* Switch tipo */}


        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            {/* Nombre (solo lectura si quieres) */}
            <label className={styles.field}>
              <span>Nombre</span>
              <input type="text" name="nombre" value={form.nombre} onChange={onChange} readOnly />
            </label>

            <label className={styles.field}>
              <span>Fecha del gasto</span>
              <input type="date" name="fechaGasto" value={form.fechaGasto} onChange={onChange} required />
            </label>

            <label className={styles.field}>
              <span>Motivo del gasto</span>
              {isGasolina ? (
                <input type="text" name="motivoGasto" value="Gasolina" readOnly required />
              ) : (
                <select name="motivoGasto" value={form.motivoGasto} onChange={onChange} required>
                  <option value="">Selecciona un motivo</option>
                  <option value="Alimentación">Alimentación</option>
                  <option value="Autobuseros Foráneo">Autobuseros Foráneo</option>
                  <option value="Camion Urbano">Camion Urbano</option>
                  <option value="Casetas">Casetas</option>
                  <option value="Estacionamiento">Estacionamiento</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Hospedaje">Hospedaje</option>
                  <option value="Material">Material</option>
                  <option value="Siteur">Siteur</option>
                  <option value="Paqueteria">Paqueteria</option>
                  <option value="Taxi">Taxi</option>
                </select>
              )}
            </label>

            <label className={styles.field}>
              <span>CR</span>
              <input type="text" name="cr" value={form.cr} onChange={onChange} inputMode="numeric" pattern="\d{4}" maxLength={4} required />
            </label>

            <label className={styles.field}>
              <span>Sucursal</span>
              <input type="text" name="sucursal" value={form.sucursal} onChange={onChange} required />
            </label>

            <label className={styles.field}>
              <span>Folio</span>
              <input type="text" name="folio" value={form.folio} onChange={onChange} required />
            </label>

            <label className={styles.field}>
              <span>Tipo</span>
              <select name="tipoServicio" value={form.tipoServicio} onChange={onChange} required>
                <option value="">Selecciona una opción</option>
                <option value="Field Services">Field Services</option>
                <option value="Instalaciones">Instalaciones</option>
                <option value="Mantenimiento equipo de transporte">Mantenimiento equipo de transporte</option>
                <option value="Administración">Administración</option>
              </select>
            </label>

            {isGasolina ? (
              <>
                <label className={styles.field}>
                  <span>Origen</span>
                  <input type="text" name="origen" value={form.origen} onChange={onChange} required />
                </label>
                <label className={styles.field}>
                  <span>Destino</span>
                  <input type="text" name="destino" value={form.destino} onChange={onChange} required />
                </label>
                <label className={styles.field}>
                  <span>KM inicial</span>
                  <input type="number" name="kmInicial" min="0" step="0.1" value={form.kmInicial} onChange={onChange} required />
                </label>
                <label className={styles.field}>
                  <span>KM final</span>
                  <input type="number" name="kmFinal" min="0" step="0.1" value={form.kmFinal} onChange={onChange} required />
                </label>
                <label className={styles.field}>
                  <span>KM (Final − Inicial)</span>
                  <input type="number" name="km" value={form.km} readOnly />
                </label>
              </>
            ) : (
              <label className={styles.field}>
                <span>Monto a Comprobar (MXN)</span>
                <input type="number" name="montoComprobar" min="0" step="0.01" value={form.montoComprobar} onChange={onChange} required />
              </label>
            )}

            <label className={`${styles.field} ${styles.colSpan2}`}>
              <span>Observaciones</span>
              <textarea name="observaciones" rows={4} value={form.observaciones} onChange={onChange} />
            </label>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.primary}>Guardar cambios</button>
            <button type="button" className={styles.secondary} onClick={() => navigate('/editar-viaticos')}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
