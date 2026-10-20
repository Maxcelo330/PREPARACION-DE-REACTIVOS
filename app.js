/* =====================================================================
   PREPARACIÓN DE REACTIVOS · PWA · Calidad · Embol S.A.
   1) Reactivos: receta del instructivo escalada al volumen que necesitas,
      con el instrumento recomendado y el error de cada medición.
   2) Valorar: normalidad real y factor de corrección con las fórmulas del
      LP-AC-I-01.21.
   3) Corregir: cuánto agregar (agua, concentrado, solución intermedia o
      sólido) para volver a fc = 1, avisando cuando la cantidad es tan
      pequeña que el error de medición cambiaría la concentración.
   4) Registros LP-AC-F-01.25: lotes, vencimiento, verificaciones,
      etiqueta, Excel, PDF, calendario y respaldo.
   ===================================================================== */
'use strict';

/* ══════════════════ 1 · UTILIDADES ══════════════════ */

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const DIA = 86400000;

function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  let s = String(v ?? '').trim().replace(/[\s ]/g, '');
  if (!s) return NaN;
  s = s.replace(/[^0-9.,\-]/g, '');
  const c = s.lastIndexOf(','), p = s.lastIndexOf('.');
  if (c > -1 && p > -1) s = c > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c > -1) s = s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : NaN;
}
function fmt(v, dec = 2) {
  if (v == null || !isFinite(v)) return '—';
  return Number(v).toLocaleString('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: false });
}
/* decimales con sentido según la magnitud (para concentraciones) */
function fmtN(v) {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  return fmt(v, a >= 10 ? 3 : a >= 1 ? 4 : a >= 0.1 ? 4 : 5);
}
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function ahoraLocal() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function hoyISO() { return ahoraLocal().slice(0, 10); }
function fFecha(ts) { const d = new Date(ts); return isNaN(d) ? '—' : d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function fFechaHora(ts) { const d = new Date(ts); return isNaN(d) ? '—' : fFecha(ts) + ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }); }
const decsU = u => Math.min(4, Math.max(0, Math.ceil(-Math.log10(u) - 1e-9)));
const decsD = d => Math.min(4, Math.max(0, Math.round(-Math.log10(d))));

let toastT;
function toast(msg, tipo = '') {
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast show ' + tipo;
  clearTimeout(toastT); toastT = setTimeout(() => t.className = 'toast ' + tipo, 3400);
}
function descargar(nombre, contenido, tipo) {
  const b = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ══════════════════ 2 · ALMACENAMIENTO ══════════════════ */

const LS = {
  leer(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
  escribir(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('No se pudo guardar en este dispositivo', 'bad'); } }
};
const K = { estado: 'rx:estado', lotes: 'rx:lotes', config: 'rx:config', pasos: 'rx:pasos', respaldo: 'rx:respaldo', avisados: 'rx:avisados' };

const clonar = o => JSON.parse(JSON.stringify(o));
function cfgDefecto() {
  return {
    analista: '', notificar: false,
    crit: clonar(CRITERIOS_DEF),
    conc: clonar(CONCENTRADOS),
    instr: {
      balanzas: INSTRUMENTOS_DEF.balanzas.map(b => Object.assign({ on: true }, b)),
      volumen: INSTRUMENTOS_DEF.volumen.map(v => Object.assign({ on: true }, v)),
      matraces: INSTRUMENTOS_DEF.matraces.slice()
    }
  };
}
let CFG = Object.assign(cfgDefecto(), LS.leer(K.config, {}));
CFG.crit = Object.assign(clonar(CRITERIOS_DEF), CFG.crit || {});
CFG.conc = Object.assign(clonar(CONCENTRADOS), CFG.conc || {});
let S = Object.assign({ view: 'reactivos', cat: 'todos', q: '', vol: {}, vR: null, vLote: '', modo: {}, nrep: 1, lFiltro: 'activos' }, LS.leer(K.estado, {}));
let LOTES = LS.leer(K.lotes, []);
let PASOS = LS.leer(K.pasos, {});

const guardarEstado = () => LS.escribir(K.estado, S);
const guardarCfg = () => LS.escribir(K.config, CFG);
const guardarLotes = () => { LS.escribir(K.lotes, LOTES); LS.escribir(K.respaldo, Object.assign(LS.leer(K.respaldo, {}), { cambios: Date.now() })); };
const RX = id => R.find(r => r.id === id);
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ══════════════════ 3 · PRECISIÓN DE LAS MEDICIONES ══════════════════ */

function estadoRel(relPct) {
  if (!isFinite(relPct)) return 'bad';
  return relPct <= CFG.crit.precOk ? 'ok' : relPct <= CFG.crit.precMax ? 'warn' : 'bad';
}

/** Elige la balanza para pesar m gramos (con tolerancia opcional ya escalada). */
function elegirBalanza(m, tol) {
  const bs = CFG.instr.balanzas.filter(b => b.on && b.max >= m).sort((a, b) => b.d - a.d); // de menos a más fina
  if (!bs.length) {
    const g = CFG.instr.balanzas.filter(b => b.on).sort((a, b) => b.max - a.max)[0];
    if (!g) return { inst: null, est: 'bad', nota: 'No hay balanzas marcadas en Ajustes' };
    const n = Math.ceil(m / g.max);
    return { inst: g, rel: g.d * n / m * 100, est: estadoRel(g.d * n / m * 100), nota: `Pesar en ${n} partes` };
  }
  const sirve = b => (b.d / m * 100) <= CFG.crit.precOk && (tol == null || b.d <= tol + 1e-12);
  const b = bs.find(sirve) || bs[bs.length - 1];
  const rel = b.d / m * 100;
  let est = estadoRel(rel), nota = '';
  if (tol != null && b.d > tol + 1e-12) { est = est === 'ok' ? 'warn' : est; nota = `La tolerancia (±${fmt(tol, decsD(b.d) + 1)} g) es menor que la legibilidad de la balanza`; }
  return { inst: b, rel, est, nota };
}

/** Elige el instrumento volumétrico para medir v ml. */
function elegirVolumen(v) {
  const vs = CFG.instr.volumen.filter(x => x.on);
  if (!vs.length) return { inst: null, est: 'bad', nota: 'No hay instrumentos marcados en Ajustes' };
  const cand = vs.filter(x => v >= x.min - 1e-9 && v <= x.max + 1e-9);
  if (cand.length) {
    const b = cand.sort((a, c) => a.u - c.u)[0];
    const rel = b.u / v * 100;
    return { inst: b, rel, est: estadoRel(rel), nota: '' };
  }
  const minimo = Math.min(...vs.map(x => x.min));
  if (v < minimo) return { inst: null, rel: Infinity, est: 'bad', nota: `Menos de lo mínimo medible (${fmt(minimo, 2)} ml)` };
  const g = vs.sort((a, c) => c.max - a.max)[0];
  const n = Math.ceil(v / g.max);
  const rel = g.u * n / v * 100;
  return { inst: g, rel, est: estadoRel(rel), nota: `Medir en ${n} veces` };
}

/* ══════════════════ 4 · ESCALADO DE LA RECETA ══════════════════ */

function volActual(r) {
  const v = num(S.vol[r.id]);
  return r.noEscala || !(v > 0) ? r.vb : v;
}

/** Devuelve cada item con su cantidad escalada, texto e instrumento. */
function escalar(r, V) {
  const f = r.noEscala ? 1 : V / r.vb;
  return r.items.map(it => {
    const o = Object.assign({}, it);
    const fi = it.fijo ? 1 : f;
    if (it.t === 's') {
      o.qs = it.q * fi; o.tols = it.tol != null ? it.tol * fi : null;
      const b = elegirBalanza(o.qs, o.tols);
      Object.assign(o, b);
      const dd = b.inst ? decsD(b.inst.d) : 2;
      o.txt = fmt(o.qs, dd) + ' g' + (o.tols != null ? ' ± ' + fmt(Math.max(o.tols, b.inst ? b.inst.d : 0), dd) + ' g' : '');
    } else if (it.t === 'l') {
      o.qs = it.q * fi;
      const b = elegirVolumen(o.qs);
      Object.assign(o, b);
      o.txt = fmt(o.qs, b.inst ? decsU(b.inst.u) : 2) + ' ml';
    } else if (it.t === 'w') {
      o.qs = it.q * fi;
      o.txt = '≈ ' + fmt(o.qs, o.qs < 10 ? 1 : 0) + ' ml';
    } else if (it.t === 'a') {
      o.txt = 'c.s.p. ' + (it.n.includes('500 ml') ? '500 ml' : fmt(V, V % 1 ? 1 : 0) + ' ' + r.uf);
    } else {
      o.txt = it.txt;
    }
    return o;
  });
}

function txtV(r, V) { return fmt(V, V % 1 ? 1 : 0) + ' ' + r.uf; }
function rellenar(texto, items, r, V) {
  return esc(texto)
    .replace(/\{V\}/g, `<b class="qv">${txtV(r, V)}</b>`)
    .replace(/\{(\d+)\}/g, (m, i) => items[i] ? `<b class="qv">${esc(items[i].txt)}</b>` : m);
}

/** Volumen máximo que se puede preparar con lo que hay de cada reactivo. */
function volumenMaximo(r, disp) {
  let lim = Infinity, cual = null;
  r.items.forEach((it, i) => {
    if (it.fijo || !(it.t === 's' || it.t === 'l')) return;
    const d = num(disp[i]);
    if (!(d >= 0)) return;
    const v = r.vb * d / it.q;
    if (v < lim) { lim = v; cual = it.n; }
  });
  return isFinite(lim) ? { v: lim, cual } : null;
}

/* ══════════════════ 5 · LOTES Y VENCIMIENTOS ══════════════════ */

function ultimaVal(l) {
  const v = (l.val || []).filter(x => isFinite(x.N));
  return v.length ? v[v.length - 1] : null;
}
function venceLote(l) { const r = RX(l.rid); return new Date(l.fecha).getTime() + (r && r.vigencia || INSTRUCTIVO.vigenciaDias) * DIA; }
function proxVerif(l) {
  const r = RX(l.rid); if (!r || !r.val) return null;
  const u = ultimaVal(l); if (!u) return null;
  return new Date(u.fecha).getTime() + INSTRUCTIVO.verifDias * DIA;
}
const EST_L = {
  vigente:   { t: 'VIGENTE',            c: 'ok' },
  porvencer: { t: 'POR VENCER',         c: 'warn' },
  verificar: { t: 'TOCA VERIFICAR',     c: 'warn' },
  valorar:   { t: 'FALTA ESTANDARIZAR', c: 'warn' },
  reval:     { t: 'RE-ESTANDARIZAR',    c: 'warn' },
  fuera:     { t: 'FC FUERA',           c: 'bad' },
  vencido:   { t: 'VENCIDO',            c: 'bad' },
  desc:      { t: 'DESCARTADO',         c: 'nd' }
};
function estadoLote(l) {
  if (l.descartado) return 'desc';
  const now = Date.now(), r = RX(l.rid);
  if (now > venceLote(l)) return 'vencido';
  if (r && r.val) {
    const u = ultimaVal(l);
    if (l.reval) return 'reval';
    if (!u) return 'valorar';
    if (u.est === 'bad') return 'fuera';
    if (now > proxVerif(l)) return 'verificar';
  }
  if (venceLote(l) - now <= CFG.crit.avisoDias * DIA) return 'porvencer';
  return 'vigente';
}
function loteVigenteDe(rid) {
  return LOTES.filter(l => l.rid === rid && !l.descartado && Date.now() <= venceLote(l))
              .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0] || null;
}
function codigoLote(rid, fecha) {
  const d = fecha.slice(2, 10).replace(/-/g, '');
  const base = `R${String(rid).padStart(2, '0')}-${d}`;
  const n = LOTES.filter(l => (l.codigo || '').startsWith(base)).length + 1;
  return `${base}-${String(n).padStart(2, '0')}`;
}
/** concentración real vigente de un lote (para usarlo como titulante o corrector) */
function nRealDe(rid) {
  const l = loteVigenteDe(rid); if (!l) return null;
  const u = ultimaVal(l); return u && !l.reval ? { N: u.N, lote: l } : null;
}

