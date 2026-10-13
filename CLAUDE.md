# Voltia

Caso de estudio de diseño: sistema de gestión de comisiones para una cadena de retail **ficticia**. Proyecto conceptual.

@docs/VOLTIA-CASO-COMPLETO.md

## Cómo trabajar aquí

- El documento maestro (arriba) es la fuente de verdad. Si una pantalla, un número o un texto lo contradice, se corrige la pantalla o se actualiza el documento; nunca quedan los dos distintos.
- Todo es ficticio: no se usa nada de trabajos con restricción ni nombres de empresas reales.
- Los números salen del motor de cálculo (`src/engine/`) y están probados en `test/engine.test.mjs`. No se escriben cifras a mano en las pantallas.
- Las decisiones nuevas van a `docs/decisiones.md` con la alternativa descartada. Lo que no está en el documento maestro se marca como **(supuesto)**.
- El estándar de calidad web está en `docs/LUMACODE-ESTANDAR-WEB-v2.md`. No se usa la identidad de Lumacode en este proyecto.

## Comandos

```
npm start         # servidor estático en http://localhost:5173 (los módulos ES no cargan desde file://)
npm test          # pruebas del motor de cálculo (sin navegador)
npm run lint      # variables sin uso e indefinidas
npm run e2e       # recorridos completos con Chromium (requiere npm start)
npm run revision  # scroll horizontal, h1, alt y consola en 4 anchos y 20 pantallas (requiere npm start)
```

## Estructura

- `src/engine/` reglas, datos, generación de ventas y cálculo. Sin dependencias del navegador.
- `src/app/` carcasa, estado, permisos, selectores, acciones y vistas (`vistas/pXX-*.js`).
- `src/styles/` tokens, base, componentes y vistas.
- `docs/` decisiones, modelo, especificaciones, sistema, caso y entrega.
- `caso/` y `portafolio/`: página del caso de estudio con imágenes de una versión anterior de la interfaz (no se regeneran).
