// Validaciones del constructor de reglas (P02): escalones, prioridad, vigencia y campos obligatorios.

import { obtener } from './estado.js';
import { periodosDisponibles, estadoPeriodo, fechaHoy } from './selectores.js';
import { ultimoDia, fmtFechaLarga, nombrePeriodo } from '../engine/formato.js';

const PASO = 0.01;

/** Devuelve { global: [...], filas: { indice: [mensajes] } } */
export function validarEscalones(escalones) {
  const filas = {};
  const global = [];
  const marca = (i, msg) => {
    (filas[i] ??= []).push(msg);
  };

  if (!escalones.length) global.push('Agrega al menos un escalón.');
  escalones.forEach((e, i) => {
    if (!Number.isFinite(e.desde)) marca(i, 'Indica desde qué cumplimiento empieza este escalón.');
    if (!Number.isFinite(e.tasa) || e.tasa < 0 || e.tasa > 100) marca(i, 'La tasa debe estar entre 0 % y 100 %.');
    const ultimo = i === escalones.length - 1;
    if (!ultimo && !Number.isFinite(e.hasta)) marca(i, 'Todos los escalones, salvo el último, necesitan un límite superior.');
    if (!ultimo && Number.isFinite(e.hasta) && Number.isFinite(e.desde) && e.hasta < e.desde) marca(i, 'El límite superior no puede ser menor que el inferior.');
    if (ultimo && e.hasta !== null && e.hasta !== undefined && Number.isFinite(e.hasta)) marca(i, 'El último escalón debe quedar abierto (“o más”): quita su límite superior.');
  });

  if (escalones.length && escalones[0].desde !== 0) marca(0, `El primer escalón debe empezar en 0 %: un cumplimiento de ${escalones[0].desde > 0 ? '0 %' : '0 %'} hasta ${escalones[0].desde} % se quedaría sin tasa.`);

  for (let i = 1; i < escalones.length; i += 1) {
    const prev = escalones[i - 1];
    const act = escalones[i];
    if (!Number.isFinite(prev.hasta) || !Number.isFinite(act.desde)) continue;
    if (act.desde <= prev.hasta + 1e-9) {
      marca(i, `Se superpone con el escalón ${i}: empieza en ${act.desde} % pero el anterior llega hasta ${prev.hasta} %.`);
    } else if (act.desde - prev.hasta > PASO + 1e-9) {
      marca(i, `Hay un hueco entre ${prev.hasta} % y ${act.desde} %: un cumplimiento de ${(prev.hasta + PASO).toFixed(2)} % no tendría tasa.`);
    }
  }

  for (let i = 1; i < escalones.length; i += 1) {
    if (Number.isFinite(escalones[i].tasa) && Number.isFinite(escalones[i - 1].tasa) && escalones[i].tasa < escalones[i - 1].tasa) {
      (filas[i] ??= []).push('Aviso: la tasa baja respecto al escalón anterior. Revisa que sea intencional.');
    }
  }
  return { global, filas, hayErrores: global.length > 0 || Object.values(filas).some((m) => m.some((x) => !x.startsWith('Aviso'))) };
}

/** Fecha mínima en la que puede empezar una vigencia nueva: después de cualquier período con corrida y de hoy. */
export function fechaMinimaVigencia() {
  const bloqueados = periodosDisponibles().filter((p) => ['Cerrado a ventas', 'Calculado', 'En revisión', 'Aprobado', 'Pagado'].includes(estadoPeriodo(p)));
  const ultimo = bloqueados[bloqueados.length - 1];
  const despues = ultimo ? siguienteDia(ultimoDia(ultimo)) : '1900-01-01';
  const hoy = fechaHoy();
  return despues > hoy ? despues : hoy;
}

export function primerDiaMesSiguiente(fechaIso) {
  const [a, m] = fechaIso.split('-').map(Number);
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`;
}

function siguienteDia(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function validarVigencia({ vigenciaDesde, vigenciaHasta }) {
  const errores = [];
  if (!vigenciaDesde) {
    errores.push('Indica desde cuándo es válida la regla.');
    return errores;
  }
  const minima = fechaMinimaVigencia();
  if (vigenciaDesde < minima) {
    const tocados = periodosDisponibles().filter((p) => ultimoDia(p) >= vigenciaDesde && `${p}-01` <= vigenciaDesde && ['Cerrado a ventas', 'Calculado', 'En revisión', 'Aprobado', 'Pagado'].includes(estadoPeriodo(p)));
    const tocado = tocados[0] ?? null;
    if (tocado && estadoPeriodo(tocado) === 'Pagado') {
      errores.push(`La vigencia desde el ${fmtFechaLarga(vigenciaDesde)} toca el período ${nombrePeriodo(tocado)}, que ya está pagado. Un período pagado no se reabre: usa el ${fmtFechaLarga(minima)} o una fecha posterior.`);
    } else if (tocado) {
      errores.push(`La vigencia desde el ${fmtFechaLarga(vigenciaDesde)} toca el período ${nombrePeriodo(tocado)}, que ya está cerrado y tiene reglas congeladas. Usa el ${fmtFechaLarga(minima)} o una fecha posterior.`);
    } else {
      errores.push(`La vigencia no puede empezar antes de hoy. Usa el ${fmtFechaLarga(minima)} o una fecha posterior.`);
    }
  }
  if (vigenciaHasta && vigenciaDesde && vigenciaHasta < vigenciaDesde) errores.push('La vigencia “hasta” no puede ser anterior a la vigencia “desde”.');
  return errores;
}

/** Reglas vigentes con la misma prioridad que un borrador: se contradicen hasta resolverse. */
export function conflictosDePrioridad(borrador) {
  return obtener().reglas.versiones.filter(
    (r) => r.estado === 'vigente' && r.id !== borrador.id && r.prioridad === borrador.prioridad,
  );
}

export function validarBorrador(b) {
  const errores = {};
  const agregar = (campo, msg) => { (errores[campo] ??= []).push(msg); };
  if (!b.nombre?.trim()) agregar('nombre', 'Dale un nombre a la regla.');
  if (!b.fuente?.trim()) agregar('fuente', 'Indica el documento o acuerdo que origina la regla. Sin fuente no hay auditoría posible.');
  if (!b.responsable) agregar('responsable', 'Elige a la persona responsable de la regla.');
  if (!Number.isInteger(b.prioridad) || b.prioridad < 0) agregar('prioridad', 'La prioridad es un número entero desde 0.');
  validarVigencia(b).forEach((m) => agregar('vigencia', m));
  const esc = b.escalones ? validarEscalones(b.escalones) : { global: [], filas: {}, hayErrores: false };
  const conflictos = conflictosDePrioridad(b);
  if (conflictos.length) agregar('prioridad', `Conflicto: ${conflictos.map((c) => c.id).join(', ')} ya usa la prioridad ${b.prioridad}. Cambia la prioridad o la acumulación antes de activar.`);
  return {
    campos: errores, escalones: esc, conflictos,
    ok: Object.keys(errores).length === 0 && !esc.hayErrores,
  };
}