/* ══════════════════ 6 · VALORACIÓN (fórmulas del instructivo) ══════════════════ */

function calcularValoracion(r, d) {
  const v = r.val, P = (num(d.pur) || 100) / 100, ideal = r.conc.v;
  const rep = [];
  if (v.tipo === 'patron') {
    const directo = d.modo === 'directo' && v.directo;
    const fa = !directo && v.alicBase ? (num(d.alic) || v.alicBase) / v.alicBase : 1;
    d.reps.forEach(x => {
      const m = num(x.m), V = num(x.v);
      if (m > 0 && V > v.blanco) rep.push(directo ? m * P * v.directo / V : m * P * v.k * fa / (V - v.blanco));
    });
  } else if (v.tipo === 'contra') {
    const Nt = num(d.nt), Va = num(d.alic);
    d.reps.forEach(x => { const V = num(x.v); if (Nt > 0 && Va > 0 && V > 0) rep.push(Nt * V / Va); });
  } else if (v.tipo === 'abs') {
    d.reps.forEach(x => { const a = num(x.v); if (a > 0) rep.push(a); });
  }
  if (!rep.length) return null;
  const N = rep.reduce((s, x) => s + x, 0) / rep.length;
  const disp = rep.length > 1 ? (Math.max(...rep) - Math.min(...rep)) / N * 100 : null;
  const fc = N / ideal;
  let est;
  if (v.tipo === 'abs') est = evaluar(N, v.min, v.max);
  else est = evaluar(fc, CFG.crit.fcMin, CFG.crit.fcMax);
  return { N, fc, est, rep, disp };
}
function evaluar(v, lei, les) {
  if (!isFinite(v)) return null;
  if (v < lei || v > les) return 'bad';
  const m = (les - lei) * 0.10;
  return (v < lei + m || v > les - m) ? 'warn' : 'ok';
}
/** gasto esperado de titulante con fc = 1 (para detectar errores de pesada o constante) */
function gastoEsperado(r, d, m) {
  const v = r.val, P = (num(d.pur) || 100) / 100, ideal = r.conc.v;
  if (v.tipo === 'patron') {
    if (!(m > 0)) return null;
    if (d.modo === 'directo' && v.directo) return m * P * v.directo / ideal;
    const fa = v.alicBase ? (num(d.alic) || v.alicBase) / v.alicBase : 1;
    return m * P * v.k * fa / ideal + v.blanco;
  }
  if (v.tipo === 'contra') { const Nt = num(d.nt), Va = num(d.alic); return Nt > 0 && Va > 0 ? ideal * Va / Nt : null; }
  return null;
}

/* ══════════════════ 7 · CORRECCIÓN ══════════════════ */

function nConcentrado(c) { return c.rho * 1000 * (c.pct / 100) / c.peq; }
function semiBanda() { return Math.min(1 - CFG.crit.fcMin, CFG.crit.fcMax - 1); }

/**
 * Calcula todas las formas de llevar V ml de solución de concentración C a la ideal.
 * Devuelve opciones ordenadas y una recomendación.
 */
function calcularCorreccion(r, V, C) {
  const Co = r.val.tipo === 'abs' ? r.val.obj : r.conc.v;
  const out = { Co, opciones: [], intermedia: null, accion: null };
  if (!(V > 0) || !(C > 0)) return out;
  const fc = C / Co, hw = semiBanda();
  const juzgar = d => d <= hw / 4 ? 'ok' : d <= hw / 2 ? 'warn' : 'bad';
  if (Math.abs(fc - 1) < 1e-6) { out.accion = 'nada'; return out; }

  if (C > Co) {                                   // ── diluir con agua
    out.accion = 'diluir';
    const c = r.corr.find(x => x.tipo === 'agua') || { n: 'Agua destilada' };
    const Vw = V * (C / Co - 1), Vf = V + Vw;
    const m = elegirVolumen(Vw);
    const delta = m.inst ? m.inst.u * (m.nota.startsWith('Medir') ? Math.ceil(Vw / m.inst.max) : 1) / Vf : Infinity;
    out.opciones.push({ tipo: 'agua', n: c.n || 'Agua destilada', cant: Vw, u: 'ml', Vf, med: m, delta,
                        est: m.inst ? juzgar(delta) : 'bad' });
    return out;
  }

  out.accion = 'reforzar';                        // ── falta soluto
  r.corr.forEach((c, ord) => {
    if (c.tipo === 'conc' || c.tipo === 'sol') {
      let Ns, fuente;
      if (c.tipo === 'conc') { const cc = CFG.conc[c.ref]; Ns = nConcentrado(cc); fuente = `${cc.n} ${fmt(cc.pct, 0)} %, ρ ${fmt(cc.rho, 2)} → ${fmt(Ns, 2)} N`; c = Object.assign({ n: cc.n + ' ' + fmt(cc.pct, 0) + ' %' }, c); }
      else { const nr = nRealDe(c.ref); Ns = nr ? nr.N : c.N; fuente = nr ? `N real del lote ${nr.lote.codigo}: ${fmtN(Ns)}` : `Sin lote valorado: se usa el nominal ${c.N} N (valóralo para más exactitud)`; }
      if (!(Ns > Co)) return;
      const Va = V * (Co - C) / (Ns - Co), Vf = V + Va;
      const m = elegirVolumen(Va);
      const n = m.inst && m.nota.startsWith('Medir') ? Math.ceil(Va / m.inst.max) : 1;
      const delta = m.inst ? m.inst.u * n * (Ns - Co) / (Co * Vf) : Infinity;
      out.opciones.push({ ord, tipo: c.tipo, n: c.n, cant: Va, u: 'ml', Vf, med: m, delta, est: m.inst ? juzgar(delta) : 'bad', fuente, Ns });
    } else if (c.tipo === 'solido') {
      const fac = c.cpg || 1 / c.peq, P = c.pur / 100, VL = V / 1000;
      const mg = (Co - C) * VL / (fac * P);
      const b = Object.assign({}, elegirBalanza(mg, null));
      const delta = b.inst ? b.inst.d * fac * P / (VL * Co) : Infinity;
      let est = b.inst ? juzgar(delta) : 'bad';
      if (c.minG && mg < c.minG) { est = 'bad'; b.nota = `No se puede pesar tan poco: ${c.minTxt || 'mínimo ' + c.minG + ' g'}`; }
      out.opciones.push({ ord, tipo: 'solido', n: c.n, cant: mg, u: 'g', Vf: V, med: b, delta, est,
                          fuente: c.cpg ? `Pureza ${c.pur} %` : `Peso equivalente ${c.peq} · pureza ${c.pur} %`, fac, P });
    }
  });

  /* Solución intermedia: cuando lo que hay que agregar es tan poco que el error
     de medirlo cambia la concentración final, se prepara primero una solución
     más diluida del mismo reactivo y se agrega un volumen cómodo de medir. */
  const RK = { ok: 0, warn: 1, bad: 2 };
  if (!out.opciones.some(o => o.est === 'ok')) out.intermedia = solucionIntermedia(r, V, C, Co, juzgar);
  // primero las exactas; entre iguales, el orden de preferencia del instructivo/laboratorio
  out.opciones.sort((a, b) => RK[a.est] - RK[b.est] || a.ord - b.ord);
  if (out.opciones[0]) out.opciones[0].rec = out.opciones[0].est === 'ok' || (!out.intermedia && out.opciones[0].est === 'warn');
  return out;
}

function solucionIntermedia(r, V, C, Co, juzgar) {
  const fuentes = [];
  r.corr.forEach(c => {
    if (c.tipo === 'conc') { const cc = CFG.conc[c.ref]; fuentes.push({ n: `${cc.n} ${fmt(cc.pct, 0)} %`, Ns: nConcentrado(cc), liq: true }); }
    if (c.tipo === 'sol') { const nr = nRealDe(c.ref); fuentes.push({ n: c.n, Ns: nr ? nr.N : c.N, liq: true }); }
    if (c.tipo === 'solido') fuentes.push({ n: c.n, fac: c.cpg || 1 / c.peq, P: c.pur / 100, liq: false, minG: c.minG });
  });
  const matraces = CFG.instr.matraces.filter(x => x >= 50).sort((a, b) => a - b);
  const RK = { ok: 0, warn: 1, bad: 2 };
  const cands = [];
  for (const Va of [1, 2, 5, 10, 20, 25, 50]) {
    if (Va > V * 0.1) break;                       // no agrandar más de un 10 % el volumen
    const mVa = elegirVolumen(Va); if (!mVa.inst) continue;
    const Ni = Co + V * (Co - C) / Va;             // concentración que debe tener la intermedia
    for (const Vm of matraces) {
      fuentes.forEach((f, fi) => {
        let prep;
        if (f.liq) {
          if (!(f.Ns > Ni)) return;
          const x = Ni * Vm / f.Ns, mx = elegirVolumen(x);
          if (!mx.inst) return;
          prep = { cant: x, u: 'ml', med: mx, rel: mx.rel };
        } else {
          const g = Ni * (Vm / 1000) / (f.fac * f.P), mb = elegirBalanza(g, null);
          if (!mb.inst || (f.minG && g < f.minG)) return;
          prep = { cant: g, u: 'g', med: mb, rel: mb.rel };
        }
        const Vf = V + Va;
        // error de medir Va + error de preparar la intermedia, ambos sobre el aporte de soluto
        const aporte = (Ni - Co) * Va / (Co * Vf);
        const delta = aporte * (mVa.inst.u / Va + prep.rel / 100);
        cands.push({ fuente: f, fi, Ni, Va, mVa, Vm, prep, Vf, delta, est: juzgar(delta) });
      });
    }
  }
  if (!cands.length) return null;
  // exacta primero; que la preparación sea medible; el matraz más chico (menos desperdicio); luego la fuente preferida
  const malo = x => x.prep.med.est === 'bad' ? 1 : 0;
  cands.sort((a, b) => RK[a.est] - RK[b.est] || malo(a) - malo(b) || a.Vm - b.Vm || RK[a.prep.med.est] - RK[b.prep.med.est] || RK[a.mVa.est] - RK[b.mVa.est] || a.fi - b.fi || a.Va - b.Va);
  return cands[0];
}

/* ══════════════════ 8 · NAVEGACIÓN ══════════════════ */

function irA(view) {
  $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.view === view));
  $$('.view').forEach(x => x.classList.toggle('active', x.id === 'view-' + view));
  S.view = view; guardarEstado();
  window.scrollTo(0, 0);
  if (view === 'registros') renderLotes();
  if (view === 'valorar') renderValorar();
  if (view === 'ajustes') renderAjustes();
  if (view === 'reactivos') { renderAvisos(); renderLista(); }
}
$$('.tab').forEach(t => t.addEventListener('click', () => { cerrarDetalle(true); irA(t.dataset.view); }));

/* ══════════════════ 9 · LISTA DE REACTIVOS ══════════════════ */

