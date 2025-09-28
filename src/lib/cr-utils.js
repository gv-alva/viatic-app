import CR_MAP_RAW from "../data/cr-map.json";
import CR_OVERRIDES from "../data/cr-overrides.json";

// Inmutables
export const CR_MAP = Object.freeze(CR_MAP_RAW);
export { CR_OVERRIDES };

// --- helpers ---
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const KEYS = Object.keys(CR_MAP);
const KEY_SET = new Set(KEYS);

// Normaliza a la clave real (4 dígitos) si existe en el mapa
const CANON = (code) => {
  const digits = String(code || "").replace(/\D/g, "");
  if (!digits) return null;
  const p4 = digits.padStart(4, "0");
  return KEY_SET.has(p4) ? p4 : (KEY_SET.has(digits) ? digits : null);
};

// Acepta 3 o 4 dígitos en texto y normaliza
const VARIANTS = Array.from(new Set([
  ...KEYS,
  ...KEYS.map((k) => String(Number(k))) // "0647" → "647"
]));

const RX_CODES = new RegExp(`\\b(${VARIANTS.map(escapeRx).join("|")})\\b`, "i");
const RX_CR    = new RegExp(`\\bCR[^0-9]{0,3}(${VARIANTS.map(escapeRx).join("|")})\\b`, "i");

export const detectCrSucursalFromMensaje = (texto) => {
  if (!texto) return null;
  const up = String(texto).toUpperCase();
  const m = up.match(RX_CR) || up.match(RX_CODES);
  if (!m) return null;
  const cr = CANON(m[1]);
  if (!cr) return null;
  return { cr, sucursal: CR_MAP[cr] };
};

// Útil para normalizar lo que teclean a mano en el input CR
export const normalizeCr = (input) => CANON(input) || input;
