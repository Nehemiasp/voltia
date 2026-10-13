// Revisión automática de calidad: scroll horizontal, un solo h1, alt en imágenes, controles con nombre y consola limpia.
// Uso: npm start (en otra terminal) y luego node tools/revision.mjs
import { abrir, irA, esperarFuentes } from './navegador.mjs';

const RUTAS = [
  ['analista', '#/inicio'], ['analista', '#/reglas'], ['analista', '#/regla/R-001'], ['analista', '#/simulador'],
  ['analista', '#/periodos'], ['analista', '#/tienda?p=2026-03'], ['jefe', '#/inicio'], ['jefe', '#/tienda?p=2026-03'],
  ['analista', '#/detalle/E-1201?p=2026-01'], ['analista', '#/detalle/E-1101?p=2026-01'], ['analista', '#/ajustes'], ['analista', '#/ajuste/AJ-2026-03-001'],
  ['analista', '#/disputas'], ['analista', '#/disputa/D-014'], ['auditoria', '#/auditoria'], ['gerente', '#/inicio'], ['gerente', '#/aprobacion'],
  ['contabilidad', '#/inicio'], ['contabilidad', '#/pagos'], ['auditoria', '#/inicio'],
];
const ANCHOS = [360, 768, 1024, 1440];
let problemas = 0;

for (const ancho of ANCHOS) {
  const { navegador, pagina, errores } = await abrir({ ancho, alto: 900 });
  for (const [rol, ruta] of RUTAS) {
    await irA(pagina, { rol, ruta });
    await esperarFuentes(pagina);
    const r = await pagina.evaluate(() => {
      const raiz = document.documentElement;
      const sinNombre = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea')]
        .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
        .filter((e) => !(e.getAttribute('aria-label') || e.textContent.trim() || (e.id && document.querySelector(`label[for="${e.id}"]`)) || e.closest('label') || e.title)).length;
      return {
        desborde: raiz.scrollWidth - raiz.clientWidth,
        h1: document.querySelectorAll('main h1').length,
        sinAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
        sinNombre,
      };
    });
    const mal = r.desborde > 1 || r.h1 !== 1 || r.sinAlt || r.sinNombre;
    if (mal) { problemas += 1; console.log(`${ancho}px · ${rol} ${ruta}:`, JSON.stringify(r)); }
  }
  if (errores.length) { problemas += 1; console.log(`${ancho}px consola:`, [...new Set(errores)].slice(0, 5)); }
  await navegador.close();
}
console.log(problemas ? `${problemas} problema(s)` : `Todo en orden en ${ANCHOS.length} anchos y ${RUTAS.length} pantallas`);
