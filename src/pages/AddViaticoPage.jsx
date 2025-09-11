// src/pages/AddViaticoPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import styles from './AddViaticoPage.module.css';
import bgHome from '../assets/background_home.png';
import { CR_MAP, CR_OVERRIDES, detectCrSucursalFromMensaje, normalizeCr } from '../lib/cr-utils';


// --- Folio desde mensaje ---
const detectFolioFromMensaje = (texto) => {
  if (!texto) return null;
  const upper = texto.toUpperCase();
  if (upper.includes('CABLEADO DE SEGURIDAD')) return 'CABLEADO DE SEGURIDAD';
  if (/\bWIFI\b/.test(upper)) return 'WIFI';
  const patterns = [
    /\bINC\d{3,}\b/i,
    /\bSCTASK\d{3,}\b/i,
    /\bUA8[- ]?[A-Za-z0-9]{2,}\b/i,
    /\bPDDOCC[- ]?[A-Za-z0-9]{2,}\b/i,
  ];
  for (const re of patterns) {
    const m = upper.match(re);
    if (m) return m[0].replace(/\s+/g, '');
  }
  return null;
};



// --- Fecha (dd/mm/aaaa) -> aaaa-mm-dd ---
// --- Fecha: acepta dd/mm/aaaa, dd-mm-aaaa, dd.mm.aaaa, dd/mmm(/aaaa), dd mmm (usa año actual si falta) ---
const detectFechaFromMensaje = (texto) => {
  if (!texto) return null;

  // Normaliza (quita acentos) y convierte a MAYÚSCULAS para comparar meses
  const norm = texto
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const pad = (n) => String(n).padStart(2, '0');
  const currentYear = new Date().getFullYear();

  // 1) dd/mm/aaaa ó dd-mm-aaaa ó dd.mm.aaaa
  {
    const m = norm.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
    if (m) {
      const dd = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const yyyy = parseInt(m[3], 10);
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
        return `${yyyy}-${pad(mm)}-${pad(dd)}`;
      }
    }
  }

  // 2) dd/mmm(/aaaa)?  -> ej: 15/sep, 15-sept-2025, 15 sep
  {
    const m = norm.match(/\b(\d{1,2})[\/\-. ]([A-Z]{3,9})(?:[\/\-. ](\d{4}))?\b/);
    if (m) {
      const dd = parseInt(m[1], 10);
      const mon = m[2];
      const yyyy = m[3] ? parseInt(m[3], 10) : currentYear;

      const toMonth = (s) => {
        if (s.startsWith('ENE')) return 1;
        if (s.startsWith('FEB')) return 2;
        if (s.startsWith('MAR')) return 3;
        if (s.startsWith('ABR')) return 4;
        if (s.startsWith('MAY')) return 5;
        if (s.startsWith('JUN')) return 6;
        if (s.startsWith('JUL')) return 7;
        if (s.startsWith('AGO')) return 8;
        if (s.startsWith('SEP') || s.startsWith('SEPT')) return 9;
        if (s.startsWith('OCT')) return 10;
        if (s.startsWith('NOV')) return 11;
        if (s.startsWith('DIC')) return 12;
        return null;
      };

      const mm = toMonth(mon);
      if (dd >= 1 && dd <= 31 && mm !== null) {
        return `${yyyy}-${pad(mm)}-${pad(dd)}`;
      }
    }
  }

  // 3) dd/mm sin año -> usa año actual
  {
    const m = norm.match(/\b(\d{1,2})[\/\-.](\d{1,2})\b/);
    if (m) {
      const dd = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
        return `${currentYear}-${pad(mm)}-${pad(dd)}`;
      }
    }
  }

  return null;
};


// --- Reglas extra ---
const hasReincidentes = (texto) => (texto || '').toUpperCase().includes('REINCIDENTES');
const getTipoFromFolio = (folio) => {
  if (!folio) return '';
  const f = String(folio).toUpperCase();
  if (f.startsWith('REI') || f.startsWith('INC0')) return 'Field Services';
  return 'Instalaciones';
};

