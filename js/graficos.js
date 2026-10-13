/* Núcleo · gráficos (mismos tipos que el programa de ahora y que el esbozo), ahora con datos reales del motor.
   Entrada común: puntos = [["2021-01-04", 123.4], …] (ganancia acumulada en $, en orden de fecha).
   periodos = [{t: 'e'|'v'|'c', desde: "2021-01-01", hasta: "2021-06-30"}, …]  (e crear · v primera prueba · c examen final)
   Nada se inventa: si no hay puntos, el gráfico dice «Sin datos». */
(function (N) {
  const { grp, usd, fP, esc, aFecha, MESES } = N;
  const COLP = { e: '#7f9fd0', v: '#a68cd0', c: '#d58a4c' };
  const NOMP = { e: 'CREAR', v: 'PRIMERA PRUEBA', c: 'EXAMEN FINAL' };
  const ms = s => aFecha(s).getTime();
  const sinDatos = (el, alto = 120) => { const t = `<div class="estado peq" style="min-height:${alto}px"><p>Sin datos para dibujar.</p></div>`; if (el) el.innerHTML = t; return t; };
  function niceStep(r) { if (!(r > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(r / 4))), m = r / 4 / p; return (m < 1.5 ? 1 : m < 3.5 ? 2.5 : m < 7.5 ? 5 : 10) * p; }
  const anioDe = s => aFecha(s).getUTCFullYear();
  // «2021–2024», «2025–2026», «2023»
  // «hasta» es el primer día que ya no cuenta: 2024-01-01 → 2023
  const rangoAnios = (a, b) => { const y0 = anioDe(a), y1 = anioDe(b) - (String(b).slice(5, 10) === '01-01' ? 1 : 0); return y0 >= y1 ? '' + y0 : y0 + '–' + y1; };

  // curva pequeña de una fila
  function spark(puntos, w = 140, h = 38) {
    if (!puntos || puntos.length < 2) return `<svg width="${w}" height="${h}" aria-hidden="true"></svg>`;
    const c = puntos.map(p => p[1]), mn = Math.min(...c), mx = Math.max(...c), st = Math.max(1, Math.floor(c.length / 70));
    const pts = []; for (let i = 0; i < c.length; i += st) pts.push([i / (c.length - 1) * w, h - 3 - (c[i] - mn) / ((mx - mn) || 1) * (h - 6)]);
    pts.push([w, h - 3 - (c[c.length - 1] - mn) / ((mx - mn) || 1) * (h - 6)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    const col = c[c.length - 1] >= 0 ? '#55c08a' : '#e5685b';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}L${w} ${h}L0 ${h}Z" fill="${col}" opacity=".22"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }

  // LA CURVA, como la de la ventana (ui_graficos.py, CurvaCapital) y mejor: hecha PUNTO A PUNTO (en la ficha, cada punto es una operación;
  // en la cartera, cada punto es un día). Línea azul clara sobre área VERDE con degradado; debajo, la caída desde el máximo en ROJO;
  // franjas de periodo con fondo (azul: primera prueba; naranja: examen final) y su nombre sin montarse; años sin amontonarse;
  // «Final · caída máx. · operaciones» arriba a la derecha.
  // INTERACTIVA: al pasar el ratón (o el dedo), un punto sigue la curva y otro la caída, con una línea vertical y un recuadro:
  // «Operación 57 de 342 · 3 may 2013 · ganó +48 $ · Capital +2.193 $ · Caída −55 $». Flechas ← → del teclado: una operación cada vez.
  // Clic en un punto: alClic(i) (en la ficha lleva a esa operación en el gráfico de velas).
  function curvaGrande(el, puntos, { periodos = [], h = 260, extra = [], limite = 0, col = '#5aa9ff', relleno = '#2fae6a', ops = null, desdeCero = true,
    unidad = 'operación', alClic = null } = {}) {
    if (!el) return; if (!puntos || puntos.length < 2) return sinDatos(el, h);
    const W = Math.max(320, el.clientWidth || 640), PADL = 66, PADR = 10, TOP = 22, bandas = periodos.length > 0, PADT = TOP + (bandas ? 22 : 8), H = h, DDH = 92, GAP = 22, YRS = 22;
    const base = desdeCero ? 0 : puntos[0][1];
    const arr = (desdeCero ? [[puntos[0][0], 0], ...puntos] : puntos).map(p => [String(p[0]).slice(0, 10), p[1] - base]);
    const n = arr.length, tms = arr.map(p => ms(p[0]));
    const extraR = extra.filter(e => e.puntos && e.puntos.length > 1).map(e => ({ col: e.col, a: e.puntos.map(p => p[1] - (desdeCero ? 0 : e.puntos[0][1])) }));
    const todos = [arr.map(p => p[1]), ...extraR.map(e => e.a)].flat(), mn = Math.min(0, ...todos), mx = Math.max(1, ...todos) * 1.04;
    const X = i => PADL + i / ((n - 1) || 1) * (W - PADL - PADR), Y = v => PADT + (1 - (v - mn) / ((mx - mn) || 1)) * (H - PADT);
    let pk = -1e18; const dd = arr.map(p => { pk = Math.max(pk, p[1]); return p[1] - pk; });
    const mdd = Math.min(...dd) || -1, mnd = Math.min(mdd, -limite * 1.08);
    const D0 = H + GAP, Yd = v => D0 + (v / mnd) * DDH, ALTO = D0 + DDH + YRS;
    const fin = arr[n - 1][1];
    const idx = t => { let lo = 0, hi = n - 1; if (t <= tms[0]) return 0; if (t > tms[n - 1]) return n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tms[m] < t) lo = m; else hi = m; } return hi; };
    const FONDO = { v: ['#2f6db5', .30], c: ['#b4652a', .24], o: ['#1f8a9c', .30] }, ROT = { e: '#bdb9ae', v: '#6fb4ff', c: '#f0954f', o: '#5fd6ea' };
    const nOps = ops != null ? ops : (unidad === 'operación' ? n - 1 : null);
    let o = `<text x="${W - PADR}" y="14" fill="#bdb9ae" font-size="11.5" text-anchor="end">Final <tspan fill="${fin >= 0 ? '#3ddc84' : '#ff5a4f'}" font-weight="600">${usd(fin)}</tspan><tspan dx="16">·  Caída máx. </tspan><tspan fill="#ff5a4f" font-weight="600">${usd(mdd)}</tspan>${nOps != null ? `<tspan dx="16">·  </tspan><tspan font-weight="600" fill="#ecebe6">${grp(nOps)}</tspan> operaciones` : ''}</text>`;
    if (bandas) {
      const seg = [];
      [...periodos].sort((a, b) => ms(a.desde) - ms(b.desde)).forEach(p => { const a = ms(p.desde), b = ms(p.hasta); const l = seg[seg.length - 1];
        if (l && l.t === p.t && Math.abs(l.b - a) < 3 * 864e5) { l.b = b; l.hasta = p.hasta; } else seg.push({ t: p.t, a, b, desde: p.desde, hasta: p.hasta }); });
      const xa = t => X(idx(t)), xb = t => t > tms[n - 1] ? X(n - 1) : X(idx(t));
      seg.forEach(g => { const a = xa(g.a), b = xb(g.b), f = FONDO[g.t];
        if (f && b > a) o += `<rect x="${a}" y="${PADT}" width="${b - a}" height="${D0 + DDH - PADT}" fill="${f[0]}" opacity="${f[1]}"/>`;
        if (f && a > PADL + 1) o += `<line x1="${a}" x2="${a}" y1="${PADT}" y2="${D0 + DDH}" stroke="${ROT[g.t]}" opacity=".6"/>`; });
      const tit = t => { const g = seg.filter(x => x.t === t); if (!g.length) return null; return { a: xa(g[0].a), b: xb(g[g.length - 1].b), d: rangoAnios(g[0].desde, g[g.length - 1].hasta), n: g.length }; };
      const e = tit('e'), v = tit('v'), c2 = tit('c'), o2 = tit('o'), anc = s => s.length * 6.9, R = [];
      if (o2) { const s = 'OTROS AÑOS ' + o2.d, x1 = Math.max(PADL + 4, o2.a + 4); R.push({ s, x1, x2: x1 + anc(s), col: ROT.o }); }
      if (c2) { const s = NOMP.c + ' ' + c2.d, s2 = 'EXAMEN ' + c2.d; const t = anc(s) <= Math.max(c2.b - c2.a, 150) ? s : s2; R.push({ s: t, x1: Math.max(PADL, c2.b - 4 - anc(t)), x2: c2.b - 4, col: ROT.c }); }
      if (v) { const largo = NOMP.v + (v.n > 1 ? ', ' + v.n + ' TROZOS' : ' ' + v.d), corto = '1.ª PRUEBA' + (v.n > 1 ? '' : ' ' + v.d), tope = R.length ? R[0].x1 - 14 : W - PADR;
        for (const s of [largo, corto]) { const x2 = Math.min((v.a + v.b) / 2 + anc(s) / 2, tope), x1 = x2 - anc(s); if (x1 >= PADL) { R.push({ s, x1, x2, col: ROT.v }); break; } } }
      if (e) { const s = NOMP.e + ' ' + e.d, x1 = Math.max(PADL + 4, e.a + 4), x2 = x1 + anc(s); if (!R.some(r => x2 > r.x1 - 14 && x1 < r.x2 + 14)) R.push({ s, x1, x2, col: ROT.e }); }
      R.forEach(r => o += `<text x="${r.x1}" y="${PADT - 8}" fill="${r.col}" font-size="10.5" font-weight="600" letter-spacing=".08em" font-family="var(--fh)">${esc(r.s)}</text>`);
    }
    const st = niceStep(mx - mn);
    for (let v = Math.ceil(mn / st) * st; v <= mx; v += st) o += `<line x1="${PADL}" x2="${W - PADR}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2c2f35" ${Math.abs(v) < 1e-9 ? '' : 'stroke-dasharray="3 5"'}/><text x="${PADL - 8}" y="${Y(v) + 4}" fill="#9a978f" font-size="11" text-anchor="end">${Math.abs(v) < 1e-9 ? '0 $' : (v < 0 ? '−' : '') + grp(v) + ' $'}</text>`;
    const camino = a => a.map((v, k) => (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    const gid = 'g' + Math.random().toString(36).slice(2, 8), y0 = Y(Math.max(mn, 0)), d = camino(arr.map(p => p[1]));
    o += `<defs><linearGradient id="${gid}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${relleno}" stop-opacity=".85"/><stop offset="1" stop-color="${relleno}" stop-opacity=".18"/></linearGradient>
      <linearGradient id="${gid}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9473b" stop-opacity=".25"/><stop offset="1" stop-color="#d9473b" stop-opacity=".9"/></linearGradient></defs>`;
    o += `<path d="${d}L${X(n - 1)} ${y0}L${X(0)} ${y0}Z" fill="url(#${gid}v)"/>`;
    extraR.forEach(e => o += `<path d="${camino(e.a)}" fill="none" stroke="${e.col}" stroke-width="1.8" opacity=".95"/>`);
    o += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round"/>`;
    const dp = dd.map((v, k) => (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Yd(v).toFixed(1)).join('');
    const rotulo = (x, s, color, ancla = 'start') => `<text x="${x}" y="${D0 - 7}" fill="${color}" font-size="10.5" font-weight="600" letter-spacing=".08em" text-anchor="${ancla}" font-family="var(--fh)">${s}</text>`;
    o += `<line x1="${PADL}" x2="${W - PADR}" y1="${D0}" y2="${D0}" stroke="#3a3d44"/>${rotulo(PADL + 6, 'CAÍDA DESDE EL MÁXIMO', '#ff6b5b')}${limite ? rotulo(W - PADR, 'LÍNEA AMARILLA: LÍMITE DEL RETO', '#f5c542', 'end') : ''}
      <path d="${dp}L${X(n - 1)} ${D0}L${X(0)} ${D0}Z" fill="url(#${gid}r)"/><path d="${dp}" fill="none" stroke="#ff6b5b" stroke-width="1.6"/>
      <text x="${PADL - 8}" y="${D0 + 4}" fill="#9a978f" font-size="11" text-anchor="end">0 $</text>${limite ? '' : `<text x="${PADL - 8}" y="${Yd(mdd / 2) + 4}" fill="#9a978f" font-size="11" text-anchor="end">−${grp(-mdd / 2)} $</text>`}<text x="${PADL - 8}" y="${Yd(mdd) + 4}" fill="#ff6b5b" font-size="11" text-anchor="end">−${grp(-mdd)} $</text>`;
    if (limite) o += `<line x1="${PADL}" x2="${W - PADR}" y1="${Yd(-limite)}" y2="${Yd(-limite)}" stroke="#f5c542" stroke-dasharray="6 4" stroke-width="1.3"/><text x="${PADL - 8}" y="${Yd(-limite) + 4}" fill="#f5c542" font-size="11" text-anchor="end">−${grp(limite)} $</text>`;
    // años: en el primer punto de cada año, y nunca a menos de 46 px del anterior
    let ultX = -1e9, ultA = null;
    arr.forEach((p, i) => { const a = p[0].slice(0, 4); if (a === ultA) return; ultA = a; const x = X(i); if (x - ultX < 46 || x > W - PADR - 28) return; ultX = x;
      o += `<line x1="${x}" x2="${x}" y1="${D0 + DDH}" y2="${D0 + DDH + 5}" stroke="#3a3d44"/><text x="${x + 3}" y="${ALTO - 4}" fill="#9a978f" font-size="11">${a}</text>`; });
    // el cursor: línea, punto en la curva y punto en la caída
    o += `<g class="cursor" style="display:none" pointer-events="none"><line class="cv" y1="${PADT}" y2="${D0 + DDH}" stroke="#ecebe6" stroke-dasharray="3 3" opacity=".7"/>
      <circle class="cp" r="5" fill="${col}" stroke="#0f1012" stroke-width="1.5"/><circle class="cd" r="4" fill="#ff6b5b" stroke="#0f1012" stroke-width="1.5"/></g>
      <rect class="zona" x="${PADL}" y="${PADT}" width="${W - PADL - PADR}" height="${D0 + DDH - PADT}" fill="transparent" style="cursor:${alClic ? 'pointer' : 'crosshair'}"/>`;
    el.style.position = 'relative';
    el.innerHTML = `<svg class="grafico" tabindex="0" width="${W}" height="${ALTO}" viewBox="0 0 ${W} ${ALTO}" role="img" aria-label="Curva de capital, punto a punto. Usa las flechas para recorrerla.">${o}</svg><div class="cuadro-curva" hidden></div>`;
    const svg = el.querySelector('svg'), g = svg.querySelector('.cursor'), caja = el.querySelector('.cuadro-curva');
    let cur = -1;
    const ver = i => {
      cur = i = Math.max(0, Math.min(n - 1, i)); const px = X(i), py = Y(arr[i][1]), pd = Yd(dd[i]);
      g.style.display = ''; ['x1', 'x2'].forEach(a => g.querySelector('.cv').setAttribute(a, px));
      g.querySelector('.cp').setAttribute('cx', px); g.querySelector('.cp').setAttribute('cy', py); g.querySelector('.cd').setAttribute('cx', px); g.querySelector('.cd').setAttribute('cy', pd);
      const paso = i ? arr[i][1] - arr[i - 1][1] : 0, ganoTxt = !i ? 'Inicio' : unidad === 'operación' ? (paso >= 0 ? 'ganó ' : 'perdió ') : (unidad === 'día' ? 'Ese día: ' : 'Esa semana: ');
      caja.hidden = false;
      caja.innerHTML = `<b>${unidad === 'operación' ? (i ? `Operación ${grp(i)} de ${grp(n - 1)}` : 'Antes de la primera operación') : N.fecha(arr[i][0])}</b>${unidad === 'operación' ? `<span class="muted">${N.fecha(arr[i][0])}</span>` : ''}
        ${i ? `<span>${ganoTxt}<em class="${paso >= 0 ? 'pos' : 'neg'}">${usd(paso)}</em></span>` : ''}<span>Capital: <em class="${arr[i][1] >= 0 ? 'pos' : 'neg'}">${usd(arr[i][1])}</em></span><span>Caída: <em class="neg">${usd(dd[i])}</em></span>${alClic && i ? '<span class="muted" style="font-size:.78rem">Clic: verla en el gráfico de velas</span>' : ''}`;
      const r = svg.getBoundingClientRect(), k = r.width / W, cw = caja.offsetWidth;
      caja.style.left = (px * k + 14 + cw > r.width ? px * k - 14 - cw : px * k + 14) + 'px'; caja.style.top = Math.max(4, Math.min(py * k - 10 - caja.offsetHeight, (D0 + DDH) * k - caja.offsetHeight)) + 'px';
    };
    const desdeEvento = ev => { const r = svg.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev, x = (p.clientX - r.left) * (W / r.width); return Math.round((x - PADL) / ((W - PADL - PADR) / ((n - 1) || 1))); };
    const salir = () => { g.style.display = 'none'; caja.hidden = true; };
    const zona = svg.querySelector('.zona');
    zona.addEventListener('mousemove', ev => ver(desdeEvento(ev)));
    zona.addEventListener('mouseleave', () => { if (document.activeElement !== svg) salir(); });
    zona.addEventListener('touchstart', ev => { ver(desdeEvento(ev)); }, { passive: true });
    zona.addEventListener('touchmove', ev => { ver(desdeEvento(ev)); ev.preventDefault(); }, { passive: false });
    zona.addEventListener('click', ev => { const i = desdeEvento(ev); ver(i); if (alClic && i > 0) alClic(i); });
    svg.addEventListener('keydown', ev => { const m = { ArrowLeft: -1, ArrowRight: 1, PageUp: -10, PageDown: 10 }[ev.key];
      if (m) { ev.preventDefault(); ver((cur < 0 ? n - 1 : cur) + m); } else if (ev.key === 'Home') { ev.preventDefault(); ver(0); } else if (ev.key === 'End') { ev.preventDefault(); ver(n - 1); }
      else if (ev.key === 'Enter' && alClic && cur > 0) alClic(cur); });
    svg.addEventListener('focus', () => { if (cur < 0) ver(n - 1); });
    svg.addEventListener('blur', salir);
  }

  // ganancia por año, desde los puntos (último valor de cada año menos el del año anterior)
  function porAnio(puntos) {
    const fin = {}; let antes = puntos.length ? puntos[0][1] : 0; const out = [];
    puntos.forEach(p => fin[anioDe(p[0])] = p[1]);
    Object.keys(fin).map(Number).sort().forEach(y => { out.push({ y, v: fin[y] - antes }); antes = fin[y]; });
    return out;
  }
  // para qué se usó cada año: e crear · v primera prueba · c examen final · o otros años (probados por ti) · x no se usó (solo informa)
  const USOS = { e: ['var(--p-crear)', 'Crear'], v: ['#4d8fe0', 'Primera prueba'], c: ['var(--p-examen)', 'Examen final'], o: ['#3cc4dc', 'Otros años (probados por ti)'], x: ['#77746c', 'No se usó: solo informa'] };
  const leyendaUsos = (hay) => `<div class="ley-usos">${Object.entries(USOS).filter(([k]) => !hay || hay.includes(k)).map(([k, [c, t]]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}<span>Debajo de la raya: año en pérdida</span></div>`;
  // barras por año. vals: [{y, v, ops?, uso?, nota?}], examen: años del examen final (se pintan en su color)
  // con «uso», cada barra va del color de para qué se usó ese año (y la leyenda lo dice)
  function barrasAnio(vals, examen = []) {
    if (!vals || !vals.length) return sinDatos(null, 140);
    const mx = Math.max(...vals.map(x => Math.abs(x.v))) || 1, hasNeg = vals.some(x => x.v < 0), zero = hasNeg ? 62 : 100;
    return `<div class="barras-anio" style="grid-template-columns:repeat(${vals.length},1fr);grid-auto-flow:row">${vals.map(x => { const { y, v } = x, h = Math.abs(v) / mx * (hasNeg ? 58 : 92), ex = examen.includes(y);
      const col = x.uso ? USOS[x.uso][0] : v >= 0 ? (ex ? 'var(--p-examen)' : 'var(--ok)') : 'var(--bad)';
      const tipTxt = `<b>${y}</b>${v >= 0 ? 'Ganó ' : 'Perdió '}<em class='${v >= 0 ? 'pos' : 'neg'}'>${usd(v)}</em>${x.ops != null ? '<span>' + grp(x.ops) + ' operaciones</span>' : ''}${x.uso ? `<span>Para qué se usó: ${USOS[x.uso][1].toLowerCase()}</span>` : ''}${x.nota ? `<span class='muted'>${esc(x.nota)}</span>` : ''}`;
      return `<div class="ba" data-tip="${tipTxt.replace(/"/g, '&quot;')}">${v >= 0
        ? `<i style="height:${h}%;background:${col};opacity:.85;position:absolute;bottom:${100 - zero}%"></i><em style="bottom:calc(${100 - zero + h}% + 3px)">${grp(v)}</em>`
        : `<i class="n" style="height:${h}%;background:${col};opacity:.85;position:absolute;top:${zero}%"></i><em style="top:calc(${zero + h}% + 2px);color:var(--bad)">−${grp(v)}</em>`}</div>`; }).join('')}
      ${hasNeg ? `<div style="position:absolute;left:0;right:0;top:${zero}%;border-top:1px solid var(--line2)"></div>` : ''}</div>
      <div class="ejes-a" style="grid-template-columns:repeat(${vals.length},1fr);grid-auto-flow:row">${vals.map(x => `<span class="${x.uso ? 'u-' + x.uso : examen.includes(x.y) ? 'exa' : ''}">${x.y}</span>`).join('')}</div>`;
  }

  // reparto de las operaciones (histograma): cuántas operaciones ganaron o perdieron cada cantidad. Recuadro al pasar el ratón.
  function histograma(valores, { cubos = 40 } = {}) {
    const v = (valores || []).filter(x => x != null && isFinite(x)); if (v.length < 2) return sinDatos(null, 170);
    const s = [...v].sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
    let lo = q(.005), hi = q(.995); if (hi <= lo) { lo = s[0]; hi = s[s.length - 1] + 1; }
    const st = niceStep((hi - lo) / cubos * 4) / 4 || 1, a0 = Math.floor(lo / st) * st, nb = Math.max(1, Math.min(80, Math.ceil((hi - a0) / st)));
    const B = Array.from({ length: nb }, (_, i) => ({ a: a0 + i * st, b: a0 + (i + 1) * st, n: 0, suma: 0 }));
    let fueraL = 0, fueraH = 0;
    v.forEach(x => { let i = Math.floor((x - a0) / st); if (i < 0) { i = 0; fueraL++; } if (i >= nb) { i = nb - 1; fueraH++; } B[i].n++; B[i].suma += x; });
    const mx = Math.max(...B.map(b => b.n)) || 1, media = v.reduce((a, b) => a + b, 0) / v.length, med = q(.5);
    return `<div class="histo">${B.map((b, i) => `<div class="hb" data-tip="<b>De ${usd(b.a, true)} a ${usd(b.b, true)}</b><span>${grp(b.n)} operaciones (${fP(b.n / v.length * 100, 1)} %)</span>${b.n ? `<span>Suman <em class='${b.suma >= 0 ? 'pos' : 'neg'}'>${usd(b.suma)}</em></span>` : ''}${i === 0 && fueraL ? `<span class='muted'>Incluye ${grp(fueraL)} aún peores</span>` : ''}${i === nb - 1 && fueraH ? `<span class='muted'>Incluye ${grp(fueraH)} aún mejores</span>` : ''}"><i style="height:${b.n / mx * 100}%;background:${b.b <= 0 ? 'var(--bad)' : b.a >= 0 ? 'var(--ok)' : '#8a877f'};opacity:.85"></i></div>`).join('')}</div>
      <div class="histo-ejes"><span>${usd(a0)}</span><span>0 $</span><span>${usd(a0 + nb * st)}</span></div>
      <p class="ayuda">Cada barra: cuántas operaciones acabaron con ese resultado. Media <b class="num ${media >= 0 ? 'pos' : 'neg'}">${usd(media, true, 1)}</b> · la mitad gana más de <b class="num">${usd(med, true, 1)}</b>.</p>`;
  }

  // mapa mes a mes desde los puntos; los meses sin datos salen como «·»
  function mapaMeses(puntos) {
    if (!puntos || puntos.length < 2) return sinDatos(null, 140);
    const fin = {}; puntos.forEach(p => { const d = aFecha(p[0]); fin[d.getUTCFullYear() * 12 + d.getUTCMonth()] = p[1]; });
    const ks = Object.keys(fin).map(Number).sort((a, b) => a - b), y0 = Math.floor(ks[0] / 12), y1 = Math.floor(ks[ks.length - 1] / 12);
    const filas = []; let mx = 1, antes = puntos[0][1];
    for (let y = y0; y <= y1; y++) { const f = []; for (let m = 0; m < 12; m++) { const k = y * 12 + m; if (fin[k] == null) { f.push(null); continue; } f.push(fin[k] - antes); antes = fin[k]; }
      f.forEach(v => { if (v != null) mx = Math.max(mx, Math.abs(v)); }); filas.push([y, f]); }
    const cel = (v, y, m) => v == null ? `<div class="sin" data-tip="<b>${MESES[m]} ${y}</b><span>Sin datos</span>">·</div>` : `<div style="background:${v >= 0 ? `rgba(34,197,94,${.12 + .6 * Math.abs(v) / mx})` : `rgba(239,83,80,${.12 + .6 * Math.abs(v) / mx})`}" data-tip="<b>${MESES[m]} ${y}</b>${v >= 0 ? 'Ganó ' : 'Perdió '}<em class='${v >= 0 ? 'pos' : 'neg'}'>${usd(v)}</em>">${Math.abs(v) < 1 ? '0' : (v < 0 ? '−' : '') + grp(v)}</div>`;
    return `<div class="mapa" style="grid-template-columns:44px repeat(12,1fr) 1.25fr"><div class="h"></div>${MESES.map(m => `<div class="h">${m}</div>`).join('')}<div class="h">Año</div>
      ${filas.map(([y, f]) => { const t = f.reduce((a, v) => a + (v || 0), 0); return `<div class="y">${y}</div>${f.map((v, m) => cel(v, y, m)).join('')}<div class="tot" style="background:${t >= 0 ? 'rgba(34,197,94,.18)' : 'rgba(239,83,80,.18)'};color:${t >= 0 ? 'var(--ok)' : 'var(--bad)'}">${usd(t)}</div>`; }).join('')}</div>`;
  }


  // mapa mes a mes desde {año: {mes(1-12): ganancia}} (como llega en la ficha)
  function mapaMesesDe(meses, usos = null) {
    const ys = Object.keys(meses || {}).map(Number).sort();
    if (!ys.length) return sinDatos(null, 140);
    let mx = 1; ys.forEach(y => Object.values(meses[y]).forEach(v => mx = Math.max(mx, Math.abs(v))));
    const cel = (v, y, m) => v == null ? `<div class="sin" data-tip="<b>${MESES[m]} ${y}</b><span>Sin operaciones</span>">·</div>` : `<div style="background:${v >= 0 ? `rgba(34,197,94,${.12 + .6 * Math.abs(v) / mx})` : `rgba(239,83,80,${.12 + .6 * Math.abs(v) / mx})`}" data-tip="<b>${MESES[m]} ${y}</b>${v >= 0 ? 'Ganó ' : 'Perdió '}<em class='${v >= 0 ? 'pos' : 'neg'}'>${usd(v)}</em>">${Math.abs(v) < 1 ? '0' : (v < 0 ? '−' : '') + grp(v)}</div>`;
    return `<div class="mapa" style="grid-template-columns:44px repeat(12,1fr) 1.25fr"><div class="h"></div>${MESES.map(m => `<div class="h">${m}</div>`).join('')}<div class="h">Año</div>
      ${ys.map(y => { const f = Array.from({ length: 12 }, (_, m) => meses[y][m + 1] ?? meses[y][String(m + 1)] ?? null), t = f.reduce((a, v) => a + (v || 0), 0);
        const u = usos && usos[y]; return `<div class="y ${u ? 'u-' + u : ''}" ${u ? `data-tip="<b>${y}</b><span>${USOS[u][1]}</span>"` : ''}>${y}</div>${f.map((v, m) => cel(v, y, m)).join('')}<div class="tot" style="background:${t >= 0 ? 'rgba(34,197,94,.18)' : 'rgba(239,83,80,.18)'};color:${t >= 0 ? 'var(--ok)' : 'var(--bad)'}">${usd(t)}</div>`; }).join('')}</div>`;
  }

  // barras horizontales: [[nombre, valor, ¿la suya?], …]
  function barrasH(items) {
    const mx = Math.max(...items.map(x => Math.abs(x[1] || 0))) || 1;
    return `<div class="bh">${items.map(([t, v, o]) => `<div class="bh-f" data-tip="<b>${esc(t)}</b><em class='${v >= 0 ? 'pos' : 'neg'}'>${usd(v)}</em>"><span class="${o ? 'orig' : ''}">${esc(t)}</span><div class="bh-b"><i style="width:${Math.abs(v || 0) / mx * 100}%;background:${v >= 0 ? 'var(--ok)' : 'var(--bad)'};opacity:${o ? 1 : .7}"></i></div><b class="num ${v >= 0 ? 'pos' : 'neg'}">${usd(v)}</b></div>`).join('')}</div>`;
  }

  // velas con las operaciones (▲ compra, ▼ venta, ◆ salida). d = respuesta de /velas:
  // {velas:[{t,a,max,min,c}], operaciones:[{k, entrada, salida, lado, precio_entrada, precio_salida, ganancia}], operacion}
  // zoom: cuántas velas se ven, centradas en la operación elegida.
  function velas(el, d, zoom = 120) {
    if (!el) return; const V0 = (d && d.velas) || []; if (V0.length < 2) return sinDatos(el, 240);
    const idx0 = t => { const s = String(t).slice(0, 16); const k = V0.findIndex(v => String(v.t).slice(0, 16) >= s); return k < 0 ? V0.length - 1 : k; };
    const sel = (d.operaciones || []).find(x => x.k === d.operacion);
    const z = Math.min(V0.length, Math.max(20, zoom)), centro = sel ? idx0(sel.entrada) : V0.length - 1;
    const i0 = Math.max(0, Math.min(V0.length - z, centro - Math.floor(z / 2))), V = V0.slice(i0, i0 + z);
    const W = Math.max(320, el.clientWidth || 640), H = 280, PR = 74, PB = 24, n = V.length;
    const mn = Math.min(...V.map(v => v.min)), mx = Math.max(...V.map(v => v.max)), cw = (W - PR) / n;
    const dec = Math.abs(mx) >= 1000 ? 0 : Math.abs(mx) >= 100 ? 1 : Math.abs(mx) >= 10 ? 2 : 4;
    const X = i => i * cw + cw / 2, Y = v => 10 + (1 - (v - mn) / ((mx - mn) || 1)) * (H - PB - 20);
    const idx = t => idx0(t) - i0;
    let o = ''; const st = niceStep(mx - mn);
    for (let v = Math.ceil(mn / st) * st; v <= mx; v += st) o += `<line x1="0" x2="${W - PR}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1d1e22"/><text x="${W - PR + 8}" y="${Y(v) + 4}" fill="#6e6c66" font-size="11" font-family="var(--fn)">${fP(v, dec)}</text>`;
    if (sel) { const a = X(idx(sel.entrada)), b = X(idx(sel.salida)); o += `<rect x="${a - cw}" y="0" width="${Math.max(0, b - a) + cw * 2}" height="${H - PB}" fill="#3cc4dc" opacity=".09"/>`; }
    const cada = Math.max(1, Math.round(n / 6));
    V.forEach((v, i) => { const up = v.c >= v.a, col = up ? '#55c08a' : '#e5685b', x = X(i), w = Math.max(1.5, cw * .62);
      o += `<line x1="${x}" x2="${x}" y1="${Y(v.max)}" y2="${Y(v.min)}" stroke="${col}" stroke-width="1"/><rect x="${x - w / 2}" y="${Y(Math.max(v.a, v.c))}" width="${w}" height="${Math.max(1, Math.abs(Y(v.a) - Y(v.c)))}" fill="${col}" rx="1"/>`;
      if (i % cada === Math.floor(cada / 2)) { const t = String(v.t); o += `<text x="${x}" y="${H - 6}" fill="#6e6c66" font-size="11" text-anchor="middle">${N.fecha(t).replace(/ \d{4}$/, '')}${t.length > 10 ? ' ' + t.slice(11, 16) : ''}</text>`; } });
    (d.operaciones || []).forEach(t => {
      if (String(t.salida) < String(V[0].t) || String(t.entrada) > String(V[n - 1].t)) return;
      const ie = Math.max(0, idx(t.entrada)), ix = Math.max(0, idx(t.salida));
      const es = t.k === d.operacion, s1 = es ? 1.35 : 1, compra = /compra/i.test(t.lado), cx = t.ganancia >= 0 ? '#3ddc84' : '#ff5a4f', ce = cx;   // entrada y salida: verde si gana, roja si pierde
      const xe = X(ie), xx = X(ix), ye = Y(t.precio_entrada), yx = Y(t.precio_salida), ve = V[ie];
      const tri = compra ? `M${xe - 7 * s1} ${Y(ve.min) + 16 * s1}L${xe + 7 * s1} ${Y(ve.min) + 16 * s1}L${xe} ${Y(ve.min) + 4}Z` : `M${xe - 7 * s1} ${Y(ve.max) - 16 * s1}L${xe + 7 * s1} ${Y(ve.max) - 16 * s1}L${xe} ${Y(ve.max) - 4}Z`;
      const yt = Math.max(14, Math.min(H - PB - 6, yx + (t.ganancia >= 0 ? -14 : 22))), txt = (t.ganancia >= 0 ? '+' : '−') + grp(t.ganancia) + ' $';
      o += `<rect x="${Math.min(xe, xx) - 2}" y="${Math.min(ye, yx)}" width="${Math.abs(xx - xe) + 4}" height="${Math.max(2, Math.abs(yx - ye))}" fill="${cx}" opacity="${es ? .16 : .08}"/>
        <line x1="${xe - cw * 1.5}" x2="${xe + cw * 1.5}" y1="${ye}" y2="${ye}" stroke="#ecebe6" stroke-width="1.6" opacity="${es ? 1 : .7}"/><line x1="${xe}" x2="${xx}" y1="${ye}" y2="${yx}" stroke="${cx}" stroke-width="${es ? 2 : 1.4}" stroke-dasharray="4 3"/>
        <path d="${tri}" fill="${ce}" stroke="#0f1012" stroke-width="1"/><rect x="${xx - 5.5 * s1}" y="${yx - 5.5 * s1}" width="${11 * s1}" height="${11 * s1}" transform="rotate(45 ${xx} ${yx})" fill="${cx}" stroke="#0f1012" stroke-width="1"/>
        <text x="${xx + 9}" y="${yt}" fill="${cx}" font-size="${es ? 12.5 : 11}" font-weight="600" font-family="var(--fn)">${txt}</text>`; });
    const ult = V[n - 1].c, up = ult >= V[n - 2].c;
    o += `<line x1="0" x2="${W - PR}" y1="${Y(ult)}" y2="${Y(ult)}" stroke="#6f7c8d" stroke-dasharray="2 4"/><rect x="${W - PR + 2}" y="${Y(ult) - 10}" width="${PR - 4}" height="20" rx="4" fill="${up ? '#55c08a' : '#e5685b'}"/><text x="${W - PR + 8}" y="${Y(ult) + 4}" fill="#fff" font-size="11" font-weight="600" font-family="var(--fn)">${fP(ult, dec)}</text>`;
    el.innerHTML = `<svg class="grafico" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Velas con las operaciones">${o}</svg>`;
  }

  // abanico: {original:[…], bandas: {"50": […], "95": […]}, curvas: [[…], …]}. Eje: operación o fecha.
  function abanico(el, a, { eje = 'operación' } = {}) {
    if (!el) return; if (!a || !a.original || a.original.length < 2) return sinDatos(el, 200);
    const W = Math.max(320, el.clientWidth || 640), H = 250, PL = 62, n = a.original.length, curvas = a.curvas || [];
    // percentiles punto a punto de las curvas al azar (todas tienen n puntos o se reescalan)
    const en = (c, i) => c[Math.min(c.length - 1, Math.round(i * (c.length - 1) / ((n - 1) || 1)))];
    const pct = (arr, q) => { const b = [...arr].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.max(0, Math.round(q * (b.length - 1))))]; };
    const p5 = [], p50 = [], p95 = [];
    if (curvas.length >= 5) for (let i = 0; i < n; i++) { const col = curvas.map(c => en(c, i)); p5.push(pct(col, .05)); p50.push(pct(col, .5)); p95.push(pct(col, .95)); }
    const all = [...a.original, ...p5, ...p95].filter(v => v != null), mn = Math.min(0, ...all), mx = Math.max(1, ...all) * 1.05;
    const X = i => PL + i / ((n - 1) || 1) * (W - PL - 8), Y = v => 10 + (1 - (v - mn) / ((mx - mn) || 1)) * (H - 34);
    const path = c => c.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    let o = ''; const st = niceStep(mx - mn);
    for (let v = Math.ceil(mn / st) * st; v <= mx; v += st) o += `<line x1="${PL}" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2a2c31" ${Math.abs(v) > 1e-9 ? 'stroke-dasharray="3 5"' : ''}/><text x="${PL - 8}" y="${Y(v) + 4}" fill="#8a877f" font-size="11" text-anchor="end">${Math.abs(v) < 1e-9 ? '0 $' : (v < 0 ? '−' : '') + grp(v) + ' $'}</text>`;
    if (p5.length) {
      o += `<path d="${path(p95)}${p5.map((v, i) => 'L' + X(n - 1 - i).toFixed(1) + ' ' + Y(p5[n - 1 - i]).toFixed(1)).join('')}Z" fill="#4d9cf5" opacity=".28"/>`;
      o += `<path d="${path(p95)}" fill="none" stroke="#3ddc84" stroke-width="1.6"/><path d="${path(p5)}" fill="none" stroke="#ff5a4f" stroke-width="1.6"/><path d="${path(p50)}" fill="none" stroke="#a9a69e" stroke-width="1.2" stroke-dasharray="5 4"/>`;
    }
    o += `<path d="${path(a.original)}" fill="none" stroke="#3cc4dc" stroke-width="3.2" stroke-linejoin="round"/>`;
    o += `<text x="${PL}" y="${H - 6}" fill="#8a877f" font-size="11">${eje === 'fecha' ? 'Principio' : 'Operación 1'}</text><text x="${W - 8}" y="${H - 6}" fill="#8a877f" font-size="11" text-anchor="end">${eje === 'fecha' ? 'Final' : 'Operación ' + grp(n - 1)}</text>`;
    o += `<g class="cursor" style="display:none" pointer-events="none"><line class="cv" y1="10" y2="${H - 24}" stroke="#ecebe6" stroke-dasharray="3 3" opacity=".7"/><circle class="cp" r="5" fill="#3cc4dc" stroke="#0f1012" stroke-width="1.5"/></g><rect class="zona" x="${PL}" y="10" width="${W - PL - 8}" height="${H - 34}" fill="transparent"/>`;
    el.style.position = 'relative';
    el.innerHTML = `<svg class="grafico" tabindex="0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="La suya frente a órdenes al azar">${o}</svg><div class="cuadro-curva" hidden></div>`;
    const svg = el.querySelector('svg'), g = svg.querySelector('.cursor'), caja = el.querySelector('.cuadro-curva'); let cur = -1;
    const ver = i => { cur = i = Math.max(0, Math.min(n - 1, i)); const px = X(i), py = Y(a.original[i]); g.style.display = ''; ['x1', 'x2'].forEach(k => g.querySelector('.cv').setAttribute(k, px)); g.querySelector('.cp').setAttribute('cx', px); g.querySelector('.cp').setAttribute('cy', py);
      caja.hidden = false; caja.innerHTML = `<b>${eje === 'fecha' ? 'Punto ' : 'Operación '}${grp(i)} de ${grp(n - 1)}</b><span>La suya: <em class="${a.original[i] >= 0 ? 'pos' : 'neg'}">${usd(a.original[i])}</em></span>${p5.length ? `<span>Con muy buena suerte: <em class="pos">${usd(p95[i])}</em></span><span>Lo normal: <em>${usd(p50[i])}</em></span><span>Con muy mala suerte: <em class="${p5[i] >= 0 ? 'pos' : 'neg'}">${usd(p5[i])}</em></span>` : ''}`;
      const r = svg.getBoundingClientRect(), k = r.width / W, cw = caja.offsetWidth; caja.style.left = (px * k + 14 + cw > r.width ? px * k - 14 - cw : px * k + 14) + 'px'; caja.style.top = Math.max(4, py * k - caja.offsetHeight - 10) + 'px'; };
    const desde = ev => { const r = svg.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev; return Math.round(((p.clientX - r.left) * (W / r.width) - PL) / ((W - PL - 8) / ((n - 1) || 1))); };
    const zona = svg.querySelector('.zona'), salir = () => { g.style.display = 'none'; caja.hidden = true; };
    zona.addEventListener('mousemove', ev => ver(desde(ev))); zona.addEventListener('mouseleave', () => { if (document.activeElement !== svg) salir(); });
    zona.addEventListener('touchmove', ev => { ver(desde(ev)); ev.preventDefault(); }, { passive: false }); zona.addEventListener('touchstart', ev => ver(desde(ev)), { passive: true });
    svg.addEventListener('keydown', ev => { const m = { ArrowLeft: -1, ArrowRight: 1 }[ev.key]; if (m) { ev.preventDefault(); ver((cur < 0 ? n - 1 : cur) + m); } });
    svg.addEventListener('blur', salir);
  }

  // resultado de /todos-los-anos → barras por año (naranja: examen final) + veredicto
  function todosAnios(r) {
    const C = r.cartera || {}, ys = Object.keys(C).map(Number).sort((a, b) => a - b);
    if (!ys.length) return sinDatos(null, 140);
    const vals = ys.map(y => ({ y, v: C[y].ganancia || 0, ops: C[y].operaciones })), examen = ys.filter(y => (C[y].usos || []).includes('examen'));
    const pa = r.peor_anio, bien = r.anios && r.anios_que_gana / r.anios >= .7;
    return `<div class="dos-col"><div>${barrasAnio(vals, examen)}<div class="leyenda"><span><i style="background:var(--ok)"></i>Año con ganancia</span> <span><i style="background:var(--bad)"></i>Año con pérdida</span> <span><i style="background:var(--p-examen)"></i>Años del examen final</span></div></div>
      <div><div class="veredicto ${bien ? 'ok' : 'warn'}"><span class="ic">${N.ic(bien ? 'check' : 'warn')}</span> <div>Gana en <b>${r.anios_que_gana} de ${r.anios} años</b>.${pa && pa.ganancia < 0 ? ` Peor año: ${esc(pa.anio)}, ${usd(pa.ganancia)}.` : ' Ningún año en pérdida.'}</div></div>
      <p class="ayuda" style="margin-top:12px">${esc(r.aviso || '')}</p>${(r.avisos || []).map(a => `<p class="ayuda">${esc(a)}</p>`).join('')}</div></div>`;
  }

  // DOS CURVAS en el mismo eje (ficha › «Frente a comprarlo y mantenerlo»): a y b con las MISMAS fechas, [[fecha, $], …].
  // Interactiva: al pasar el ratón (o el dedo, o con las flechas) un recuadro con la fecha y lo que llevaba cada una.
  function dosCurvas(el, a, b, { nombres = ['La estrategia', 'Comprar y mantener'], cols = ['#5aa9ff', '#d6a05e'], h = 230 } = {}) {
    if (!el) return; if (!a || a.length < 2) return sinDatos(el, h);
    b = b && b.length === a.length ? b : null;
    const W = Math.max(320, el.clientWidth || 640), PADL = 74, PADR = 12, PADT = 16, PADB = 26, H = h, n = a.length;
    const va = a.map(p => p[1]), vb = b ? b.map(p => p[1]) : [];
    const mn = Math.min(0, ...va, ...vb), mx = Math.max(1, ...va, ...vb) * 1.04;
    const X = i => PADL + i / ((n - 1) || 1) * (W - PADL - PADR), Y = v => PADT + (1 - (v - mn) / ((mx - mn) || 1)) * (H - PADT - PADB);
    const st = niceStep(mx - mn); let o = '';
    for (let v = Math.ceil(mn / st) * st; v <= mx; v += st) o += `<line x1="${PADL}" x2="${W - PADR}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2c2f35" ${Math.abs(v) < 1e-9 ? '' : 'stroke-dasharray="3 5"'}/><text x="${PADL - 8}" y="${Y(v) + 4}" fill="#9a978f" font-size="11" text-anchor="end">${Math.abs(v) < 1e-9 ? '0 $' : (v < 0 ? '−' : '') + grp(Math.abs(v)) + ' $'}</text>`;
    let ultX = -1e9, ultA = null;
    a.forEach((p, i) => { const y = String(p[0]).slice(0, 4); if (y === ultA) return; ultA = y; const x = X(i); if (x - ultX < 40 || x > W - PADR - 26) return; ultX = x; o += `<text x="${x + 2}" y="${H - 6}" fill="#9a978f" font-size="11">${y}</text>`; });
    const camino = arr => arr.map((v, k) => (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    if (b) o += `<path d="${camino(vb)}" fill="none" stroke="${cols[1]}" stroke-width="2" opacity=".95"/>`;
    o += `<path d="${camino(va)}" fill="none" stroke="${cols[0]}" stroke-width="2.4" stroke-linejoin="round"/>`;
    o += `<g class="cursor" style="display:none" pointer-events="none"><line class="cv" y1="${PADT}" y2="${H - PADB}" stroke="#ecebe6" stroke-dasharray="3 3" opacity=".7"/><circle class="ca" r="4.5" fill="${cols[0]}" stroke="#0f1012" stroke-width="1.5"/>${b ? `<circle class="cb" r="4.5" fill="${cols[1]}" stroke="#0f1012" stroke-width="1.5"/>` : ''}</g>
      <rect class="zona" x="${PADL}" y="${PADT}" width="${W - PADL - PADR}" height="${H - PADT - PADB}" fill="transparent" style="cursor:crosshair"/>`;
    el.style.position = 'relative';
    el.innerHTML = `<svg class="grafico" tabindex="0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(nombres.join(' frente a '))}, día a día. Usa las flechas para recorrerla.">${o}</svg><div class="cuadro-curva" hidden></div>
      <div class="velas-ley"><span><i class="ley-l" style="background:${cols[0]};height:3px"></i>${esc(nombres[0])}</span>${b ? ` <span><i class="ley-l" style="background:${cols[1]};height:3px"></i>${esc(nombres[1])}</span>` : ''}</div>`;
    const svg = el.querySelector('svg'), g = svg.querySelector('.cursor'), caja = el.querySelector('.cuadro-curva'); let cur = -1;
    const ver = i => { cur = i = Math.max(0, Math.min(n - 1, i)); const px = X(i);
      g.style.display = ''; ['x1', 'x2'].forEach(k => g.querySelector('.cv').setAttribute(k, px));
      g.querySelector('.ca').setAttribute('cx', px); g.querySelector('.ca').setAttribute('cy', Y(va[i]));
      if (b) { g.querySelector('.cb').setAttribute('cx', px); g.querySelector('.cb').setAttribute('cy', Y(vb[i])); }
      caja.hidden = false;
      caja.innerHTML = `<b>${N.fecha(a[i][0])}</b><span>${esc(nombres[0])}: <em class="${va[i] >= 0 ? 'pos' : 'neg'}">${usd(va[i])}</em></span>${b ? `<span>${esc(nombres[1])}: <em class="${vb[i] >= 0 ? 'pos' : 'neg'}">${usd(vb[i])}</em></span>` : ''}`;
      const r = svg.getBoundingClientRect(), k = r.width / W, cw = caja.offsetWidth, py = Math.min(Y(va[i]), b ? Y(vb[i]) : 1e9);
      caja.style.left = (px * k + 14 + cw > r.width ? px * k - 14 - cw : px * k + 14) + 'px'; caja.style.top = Math.max(4, py * k - 10 - caja.offsetHeight) + 'px'; };
    const desde = ev => { const r = svg.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev, x = (p.clientX - r.left) * (W / r.width); return Math.round((x - PADL) / ((W - PADL - PADR) / ((n - 1) || 1))); };
    const salir = () => { g.style.display = 'none'; caja.hidden = true; };
    const zona = svg.querySelector('.zona');
    zona.addEventListener('mousemove', ev => ver(desde(ev))); zona.addEventListener('mouseleave', () => { if (document.activeElement !== svg) salir(); });
    zona.addEventListener('touchstart', ev => ver(desde(ev)), { passive: true }); zona.addEventListener('touchmove', ev => { ver(desde(ev)); ev.preventDefault(); }, { passive: false });
    svg.addEventListener('keydown', ev => { const m = { ArrowLeft: -1, ArrowRight: 1, PageUp: -20, PageDown: 20 }[ev.key]; if (m) { ev.preventDefault(); ver((cur < 0 ? n - 1 : cur) + m); } });
    svg.addEventListener('focus', () => { if (cur < 0) ver(n - 1); }); svg.addEventListener('blur', salir);
  }

  N.graf = Object.assign(N.graf || {}, { USOS, leyendaUsos, histograma, todosAnios, mapaMesesDe, barrasH, velas, abanico, spark, curvaGrande, barrasAnio, porAnio, mapaMeses, niceStep, sinDatos, COLP, NOMP, dosCurvas });
})(window.N);
