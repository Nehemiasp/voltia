// Servidor estático mínimo para el prototipo (los módulos ES no cargan desde file://).
// Uso: npm start  →  http://localhost:5173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(import.meta.url), '..', '..');
const PUERTO = Number(process.env.PORT ?? 5173);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.webm': 'video/webm', '.mp4': 'video/mp4', '.gif': 'image/gif',
};

createServer(async (req, res) => {
  try {
    let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta.endsWith('/')) ruta += 'index.html';
    const archivo = normalize(join(RAIZ, ruta));
    if (!archivo.startsWith(RAIZ)) throw Object.assign(new Error('fuera de la raíz'), { code: 'ENOENT' });
    const info = await stat(archivo);
    if (info.isDirectory()) {
      res.writeHead(301, { Location: `${ruta}/` });
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(archivo));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(RAIZ, '404.html')));
  }
}).listen(PUERTO, () => console.log(`Voltia en http://localhost:${PUERTO}`));
