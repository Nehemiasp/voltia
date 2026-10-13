// Graba la secuencia animada del ajuste de Marta (unos 19 s, sin audio): captura cuadros con su marca de tiempo
// y los ensambla con ffmpeg en WebM y MP4. Uso: npm start (en otra terminal) y luego npm run secuencia
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { abrir, irA, esperarFuentes } from './navegador.mjs';

const SALIDA = new URL('../portafolio/video/', import.meta.url).pathname;
const TEMP = join(SALIDA, '.tmp');
rmSync(TEMP, { recursive: true, force: true });
mkdirSync(TEMP, { recursive: true });

const { navegador, pagina } = await abrir({ ancho: 1280, alto: 720 });
await irA(pagina, { momento: 'M2', rol: 'analista', ruta: '#/ajuste/AJ-2026-03-001' });
await esperarFuentes(pagina);
await pagina.evaluate(() => { document.body.classList.add('captura'); location.hash = '#/ajuste/AJ-2026-03-001?secuencia=1'; });
await pagina.waitForTimeout(150);
await pagina.evaluate(() => document.body.classList.add('captura'));

const inicio = Date.now();
const marcas = [];
const DURACION = 19000;
for (let i = 0; Date.now() - inicio < DURACION; i += 1) {
  const t = Date.now() - inicio;
  const nombre = `f${String(i).padStart(4, '0')}.jpg`;
  await pagina.screenshot({ path: join(TEMP, nombre), type: 'jpeg', quality: 88 });
  marcas.push([nombre, t]);
}
await navegador.close();

const lista = marcas.map(([n, t], i) => `file '${n}'\nduration ${(((marcas[i + 1]?.[1] ?? DURACION) - t) / 1000).toFixed(3)}`).join('\n');
writeFileSync(join(TEMP, 'lista.txt'), `${lista}\nfile '${marcas[marcas.length - 1][0]}'\n`);
const base = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(TEMP, 'lista.txt'), '-vf', 'fps=15,scale=1280:720', '-an'];
execFileSync('ffmpeg', [...base, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-pix_fmt', 'yuv420p', join(SALIDA, 'ajuste-de-marta.webm')]);
execFileSync('ffmpeg', [...base, '-c:v', 'libx264', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(SALIDA, 'ajuste-de-marta.mp4')]);
rmSync(TEMP, { recursive: true, force: true });
console.log(`${marcas.length} cuadros → portafolio/video/ajuste-de-marta.webm y .mp4`);
