// src/pages/EditViaticosPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import styles from './EditViaticosPage.module.css';
import bgHome from '../assets/background_home.png';

// --- utils de fechas (ISO week) ---
const toUTCDate = (d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
const startOfISOWeek = (date) => {
  const d = toUTCDate(date);
  let day = d.getUTCDay(); // 0=dom..6=sab
  if (day === 0) day = 7;  // dom → 7
  d.setUTCDate(d.getUTCDate() - (day - 1)); // ir a lunes
  return d;
};
const endOfISOWeek = (start) => {
  const e = new Date(start);
  e.setUTCDate(e.getUTCDate() + 6); // lunes + 6 = domingo
  return e;
};
const isoWeekNumber = (date) => {
  const d = toUTCDate(date);
  const dayNr = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = (d - firstThursday) / 86400000;
  return 1 + Math.floor(diff / 7);
};
const fmtDMY = (dateLike) => {
  const d = new Date(dateLike);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};
const weekMeta = (dateLike) => {
  const d = new Date(dateLike);
  const start = startOfISOWeek(d);
  const end = endOfISOWeek(start);
  const week = isoWeekNumber(d);
  const year = d.getUTCFullYear();
  const key = `${year}-W${String(week).padStart(2, '0')}`;
  return { key, week, year, start, end, label: `Semana ${week} (${fmtDMY(start)} - ${fmtDMY(end)})` };
};

// -------- exportar semana a XLSX (carga dinámica: no rompe si no está instalado) --------
const GAS_HEADERS = [
  'Tipo', 'Nombre', 'Fecha del gasto', 'Motivo del gasto', 'CR', 'Nombre Sucursal',
  'Folio de la actividad', 'Origen del trayecto', 'Destino del trayecto', 'KM',
  'Rendimiento del vehículo', 'Precio por Litro', 'Importe del gasto', 'Observaciones'
];
const VIA_HEADERS = [
  'Tipo', 'Nombre', 'Fecha del gasto', 'Motivo del gasto', 'CR', 'Nombre Sucursal',
  'Folio de la actividad', 'Observaciones', 'Monto a comprobar',
  'Número de factura', 'Importe de Factura', 'Horas actividad', 'Comentarios'
];

function buildSheetFromAOA(utils, aoa) {
  const ws = utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 18 }, { wch: 24 }, { wch: 14 }, { wch: 24 }, { wch: 6 }, { wch: 22 },
    { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 8 }, { wch: 18 }, { wch: 14 },
    { wch: 16 }, { wch: 30 },
  ];
  return ws;
}

