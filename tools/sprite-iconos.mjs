// Genera assets/iconos.svg con los íconos Lucide (ISC) que usa el prototipo.
// Uso: node tools/sprite-iconos.mjs <carpeta de lucide-static/icons>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const carpeta = process.argv[2];
if (!carpeta) throw new Error('Indica la carpeta lucide-static/icons');
const ICONOS = `check circle-check triangle-alert circle-x clock lock info circle chevron-right chevron-down chevron-left
arrow-right arrow-left arrow-up arrow-down arrow-up-right user users store file-text search download upload play pause history
scale list-checks sliders-horizontal git-compare shield-check calculator receipt-text inbox banknote x plus minus pencil
trash-2 rotate-ccw send flag message-square eye book-open layout-dashboard circle-dot circle-dashed hourglass ban badge-check
wallet smartphone building-2 list-ordered external-link filter menu zap file-down circle-alert`.split(/\s+/);

const simbolos = ICONOS.map((nombre) => {
  const svg = readFileSync(join(carpeta, `${nombre}.svg`), 'utf8');
  const interior = svg.replace(/<!--[\s\S]*?-->/, '').replace(/<svg[\s\S]*?>/, '').replace('</svg>', '').trim();
  return `  <symbol id="i-${nombre}" viewBox="0 0 24 24">${interior.replace(/\s*\n\s*/g, '')}</symbol>`;
});

const salida = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <!-- Íconos Lucide (licencia ISC). Generado con tools/sprite-iconos.mjs -->
${simbolos.join('\n')}
</svg>
`;
writeFileSync('assets/iconos.svg', salida);
console.log(`${ICONOS.length} íconos en assets/iconos.svg`);
