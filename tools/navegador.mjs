// Utilidades para controlar Voltia con Chromium (pruebas de recorridos y revisión visual).
import { chromium } from 'playwright-core';

export const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const BASE = process.env.BASE_URL ?? 'http://localhost:5173';

export async function abrir({ ancho = 1440, alto = 900, escala = 1, video = null } = {}) {
  const navegador = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const contexto = await navegador.newContext({
    viewport: { width: ancho, height: alto }, deviceScaleFactor: escala, locale: 'es-GT', reducedMotion: 'no-preference',
    ...(video ? { recordVideo: { dir: video, size: { width: ancho, height: alto } } } : {}),
  });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errores.push(`${m.type()}: ${m.text()}`); });
  pagina.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  return { navegador, contexto, pagina, errores };
}

/** Parte de los datos iniciales, elige el rol desde el menú de usuario y navega a una ruta. */
export async function irA(pagina, { rol = 'analista', ruta = '#/inicio' } = {}) {
  await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await pagina.evaluate(() => localStorage.clear());
  await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await cambiarRol(pagina, rol);
  await pagina.evaluate((r) => { location.hash = r; }, ruta);
  await pagina.waitForTimeout(250);
}

export async function cambiarRol(pagina, rol) {
  await pagina.click('#btn-usuario');
  await pagina.click(`#menu-usuario [data-rol="${rol}"]`);
  await pagina.waitForTimeout(150);
}

export async function esperarFuentes(pagina) {
  await pagina.evaluate(() => document.fonts.ready);
}