function renderChips() {
  const el = $('#chips');
  const op = [['todos', 'Todos'], ['valorables', 'Se valoran'], ...Object.entries(CATS).map(([k, c]) => [k, c.n])];
  el.innerHTML = op.map(([k, n]) => `<button class="chip ${S.cat === k ? 'on' : ''}" data-k="${k}">${n}</button>`).join('');
  el.querySelectorAll('.chip').forEach(c => c.onclick = () => { S.cat = c.dataset.k; guardarEstado(); renderChips(); renderLista(); });
}
function pillLote(rid) {
  const ls = LOTES.filter(l => l.rid === rid && !l.descartado).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (!ls.length) return '';
  const e = EST_L[estadoLote(ls[0])];
  return `<span class="pill ${e.c}">${e.t}</span>`;
}
function renderLista() {
  const nq = norm(S.q.trim());
  const lista = R.filter(r =>
    (S.cat === 'todos' || (S.cat === 'valorables' ? !!r.val : r.cat === S.cat)) &&
    (!nq || norm(r.nombre + ' ' + CATS[r.cat].n + ' ' + (r.conc.txt || '') + ' ' + r.items.map(i => i.n).join(' ')).includes(nq)));
  $('#countR').textContent = lista.length;
  $('#rEmpty').hidden = lista.length > 0;
  $('#rlist').innerHTML = lista.map(r => `
    <button class="ritem" data-id="${r.id}">
      <span class="rnum" style="--c:${CATS[r.cat].c}">${r.id}</span>
      <span class="rbody">
        <b>${esc(r.nombre)}</b>
        <span class="rtags"><i style="color:${CATS[r.cat].c}">${CATS[r.cat].n}</i>${r.val ? '<i class="tv">Se valora</i>' : ''}${r.seguridad && /CANCER|cancer|tóxic|corrosiv/i.test(r.seguridad) ? '<i class="ts">Precaución</i>' : ''}</span>
      </span>
      ${pillLote(r.id)}
      <svg class="chev" viewBox="0 0 24 24"><path d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z"/></svg>
    </button>`).join('');
  $$('#rlist .ritem').forEach(b => b.onclick = () => abrirDetalle(+b.dataset.id));
}
$('#q').value = S.q;
$('#q').addEventListener('input', e => { S.q = e.target.value; guardarEstado(); renderLista(); });

/* Tarjeta de avisos: soluciones vencidas o que piden verificación */
function lotesConAviso() {
  return LOTES.filter(l => !l.descartado).map(l => ({ l, e: estadoLote(l) }))
              .filter(x => ['vencido', 'porvencer', 'verificar', 'valorar', 'reval', 'fuera'].includes(x.e));
}
function renderAvisos() {
  const a = lotesConAviso();
  $('#tabRegistros').classList.toggle('avisa', a.length > 0);
  if (!a.length) { $('#avisosLotes').innerHTML = ''; return; }
  const malos = a.filter(x => x.e === 'vencido' || x.e === 'fuera').length;
  $('#avisosLotes').innerHTML = `
    <div class="aviso-respaldo ${malos ? 'bad' : ''}">
      <span class="ar-ico"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2zm0-4h-2V9h2z"/></svg></span>
      <div class="ar-txt"><strong>${a.length} solución${a.length > 1 ? 'es' : ''} requiere${a.length > 1 ? 'n' : ''} atención</strong>
        <span>${a.slice(0, 3).map(x => `${esc(RX(x.l.rid)?.nombre || '')}: ${EST_L[x.e].t.toLowerCase()}`).join(' · ')}${a.length > 3 ? '…' : ''}</span></div>
      <button class="btn primary" id="btnVerAvisos">Ver</button>
    </div>`;
  $('#btnVerAvisos').onclick = () => { S.lFiltro = 'atencion'; irA('registros'); };
}

/* ══════════════════ 10 · DETALLE DE UN REACTIVO ══════════════════ */

let DET = null;   // id del reactivo abierto
let DISP = {};    // cantidades disponibles para el cálculo de volumen máximo

function abrirDetalle(id, push = true) {
  DET = id; DISP = {};
  renderDetalle();
  $('#detalle').classList.add('on');
  $('#detalle').setAttribute('aria-hidden', 'false');
  $('#detalle').scrollTop = 0;
  document.body.classList.add('noscroll');
  if (push) history.pushState({ det: id }, '');
}
function cerrarDetalle(silencioso) {
  if (!$('#detalle').classList.contains('on')) return;
  $('#detalle').classList.remove('on');
  $('#detalle').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('noscroll');
  DET = null;
  if (!silencioso) renderLista();
}
$('#dBack').onclick = () => history.state && history.state.det ? history.back() : cerrarDetalle();
window.addEventListener('popstate', () => { cerrarDetalle(); if (!$('#modal').hidden) cerrarModal(); });

const ICO = {
  calc: '<path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v4h10V4H7zm1 7v2h2v-2H8zm0 4v2h2v-2H8zm4-4v2h2v-2h-2zm0 4v2h2v-2h-2zm4-4v6h2v-6h-2z"/>',
  rx: '<path d="M9 3v6.5L4.2 18a2 2 0 0 0 1.7 3h12.2a2 2 0 0 0 1.7-3L15 9.5V3H9z"/>',
  mat: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  step: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
  lab: '<path d="M6 2h12v2h-2v4l4 9a2 2 0 0 1-1.8 3H5.8A2 2 0 0 1 4 17l4-9V4H6z"/>',
  warn: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2zm0-4h-2V9h2z"/>',
  store: '<path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6z"/>',
  info: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z"/>',
  link: '<path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a3 3 0 1 1 4.2 4.2l-2 2-1.4-1.4 2-2a1 1 0 1 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0zm2.8-2.8a1 1 0 0 1 0 1.4l-3.5 3.5a3 3 0 1 1-4.2-4.2l2-2 1.4 1.4-2 2a1 1 0 1 0 1.4 1.4L12 10.6a1 1 0 0 1 1.4 0z"/>'
};
const ico = k => `<svg class="sico" viewBox="0 0 24 24">${ICO[k]}</svg>`;
const seccion = (t, k, inner, cls = '') => `<div class="card dsec ${cls}"><h3>${ico(k)} ${t}</h3>${inner}</div>`;

function renderDetalle() {
  const r = RX(DET); if (!r) return;
  const V = volActual(r), items = escalar(r, V);
  $('#dTag').textContent = CATS[r.cat].n;
  $('#dTag').style.background = CATS[r.cat].c;
  $('#dTitulo').textContent = `${r.id}. ${r.nombre}`;
  $('#dMeta').innerHTML = `<span>${esc(r.conc.txt || '')}</span><span>Vigencia ${r.vigencia ? r.vigencia + ' días' : '6 meses'}</span>${r.val ? '<span>Verificación cada 2 meses</span>' : ''}`;

  let h = '';
  if (r.seguridad) h += `<div class="note ${/CANCER|cancer|tóxic|corrosiv|inflamable|⚠/i.test(r.seguridad) ? 'danger' : 'warn'}">${ico('warn')}<div><b>Seguridad.</b> ${esc(r.seguridad)}<br><small>EPP según ${INSTRUCTIVO.epp}.</small></div></div>`;

  // dependencias
  if (r.req && r.req.length) {
    h += seccion('Antes de empezar necesitas', 'link', `<div class="deps">${r.req.map(id => {
      const x = RX(id), l = loteVigenteDe(id), e = l ? EST_L[estadoLote(l)] : null;
      return `<button class="dep" data-id="${id}"><span class="rnum sm" style="--c:${CATS[x.cat].c}">${id}</span><b>${esc(x.nombre)}</b>
        ${e ? `<span class="pill ${e.c}">${e.t}</span>` : '<span class="pill nd">SIN REGISTRO</span>'}</button>`;
    }).join('')}</div>`);
  }

  // calculadora de volumen
  const f = V / r.vb;
  const presets = r.uf === 'g' ? [10, 25, 50, 100, 200] : CFG.instr.matraces;
  const esMatraz = r.uf === 'g' || CFG.instr.matraces.includes(V);
  h += seccion('¿Cuánto vas a preparar?', 'calc', r.noEscala
    ? `<p class="under" style="margin-top:0">Esta receta se prepara solo en su volumen original (${txtV(r, r.vb)}). Revisa las observaciones al final.</p>`
    : `<div class="seg wrap" id="dVols">${presets.map(p => `<button type="button" data-v="${p}" class="${p === V ? 'on' : ''}${p === r.vb ? ' base' : ''}">${p}${p === r.vb ? '<small>base</small>' : ''}</button>`).join('')}</div>
       <div class="grid2" style="margin-top:12px">
         <div class="field"><label for="dVolOtro">Otro volumen <b>[${r.uf}]</b></label><input id="dVolOtro" type="text" inputmode="decimal" placeholder="${r.vb}" value="${presets.includes(V) ? '' : fmt(V, V % 1 ? 1 : 0)}"></div>
         <div class="mini fac"><span>Factor sobre la receta</span><b>× ${fmt(f, f < 1 ? 3 : 2)}</b><i>${txtV(r, r.vb)} → ${txtV(r, V)}</i></div>
       </div>
       ${!esMatraz ? `<p class="under warn">No hay matraz aforado de ${txtV(r, V)} en tu lista: el aforo no será exacto. Usa un volumen de matraz si la concentración es crítica.</p>` : ''}
       <details class="ajustes" id="dPoco" ${Object.keys(DISP).length ? 'open' : ''}>
         <summary>Tengo poco de algún reactivo</summary>
         <p class="under">Escribe cuánto te queda y la app calcula el volumen máximo que puedes preparar <b>sin cambiar la concentración</b>.</p>
         ${r.items.map((it, i) => (it.t === 's' || it.t === 'l') && !it.fijo ? `<div class="field"><label for="disp${i}">${esc(it.n)} disponible <b>[${it.u}]</b></label><input id="disp${i}" data-i="${i}" class="disp" type="text" inputmode="decimal" value="${DISP[i] ?? ''}" placeholder="—"></div>` : '').join('')}
         <div id="dVmax"></div>
       </details>`);

  // cantidades
  h += seccion('Reactivos y cantidades', 'rx', `<div class="qtab">${items.map((it, i) => `
    <div class="qrow ${it.t}">
      <div class="qn">${esc(it.n)}${it.fijo ? ' <i class="tag">madre, no cambia</i>' : ''}</div>
      <div class="qq">${esc(it.txt)}</div>
      ${it.inst !== undefined ? `<div class="qi">${it.inst ? esc(it.inst.n) : '—'}${it.nota ? ` · <span class="${it.est}">${esc(it.nota)}</span>` : ''}
        <span class="pill ${it.est}">${isFinite(it.rel) ? 'error ' + fmt(it.rel, it.rel < 0.1 ? 3 : 2) + ' %' : 'no medible'}</span></div>` : ''}
    </div>`).join('')}</div>
    <p class="under">El error es la incertidumbre del instrumento sobre la cantidad medida. Verde ≤ ${fmt(CFG.crit.precOk, 1)} % · ámbar ≤ ${fmt(CFG.crit.precMax, 1)} %.</p>`);

  h += seccion('Materiales y equipos', 'mat', `<ul class="mat">${r.materiales.map(m => `<li>${esc(m).replace(/\{V\}/g, fmt(V, V % 1 ? 1 : 0))}</li>`).join('')}</ul>`);

  // pasos
  const hechos = PASOS[r.id] || [];
  const pct = Math.round(hechos.length / r.pasos.length * 100);
  h += `<div class="card dsec"><h3>${ico('step')} Pasos de preparación</h3>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="prow"><span>${hechos.length} de ${r.pasos.length} pasos</span><button class="mini-btn" id="dReset">Reiniciar</button></div>
    ${r.pasos.map((p, i) => `<div class="paso ${hechos.includes(i) ? 'done' : ''}" data-i="${i}">
      <span class="pbox"><svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg></span>
      <span class="pn">${i + 1}</span><span class="pt">${rellenar(p, items, r, V)}</span></div>`).join('')}</div>`;

  if (r.estand) h += seccion('Estandarización', 'lab', `<ol class="est">${r.estand.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    ${r.val ? `<div class="formula">${esc(r.val.formula)}${r.val.tipo !== 'abs' ? '<br>fc = N real / N ideal' : ''}</div>
    <button class="btn full" id="dIrValorar" style="margin-top:12px">Valorar y corregir esta solución</button>` : ''}`);

  h += seccion('Almacenamiento y vigencia', 'store', `<p class="pl">${esc(r.almacen || '—')}</p>
    <p class="under">Vigencia ${r.vigencia ? r.vigencia + ' días' : '6 meses'}${r.val ? ', con verificación cada 2 meses' : ''}. Observe signos de deterioro: decoloración, precipitados o cambio de concentración. Registrar en ${INSTRUCTIVO.registro}. Residuos según ${INSTRUCTIVO.ambiental}.</p>`);

  if (r.obs) h += seccion('Observaciones al instructivo', 'info', `<ul class="mat obs">${r.obs.map(o => `<li>${esc(o)}</li>`).join('')}</ul>`, 'obs');

  h += `<div class="actions sticky">
    <button class="btn primary" id="dRegistrar">Registrar preparación</button>
    ${r.val ? '<button class="btn" id="dValorar">Valorar</button>' : ''}
  </div>`;

  $('#dBody').innerHTML = h;
  enlazarDetalle(r);
}

