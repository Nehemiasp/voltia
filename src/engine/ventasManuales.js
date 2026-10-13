// Ventas escritas a mano: las de la sección 4.3 (Marta Ruiz, enero) y las que sostienen los demás casos.
// Formato: [id, día, producto, categoría, monto neto, descuento %, estado, fecha de devolución]

import { ID } from './datos.js';

const LB = 'Línea blanca';
const EL = 'Electrónica';
const AC = 'Accesorios';
const GE = 'Garantía extendida';

function lineas(vendedor, tienda, periodo, filas) {
  return filas.map(([id, dia, producto, categoria, neto, descuentoPct = 0, estado = 'vigente', fechaDevolucion = null]) => {
    const bruto = descuentoPct ? Math.round(neto / (1 - descuentoPct / 100)) : neto;
    return {
      id, fecha: `${periodo}-${String(dia).padStart(2, '0')}`, tienda, vendedor, producto, categoria,
      bruto, descuentoPct, neto, estado, fechaDevolucion,
    };
  });
}

// Sección 4.3. Meta de enero: Q150,000. Total comisionable: Q157,500.
const MARTA_ENERO = [
  ['V-0142', 14, 'Refrigeradora RF-480', LB, 12000, 0, 'devuelta', '2026-03-09'],
  ['V-0151', 15, 'Lavadora LV-20', LB, 9500],
  ['V-0163', 17, 'Lavadora LV-20', LB, 9500],
  ['V-0170', 18, 'Estufa EG-6', LB, 7800],
  ['V-0188', 21, 'Refrigeradora RF-360', LB, 10400],
  ['V-0196', 22, 'Secadora SC-18', LB, 8900],
  ['V-0204', 24, 'Lavavajillas LJ-12', LB, 11200],
  ['V-0219', 26, 'Refrigeradora RF-480', LB, 12000],
  ['V-0231', 29, 'Estufa EG-4', LB, 8700],
  ['V-0136', 12, 'Televisor 65" TV-65Q', EL, 14500],
  ['V-0158', 16, 'Televisor 55" TV-55U', EL, 9800],
  ['V-0174', 19, 'Barra de sonido BS-3', EL, 4200],
  ['V-0192', 22, 'Laptop LT-14', EL, 11300],
  ['V-0210', 25, 'Televisor 50" TV-50U', EL, 7600],
  ['V-0227', 28, 'Consola de videojuegos CV-1', EL, 2600],
  ['V-0139', 13, 'Soporte de pared', AC, 1800],
  ['V-0167', 17, 'Kit de instalación', AC, 2400],
  ['V-0185', 20, 'Regulador de voltaje', AC, 3100],
  ['V-0199', 23, 'Cables y adaptadores', AC, 1200],
  ['V-0224', 27, 'Protector de pantalla', AC, 1500],
  ['V-0137', 12, 'Garantía extendida 3 años', GE, 2500],
  ['V-0159', 16, 'Garantía extendida 3 años', GE, 2500],
  ['V-0211', 25, 'Garantía extendida 3 años', GE, 2500],
  // Excluida por R-006: neto Q6,300 con 30 % de descuento (bruto Q9,000).
  ['V-0180', 20, 'Lavadora LV-16', LB, 6300, 30],
];

// Marzo de Marta: comisión Q5,200 (sección 5.2). Meta de marzo Q100,000, venta Q100,700, escalón de 5 %.
const MARTA_MARZO = [
  ['V-0412', 3, 'Lavavajillas LJ-12', LB, 11200],
  ['V-0415', 4, 'Refrigeradora RF-360', LB, 10400],
  ['V-0421', 6, 'Televisor 50" TV-50U', EL, 7600],
  ['V-0428', 8, 'Secadora SC-18', LB, 8900],
  ['V-0433', 11, 'Garantía extendida 3 años', GE, 2500],
  ['V-0437', 12, 'Refrigeradora RF-480', LB, 12000],
  ['V-0442', 14, 'Kit de instalación', AC, 2400],
  ['V-0449', 17, 'Lavavajillas LJ-12', LB, 11200],
  ['V-0455', 19, 'Barra de sonido BS-3', EL, 4200],
  ['V-0461', 22, 'Secadora SC-18', LB, 8900],
  ['V-0468', 25, 'Refrigeradora RF-360', LB, 10400],
  ['V-0474', 27, 'Protector de pantalla', AC, 1500],
  ['V-0481', 29, 'Lavadora LV-20', LB, 9500],
];

// Ana Morales, enero: una venta con 28 % de descuento queda excluida por R-006 (caso P03).
const ANA_ENERO = [
  ['V-0301', 3, 'Refrigeradora RF-480', LB, 12000],
  ['V-0304', 5, 'Lavavajillas LJ-12', LB, 11200],
  ['V-0309', 7, 'Refrigeradora RF-360', LB, 10400],
  ['V-0314', 10, 'Lavadora LV-20', LB, 9500],
  ['V-0318', 13, 'Secadora SC-18', LB, 8900],
  ['V-0326', 16, 'Estufa EG-4', LB, 8700],
  ['V-0307', 6, 'Televisor 55" TV-55U', EL, 9800],
  ['V-0321', 14, 'Laptop LT-14', EL, 11300],
  ['V-0329', 18, 'Televisor 50" TV-50U', EL, 7600],
  ['V-0335', 21, 'Barra de sonido BS-3', EL, 4200],
  ['V-0341', 24, 'Consola de videojuegos CV-1', EL, 2600],
  ['V-0312', 9, 'Regulador de voltaje', AC, 3100],
  ['V-0316', 12, 'Kit de instalación', AC, 2400],
  ['V-0332', 19, 'Soporte de pared', AC, 1800],
  ['V-0344', 26, 'Cables y adaptadores', AC, 1200],
  ['V-0349', 28, 'Protector de pantalla', AC, 1500],
  ['V-0310', 8, 'Garantía extendida 3 años', GE, 2500],
  ['V-0337', 22, 'Garantía extendida 3 años', GE, 2500],
  // Excluida por R-006: lista de Q14,500 con 28 % de descuento.
  ['V-0323', 15, 'Televisor 65" TV-65Q', EL, 10440, 28],
];

// La venta que Jorge Castillo reclama (P08): quedó registrada a nombre de Pablo Nájera.
export const VENTA_DISPUTADA = { id: 'V-0388', dia: 23, producto: 'Lavadora LV-20', categoria: LB, neto: 9500 };

export function ventasManuales(vendedorId, periodo, tienda) {
  if (vendedorId === ID.marta && periodo === '2026-01') return lineas(vendedorId, tienda, periodo, MARTA_ENERO);
  if (vendedorId === ID.marta && periodo === '2026-03') return lineas(vendedorId, tienda, periodo, MARTA_MARZO);
  if (vendedorId === ID.ana && periodo === '2026-01') return lineas(vendedorId, tienda, periodo, ANA_ENERO);
  return null;
}

/** Líneas fijas que se suman a lo generado (se descuentan del total de su categoría). */
export function ventasFijas(vendedorId, periodo, tienda) {
  if (vendedorId === ID.pablo && periodo === '2026-01') {
    const v = VENTA_DISPUTADA;
    return lineas(vendedorId, tienda, periodo, [[v.id, v.dia, v.producto, v.categoria, v.neto]]);
  }
  return [];
}
