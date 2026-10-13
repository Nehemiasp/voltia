// Generación determinista de ventas. Un vendedor y un período dan siempre las mismas líneas,
// y la suma por categoría coincide exactamente con el objetivo (sección 4: "los números cuadran").

import { CATEGORIAS } from './reglas.js';
import {
  VENDEDORES, VENDEDOR, TIENDAS, PERFILES, FACTOR_VENTA, FACTOR_META, METAS_ESPECIALES, ID, DIEGO,
} from './datos.js';
import { ventasManuales, ventasFijas } from './ventasManuales.js';
import { diasDelMes, ultimoDia } from './formato.js';

const [LB, EL, AC, GE] = CATEGORIAS;

export const CATALOGO = {
  [LB]: [
    ['Refrigeradora RF-480', 12000], ['Refrigeradora RF-360', 10400], ['Lavadora LV-20', 9500], ['Lavadora LV-16', 9000],
    ['Estufa EG-6', 7800], ['Estufa EG-4', 8700], ['Secadora SC-18', 8900], ['Lavavajillas LJ-12', 11200],
    ['Cocina de mesa CM-2', 6500], ['Horno eléctrico HE-30', 5200], ['Horno eléctrico HE-40', 4400],
    ['Microondas MW-35', 3900], ['Microondas MW-25', 3400],
  ],
  [EL]: [
    ['Televisor 65" TV-65Q', 14500], ['Laptop LT-16', 12500], ['Televisor 55" TV-55U', 9800], ['Televisor 50" TV-50U', 7600],
    ['Barra de sonido BS-3', 4200], ['Laptop LT-14', 11300], ['Consola de videojuegos CV-1', 2600], ['Tablet TB-10', 3900],
    ['Audífonos AU-7', 1500], ['Audífonos AU-9', 1600], ['Teléfono SP-12', 5200], ['Teléfono SP-8', 6500], ['Teléfono SP-6', 3200],
    ['Monitor MN-24', 4900], ['Monitor MN-27', 8200], ['Parlante PB-2', 1900], ['Parlante PB-4', 2300],
  ],
  [AC]: [
    ['Soporte de pared', 1800], ['Kit de instalación', 2400], ['Regulador de voltaje', 3100], ['Cables y adaptadores', 1200],
    ['Protector de pantalla', 1500], ['Control remoto universal', 900], ['Base giratoria', 2000], ['Kit de instalación plus', 2700],
    ['Cable HDMI premium', 1000],
  ],
  [GE]: [
    ['Garantía extendida 3 años', 2500], ['Garantía extendida 2 años', 1800], ['Garantía extendida 1 año', 1200],
    ['Garantía extendida 4 años', 3200], ['Garantía extendida 1 año plus', 1500], ['Garantía extendida 2 años con accidentes', 2000],
    ['Garantía extendida 3 años con accidentes', 2700],
  ],
};

export const MAX_DESCUENTO_GENERADO = 20;
const PREFIJO_ID = { '2025-12': 5, '2026-01': 1, '2026-02': 2, '2026-03': 3, '2026-04': 4 };