// --- Util: KM final - KM inicial ---
const calcKm = (kmInicial, kmFinal) => {
  const a = parseFloat(kmInicial), b = parseFloat(kmFinal);
  if (Number.isNaN(a) || Number.isNaN(b)) return '';
  const diff = b - a;
  return diff < 0 ? '' : Number(diff.toFixed(1));
};

// --- Claves para “arrastrar” datos del registro anterior ---
const LS_LAST_DESTINO = 'viatic:lastDestino';
const LS_LAST_KMFINAL = 'viatic:lastKmFinal';

const AddViaticoPage = () => {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('gasolina'); // 'gasolina' | 'viaticos'
  const isGasolina = tipo === 'gasolina';

  const [okMsg, setOkMsg] = useState('');
  const msgRef = useRef(null);

  // Activación del arrastre por usuario foráneo
  const [carryOverEnabled, setCarryOverEnabled] = useState(false);

  const [form, setForm] = useState({
    // comunes
    mensaje: '', nombre: '', fechaGasto: '',
    motivoGasto: 'Gasolina', cr: '', sucursal: '', folio: '',
    observaciones: '', tipoServicio: '',
    // gasolina
    origen: '', destino: '', kmInicial: '', kmFinal: '', km: '',
    // viáticos
    montoComprobar: '',
  });

  // Autocompletar nombre desde backend + leer bandera "foraneo"
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    const token = localStorage.getItem('auth-token');

    fetch(`${import.meta.env.VITE_API_URL}/api/user/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        const nombre = data?.name || data?.username || '';
        if (nombre) setForm(f => ({ ...f, nombre }));
        setCarryOverEnabled(Boolean(data?.foraneo));
      })
      .catch(() => {});
  }, []);

  // Precargar Origen/KM inicial desde el último registro SOLO si está activo el modo foráneo
  useEffect(() => {
    if (!carryOverEnabled) return;
    const lastDestino = localStorage.getItem(LS_LAST_DESTINO) || '';
    const lastKmFinal = localStorage.getItem(LS_LAST_KMFINAL) || '';
    if (lastDestino || lastKmFinal) {
      setForm(f => ({
        ...f,
        origen: lastDestino || f.origen,
        kmInicial: lastKmFinal || f.kmInicial,
      }));
    }
  }, [carryOverEnabled]);

  const onChange = (e) => {
    const { name, value } = e.target;

    if (name === 'mensaje') {
      const autoFolioStd = detectFolioFromMensaje(value);
      const autoCrSuc    = detectCrSucursalFromMensaje(value);
      const autoFecha    = detectFechaFromMensaje(value);
    
      setForm((f) => {
        const nextCr    = autoCrSuc?.cr ?? f.cr;
        const nextSuc   = autoCrSuc?.sucursal ?? f.sucursal;
        const nextFecha = autoFecha ?? f.fechaGasto;
    
        // Si hay "Reincidentes" + CR, tu regla original
        const folioRei  = hasReincidentes(value) && nextCr ? `Rei${nextCr}` : null;
    
        // Base (antes de overrides)
        let folioFinal   = folioRei ?? autoFolioStd ?? f.folio;
        let destinoFinal = f.destino;
    
        // ✅ Override SOLO cuando el CR viene detectado desde el Mensaje
        if (autoCrSuc?.cr && CR_OVERRIDES[autoCrSuc.cr]) {
          const override = CR_OVERRIDES[autoCrSuc.cr];
          folioFinal   = override.folio;
          destinoFinal = override.destino; // si no quieres pisar valor previo: destinoFinal = f.destino || override.destino;
        }
    
        const tipoAuto = folioFinal
          ? getTipoFromFolio(folioFinal)
          : (hasReincidentes(value) ? 'Field Services' : f.tipoServicio);
    
        return {
          ...f,
          mensaje: value,
          cr: nextCr,
          sucursal: nextSuc,
          fechaGasto: nextFecha,
          folio: folioFinal,
          destino: destinoFinal,
          tipoServicio: tipoAuto,
        };
      });
      return;
    }
    

    if (name === 'cr') {
      const canon = normalizeCr(value);
      setForm((f) => {
        const nextCr = canon;
        const nextSucursal = CR_MAP[nextCr] ?? f.sucursal;
        const nextFolio = hasReincidentes(f.mensaje) ? `Rei${nextCr}` : f.folio;
        const nextTipo = getTipoFromFolio(nextFolio || f.folio);
        return {
          ...f,
          cr: nextCr,
          sucursal: nextSucursal,
          folio: nextFolio,
          tipoServicio: nextTipo || f.tipoServicio
        };
      });
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
  
    // Reglas de campos obligatorios por modo
    const comunesReq = ['nombre', 'fechaGasto', 'motivoGasto', 'cr', 'sucursal', 'folio', 'tipoServicio'];
    const reqGasolina = [...comunesReq, 'origen', 'destino', 'kmInicial', 'kmFinal'];
    const reqViaticos = [...comunesReq, 'montoComprobar'];
    const required = isGasolina ? reqGasolina : reqViaticos;
  
    const missing = required.filter((k) => !String(form[k] ?? '').trim());
    if (missing.length) {
      window.alert('Faltan campos obligatorios: ' + missing.join(', '));
      return;
    }
  
    if (isGasolina) {
      const kmCalc = calcKm(form.kmInicial, form.kmFinal);
      if (kmCalc === '' || kmCalc < 0) {
        window.alert('Revisa los kilómetros: KM final debe ser mayor o igual a KM inicial.');
        return;
      }
    }
  
    const base = {
      tipo, // 'gasolina' | 'viaticos'
      nombre: form.nombre,
      fechaGasto: form.fechaGasto,
      motivoGasto: form.motivoGasto,
      cr: form.cr,
      sucursal: form.sucursal,
      folio: form.folio,
      observaciones: form.observaciones,
      tipoServicio: form.tipoServicio,
    };
  
    const payload = isGasolina
      ? {
          ...base,
          origen: form.origen,
          destino: form.destino,
          kmInicial: Number(form.kmInicial || 0),
          kmFinal: Number(form.kmFinal || 0),
          km: Number(calcKm(form.kmInicial, form.kmFinal) || 0),
        }
      : {
          ...base,
          montoComprobar: Number(form.montoComprobar || 0),
        };
  
    try {
      const token = localStorage.getItem('auth-token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/viaticos`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
  
      // Si el usuario es foráneo y el tipo es gasolina, guarda para el siguiente registro
      if (isGasolina && carryOverEnabled) {
        if (form.destino) localStorage.setItem(LS_LAST_DESTINO, form.destino);
        if (form.kmFinal !== undefined && form.kmFinal !== null && form.kmFinal !== '') {
          localStorage.setItem(LS_LAST_KMFINAL, String(form.kmFinal));
        }
      }
  
      // Suelta el foco para que el Enter no dispare botones
      if (document.activeElement) document.activeElement.blur();
  
      // Limpia el formulario (conserva el nombre y el modo actual)
      // Precarga origen/kmInicial solo si está activo el modo foráneo
      const nextOrigen    = (isGasolina && carryOverEnabled) ? (localStorage.getItem(LS_LAST_DESTINO) || '') : '';
      const nextKmInicial = (isGasolina && carryOverEnabled) ? (localStorage.getItem(LS_LAST_KMFINAL) || '') : '';
  
      setForm((f) => ({
        // comunes
        mensaje: '',
        nombre: f.nombre,
        fechaGasto: '',
        motivoGasto: isGasolina ? 'Gasolina' : '',
        cr: '',
        sucursal: '',
        folio: '',
        observaciones: '',
        tipoServicio: '',
        // gasolina
        origen: nextOrigen,
        destino: '',
        kmInicial: nextKmInicial,
        kmFinal: '',
        km: '',
        // viáticos
        montoComprobar: '',
      }));
  
      // Enfoca el campo Mensaje para capturar el siguiente
      setTimeout(() => { msgRef.current?.focus(); }, 0);
  
      // Aviso de éxito 2.5s
      setOkMsg('Viático guardado correctamente');
      setTimeout(() => setOkMsg(''), 2500);
  
      // Importante: NO navegamos a ninguna ruta
    } catch (err) {
      console.error(err);
      window.alert('No se pudo guardar el viático');
    }
  };

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${bgHome})` }}>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h1>Agregar Viático</h1>
          <button className={styles.backBtn} onClick={() => navigate('/')}>Volver</button>
        </div>

        {/* Switch Tipo */}
        <div className={styles.switchCard}>
          <span className={`${styles.switchLabel} ${isGasolina ? styles.active : ''}`}>Gasolina</span>
          <button
            type="button"
            className={`${styles.switch} ${isGasolina ? styles.left : styles.right}`}
            role="switch"
            aria-checked={!isGasolina}
            onClick={handleToggleTipo}
          >
            <span className={styles.knob} />
          </button>
          <span className={`${styles.switchLabel} ${!isGasolina ? styles.active : ''}`}>Viáticos</span>
        </div>


        {okMsg && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '8px 12px',
              borderRadius: 10,
              marginBottom: 12
            }}
          >
            {okMsg}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>{isGasolina ? 'Registro de Gasolina' : 'Registro de Viáticos'}</h2>

          <div className={styles.grid}>
            {/* Mensaje */}
            <label className={`${styles.field} ${styles.colSpan2}`}>
              <span>Mensaje</span>
              <input
                type="text"
                name="mensaje"
                value={form.mensaje}
                ref={msgRef}
                onChange={onChange}
                placeholder='Incluye: Reincidentes / INC... / SCTASK... / UA8... / PDDOCC... / WIFI / CABLEADO... / INSATM..., CR y fecha dd/mm/aaaa o dd/mmm'

              />
              <small style={{ color: '#64748b' }}>
                Autodetecta Folio (Rei+CR si “Reincidentes”), CR/Sucursal, Fecha y Tipo.
              </small>
            </label>

            {/* Nombre */}
            <label className={styles.field}>
              <span>Nombre</span>
              <input type="text" name="nombre" value={form.nombre} readOnly required />
            </label>

            {/* Fecha del gasto */}
            <label className={styles.field}>
              <span>Fecha del gasto</span>
              <input type="date" name="fechaGasto" value={form.fechaGasto} onChange={onChange} required />
            </label>

            {/* Motivo */}
            <label className={styles.field}>
              <span>Motivo del gasto</span>
              {isGasolina ? (
                <input type="text" name="motivoGasto" value="Gasolina" readOnly required />
              ) : (
                <select name="motivoGasto" value={form.motivoGasto} onChange={onChange} required>
                  <option value="">Selecciona un motivo</option>
                  <option value="Alimentos">Alimentos</option>
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

            {/* CR / Sucursal / Folio */}
            <label className={styles.field}>
              <span>CR</span>
              <input type="text" name="cr" value={form.cr} onChange={onChange} inputMode="numeric" pattern="[0-9]{3,4}" maxLength={4} required />
            </label>
            <label className={styles.field}>
              <span>Sucursal</span>
              <input type="text" name="sucursal" value={form.sucursal} onChange={onChange} required />
            </label>
            <label className={styles.field}>
              <span>Folio</span>
              <input type="text" name="folio" value={form.folio} onChange={onChange} required />
            </label>

            {/* Tipo (Field Services, Instalaciones, etc.) */}
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
                  <span>Origen del Trayecto</span>
                  <input type="text" name="origen" value={form.origen} onChange={onChange} required />
                </label>
                <label className={styles.field}>
                  <span>Destino del Trayecto</span>
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

            {/* Observaciones */}
            <label className={`${styles.field} ${styles.colSpan2}`}>
              <span>Observaciones</span>
              <textarea name="observaciones" rows={4} value={form.observaciones} onChange={onChange} />
            </label>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.primary}>Guardar</button>
            <button type="button" className={styles.secondary} onClick={() => navigate('/')}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddViaticoPage;
