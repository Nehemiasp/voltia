// Revisión mínima: variables sin uso e indefinidas. No impone estilo.
const navegador = {
  window: 'readonly', document: 'readonly', location: 'readonly', localStorage: 'readonly', matchMedia: 'readonly', Blob: 'readonly', URL: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', console: 'readonly', CSS: 'readonly',
  FormData: 'readonly', URLSearchParams: 'readonly', Intl: 'readonly', globalThis: 'readonly', navigator: 'readonly', getComputedStyle: 'readonly',
  HTMLElement: 'readonly', Event: 'readonly',
};
const nodo = { process: 'readonly', console: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', setTimeout: 'readonly', Buffer: 'readonly' };

export default [
  { ignores: ['node_modules/**', '.scratch/**', 'portafolio/**'] },
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: navegador },
    rules: { 'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }], 'no-undef': 'error' },
  },
  {
    files: ['tools/**/*.mjs', 'test/**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...nodo, ...navegador } },
    rules: { 'no-unused-vars': ['warn', { args: 'none' }], 'no-undef': 'error' },
  },
];