// ---------- PRNG determinista ----------

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(semilla) {
  let a = semilla | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const elegir = (rng, lista) => lista[Math.floor(rng() * lista.length)];
const redondear = (n, paso) => Math.round(n / paso) * paso;

// ---------- una categoría -> líneas que suman exactamente `total` ----------

/** Devuelve [{producto, bruto, neto, descuentoPct}] cuya suma de netos es `total`. */
export function repartirCategoria(total, categoria, rng) {
  if (total <= 0) return [];
  const catalogo = CATALOGO[categoria];
  const maxP = Math.max(...catalogo.map(([, p]) => p));
  const minViable = Math.min(...catalogo.map(([, p]) => p)) * (1 - MAX_DESCUENTO_GENERADO / 100);

  for (let intento = 0; intento < 300; intento += 1) {
    const lineas = [];
    let resto = total;
    for (let guarda = 0; resto > maxP && guarda < 600; guarda += 1) {
      const [producto, precio] = elegir(rng, catalogo);
      const d = elegir(rng, [0, 0, 0, 5, 10]);
      const neto = redondear(precio * (1 - d / 100), 10);
      if (resto - neto >= minViable) {
        lineas.push({ producto, bruto: precio, neto, descuentoPct: d });
        resto -= neto;
      }
    }
    // Última línea: un producto cuyo precio de lista deja el neto con un descuento razonable.
    const candidatos = catalogo.filter(([, p]) => p * (1 - MAX_DESCUENTO_GENERADO / 100) <= resto && resto <= p);
    if (resto <= maxP && candidatos.length) {
      const [producto, precio] = elegir(rng, candidatos);
      lineas.push({ producto, bruto: precio, neto: resto, descuentoPct: Math.round((1 - resto / precio) * 1000) / 10 });
      return lineas;
    }
  }
  throw new Error(`No se pudo repartir ${total} en ${categoria}`);
}

// ---------- objetivos por vendedor y período ----------

function activoEn(v, periodo) {
  return v.ingreso <= ultimoDia(periodo);
}

export function tiendaEn(v, periodo) {
  if (v.id === ID.diego && periodo < '2026-01') return 'T01';
  return v.tienda;
}

/** Meta del período; null si no se ha cargado (Sofía en enero). */
export function metaDe(v, periodo) {
  const especial = METAS_ESPECIALES[`${v.id}|${periodo}`];
  if (especial !== undefined) return especial;
  if (v.metaEne === null) return null;
  if (periodo === '2026-01') return v.metaEne;
  return redondear(v.metaEne * FACTOR_META[periodo], 1000);
}

function ruido(v, periodo) {
  const rng = mulberry32(hash(`ruido|${v.id}|${periodo}`));
  return 0.95 + rng() * 0.1;
}

/** Venta objetivo del período (suma de todos los segmentos). */
function ventaObjetivo(v, periodo) {
  if (periodo === '2026-01') return v.vendidoEne;
  const f = FACTOR_VENTA[periodo][v.tienda] * ruido(v, periodo);
  return redondear(v.vendidoEne * f, 100);
}

function categoriasDe(total, perfilIdx) {
  const p = PERFILES[perfilIdx];
  const e = redondear(total * p[1], 100);
  const a = redondear(total * p[2], 100);
  const g = redondear(total * p[3], 100);
  return { [LB]: total - e - a - g, [EL]: e, [AC]: a, [GE]: g };
}

function segmentos(v, periodo, total) {
  const dias = diasDelMes(periodo);
  const inicio = periodo === '2026-01' ? 2 : 1;
  if (v.id === ID.diego && periodo === '2026-01') {
    return [
      { tienda: 'T01', desde: 2, hasta: 14, categorias: categoriasDe(DIEGO.ventaEnT01, v.perfil) },
      { tienda: 'T04', desde: 15, hasta: dias, categorias: categoriasDe(DIEGO.ventaEnT04, v.perfil) },
    ];
  }
  return [{ tienda: tiendaEn(v, periodo), desde: inicio, hasta: dias, categorias: categoriasDe(total, v.perfil) }];
}

const memo = new Map();

/** Líneas de venta de un vendedor en un período. */
export function ventasDe(vendedorId, periodo) {
  const clave = `${vendedorId}|${periodo}`;
  if (memo.has(clave)) return memo.get(clave);
  const v = VENDEDOR[vendedorId];
  let resultado = [];
  if (activoEn(v, periodo)) {
    const manuales = ventasManuales(v.id, periodo, tiendaEn(v, periodo));
    resultado = manuales ?? generar(v, periodo);
  }
  memo.set(clave, Object.freeze(resultado));
  return memo.get(clave);
}

function generar(v, periodo) {
  const rng = mulberry32(hash(`ventas|${v.id}|${periodo}`));
  const total = ventaObjetivo(v, periodo);
  const fijas = ventasFijas(v.id, periodo, tiendaEn(v, periodo));
  const lineas = [];

  for (const seg of segmentos(v, periodo, total)) {
    for (const categoria of CATEGORIAS) {
      const fijasCat = fijas.filter((l) => l.categoria === categoria && seg.tienda === l.tienda);
      const objetivo = seg.categorias[categoria] - fijasCat.reduce((s, l) => s + l.neto, 0);
      const nuevas = repartirCategoria(objetivo, categoria, rng).map((l) => ({
        ...l, categoria, tienda: seg.tienda, vendedor: v.id,
        fecha: `${periodo}-${String(seg.desde + Math.floor(rng() * (seg.hasta - seg.desde + 1))).padStart(2, '0')}`,
        estado: 'vigente', fechaDevolucion: null,
      }));
      lineas.push(...nuevas);
    }
  }
  lineas.push(...fijas);
  lineas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.producto.localeCompare(b.producto));
  const base = PREFIJO_ID[periodo] * 10000 + v.indice * 60;
  let n = 0;
  return lineas.map((l) => {
    if (l.id) return l; // fijas
    n += 1;
    if (n >= 60) throw new Error(`Demasiadas líneas para ${v.id} en ${periodo}`);
    return { ...l, id: `V-${base + n}` };
  });
}

/** Vendedores que figuran en un período (los que ya habían ingresado). */
export function vendedoresDelPeriodo(periodo) {
  return VENDEDORES.filter((v) => activoEn(v, periodo));
}

export function tiendasDelPeriodo(periodo) {
  return TIENDAS.map((t) => ({ ...t, meta: metaTienda(t.id, periodo) }));
}

/** Meta de tienda: suma de las metas de sus vendedores asignados a ella (Diego cuenta en su tienda de cierre). */
export function metaTienda(tiendaId, periodo) {
  return vendedoresDelPeriodo(periodo)
    .filter((v) => tiendaEn(v, periodo) === tiendaId)
    .reduce((suma, v) => suma + (metaDe(v, periodo) ?? 0), 0);
}