function enlazarDetalle(r) {
  const setVol = v => { S.vol[r.id] = v; guardarEstado(); const st = $('#detalle').scrollTop; renderDetalle(); $('#detalle').scrollTop = st; };
  $$('#dVols button').forEach(b => b.onclick = () => setVol(+b.dataset.v));
  const otro = $('#dVolOtro');
  if (otro) otro.addEventListener('change', () => { const v = num(otro.value); if (v > 0) setVol(v); else { delete S.vol[r.id]; setVol(r.vb); } });
  $$('.disp').forEach(inp => inp.addEventListener('input', () => { DISP[inp.dataset.i] = inp.value; pintarVmax(r); }));
  pintarVmax(r);
  $$('.dep').forEach(b => b.onclick = () => abrirDetalle(+b.dataset.id, false));
  $$('.paso').forEach(p => p.onclick = () => {
    const i = +p.dataset.i; let a = PASOS[r.id] || [];
    a = a.includes(i) ? a.filter(x => x !== i) : a.concat(i);
    PASOS[r.id] = a; LS.escribir(K.pasos, PASOS);
    p.classList.toggle('done');
    const pct = Math.round(a.length / r.pasos.length * 100);
    $('#dBody .bar i').style.width = pct + '%';
    $('#dBody .prow span').textContent = `${a.length} de ${r.pasos.length} pasos`;
  });
  $('#dReset').onclick = () => { PASOS[r.id] = []; LS.escribir(K.pasos, PASOS); renderDetalle(); };
  $('#dRegistrar').onclick = () => modalRegistro(r);
  const iv = () => { S.vR = r.id; S.vLote = (loteVigenteDe(r.id) || {}).id || ''; guardarEstado(); history.state && history.state.det ? history.back() : cerrarDetalle(); irA('valorar'); };
  if ($('#dValorar')) $('#dValorar').onclick = iv;
  if ($('#dIrValorar')) $('#dIrValorar').onclick = iv;
}

function pintarVmax(r) {
  const el = $('#dVmax'); if (!el) return;
  const res = volumenMaximo(r, DISP);
  if (!res) { el.innerHTML = ''; return; }
  const mats = r.uf === 'g' ? [] : CFG.instr.matraces.filter(m => m <= res.v + 1e-9);
  const sug = r.uf === 'g' ? Math.floor(res.v) : (mats.length ? Math.max(...mats) : null);
  el.innerHTML = `<div class="veredicto ${res.v >= volActual(r) ? 'ok' : 'warn'}"><span class="v-dot"></span><div class="v-txt">
    <strong>Alcanza para ${fmt(res.v, res.v < 100 ? 1 : 0)} ${r.uf} como máximo</strong>
    <span>Limita: ${esc(res.cual)}. ${sug ? `Matraz sugerido: <b>${sug} ${r.uf}</b>, con la misma concentración.` : 'No alcanza para el matraz más pequeño de la lista.'}</span></div></div>
    ${sug ? `<button class="btn full" id="dUsarVmax" style="margin-top:10px">Preparar ${sug} ${r.uf}</button>` : ''}`;
  if ($('#dUsarVmax')) $('#dUsarVmax').onclick = () => { S.vol[r.id] = sug; guardarEstado(); renderDetalle(); };
}

/* ══════════════════ 11 · REGISTRO DE UNA PREPARACIÓN ══════════════════ */

