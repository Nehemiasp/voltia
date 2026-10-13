// Genera las imágenes del portafolio (1600 px de ancho a 2x) a partir del prototipo, con datos reales del documento.
// Uso: npm start (en otra terminal) y luego npm run capturas [filtro]
import { mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { abrir, irA, esperarFuentes, abrirControles, BASE } from './navegador.mjs';

const SALIDA = new URL('../portafolio/img/', import.meta.url).pathname;
const TEMP = mkdtempSync(join(tmpdir(), 'voltia-'));
mkdirSync(SALIDA, { recursive: true });
const filtro = process.argv[2] ?? '';
const rol = async (p, r, vend) => { await p.evaluate(() => document.body.classList.remove('captura')); await abrirControles(p); await p.selectOption('#demo-rol', r); if (vend) await p.selectOption('#demo-vendedor', vend); };
const ir = async (p, ruta) => { await p.evaluate((x) => { location.hash = x; }, ruta); await p.waitForTimeout(350); };
const aceptar = async (p, marcar = false) => { if (marcar) await p.check('#dialogo input[type=checkbox]'); await p.click('#dialogo button[type=submit]'); await p.waitForTimeout(350); };

async function guardar(pagina, nombre, { selector = null, completa = true, escala = 2 } = {}) {
  await pagina.evaluate(() => { document.body.classList.add('captura'); window.scrollTo(0, 0); });
  await esperarFuentes(pagina);
  await pagina.waitForTimeout(250);
  const png = join(TEMP, `${nombre}.png`);
  if (selector) await pagina.locator(selector).first().screenshot({ path: png });
  else await pagina.screenshot({ path: png, fullPage: completa });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-c:v', 'libwebp', '-quality', '90', join(SALIDA, `${nombre}.webp`)]);
  console.log(`  ${nombre}.webp`);
}

const trabajos = [
  ['01-p09-ajuste-de-marta', { ancho: 1600, alto: 1000 }, async (p) => { await irA(p, { momento: 'M2', rol: 'analista', ruta: '#/ajuste/AJ-2026-03-001' }); await guardar(p, '01-p09-ajuste-de-marta'); }],
  ['02-problema-hoja-de-calculo', { ancho: 1600, alto: 900 }, async (p) => { await p.goto(`${BASE}/portafolio/problema.html`, { waitUntil: 'networkidle' }); await guardar(p, '02-problema-hoja-de-calculo', { selector: 'body' }); }],
  ['03-p03-detalle-de-marta', { ancho: 1600, alto: 1000 }, async (p) => { await irA(p, { momento: 'M2', rol: 'analista', ruta: '#/detalle/E-1201?p=2026-01' }); await guardar(p, '03-p03-detalle-de-marta'); }],
  ['04-p03-venta-excluida', { ancho: 1600, alto: 1000 }, async (p) => { await irA(p, { momento: 'M2', rol: 'analista', ruta: '#/detalle/E-1101?p=2026-01' }); await guardar(p, '04-p03-venta-excluida', { selector: 'section.panel:has(table.tabla)' }); }],
  ['05-p02-constructor', { ancho: 1600, alto: 1000 }, async (p) => {
    await irA(p, { momento: 'M1', rol: 'analista', ruta: '#/regla/R-001' });
    await p.fill('[data-esc="2"][data-campo="tasa"]', '5.5'); await p.fill('[name="fuente"]', 'Acta del Comité Comercial CC-2026-02'); await p.waitForTimeout(250);
    await guardar(p, '05-p02-constructor');
  }],
  ['06-p02-validacion', { ancho: 1600, alto: 1000 }, async (p) => {
    await irA(p, { momento: 'M1', rol: 'analista', ruta: '#/regla/R-001' });
    await p.fill('[data-esc="2"][data-campo="desde"]', '102'); await p.fill('[name="prioridad"]', '2'); await p.fill('[name="vigenciaDesde"]', '2026-01-01'); await p.waitForTimeout(250);
    await guardar(p, '06-p02-validacion');
  }],
  ['07-p01-reglas', { ancho: 1600, alto: 1000 }, async (p) => { await irA(p, { momento: 'M2', rol: 'analista', ruta: '#/reglas' }); await guardar(p, '07-p01-reglas'); }],
  ['08-p04-corrida', { ancho: 1600, alto: 1000 }, async (p) => {
    await irA(p, { momento: 'M1', rol: 'analista', ruta: '#/periodos' });
    await p.click('[data-accion="corrida"]'); await p.click('#dialogo button[type=submit]'); await p.waitForSelector('text=Alertas de la corrida', { timeout: 12000 }); await p.waitForTimeout(400);
    await guardar(p, '08-p04-corrida');
  }],
  ['09-p05-revision-de-tienda', { ancho: 1600, alto: 1000 }, async (p) => { await irA(p, { momento: 'M2', rol: 'jefe', ruta: '#/tienda?p=2026-03' }); await guardar(p, '09-p05-revision-de-tienda'); }],
  ['10-p06-aprobacion', { ancho: 1600, alto: 1000 }, async (p) => { await irA(p, { momento: 'M2', rol: 'gerente', ruta: '#/aprobacion' }); await guardar(p, '10-p06-aprobacion'); }],
  ['11-ciclo-de-enero', { ancho: 1600, alto: 1000 }, async (p) => {
    // recorre el ciclo de enero: corrida, meta de Sofía, revisión, tope de Luis, aprobación y pago
    await irA(p, { momento: 'M1', rol: 'analista', ruta: '#/periodos' });
    await p.click('[data-accion="corrida"]'); await aceptar(p); await p.waitForSelector('text=Alertas de la corrida', { timeout: 12000 });
    await p.click('[data-accion="meta"]'); await p.fill('#dialogo input[type=number]', '70000'); await aceptar(p);
    await p.click('[data-accion="corrida"] >> nth=-1'); await aceptar(p); await p.waitForTimeout(3600);
    await p.click('[data-accion="revision"]'); await aceptar(p);
    await rol(p, 'gerente'); await ir(p, '#/aprobacion');
    await p.locator('[data-accion="tope-autorizar"]').click(); await p.fill('#dialogo textarea', 'Campaña de electrónica del trimestre'); await aceptar(p);
    await p.click('[data-accion="aprobar"]'); await p.waitForTimeout(300);
    await p.evaluate(() => document.body.classList.add('captura'));
    await p.screenshot({ path: join(TEMP, '11-p06-confirmacion.png') });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(TEMP, '11-p06-confirmacion.png'), '-c:v', 'libwebp', '-quality', '90', join(SALIDA, '11-p06-confirmacion.webp')]); console.log('  11-p06-confirmacion.webp');
    await aceptar(p, true);
    await rol(p, 'contabilidad'); await ir(p, '#/pagos');
    await guardar(p, '12-p07-pagos');
  }],
  ['13-p08-disputa-de-jorge', { ancho: 1600, alto: 1000 }, async (p) => {
    await irA(p, { momento: 'M2', rol: 'analista', ruta: '#/disputa/D-014' });
    await p.click('[data-accion="tomar"]'); await p.waitForTimeout(300);
    await p.locator('tr', { hasText: 'V-0388' }).locator('[data-accion="elegir"]').click(); await p.waitForTimeout(300);
    await guardar(p, '13-p08-disputa-de-jorge');
  }],
  ['14-p10-simulador', { ancho: 1600, alto: 1000 }, async (p) => { await irA(p, { momento: 'M2', rol: 'analista', ruta: '#/simulador' }); await guardar(p, '14-p10-simulador'); }],
  ['15-p11-movil-en-curso', { ancho: 390, alto: 844, escala: 3 }, async (p) => { await irA(p, { momento: 'M0', rol: 'vendedor', vendedor: 'E-1201', ruta: '#/mi-comision' }); await guardar(p, '15-p11-movil-en-curso'); }],
  ['16-p11-movil-ajuste', { ancho: 390, alto: 844, escala: 3 }, async (p) => {
    await irA(p, { momento: 'M2', rol: 'gerente', ruta: '#/ajuste/AJ-2026-03-001' });
    await p.click('[data-accion="autorizar"]'); await aceptar(p);
    await rol(p, 'vendedor', 'E-1201'); await ir(p, '#/mi-comision');
    await guardar(p, '16-p11-movil-ajuste');
  }],
  ['17-p12-auditoria', { ancho: 1600, alto: 1000 }, async (p) => { await irA(p, { momento: 'M2', rol: 'auditoria', ruta: '#/auditoria' }); await guardar(p, '17-p12-auditoria', { completa: false }); }],
  ['18-sistema-componentes', { ancho: 1600, alto: 1000 }, async (p) => { await irA(p, { momento: 'M1', rol: 'analista', ruta: '#/sistema' }); await guardar(p, '18-sistema-componentes'); }],
  ['19-modelo', { ancho: 1600, alto: 1000 }, async (p) => { await p.goto(`${BASE}/caso/`, { waitUntil: 'networkidle' }); await guardar(p, '19-modelo', { selector: '#modelo-figura' }); }],
];

for (const [nombre, config, correr] of trabajos) {
  if (filtro && !nombre.includes(filtro)) continue;
  console.log(nombre);
  const { navegador, pagina, errores } = await abrir({ ancho: config.ancho, alto: config.alto, escala: config.escala ?? 2 });
  try { await correr(pagina); } catch (e) { console.error(`  ERROR en ${nombre}:`, e.message.split('\n')[0]); }
  if (errores.length) console.warn('  consola:', errores.slice(0, 3));
  await navegador.close();
}
rmSync(TEMP, { recursive: true, force: true });
