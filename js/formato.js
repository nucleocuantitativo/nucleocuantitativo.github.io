/* Núcleo · formato de cifras y fechas, siempre a la española: 1.234,5 $ · 30,4 % · 4 oct 2026.
   Todo cuelga de window.N para que funcione igual abierto desde el servidor o desde el disco. */
window.N = window.N || {};
(function (N) {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const sep = e => e.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // número con d decimales, coma decimal y punto de miles; sin signo
  const fP = (v, d = 0) => { const [e, f] = Math.abs(+v).toFixed(d).split('.'); return sep(e) + (f ? ',' + f : ''); };
  const grp = n => fP(Math.round(Math.abs(n)));
  const menos = n => (n < 0 && Math.round(Math.abs(n)) > 0 ? '−' : '');
  // dinero: +1.234 $ / −567 $ (signo opcional)
  const usd = (n, signo = true, d = 0) => n == null || isNaN(n) ? '—'
    : (n < 0 && fP(n, d) !== fP(0, d) ? '−' : (signo && n > 0 ? '+' : '')) + fP(n, d) + ' $';
  const pct = (n, d = 1) => n == null || isNaN(n) ? '—' : (n < 0 ? '−' : '') + fP(n, d) + ' %';
  const num = (n, d = 0) => n == null || isNaN(n) ? '—' : (n < 0 ? '−' : '') + fP(n, d);
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  // fechas del motor: "2021-01-04" o "2021-01-04 13:00"
  const aFecha = s => s instanceof Date ? s : new Date(String(s).slice(0, 10) + 'T00:00:00Z');
  const fecha = s => { const d = aFecha(s); return isNaN(d) ? '—' : d.getUTCDate() + ' ' + MESES[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  const mesAnio = s => { const d = aFecha(s); return isNaN(d) ? '—' : MESES[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  // duraciones en palabras de persona
  const dura = seg => seg == null ? '—' : seg < 60 ? 'menos de 1 min' : seg < 3600 ? Math.round(seg / 60) + ' min'
    : Math.floor(seg / 3600) + ' h' + (Math.round(seg % 3600 / 60) ? ' ' + Math.round(seg % 3600 / 60) + ' min' : '');
  const ic = (id, cls = '') => `<svg class="i ${cls}"><use href="#i-${id}"/></svg>`;
  // para meter texto del motor en HTML sin riesgos
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // lee una cifra escrita por la persona: «1.234,5» → 1234.5
  const leeNum = t => { const v = parseFloat(String(t).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')); return isNaN(v) ? null : v; };
  const guarda = (k, v) => { try { localStorage.setItem('nucleo_' + k, v); } catch (e) { } };
  const lee = k => { try { return localStorage.getItem('nucleo_' + k); } catch (e) { return null; } };
  // ayuda de la Puntuación (la de la ventana, sin tope; la Nota de 0 a 10 se aplastaba en 10)
  N.TIP_PUNT = '<b>Puntuación</b><span>Cuánto gana por cada $ que cae en los años con que se creó,</span><span>por los años que gana y menos si es complicada. Más es mejor.</span><span>No dice si es de fiar: eso lo dicen las pruebas.</span>';
  Object.assign(N, { $, $$, fP, grp, menos, usd, pct, num, MESES, aFecha, fecha, mesAnio, dura, ic, esc, leeNum, guarda, lee });
})(window.N);