async function exportWeekToXLSX(group) {
  const XLSX = await import('xlsx');

  // Comparador: por día (asc) y, si empatan, por hora de creación (asc)
  const startOfDayTS = (v) => {
    const d = new Date(v.fechaGasto || v.createdAt || 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const createdTS = (v) => new Date(v.createdAt || v.fechaGasto || 0).getTime();

  const byDateThenCreation = (a, b) => {
    const cmp = startOfDayTS(a) - startOfDayTS(b); // día ascendente
    if (cmp !== 0) return cmp;
    return createdTS(a) - createdTS(b);            // creación ascendente
  };

  const gasolina = group.items
    .filter(v => v.tipo === 'gasolina')
    .sort(byDateThenCreation);

  const viaticos = group.items
    .filter(v => v.tipo === 'viaticos')
    .sort(byDateThenCreation);

  // Construir hojas
  const gasRows = gasolina.map(v => ([
    v.tipoServicio || '',
    v.nombre || '',
    fmtDMY(v.fechaGasto || v.createdAt),
    v.motivoGasto || 'Gasolina',
    v.cr || '',
    v.sucursal || '',
    v.folio || '',
    v.origen || '',
    v.destino || '',
    typeof v.km === 'number' ? v.km : (v.km ?? ''),
    '', '', '', // columnas a completar
    v.observaciones || '',
  ]));

  const viaRows = viaticos.map(v => ([
    v.tipoServicio || '',
    v.nombre || '',
    fmtDMY(v.fechaGasto || v.createdAt),
    v.motivoGasto || '',
    v.cr || '',
    v.sucursal || '',
    v.folio || '',
    v.observaciones || '',
    typeof v.montoComprobar === 'number' ? v.montoComprobar : (v.montoComprobar ?? ''),
    '', '', '', // a completar
  ]));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheetFromAOA(XLSX.utils, [GAS_HEADERS, ...gasRows]), 'Gasolina');
  XLSX.utils.book_append_sheet(wb, buildSheetFromAOA(XLSX.utils, [VIA_HEADERS, ...viaRows]), 'Viaticos');

  const fname = `viaticos_semana_${group.year}-W${String(group.week).padStart(2,'0')}.xlsx`;
  XLSX.writeFile(wb, fname);
}

// ----------------------------------------------------------------------------------------

const EditViaticosPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/viaticos`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err?.response?.data?.message || 'Error cargando viáticos'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const token = localStorage.getItem('auth-token');

  const handleEdit = useCallback((id) => {
    navigate(`/editar-viaticos/${id}`);
  }, [navigate]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar este viático? Esta acción no se puede deshacer.')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/viaticos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((arr) => arr.filter((x) => x._id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || 'No se pudo eliminar');
    }
  }, [token]);

  // Agrupar por semana de la FECHA DEL GASTO (si no hay, usa createdAt)
  const groups = useMemo(() => {
    const map = new Map();
    for (const v of items) {
      const base = v.fechaGasto ? new Date(v.fechaGasto) : new Date(v.createdAt || Date.now());
      const w = weekMeta(base);
      if (!map.has(w.key)) map.set(w.key, { ...w, items: [] });
      map.get(w.key).items.push(v);
    }
    const arr = Array.from(map.values()).sort((a, b) => b.start - a.start);

    // Orden dentro de cada semana:
    // 1) por día ascendente
    // 2) si empatan, por hora de creación ascendente
    arr.forEach((g) => {
      g.items.sort((a, b) => {
        const da = new Date(a.fechaGasto || a.createdAt || 0);
        const db = new Date(b.fechaGasto || b.createdAt || 0);

        const aDay = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime();
        const bDay = new Date(db.getFullYear(), db.getMonth(), db.getDate()).getTime();
        const dayCmp = aDay - bDay;
        if (dayCmp !== 0) return dayCmp;

        const ca = new Date(a.createdAt || a.fechaGasto || 0).getTime();
        const cb = new Date(b.createdAt || b.fechaGasto || 0).getTime();
        return ca - cb;
      });
    });
    return arr;
  }, [items]);

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${bgHome})` }}>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h1>Editar Viáticos</h1>
          <button className={styles.backBtn} onClick={() => navigate('/')}>Volver</button>
        </div>

        {loading && <div className={styles.info}>Cargando…</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && !error && groups.length === 0 && (
          <div className={styles.info}>No hay viáticos todavía.</div>
        )}

        {!loading && !error && groups.map((g) => (
          <section key={g.key} className={styles.weekCard}>
            <div className={styles.weekHeader}>
              <div className={styles.weekTitle}>{g.label}</div>
              <div className={styles.weekRight}>
                <div className={styles.weekCount}>{g.items.length} registro(s)</div>
                <button className={styles.exportBtn} onClick={() => exportWeekToXLSX(g)}>
                  Exportar semana (xlsx)
                </button>
              </div>
            </div>

            <ul className={styles.list}>
              {g.items.map((it) => (
                <li key={it._id} className={styles.item}>
                  <div className={styles.itemTop}>
                    <span className={styles.badge}>{it.tipo}</span>
                    <strong className={styles.kind}>{it.tipoServicio}</strong>
                    <span className={styles.folio}>{it.folio}</span>
                    <span className={styles.place}>{it.cr} · {it.sucursal}</span>
                  </div>
                  <div className={styles.itemBottom}>
                    <span>Fecha gasto: {it.fechaGasto ? fmtDMY(it.fechaGasto) : '—'}</span>
                    {it.tipo === 'gasolina'
                      ? <span>KM: {it.km ?? '—'} ({it.origen} → {it.destino})</span>
                      : <span>Monto: {typeof it.montoComprobar === 'number' ? `$${it.montoComprobar.toFixed(2)}` : '—'}</span>}
                  </div>

                  <div className={styles.actionsRow}>
                    <button className={styles.actionEdit} onClick={() => handleEdit(it._id)}>Editar</button>
                    <button className={styles.actionDelete} onClick={() => handleDelete(it._id)}>Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default EditViaticosPage;
