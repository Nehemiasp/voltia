# Registro de imágenes

Este proyecto **no usa fotografías de stock ni de clientes**. Todo lo visual es interfaz del propio prototipo, ilustración hecha para el caso o ícono.

| Archivo | Dónde se usa | Tipo | Fuente | Reemplazar por |
|---|---|---|---|---|
| `portafolio/img/01` a `18` (`.webp`) | Caso de estudio | Captura del prototipo | `npm run capturas` | No hace falta; se regeneran |
| `portafolio/img/19-modelo.webp` | Caso de estudio | Captura del diagrama del caso | `npm run capturas` | No hace falta |
| `portafolio/img/02-problema-hoja-de-calculo.webp` | Caso de estudio, “El problema” | Ilustración propia (HTML en `portafolio/problema.html`) | Hecha para el caso | Opcional: una ilustración definitiva |
| `portafolio/video/ajuste-de-marta.webm` y `.mp4` | Caso de estudio, “El caso de Marta” | Grabación del prototipo (19 s, sin audio) | `npm run secuencia` | No hace falta |
| `assets/og.png` | Open Graph de `index.html` y del caso | Recorte de la captura 01 | ffmpeg | No hace falta |
| `assets/iconos.svg` | Íconos de la interfaz | Lucide (ISC) | `npm run iconos` | No aplica |