function abrirModal(html) {
  $('#modalBody').innerHTML = html;
  $('#modal').hidden = false;
  document.body.classList.add('noscroll');
}
function cerrarModal() { $('#modal').hidden = true; if (!$('#detalle').classList.contains('on')) document.body.classList.remove('noscroll'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') cerrarModal(); });

function modalRegistro(r, lote) {
  const V = lote ? lote.vol : volActual(r), items = escalar(r, V);
  const medibles = items.map((it, i) => ({ it, i })).filter(x => x.it.t === 's' || x.it.t === 'l');
  abrirModal(`
    <h3>${lote ? 'Editar' : 'Registrar'} preparación</h3>
    <p class="msub">${esc(r.nombre)} · ${INSTRUCTIVO.registro}</p>
    <div class="grid2">
      <div class="field"><label for="mFecha">Fecha y hora</label><input id="mFecha" type="datetime-local" value="${lote ? lote.fecha.slice(0, 16) : ahoraLocal()}"></div>
      <div class="field"><label for="mVol">Volumen preparado <b>[${r.uf}]</b></label><input id="mVol" type="text" inputmode="decimal" value="${fmt(V, V % 1 ? 1 : 0)}"></div>
    </div>
    <div class="field"><label for="mAnalista">Analista</label><input id="mAnalista" type="text" autocomplete="off" value="${esc(lote ? lote.analista : CFG.analista)}" placeholder="Nombre"></div>
    ${medibles.length ? `<label style="margin-top:4px">Cantidades realmente pesadas / medidas</label>
      ${medibles.map(({ it, i }) => `<div class="field qreal"><span>${esc(it.n)}<small>Receta: ${esc(it.txt)}</small></span>
        <input data-i="${i}" class="mReal" type="text" inputmode="decimal" value="${lote && lote.real && lote.real[i] != null ? fmt(lote.real[i], 4).replace(/0+$/, '').replace(/,$/, '') : ''}" placeholder="${fmt(it.qs, it.u === 'g' ? 4 : 2)}"><b>${it.u}</b></div>`).join('')}
      <div id="mDesv" class="under"></div>` : ''}
    <div class="field"><label for="mInsumo">Lote / marca del reactivo de partida</label><input id="mInsumo" type="text" autocomplete="off" value="${esc(lote ? lote.insumo || '' : '')}" placeholder="Ej. Merck lote K123 · vence 2027"></div>
    <div class="field"><label for="mObs">Observaciones</label><input id="mObs" type="text" autocomplete="off" value="${esc(lote ? lote.obs || '' : '')}" placeholder="Opcional"></div>
    <div class="actions">
      <button class="btn ghost" id="mCancel">Cancelar</button>
      <button class="btn primary" id="mGuardar">${lote ? 'Guardar cambios' : 'Registrar'}</button>
    </div>`);

  // concentración real estimada a partir de lo pesado (solo el reactivo principal)
  const desv = () => {
    const el = $('#mDesv'); if (!el) return;
    const Vr = num($('#mVol').value) || V, it0 = medibles[0];
    const real = num($(`.mReal[data-i="${it0.i}"]`).value);
    if (!(real > 0)) { el.innerHTML = ''; return; }
    const plan = it0.it.fijo ? it0.it.q : it0.it.q * Vr / r.vb;
    const d = (real / plan - 1) * 100;
    el.className = 'under ' + (Math.abs(d) <= CFG.crit.precOk ? 'ok' : Math.abs(d) <= CFG.crit.precMax * 2 ? 'warn' : 'bad');
    el.innerHTML = `${esc(it0.it.n)}: ${d >= 0 ? '+' : ''}${fmt(d, 2)} % respecto a la receta para ${fmt(Vr, 0)} ${r.uf}.${r.val ? ' La valoración dará la concentración real.' : ''}`;
  };
  $$('.mReal').forEach(x => x.addEventListener('input', desv)); $('#mVol').addEventListener('input', desv); desv();
  $('#mCancel').onclick = cerrarModal;
  $('#mGuardar').onclick = () => {
    const fecha = $('#mFecha').value || ahoraLocal(), vol = num($('#mVol').value);
    if (!(vol > 0)) return toast('Escribe el volumen preparado', 'bad');
    const real = {}; $$('.mReal').forEach(x => { const v = num(x.value); if (v > 0) real[x.dataset.i] = v; });
    const analista = $('#mAnalista').value.trim();
    if (analista) { CFG.analista = analista; guardarCfg(); }
    if (lote) {
      Object.assign(lote, { fecha, vol, real, analista, insumo: $('#mInsumo').value.trim(), obs: $('#mObs').value.trim() });
    } else {
      lote = { id: nuevoId(), codigo: codigoLote(r.id, fecha), rid: r.id, nombre: r.nombre, conc: r.conc.txt, uf: r.uf,
               fecha, vol, real, analista, insumo: $('#mInsumo').value.trim(), obs: $('#mObs').value.trim(), val: [], corr: [] };
      LOTES.push(lote);
    }
    guardarLotes(); cerrarModal();
    PASOS[r.id] = []; LS.escribir(K.pasos, PASOS);
    toast(`Lote ${lote.codigo} registrado`, 'ok');
    if ($('#detalle').classList.contains('on')) renderDetalle();
    renderAvisos();
    if (r.val && !ultimaVal(lote)) {
      abrirModal(`<h3>Siguiente paso: estandarizar</h3><p class="msub">${esc(r.nombre)} · lote ${lote.codigo}</p>
        <p class="pl">Esta solución se estandariza antes de usarse. ¿Vas a valorarla ahora?</p>
        <div class="actions"><button class="btn ghost" id="mLuego">Luego</button><button class="btn primary" id="mAhora">Valorar ahora</button></div>`);
      $('#mLuego').onclick = cerrarModal;
      $('#mAhora').onclick = () => { cerrarModal(); S.vR = r.id; S.vLote = lote.id; guardarEstado();
        if (history.state && history.state.det) history.back(); cerrarDetalle(true); irA('valorar'); };
    }
  };
}

/* ══════════════════ 12 · VALORAR Y CORREGIR ══════════════════ */

const VALORABLES = R.filter(r => r.val);
let VD = { reps: [{}, {}, {}], pur: '', alic: '', nt: '', modo: 'instructivo' };
let ULT = null;   // último resultado calculado
let ULT_GUARDADO = '';

function rVal() { return RX(S.vR) && RX(S.vR).val ? RX(S.vR) : VALORABLES[0]; }

function renderValorar() {
  const sel = $('#vReactivo');
  if (!sel.options.length) sel.innerHTML = VALORABLES.map(r => `<option value="${r.id}">${r.id}. ${esc(r.nombre)}</option>`).join('');
  const r = rVal(); S.vR = r.id; sel.value = r.id;
  // lotes
  const ls = LOTES.filter(l => l.rid === r.id && !l.descartado).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  $('#vLote').innerHTML = `<option value="">Sin lote registrado (solo cálculo)</option>` +
    ls.map(l => `<option value="${l.id}">${l.codigo} · ${fFecha(l.fecha)} · ${fmt(l.vol, 0)} ${l.uf} · ${EST_L[estadoLote(l)].t}</option>`).join('');
  if (!ls.find(l => l.id === S.vLote)) S.vLote = ls[0] ? ls[0].id : '';
  $('#vLote').value = S.vLote;
  const lote = LOTES.find(l => l.id === S.vLote);
  $('#vLoteInfo').innerHTML = lote ? (() => { const u = ultimaVal(lote); return `Preparado ${fFechaHora(lote.fecha)} por ${esc(lote.analista || '—')}.` +
      (u ? ` Última valoración: ${fmtN(u.N)} (fc ${fmt(u.fc, 4)}) el ${fFecha(u.fecha)}.` : ' Aún sin valorar.') + (lote.reval ? ' <b class="warn">Se corrigió: falta re-estandarizar.</b>' : ''); })()
    : 'Puedes calcular sin lote; para guardar en el historial, registra la preparación desde el reactivo.';
  $('#vTipo').value = lote ? (lote.reval ? 'post' : ultimaVal(lote) ? 'verificacion' : 'estandarizacion') : 'estandarizacion';
  if (!$('#vFecha').value) $('#vFecha').value = ahoraLocal();
  if (!$('#vAnalista').value) $('#vAnalista').value = CFG.analista;
  if (lote && !$('#cVol').dataset.manual) $('#cVol').value = fmt(lote.vol, 0);
  renderFormValorar(r);
}

function renderFormValorar(r) {
  const v = r.val;
  $('#vFormula').textContent = v.formula;
  VD.modo = S.modo[r.id] || 'instructivo';
  // modo (solo HCl: pesada directa)
  $('#vModo').innerHTML = v.directo ? `<div class="field"><label>Forma de valorar</label><div class="seg" id="vModoSeg">
      <button type="button" data-m="instructivo" class="${VD.modo === 'instructivo' ? 'on' : ''}">Alícuota del patrón (instructivo)</button>
      <button type="button" data-m="directo" class="${VD.modo === 'directo' ? 'on' : ''}">Pesada directa</button></div>
      <p class="under">${VD.modo === 'directo' ? 'Se pesa el Na₂CO₃ directo en el erlenmeyer: N = m × pureza × 1000 / (52.995 × V). Útil para normalidades altas como 6N.' : 'Na₂CO₃ disuelto en 1000 ml y se titula una alícuota, como indica el instructivo.'}</p></div>` : '';
  $$('#vModoSeg button').forEach(b => b.onclick = () => { S.modo[r.id] = b.dataset.m; guardarEstado(); renderFormValorar(r); });

  // campos comunes
  let com = '';
  if (v.tipo === 'patron') {
    com += `<div class="field"><label for="vPur">Pureza del patrón <b>[%]</b></label><input id="vPur" type="text" inputmode="decimal" value="${esc(VD.pur)}" placeholder="${v.purDef}"></div>`;
    if (v.alicBase && VD.modo !== 'directo') com += `<div class="field"><label for="vAlic">Alícuota titulada <b>[ml]</b></label><input id="vAlic" type="text" inputmode="decimal" value="${esc(VD.alic)}" placeholder="${v.alicBase}"></div>`;
  } else if (v.tipo === 'contra') {
    const nr = nRealDe(v.refTit);
    if (!VD.nt && nr) VD.nt = fmt(nr.N, 5);
    com += `<div class="field"><label for="vNt">N real del ${esc(v.titulante)}</label><input id="vNt" type="text" inputmode="decimal" value="${esc(VD.nt)}" placeholder="${v.ntDef}"></div>
            <div class="field"><label for="vAlic">Ácido titulado <b>[ml]</b></label><input id="vAlic" type="text" inputmode="decimal" value="${esc(VD.alic)}" placeholder="${v.alicDef}"></div>`;
    com = com + `<p class="under span2">${nr ? `Tomado del lote ${nr.lote.codigo} (valorado).` : `No hay un ${esc(v.titulante)} valorado y vigente: escribe su normalidad real.`}</p>`;
  }
  $('#vComunes').innerHTML = com;
  $('#vComunes').hidden = !com;
  ['vPur', 'vAlic', 'vNt'].forEach(id => { const el = $('#' + id); if (el) el.oninput = () => { VD[{ vPur: 'pur', vAlic: 'alic', vNt: 'nt' }[id]] = el.value; calcValorar(); }; });

  // réplicas
  $$('#vNRep button').forEach(b => { b.classList.toggle('on', +b.dataset.n === S.nrep); b.onclick = () => { S.nrep = +b.dataset.n; guardarEstado(); renderFormValorar(r); }; });
  const lM = v.tipo === 'patron' ? (VD.modo === 'directo' ? 'Na₂CO₃ pesado en el erlenmeyer' : v.lblM) : null;
  const lV = v.tipo === 'abs' ? 'Absorbancia' : v.tipo === 'contra' ? `${v.titulante} gastado` : v.lblV;
  $('#vReplicas').innerHTML = Array.from({ length: S.nrep }, (_, i) => `
    <div class="rep"><span class="rep-n">${i + 1}</span>
      ${lM ? `<div class="field"><label for="vm${i}">${esc(lM)} <b>[g]</b></label><input id="vm${i}" data-i="${i}" data-k="m" class="vin" type="text" inputmode="decimal" value="${esc(VD.reps[i].m || '')}" placeholder="${v.mDef ?? '0,8000'}"></div>` : ''}
      <div class="field"><label for="vv${i}">${esc(lV)} <b>${v.tipo === 'abs' ? '' : '[ml]'}</b></label><input id="vv${i}" data-i="${i}" data-k="v" class="vin big" type="text" inputmode="decimal" value="${esc(VD.reps[i].v || '')}" placeholder="—"></div>
      <div class="rep-esp" id="vesp${i}"></div>
    </div>`).join('');
  $$('.vin').forEach(x => x.oninput = () => { VD.reps[x.dataset.i][x.dataset.k] = x.value; calcValorar(); });

  // sugerencia de masa (NaOH) o rango (abs)
  let sug = '';
  if (v.vObj) {
    const P = (num(VD.pur) || 100) / 100, m = r.conc.v * v.vObj * v.pm / (1000 * P);
    sug = `Para gastar ≈${v.vObj} ml de ${esc(r.nombre.replace(/.*\(NaOH\) /, 'NaOH '))} pese ≈<b>${fmt(m, 4)} g</b> de biftalato (instructivo: gasto de 38 a 42 ml para 0.1N).`;
  }
  if (v.tipo === 'abs') sug = `Rango del instructivo: <b>${fmt(v.min, 3)} – ${fmt(v.max, 3)}</b> unidades de absorbancia. El factor se calcula sobre ${fmt(v.obj, 3)}.`;
  $('#vSugerencia').innerHTML = sug;
  $('#vFcU').textContent = v.tipo === 'abs' ? 'Abs / ' + fmt(v.obj, 3) : r.conc.u + ' real / ' + r.conc.u + ' ideal';
  calcValorar();
}

function calcValorar() {
  const r = rVal(), v = r.val;
  const d = Object.assign({}, VD, { reps: VD.reps.slice(0, S.nrep) });
  // gasto esperado por réplica
  for (let i = 0; i < S.nrep; i++) {
    const el = $('#vesp' + i); if (!el) continue;
    const m = num(VD.reps[i].m), e = gastoEsperado(r, d, m);
    el.innerHTML = e != null && isFinite(e) ? `Con fc = 1 se esperan <b>${fmt(e, e < 1 ? 3 : 2)} ml</b>${e < 1 ? ' <span class="bad">— muy poco para medir bien</span>' : ''}` : '';
  }
  const res = calcularValoracion(r, d);
  ULT = res;
  const lims = v.tipo === 'abs' ? [v.min / v.obj, v.max / v.obj] : [CFG.crit.fcMin, CFG.crit.fcMax];
  $('#vFcMin').textContent = fmt(lims[0], 3); $('#vFcMax').textContent = fmt(lims[1], 3);
  $('#vGMin').textContent = fmt(lims[0], 3); $('#vGMax').textContent = fmt(lims[1], 3);
  $('#vResLbl').textContent = v.tipo === 'abs' ? 'Absorbancia promedio' : (r.conc.u === 'M' ? 'Concentración real (M)' : 'Normalidad real');
  if (!res) {
    $('#vRes').className = 'res-card'; $('#vResN').textContent = '—'; $('#vResExtra').textContent = 'Ingresa los datos de la titulación';
    $('#vFc').textContent = '—'; $('#vVer').hidden = true; $('#vMark').style.left = '50%';
    if (!$('#cConc').dataset.manual) $('#cConc').value = '';
    renderCorreccion(); return;
  }
  $('#vRes').className = 'res-card ' + res.est;
  $('#vResN').textContent = v.tipo === 'abs' ? fmt(res.N, 4) : fmtN(res.N) + ' ' + r.conc.u;
  $('#vResExtra').textContent = (res.rep.length > 1 ? `Promedio de ${res.rep.length} réplicas · dispersión ${fmt(res.disp, 2)} %` : '1 réplica') + ` · ideal ${v.tipo === 'abs' ? fmt(v.obj, 3) : r.conc.txt}`;
  $('#vFc').textContent = fmt(res.fc, 4);
  const span = lims[1] - lims[0], lo = lims[0] - span / 2, hi = lims[1] + span / 2;
  $('#vMark').style.left = Math.max(0, Math.min(100, (res.fc - lo) / (hi - lo) * 100)) + '%';
  const ver = $('#vVer'); ver.hidden = false; ver.className = 'veredicto ' + res.est;
  const MSG = { ok: 'DENTRO DE ESPECIFICACIÓN', warn: 'DENTRO, PERO AL LÍMITE', bad: 'FUERA DE ESPECIFICACIÓN' };
  $('#vVerMsg').textContent = MSG[res.est];
  let det = res.est === 'bad' ? 'Corrige la solución (paso 4) o prepárala de nuevo.' : `Use el factor fc = ${fmt(res.fc, 4)} en los cálculos de los análisis.`;
  if (res.disp != null && res.disp > CFG.crit.replicas) det += ` Réplicas con ${fmt(res.disp, 2)} % de diferencia: revise y repita una titulación.`;
  $('#vVerDet').textContent = det;
  if (!$('#cConc').dataset.manual) $('#cConc').value = v.tipo === 'abs' ? fmt(res.N, 4) : fmt(res.N, 5);
  renderCorreccion();
}

['#cVol', '#cConc'].forEach(s => $(s).addEventListener('input', e => { e.target.dataset.manual = e.target.value ? '1' : ''; renderCorreccion(); }));
$('#vReactivo').addEventListener('change', e => {
  S.vR = +e.target.value; S.vLote = ''; guardarEstado();
  VD = { reps: [{}, {}, {}], pur: '', alic: '', nt: '', modo: 'instructivo' };
  $('#cVol').dataset.manual = ''; $('#cConc').dataset.manual = ''; $('#cVol').value = '';
  renderValorar();
});
$('#vLote').addEventListener('change', e => { S.vLote = e.target.value; guardarEstado(); $('#cVol').dataset.manual = ''; renderValorar(); });

let CORR = null;
function renderCorreccion() {
  const r = rVal(), V = num($('#cVol').value), C = num($('#cConc').value);
  const out = $('#cOut');
  $('#cConcNota').textContent = r.val.tipo === 'abs' ? 'Absorbancia medida del estándar (se llena con el paso 3).' : `Concentración real en ${r.conc.u} (se llena con el paso 3; puedes escribirla).`;
  if (!(V > 0) || !(C > 0)) { out.innerHTML = '<p class="under">Escribe el volumen que tienes y la concentración real para ver cómo corregir.</p>'; CORR = null; return; }
  const Co = r.val.tipo === 'abs' ? r.val.obj : r.conc.v, fc = C / Co;
  const lims = r.val.tipo === 'abs' ? [r.val.min / r.val.obj, r.val.max / r.val.obj] : [CFG.crit.fcMin, CFG.crit.fcMax];
  const dentro = fc >= lims[0] && fc <= lims[1];
  const res = calcularCorreccion(r, V, C);
  CORR = { r, V, C, res };
  let h = `<div class="veredicto ${dentro ? 'ok' : 'bad'}"><span class="v-dot"></span><div class="v-txt">
    <strong>${dentro ? 'No necesita corrección' : 'Necesita corrección'}</strong>
    <span>${dentro ? `fc = ${fmt(fc, 4)} está dentro de ${fmt(lims[0], 3)}–${fmt(lims[1], 3)}. Lo correcto es <b>usar el factor</b>; corregir solo agrega error. Si igual quieres llevarla a 1,000, abajo tienes cómo.`
      : `fc = ${fmt(fc, 4)}: la solución está ${fc > 1 ? 'más concentrada' : 'más diluida'} de lo ideal (${fmt((fc - 1) * 100, 2)} %).`}</span></div></div>`;
  if (res.accion === 'nada') { out.innerHTML = h; return; }

  h += `<p class="ctit">${res.accion === 'diluir' ? 'Diluir con agua' : 'Agregar soluto'} · ${fmt(V, 0)} ml de ${fmtN(C)} → ${fmtN(Co)} ${r.val.tipo === 'abs' ? 'Abs' : r.conc.u}</p>`;
  h += res.opciones.map((o, k) => tarjetaOpcion(o, k, r)).join('');
  if (!res.opciones.length) h += '<p class="under bad">No hay un reactivo de corrección más concentrado que la solución. Prepárala de nuevo.</p>';
  if (res.intermedia) h += tarjetaIntermedia(res.intermedia, r);
  h += `<div class="nota-i"><b>Después de corregir:</b> mezcle bien, deje reposar a temperatura ambiente y <b>vuelva a estandarizar</b>. La corrección supone volúmenes aditivos, lo que vale para ajustes pequeños. Si el ajuste supera el 10 %, conviene preparar de nuevo.</div>`;
  out.innerHTML = h;
  $$('.btnAplicar').forEach(b => b.onclick = () => aplicarCorreccion(b.dataset.k));
}

function tarjetaOpcion(o, k, r) {
  const d = o.u === 'g' ? (o.med.inst ? decsD(o.med.inst.d) : 4) : (o.med.inst ? decsU(o.med.inst.u) : 3);
  const pctD = o.delta * 100;
  return `<div class="opc ${o.est}${o.rec ? ' rec' : ''}">
    ${o.rec ? '<span class="rec-b">Recomendado</span>' : ''}
    <div class="opc-top"><div><em>${{ agua: 'Diluir con', conc: 'Agregar concentrado', sol: 'Agregar solución', solido: 'Agregar sólido' }[o.tipo]}</em>
      <strong>${esc(o.n)}</strong></div><span class="pill ${o.est}">${{ ok: 'EXACTA', warn: 'ACEPTABLE', bad: 'NO CONFIABLE' }[o.est]}</span></div>
    <div class="opc-cant">${fmt(o.cant, d)} <small>${o.u}</small></div>
    <div class="opc-det">
      <span>${o.med.inst ? 'Con ' + esc(o.med.inst.n) : '<b class="bad">' + esc(o.med.nota || 'No medible') + '</b>'}${o.med.inst && o.med.nota ? ' · ' + esc(o.med.nota) : ''}</span>
      <span>Volumen final ≈ ${fmt(o.Vf, o.Vf < 100 ? 1 : 0)} ml</span>
      <span>El error al medir mueve el fc en ±${isFinite(pctD) ? fmt(pctD, pctD < 0.01 ? 4 : 3) : '∞'} %</span>
      ${o.fuente ? `<span class="src">${esc(o.fuente)}</span>` : ''}
    </div>
    ${o.est === 'bad' ? `<p class="under bad">Es tan poco que el error de medirlo cambiaría la concentración más que la corrección. Usa la solución intermedia de abajo.</p>` : ''}
    ${o.med.inst ? `<button class="btn btnAplicar" data-k="${k}">Registrar que apliqué esta corrección</button>` : ''}
  </div>`;
}

function tarjetaIntermedia(m, r) {
  const dp = m.prep.u === 'g' ? decsD(m.prep.med.inst.d) : decsU(m.prep.med.inst.u);
  const pctD = m.delta * 100;
  return `<div class="opc inter ${m.est}">
    <span class="rec-b">Para poca cantidad</span>
    <div class="opc-top"><div><em>Solución intermedia de corrección</em><strong>Prepara primero una solución más diluida</strong></div>
      <span class="pill ${m.est}">${{ ok: 'EXACTA', warn: 'ACEPTABLE', bad: 'REVISAR' }[m.est]}</span></div>
    <ol class="pasos-int">
      <li>${m.prep.u === 'g' ? 'Pese' : 'Mida'} <b>${fmt(m.prep.cant, dp)} ${m.prep.u}</b> de ${esc(m.fuente.n)} (${esc(m.prep.med.inst.n)}) y afore a <b>${m.Vm} ml</b>. Queda a ${fmtN(m.Ni)} ${r.val.tipo === 'abs' ? 'Abs-eq' : r.conc.u}.</li>
      <li>Agregue <b>${fmt(m.Va, decsU(m.mVa.inst.u))} ml</b> de esa solución (${esc(m.mVa.inst.n)}) a la solución que corrige.</li>
      <li>Mezcle, deje reposar y vuelva a estandarizar.</li>
    </ol>
    <div class="opc-det"><span>Volumen final ≈ ${fmt(m.Vf, m.Vf < 100 ? 1 : 0)} ml</span>
      <span>El error total mueve el fc en ±${fmt(pctD, pctD < 0.01 ? 4 : 3)} %</span>
      <span class="src">Se mide un volumen cómodo en lugar de una gota de concentrado. Así la concentración final no depende del error de medir algo muy pequeño.</span></div>
    <button class="btn btnAplicar" data-k="inter">Registrar que apliqué esta corrección</button>
  </div>`;
}

function aplicarCorreccion(k) {
  if (!CORR) return;
  const lote = LOTES.find(l => l.id === S.vLote);
  if (!lote) return toast('Elige un lote registrado para guardar la corrección', 'bad');
  const { res, V, C, r } = CORR;
  let txt, Vf;
  if (k === 'inter') { const m = res.intermedia; Vf = m.Vf;
    txt = `Solución intermedia ${fmtN(m.Ni)} (${fmt(m.prep.cant, 4)} ${m.prep.u} de ${m.fuente.n} en ${m.Vm} ml) · agregado ${fmt(m.Va, 2)} ml`; }
  else { const o = res.opciones[+k]; Vf = o.Vf; txt = `${o.n}: ${fmt(o.cant, o.u === 'g' ? 4 : 3)} ${o.u}`; }
  lote.corr = lote.corr || [];
  lote.corr.push({ fecha: $('#vFecha').value || ahoraLocal(), V, C, Co: res.Co, detalle: txt, Vf, analista: $('#vAnalista').value.trim() });
  lote.vol = Math.round(Vf * 10) / 10;
  lote.reval = true;
  guardarLotes();
  toast('Corrección registrada. Falta re-estandarizar', 'ok');
  $('#cVol').dataset.manual = ''; $('#cConc').dataset.manual = '';
  VD.reps = [{}, {}, {}];
  renderValorar(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#vGuardar').addEventListener('click', () => {
  const r = rVal();
  if (!ULT) return toast('Completa los datos de la titulación', 'bad');
  if (ULT_GUARDADO === S.vLote + '|' + ULT.N) return toast('Esta valoración ya está guardada', '');
  let lote = LOTES.find(l => l.id === S.vLote);
  if (!lote) {
    const fecha = $('#vFecha').value || ahoraLocal(), vol = num($('#cVol').value) || r.vb;
    lote = { id: nuevoId(), codigo: codigoLote(r.id, fecha), rid: r.id, nombre: r.nombre, conc: r.conc.txt, uf: r.uf,
             fecha, vol, real: {}, analista: $('#vAnalista').value.trim(), insumo: '', obs: 'Creado desde Valorar', val: [], corr: [] };
    LOTES.push(lote); S.vLote = lote.id;
  }
  const analista = $('#vAnalista').value.trim();
  if (analista) { CFG.analista = analista; guardarCfg(); }
  lote.val.push({ fecha: $('#vFecha').value || ahoraLocal(), tipo: $('#vTipo').value, N: ULT.N, fc: ULT.fc, est: ULT.est,
                  rep: ULT.rep, disp: ULT.disp, modo: VD.modo, datos: { pur: VD.pur, alic: VD.alic, nt: VD.nt, reps: VD.reps.slice(0, S.nrep) },
                  analista, obs: $('#vObs').value.trim() });
  lote.reval = false;
  guardarLotes(); guardarEstado();
  ULT_GUARDADO = lote.id + '|' + ULT.N;
  toast(`Valoración guardada en ${lote.codigo}`, 'ok');
  $('#vObs').value = '';
  renderValorar(); renderAvisos();
});

/* ══════════════════ 13 · REGISTROS ══════════════════ */

const FILTROS_L = [['activos', 'Activos'], ['atencion', 'Requieren atención'], ['vencido', 'Vencidos'], ['todos', 'Todos']];
function renderLotes() {
  $('#lChips').innerHTML = FILTROS_L.map(([k, n]) => `<button class="chip ${S.lFiltro === k ? 'on' : ''}" data-k="${k}">${n}</button>`).join('');
  $$('#lChips .chip').forEach(c => c.onclick = () => { S.lFiltro = c.dataset.k; guardarEstado(); renderLotes(); });
  const nq = norm($('#lq').value.trim());
  const lista = LOTES.map(l => ({ l, e: estadoLote(l) })).filter(({ l, e }) =>
    (S.lFiltro === 'todos' || (S.lFiltro === 'activos' ? !['desc', 'vencido'].includes(e) : S.lFiltro === 'vencido' ? e === 'vencido'
      : ['vencido', 'porvencer', 'verificar', 'valorar', 'reval', 'fuera'].includes(e))) &&
    (!nq || norm(`${l.nombre} ${l.codigo} ${l.analista}`).includes(nq)))
    .sort((a, b) => new Date(b.l.fecha) - new Date(a.l.fecha));
  $('#countL').textContent = lista.length;
  $('#lEmpty').hidden = lista.length > 0;
  $('#lLista').innerHTML = lista.map(({ l, e }) => {
    const r = RX(l.rid), u = ultimaVal(l), es = EST_L[e], pv = proxVerif(l);
    return `<div class="item" data-id="${l.id}">
      <div class="item-top"><div><div class="item-t">${esc(l.nombre)}</div>
        <div class="item-s">${l.codigo} · ${fFechaHora(l.fecha)} · ${esc(l.analista || '—')}</div></div>
        <span class="pill ${es.c}">${es.t}</span></div>
      <div class="item-tags">
        <span class="tag">${fmt(l.vol, l.vol % 1 ? 1 : 0)} ${l.uf}</span>
        ${u ? `<span class="tag ${u.est === 'bad' ? 'ba' : u.est === 'warn' ? 'wa' : 'okt'}">${r && r.val.tipo === 'abs' ? 'Abs ' + fmt(u.N, 4) : fmtN(u.N) + ' ' + (r ? r.conc.u : '')} · fc ${fmt(u.fc, 4)}</span>` : ''}
        <span class="tag ${e === 'vencido' ? 'ba' : e === 'porvencer' ? 'wa' : ''}">Vence ${fFecha(venceLote(l))}</span>
        ${pv ? `<span class="tag ${Date.now() > pv ? 'wa' : ''}">Verificar ${fFecha(pv)}</span>` : ''}
        ${(l.corr || []).length ? `<span class="tag agua">${l.corr.length} corrección${l.corr.length > 1 ? 'es' : ''}</span>` : ''}
      </div>
      <details class="hist"><summary>Historial</summary>${historialLote(l)}</details>
      <div class="item-acts">
        ${r && r.val && !l.descartado ? `<button data-a="valorar">Valorar</button>` : ''}
        <button data-a="etiqueta">Etiqueta</button>
        <button data-a="editar">Editar</button>
        <button data-a="${l.descartado ? 'borrar' : 'descartar'}" class="del">${l.descartado ? 'Borrar' : 'Descartar'}</button>
      </div></div>`;
  }).join('');
  $$('#lLista .item-acts button').forEach(b => b.onclick = () => accionLote(b.closest('.item').dataset.id, b.dataset.a));
  renderAvisoRespaldo(); renderAvisos();
}
$('#lq').addEventListener('input', renderLotes);

function historialLote(l) {
  const ev = [{ f: l.fecha, t: `Preparación · ${fmt(l.vol, 0)} ${l.uf}${l.insumo ? ' · ' + esc(l.insumo) : ''}${l.obs ? ' · ' + esc(l.obs) : ''}` }];
  const r = RX(l.rid);
  (l.val || []).forEach(v => ev.push({ f: v.fecha, t: `${{ estandarizacion: 'Estandarización', verificacion: 'Verificación', post: 'Re-estandarización' }[v.tipo] || 'Valoración'} · ${r && r.val.tipo === 'abs' ? 'Abs ' + fmt(v.N, 4) : fmtN(v.N)} · fc ${fmt(v.fc, 4)} · <b class="${v.est}">${{ ok: 'dentro', warn: 'al límite', bad: 'fuera' }[v.est]}</b>${v.analista ? ' · ' + esc(v.analista) : ''}` }));
  (l.corr || []).forEach(c => ev.push({ f: c.fecha, t: `Corrección · ${esc(c.detalle)} · volumen final ≈ ${fmt(c.Vf, 0)} ml` }));
  return `<ul class="hlist">${ev.sort((a, b) => new Date(a.f) - new Date(b.f)).map(e => `<li><span>${fFechaHora(e.f)}</span>${e.t}</li>`).join('')}</ul>`;
}

function accionLote(id, a) {
  const l = LOTES.find(x => x.id === id); if (!l) return;
  if (a === 'valorar') { S.vR = l.rid; S.vLote = l.id; guardarEstado(); $('#cVol').dataset.manual = ''; irA('valorar'); }
  if (a === 'etiqueta') imprimirEtiqueta(l);
  if (a === 'editar') modalRegistro(RX(l.rid), l);
  if (a === 'descartar') { if (confirmar(`¿Descartar el lote ${l.codigo}? Queda en el historial como descartado.`)) { l.descartado = true; guardarLotes(); renderLotes(); } }
  if (a === 'borrar') { if (confirmar(`¿Borrar definitivamente el lote ${l.codigo}?`)) { LOTES = LOTES.filter(x => x.id !== id); guardarLotes(); renderLotes(); } }
}
function confirmar(t) { try { return window.confirm(t); } catch { return true; } }

/* ── Etiqueta del frasco ── */
function imprimirEtiqueta(l) {
  const r = RX(l.rid), u = ultimaVal(l);
  const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Etiqueta ${l.codigo}</title><style>
@page{size:100mm 60mm;margin:0}
body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#111}
.e{width:96mm;height:56mm;margin:2mm;border:1.4mm solid #F40009;border-radius:3mm;padding:3mm 4mm;box-sizing:border-box;display:flex;flex-direction:column}
.h{display:flex;justify-content:space-between;align-items:flex-start;gap:3mm}
.n{font-size:13pt;font-weight:800;line-height:1.1}
.c{font-size:9pt;font-weight:700;color:#F40009;white-space:nowrap}
.g{display:grid;grid-template-columns:1fr 1fr;gap:1mm 4mm;margin-top:2.5mm;font-size:8.5pt}
.g b{display:block;font-size:6.5pt;color:#666;text-transform:uppercase;letter-spacing:.3pt}
.g span{font-weight:700}
.p{margin-top:auto;font-size:6.5pt;color:#555;border-top:.3mm solid #ddd;padding-top:1.2mm}
.fc{font-size:12pt;font-weight:800}
</style></head><body><div class="e">
<div class="h"><div class="n">${esc(l.nombre)}</div><div class="c">${l.codigo}</div></div>
<div class="g">
<div><b>Preparado</b><span>${fFecha(l.fecha)}</span></div>
<div><b>Vence</b><span>${fFecha(venceLote(l))}</span></div>
<div><b>Concentración</b><span>${u && r.val.tipo !== 'abs' ? fmtN(u.N) + ' ' + r.conc.u : esc(l.conc)}</span></div>
<div><b>Factor fc</b><span class="fc">${u ? fmt(u.fc, 4) : '—'}</span></div>
<div><b>Analista</b><span>${esc(l.analista || '—')}</span></div>
<div><b>${proxVerif(l) ? 'Próx. verificación' : 'Volumen'}</b><span>${proxVerif(l) ? fFecha(proxVerif(l)) : fmt(l.vol, 0) + ' ' + l.uf}</span></div>
</div>
<div class="p">${esc(r ? r.almacen : '')} · ${INSTRUCTIVO.codigo} · ${INSTRUCTIVO.registro}</div>
</div><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`;
  abrirVentana(doc);
}
function abrirVentana(doc) {
  const w = window.open('', '_blank');
  if (!w) return toast('Permite las ventanas emergentes para imprimir', 'bad');
  w.document.write(doc); w.document.close();
}

/* ── Exportar ── */
function filasPrep() {
  return LOTES.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map((l, i) => {
    const u = ultimaVal(l), r = RX(l.rid);
    const reales = r ? r.items.map((it, k) => l.real && l.real[k] != null ? `${it.n}: ${l.real[k]} ${it.u}` : null).filter(Boolean).join(' | ') : '';
    return [i + 1, l.codigo, fFecha(l.fecha), new Date(l.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      l.rid, l.nombre, l.conc, l.vol, l.uf, reales, l.insumo || '',
      u ? Number(u.N.toFixed(5)) : '', u ? Number(u.fc.toFixed(4)) : '', u ? { ok: 'DENTRO', warn: 'AL LÍMITE', bad: 'FUERA' }[u.est] : '',
      fFecha(venceLote(l)), proxVerif(l) ? fFecha(proxVerif(l)) : '', EST_L[estadoLote(l)].t, l.analista || '', l.obs || ''];
  });
}
const CAB_PREP = ['N°', 'CÓDIGO', 'FECHA', 'HORA', 'N° REACTIVO', 'REACTIVO', 'CONCENTRACIÓN', 'VOLUMEN', 'UNIDAD', 'CANTIDADES REALES',
  'LOTE INSUMO', 'N / ABS REAL', 'FC', 'RESULTADO', 'VENCE', 'PRÓX. VERIFICACIÓN', 'ESTADO', 'ANALISTA', 'OBSERVACIONES'];
function filasVal() {
  const f = [];
  LOTES.forEach(l => (l.val || []).forEach(v => f.push([l.codigo, l.nombre, fFechaHora(v.fecha),
    { estandarizacion: 'ESTANDARIZACIÓN', verificacion: 'VERIFICACIÓN', post: 'RE-ESTANDARIZACIÓN' }[v.tipo] || v.tipo,
    v.modo === 'directo' ? 'Pesada directa' : '', (v.datos.reps || []).map(x => [x.m, x.v].filter(Boolean).join(' g / ') + (x.v ? '' : '')).join(' | '),
    Number(v.N.toFixed(5)), Number(v.fc.toFixed(4)), v.disp != null ? Number(v.disp.toFixed(2)) : '',
    { ok: 'DENTRO', warn: 'AL LÍMITE', bad: 'FUERA' }[v.est], v.analista || '', v.obs || ''])));
  return f;
}
const CAB_VAL = ['CÓDIGO', 'REACTIVO', 'FECHA', 'TIPO', 'MODO', 'RÉPLICAS (masa g / gasto ml)', 'N / ABS', 'FC', 'DISPERSIÓN %', 'RESULTADO', 'ANALISTA', 'OBSERVACIONES'];
function filasCorr() {
  const f = [];
  LOTES.forEach(l => (l.corr || []).forEach(c => f.push([l.codigo, l.nombre, fFechaHora(c.fecha), c.V, Number(c.C.toFixed(5)), c.Co, c.detalle, Number(c.Vf.toFixed(1)), c.analista || ''])));
  return f;
}
const CAB_CORR = ['CÓDIGO', 'REACTIVO', 'FECHA', 'VOLUMEN INICIAL ml', 'CONC. REAL', 'CONC. OBJETIVO', 'CORRECCIÓN', 'VOLUMEN FINAL ml', 'ANALISTA'];

$('#xXlsx').addEventListener('click', () => {
  if (!LOTES.length) return toast('No hay registros', 'bad');
  if (typeof XLSX === 'undefined') {
    const csv = r => r.map(c => { const s = String(c ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
    const filas = [['PREPARACIÓN DE REACTIVOS — ' + INSTRUCTIVO.registro], [], CAB_PREP, ...filasPrep(), [], ['VALORACIONES'], CAB_VAL, ...filasVal(), [], ['CORRECCIONES'], CAB_CORR, ...filasCorr()];
    descargar(`Reactivos_${hoyISO()}.csv`, '\ufeff' + filas.map(csv).join('\r\n'), 'text/csv;charset=utf-8');
    return toast('Sin internet: se generó un CSV, que Excel abre igual', 'ok');
  }
  const wb = XLSX.utils.book_new();
  const hoja = (t, cab, filas, anchos) => { const ws = XLSX.utils.aoa_to_sheet([[t], ['Generado: ' + new Date().toLocaleString('es-BO')], [], cab, ...filas]); ws['!cols'] = anchos.map(w => ({ wch: w })); return ws; };
  XLSX.utils.book_append_sheet(wb, hoja(`PREPARACIÓN DE REACTIVOS — ${INSTRUCTIVO.registro} (${INSTRUCTIVO.codigo} v${INSTRUCTIVO.version})`, CAB_PREP, filasPrep(),
    [4, 16, 11, 7, 6, 34, 16, 9, 7, 40, 22, 12, 8, 11, 11, 13, 18, 16, 26]), 'Preparaciones');
  XLSX.utils.book_append_sheet(wb, hoja('VALORACIONES Y VERIFICACIONES', CAB_VAL, filasVal(), [16, 34, 16, 18, 13, 36, 11, 8, 11, 11, 16, 26]), 'Valoraciones');
  XLSX.utils.book_append_sheet(wb, hoja('CORRECCIONES', CAB_CORR, filasCorr(), [16, 34, 16, 12, 12, 12, 60, 12, 16]), 'Correcciones');
  XLSX.writeFile(wb, `Reactivos_${hoyISO()}.xlsx`);
  toast('Excel generado', 'ok');
});

$('#xPdf').addEventListener('click', () => {
  if (!LOTES.length) return toast('No hay registros', 'bad');
  const tabla = (cab, filas) => `<table><thead><tr>${cab.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${f.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const sel = [0, 1, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 17];
  const fp = filasPrep().map(f => sel.map(i => f[i]));
  const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reactivos_${hoyISO()}</title><style>
@page{size:landscape;margin:10mm}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#14171C;margin:0;padding:14px;font-size:10px}
h2{margin:0 0 4px;font-size:16px} h3{margin:18px 0 6px;font-size:12px}
.meta{font-size:10.5px;color:#6A7382;margin-bottom:10px;font-weight:600}
table{border-collapse:collapse;width:100%;font-size:9px}
th{background:#F40009;color:#fff;padding:6px 4px;border:1px solid #C4000A;font-size:8.5px}
td{padding:5px 4px;border:1px solid #E2E5EA;text-align:center}
tr:nth-child(even) td{background:#F8F9FA}
.firmas{display:flex;gap:40px;margin-top:40px;font-size:10px}.firmas div{flex:1;border-top:1px solid #333;padding-top:4px;text-align:center}
</style></head><body>
<h2>PREPARACIÓN DE REACTIVOS — ${INSTRUCTIVO.registro}</h2>
<div class="meta">${INSTRUCTIVO.codigo} Versión ${INSTRUCTIVO.version} · ${new Date().toLocaleString('es-BO')} · Laboratorio de Calidad · Embol S.A.</div>
${tabla(sel.map(i => CAB_PREP[i]), fp)}
${filasVal().length ? '<h3>VALORACIONES Y VERIFICACIONES</h3>' + tabla(CAB_VAL, filasVal()) : ''}
${filasCorr().length ? '<h3>CORRECCIONES</h3>' + tabla(CAB_CORR, filasCorr()) : ''}
<div class="firmas"><div>Elaborado por</div><div>Revisado por</div></div>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>`;
  abrirVentana(doc);
  toast('Elige «Guardar como PDF» al imprimir', 'ok');
});

/* ── Calendario (.ics) ── */
$('#xIcs').addEventListener('click', () => {
  const act = LOTES.filter(l => !l.descartado && Date.now() <= venceLote(l));
  if (!act.length) return toast('No hay soluciones vigentes', 'bad');
  const fd = t => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');
  const e = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const ev = [];
  act.forEach(l => {
    const add = (t, tit) => ev.push(['BEGIN:VEVENT', `UID:${l.id}-${tit.length}-${fd(t)}@reactivos`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${fd(t)}`, `SUMMARY:${e(tit + ': ' + l.nombre + ' (' + l.codigo + ')')}`,
      `DESCRIPTION:${e(INSTRUCTIVO.registro + ' · preparado ' + fFecha(l.fecha))}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${e(tit)}`, 'END:VALARM', 'END:VEVENT'].join('\r\n'));
    add(venceLote(l), 'Vence');
    const pv = proxVerif(l); if (pv && pv < venceLote(l)) add(pv, 'Verificar');
  });
  descargar(`Reactivos_vencimientos_${hoyISO()}.ics`, ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Embol Calidad//Reactivos//ES', ...ev, 'END:VCALENDAR'].join('\r\n'), 'text/calendar');
  toast('Abre el archivo para agregarlo a tu calendario', 'ok');
});

/* ── Respaldo ── */
function hacerRespaldo() {
  descargar(`Reactivos_respaldo_${hoyISO()}.json`, JSON.stringify({ app: 'reactivos-embol', v: 1, fecha: new Date().toISOString(), lotes: LOTES, config: CFG }, null, 1), 'application/json');
  LS.escribir(K.respaldo, Object.assign(LS.leer(K.respaldo, {}), { ultimo: Date.now() }));
  renderAvisoRespaldo(); toast('Respaldo descargado', 'ok');
}
function renderAvisoRespaldo() {
  const rp = LS.leer(K.respaldo, {});
  const pend = LOTES.length && (!rp.ultimo || (rp.cambios || 0) > rp.ultimo);
  $('#avisoRespaldo').hidden = !pend;
  if (pend) $('#arTxt').textContent = rp.ultimo ? `Último respaldo: ${fFechaHora(rp.ultimo)}. Hay cambios nuevos.` : 'Aún no descargaste ningún respaldo.';
}
$('#btnRespaldo').onclick = hacerRespaldo;
$('#btnRespaldoRapido').onclick = hacerRespaldo;
$('#btnRestaurar').onclick = () => $('#fileRestaurar').click();
$('#fileRestaurar').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.lotes)) throw 0;
    const ids = new Set(LOTES.map(l => l.id));
    let n = 0; d.lotes.forEach(l => { if (!ids.has(l.id)) { LOTES.push(l); n++; } });
    guardarLotes(); renderLotes();
    toast(`${n} lote${n === 1 ? '' : 's'} restaurado${n === 1 ? '' : 's'}`, 'ok');
  } catch { toast('El archivo no es un respaldo válido', 'bad'); }
  e.target.value = '';
});

/* ══════════════════ 14 · AJUSTES ══════════════════ */

function renderAjustes() {
  $('#aAnalista').value = CFG.analista;
  const c = CFG.crit;
  [['aFcMin', 'fcMin'], ['aFcMax', 'fcMax'], ['aPrecOk', 'precOk'], ['aPrecMax', 'precMax'], ['aRep', 'replicas'], ['aAviso', 'avisoDias']]
    .forEach(([id, k]) => { $('#' + id).value = fmt(c[k], k === 'avisoDias' ? 0 : k.startsWith('fc') ? 3 : 2); });
  $('#aConc').innerHTML = Object.entries(CFG.conc).map(([k, x]) => `
    <div class="conc-row"><b>${esc(x.n)}</b>
      <div class="grid2"><div class="field"><label>Pureza <b>[%]</b></label><input data-k="${k}" data-p="pct" class="aConcIn" type="text" inputmode="decimal" value="${fmt(x.pct, 1)}"></div>
      <div class="field"><label>Densidad <b>[g/ml]</b></label><input data-k="${k}" data-p="rho" class="aConcIn" type="text" inputmode="decimal" value="${fmt(x.rho, 3)}"></div></div>
      <p class="under">Equivale a <b id="aN_${k}">${fmt(nConcentrado(x), 2)} N</b></p></div>`).join('');
  $$('.aConcIn').forEach(i => i.onchange = () => { const v = num(i.value); if (v > 0) { CFG.conc[i.dataset.k][i.dataset.p] = v; guardarCfg(); $('#aN_' + i.dataset.k).textContent = fmt(nConcentrado(CFG.conc[i.dataset.k]), 2) + ' N'; } });
  $('#aInstr').innerHTML = `<p class="ctit">Balanzas</p>` + CFG.instr.balanzas.map((b, i) => `
    <label class="inst"><input type="checkbox" data-g="balanzas" data-i="${i}" ${b.on ? 'checked' : ''}><span><b>${esc(b.n)}</b><small>legibilidad ${b.d} g · hasta ${b.max} g</small></span></label>`).join('') +
    `<p class="ctit">Material volumétrico</p>` + CFG.instr.volumen.map((v, i) => `
    <label class="inst"><input type="checkbox" data-g="volumen" data-i="${i}" ${v.on ? 'checked' : ''}><span><b>${esc(v.n)}</b><small>${v.min}–${v.max} ml · ±${v.u} ml</small></span></label>`).join('') +
    `<div class="field" style="margin-top:12px"><label for="aMat">Matraces aforados que tienes <b>[ml, separados por coma]</b></label><input id="aMat" type="text" value="${CFG.instr.matraces.join(', ')}"></div>`;
  $$('#aInstr input[type=checkbox]').forEach(x => x.onchange = () => { CFG.instr[x.dataset.g][x.dataset.i].on = x.checked; guardarCfg(); });
  $('#aMat').onchange = () => { const m = $('#aMat').value.split(/[;,\s]+/).map(num).filter(v => v > 0).sort((a, b) => a - b); if (m.length) { CFG.instr.matraces = m; guardarCfg(); toast('Matraces guardados', 'ok'); } };
  $('#aNoti').checked = !!CFG.notificar;
  $('#aNotiTxt').textContent = !('Notification' in window) ? 'Este navegador no permite notificaciones; usa el botón Calendario en Registros.'
    : Notification.permission === 'denied' ? 'Las notificaciones están bloqueadas en el navegador. Usa el botón Calendario en Registros.'
    : 'Notificación al abrir la app cuando una solución vence o le toca verificación.';
}
$('#aAnalista').onchange = () => { CFG.analista = $('#aAnalista').value.trim(); guardarCfg(); };
[['aFcMin', 'fcMin'], ['aFcMax', 'fcMax'], ['aPrecOk', 'precOk'], ['aPrecMax', 'precMax'], ['aRep', 'replicas'], ['aAviso', 'avisoDias']].forEach(([id, k]) =>
  $('#' + id).addEventListener('change', e => {
    const v = num(e.target.value);
    if (!(v >= 0)) return toast('Valor no válido', 'bad');
    if (k === 'fcMin' && v >= 1 || k === 'fcMax' && v <= 1) return toast('El rango del factor debe contener 1,000', 'bad');
    CFG.crit[k] = v; guardarCfg(); toast('Criterio guardado', 'ok');
  }));
$('#aInstrReset').onclick = () => { CFG.instr = cfgDefecto().instr; CFG.conc = clonar(CONCENTRADOS); CFG.crit = clonar(CRITERIOS_DEF); guardarCfg(); renderAjustes(); toast('Valores por defecto restaurados', 'ok'); };
$('#aNoti').addEventListener('change', async e => {
  if (e.target.checked && 'Notification' in window) {
    const p = await Notification.requestPermission();
    if (p !== 'granted') { e.target.checked = false; toast('No se dio permiso para notificaciones', 'bad'); renderAjustes(); return; }
  }
  CFG.notificar = e.target.checked; guardarCfg();
  if (CFG.notificar) revisarNotificaciones(true);
});

/* ── Notificaciones al abrir (una por lote y por día) ── */
async function revisarNotificaciones(forzar) {
  if (!CFG.notificar || !('Notification' in window) || Notification.permission !== 'granted') return;
  const av = LS.leer(K.avisados, {}), hoy = hoyISO();
  const lista = lotesConAviso().filter(x => forzar || av[x.l.id] !== hoy);
  if (!lista.length) return;
  const cuerpo = lista.slice(0, 4).map(x => `${x.l.nombre}: ${EST_L[x.e].t.toLowerCase()}`).join('\n');
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const titulo = `Reactivos: ${lista.length} solución${lista.length > 1 ? 'es' : ''} requiere${lista.length > 1 ? 'n' : ''} atención`;
    if (reg) reg.showNotification(titulo, { body: cuerpo, tag: 'reactivos' });
    else new Notification(titulo, { body: cuerpo });
  } catch {}
  lista.forEach(x => av[x.l.id] = hoy); LS.escribir(K.avisados, av);
}

/* ══════════════════ 15 · INSTALACIÓN ══════════════════ */

let promptInstalar = null;
const yaInstalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; $('#btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { $('#btnInstall').hidden = true; toast('App instalada', 'ok'); });
async function instalar() {
  if (promptInstalar) { promptInstalar.prompt(); await promptInstalar.userChoice; promptInstalar = null; $('#btnInstall').hidden = true; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  abrirModal(`<h3>Instalar la app</h3><p class="msub">${yaInstalada() ? 'Ya está instalada en este dispositivo.' : 'Se instala desde el navegador, no desde una tienda.'}</p>
    ${ios ? `<div class="paso-i"><b>1</b><span>Abre esta dirección en <em>Safari</em>.</span></div>
             <div class="paso-i"><b>2</b><span>Toca el botón <em>Compartir</em>.</span></div>
             <div class="paso-i"><b>3</b><span>Elige <em>Agregar a inicio</em>.</span></div>`
          : `<div class="paso-i"><b>1</b><span>Abre esta dirección en <em>Chrome</em>.</span></div>
             <div class="paso-i"><b>2</b><span>Toca el menú <em>⋮</em> arriba a la derecha.</span></div>
             <div class="paso-i"><b>3</b><span>Elige <em>Instalar aplicación</em> o <em>Agregar a pantalla principal</em>.</span></div>`}
    <div class="nota-i">Una vez instalada funciona <b>sin internet</b>. La primera vez sí necesita conexión.</div>
    <div class="actions"><button class="btn primary" id="mOk">Entendido</button></div>`);
  $('#mOk').onclick = cerrarModal;
}
$('#btnInstall').onclick = instalar;
$('#aInstalar').onclick = instalar;
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

/* ══════════════════ 16 · ARRANQUE ══════════════════ */

renderChips();
irA(S.view || 'reactivos');
setTimeout(() => revisarNotificaciones(false), 1500);
