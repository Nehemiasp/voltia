// Diálogo de confirmación con resumen de impacto, panel lateral de detalle y avisos temporales.

import { esc } from '../engine/formato.js';
import { ico, nota, resumenImpacto } from './ui.js';

let enfocarAlCerrar = null;

// ---------- Confirmación con contexto (principio 4) ----------

/**
 * @returns {Promise<{confirmado: boolean, valor: string}>}
 * Una acción irreversible exige marcar “Entiendo que no se puede deshacer” antes de habilitar el botón.
 */
export function confirmar({
  titulo, descripcion = '', resumen = [], aviso = null, textoConfirmar = 'Confirmar', peligro = false, irreversible = false,
  campo = null,
}) {
  const dialogo = document.getElementById('dialogo');
  enfocarAlCerrar = document.activeElement;
  const id = `dlg-${Math.random().toString(36).slice(2, 7)}`;
  const campoHtml = campo
    ? `<div class="campo" style="margin-top:12px"><label for="${id}-campo">${esc(campo.etiqueta)}${campo.requerido ? '' : ' (opcional)'}</label>
        ${campo.tipo === 'number'
          ? `<input id="${id}-campo" type="number" value="${esc(campo.valor ?? '')}" min="${esc(campo.min ?? '')}" inputmode="numeric">`
          : `<textarea id="${id}-campo" rows="3" placeholder="${esc(campo.placeholder ?? '')}">${esc(campo.valor ?? '')}</textarea>`}
        <p class="campo__error" id="${id}-error" hidden>${ico('circle-alert')}<span></span></p>
        ${campo.ayuda ? `<span class="campo__ayuda">${esc(campo.ayuda)}</span>` : ''}</div>`
    : '';
  const check = irreversible
    ? `<label class="opcion" style="margin-top:12px"><input type="checkbox" id="${id}-entiendo"><span>Entiendo que esta acción no se puede deshacer.</span></label>`
    : '';

  dialogo.innerHTML = `<form method="dialog" class="dialogo" aria-labelledby="${id}-titulo">
    <div class="dialogo__cabecera"><h2 id="${id}-titulo">${esc(titulo)}</h2>${descripcion ? `<p class="secundario pequeno" style="margin-top:4px">${descripcion}</p>` : ''}</div>
    <div class="dialogo__cuerpo">${resumen.length ? resumenImpacto(resumen) : ''}${aviso ? nota(aviso.variante, aviso.html) : ''}${campoHtml}${check}</div>
    <div class="dialogo__pie">
      <button type="button" class="btn" data-cancelar>Cancelar</button>
      <button type="submit" class="btn ${peligro ? 'btn--peligro-solido' : 'btn--primario'}" id="${id}-ok"${irreversible ? ' disabled' : ''}>${esc(textoConfirmar)}</button>
    </div></form>`;

  return new Promise((resolver) => {
    const form = dialogo.querySelector('form');
    const ok = dialogo.querySelector(`#${id}-ok`);
    const entiendo = dialogo.querySelector(`#${id}-entiendo`);
    const entrada = dialogo.querySelector(`#${id}-campo`);
    let resuelto = false;

    const terminar = (confirmado) => {
      if (resuelto) return;
      resuelto = true;
      const valor = entrada ? entrada.value : '';
      if (dialogo.open) dialogo.close();
      dialogo.removeEventListener('cancel', alCancelar);
      enfocarAlCerrar?.focus?.();
      resolver({ confirmado, valor });
    };
    const alCancelar = (e) => {
      e.preventDefault();
      terminar(false);
    };
    entiendo?.addEventListener('change', () => { ok.disabled = !entiendo.checked; });
    dialogo.querySelector('[data-cancelar]').addEventListener('click', () => terminar(false));
    dialogo.addEventListener('cancel', alCancelar);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (campo?.requerido && !entrada.value.trim()) {
        const err = dialogo.querySelector(`#${id}-error`);
        err.hidden = false;
        err.querySelector('span').textContent = campo.mensajeRequerido ?? 'Este campo es obligatorio.';
        entrada.setAttribute('aria-invalid', 'true');
        entrada.focus();
        return;
      }
      terminar(true);
    });
    dialogo.showModal();
    (entrada ?? dialogo.querySelector('[data-cancelar]')).focus();
  });
}

// ---------- Panel lateral de detalle ----------

export function abrirPanel({ titulo, html }) {
  const panel = document.getElementById('panel-lateral');
  enfocarAlCerrar = document.activeElement;
  panel.innerHTML = `<div class="lateral-detalle__cabecera"><div><h2 id="panel-titulo" style="font-size:var(--t-l)">${esc(titulo)}</h2></div>
    <button type="button" class="btn btn--s btn--discreto" data-cerrar-panel aria-label="Cerrar panel">${ico('x')} Cerrar</button></div>
    <div class="lateral-detalle__cuerpo">${html}</div>`;
  panel.classList.add('abierto');
  panel.setAttribute('aria-hidden', 'false');
  panel.querySelector('[data-cerrar-panel]').focus();
}

export function cerrarPanel() {
  const panel = document.getElementById('panel-lateral');
  if (!panel.classList.contains('abierto')) return;
  panel.classList.remove('abierto');
  panel.setAttribute('aria-hidden', 'true');
  enfocarAlCerrar?.focus?.();
}

// ---------- Avisos temporales ----------

export function avisar(texto, tipo = 'positivo') {
  const contenedor = document.getElementById('avisos');
  const el = document.createElement('div');
  el.className = `aviso-flotante aviso-flotante--${tipo}`;
  el.innerHTML = `${ico(tipo === 'negativo' ? 'circle-alert' : 'circle-check')}<span>${esc(texto)}</span>`;
  contenedor.appendChild(el);
  setTimeout(() => el.remove(), tipo === 'negativo' ? 9000 : 6000);
}
