// Aula 9 (v4) — núcleo das simulações: rede de Hopfield (±1), anel de memória de trabalho e Hopfield moderna.
// Sem dependências; funciona no navegador (window.HOP) e no Node (module.exports).
(function (root) {
  'use strict';

  // ---------- sorteio com semente (mulberry32) ----------
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(rnd) { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function perm(n, rnd) { const a = []; for (let i = 0; i < n; i++) a.push(i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function randPat(n, rnd) { const p = new Array(n); for (let i = 0; i < n; i++) p[i] = rnd() < 0.5 ? 1 : -1; return p; }

  // ---------- guardar (Hebb) ----------
  // w_ij = (1/N) Σ_μ ξ_i^μ ξ_j^μ, w_ii = 0. W é uma matriz N × N em Float64Array (linha i = entradas do neurônio i).
  function hebb(pats, N) {
    N = N || pats[0].length; const W = new Float64Array(N * N);
    pats.forEach(p => { for (let i = 0; i < N; i++) { const pi = p[i] / N, r = i * N; for (let j = 0; j < N; j++) W[r + j] += pi * p[j]; } });
    for (let i = 0; i < N; i++) W[i * N + i] = 0;
    return W;
  }
  const size = (W) => Math.round(Math.sqrt(W.length));
  function field(W, s, i) { const N = s.length, r = i * N; let h = 0; for (let j = 0; j < N; j++) h += W[r + j] * s[j]; return h; }
  function energy(W, s) { const N = s.length; let e = 0; for (let i = 0; i < N; i++) e += s[i] * field(W, s, i); return -0.5 * e; }
  function overlap(a, b) { let o = 0; for (let i = 0; i < a.length; i++) o += a[i] * b[i]; return o / a.length; }
  function corr(a, b) { const n = a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
    let s = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sa && sb ? s / Math.sqrt(sa * sb) : 0; }
  const same = (a, b) => a.every((v, i) => v === b[i]);

  // ---------- pistas ----------
  function flip(p, frac, rnd) { const s = p.slice(), k = Math.round(frac * p.length); perm(p.length, rnd).slice(0, k).forEach(i => { s[i] = -s[i]; }); return s; }
  // metade apagada: os pixels apagados ficam 0 ("não sei"), desenhados em cinza
  function erase(p, part) { const n = p.length, w = Math.round(Math.sqrt(n)); return p.map((v, i) => { const r = Math.floor(i / w), c = i % w;
    const keep = part === 'cima' ? r < w / 2 : part === 'baixo' ? r >= w / 2 : part === 'esq' ? c < w / 2 : c >= w / 2; return keep ? v : 0; }); }

  // ---------- modificações das ligações (Atividade 5) ----------
  // dilui: zera ao acaso a fração f dos pares (i, j), mantendo a simetria
  function dilute(W, f, rnd) { const N = size(W), V = Float64Array.from(W);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (rnd() < f) { V[i * N + j] = 0; V[j * N + i] = 0; } return V; }
  // assimetria: soma uma parte antissimétrica ao acaso (a_ij = −a_ji), de tamanho k (em unidades de 1/√N)
  function asym(W, k, rnd) { const N = size(W), V = Float64Array.from(W), sc = k / Math.sqrt(N);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const a = gauss(rnd) * sc; V[i * N + j] += a; V[j * N + i] -= a; } return V; }
  const zeros = (N) => new Float64Array(N * N);

  // ---------- lembrar ----------
  // Runner: atualização assíncrona (um neurônio por vez, ordem sorteada a cada varredura) ou síncrona (todos juntos),
  // com temperatura opcional (regra de Glauber: P(+1) = 1 / (1 + e^(−2h/T))). Regra determinística: h > 0 → +1, h < 0 → −1, h = 0 → mantém.
  function Runner(W, s0, opt) {
    opt = opt || {};
    const N = s0.length, rnd = opt.rnd || rng(opt.seed || 1), T = opt.T || 0, sync = !!opt.sync;
    const R = { s: s0.slice(), t: 0, sweeps: 0, changesInSweep: 0, lastChanged: -1, E: [energy(W, s0)], hist: [s0.slice()], stableSweeps: 0 };
    let order = perm(N, rnd), k = 0;
    const decide = (h, cur) => { if (T > 0) return rnd() < 1 / (1 + Math.exp(-2 * h / T)) ? 1 : -1; return h > 0 ? 1 : h < 0 ? -1 : cur; };
    R.step = function () { // um neurônio (assíncrona) ou uma rodada inteira (síncrona)
      if (sync) { const h = R.s.map((_, i) => field(W, R.s, i)), ns = h.map((v, i) => decide(v, R.s[i]));
        const ch = ns.reduce((a, v, i) => a + (v !== R.s[i]), 0); R.s = ns; R.t += N; R.sweeps++; R.lastChanged = ch; R.stableSweeps = ch ? 0 : R.stableSweeps + 1;
        R.E.push(energy(W, R.s)); R.hist.push(R.s.slice()); return ch > 0; }
      const i = order[k++]; const v = decide(field(W, R.s, i), R.s[i]); const ch = v !== R.s[i]; R.s[i] = v; R.t++; R.lastChanged = ch ? i : -1;
      if (ch) R.changesInSweep++;
      if (k >= N) { R.sweeps++; R.stableSweeps = R.changesInSweep ? 0 : R.stableSweeps + 1; R.changesInSweep = 0; k = 0; order = perm(N, rnd); R.hist.push(R.s.slice()); }
      R.E.push(energy(W, R.s)); return ch;
    };
    R.sweep = function () { if (sync) return R.step(); const s0 = R.sweeps; while (R.sweeps === s0) R.step(); return R.stableSweeps === 0; };
    R.stable = function () { if (T > 0) return false; for (let i = 0; i < N; i++) { const h = field(W, R.s, i); const v = h > 0 ? 1 : h < 0 ? -1 : R.s[i]; if (v !== R.s[i]) return false; } return true; };
    R.run = function (maxSweeps) { maxSweeps = maxSweeps || 50; while (R.sweeps < maxSweeps) { R.sweep(); if (T === 0 && R.stable() && !R.s.includes(0)) break; } return R; };
    return R;
  }
  function settle(W, s, opt) { return Runner(W, s, opt).run((opt && opt.maxSweeps) || 50); }

  // classifica o estado final em relação às memórias guardadas
  function classify(s, pats, names) {
    const ms = pats.map(p => overlap(s, p)); let best = 0; ms.forEach((m, i) => { if (Math.abs(m) > Math.abs(ms[best])) best = i; });
    const m = ms[best], nm = names ? names[best] : String(best);
    if (m >= 0.98) return { tipo: 'memoria', idx: best, nome: nm, m, ms };
    if (m <= -0.98) return { tipo: 'negativo', idx: best, nome: nm, m, ms };
    return { tipo: 'mistura', idx: best, nome: nm, m, ms };
  }

  // ---------- anel de memória de trabalho (Atividade 6) ----------
  // n neurônios de taxa num anel; excitação local (gaussiana, largura sig) com ganho g; inibição global fixa;
  // r = f(entrada) com f saturando em 1. Estímulo: um "ponto" numa de 8 posições durante cueT; depois some (atraso).
  function Ring(opt) {
    opt = Object.assign({ n: 48, g: 1, sig: 0.35, inh: 0.55, tau: 10, dt: 1, noise: 0.03, seed: 1, theta: 0.3, cueAmp: 1.2 }, opt || {});
    const n = opt.n, rnd = rng(opt.seed), K = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i === j) continue; let d = Math.abs(i - j); d = Math.min(d, n - d) * 2 * Math.PI / n;
      K[i * n + j] = Math.exp(-d * d / (2 * opt.sig * opt.sig)); }
    const ksum = K.slice(0, n).reduce((a, b) => a + b, 0);
    const R = { n, r: new Float64Array(n), t: 0, opt, hist: [] };
    const f = (x) => x <= 0 ? 0 : Math.min(1, x); // linear com limiar e saturação
    R.posAngle = (p) => p / 8 * 2 * Math.PI;
    R.step = function (cuePos) {
      const r = R.r, out = new Float64Array(n), tot = r.reduce((a, b) => a + b, 0);
      for (let i = 0; i < n; i++) {
        let e = 0; for (let j = 0; j < n; j++) e += K[i * n + j] * r[j];
        let I = opt.g * e / ksum * 4 - opt.inh * tot / n * 4 - opt.theta;
        if (cuePos !== null && cuePos !== undefined) { const th = 2 * Math.PI * i / n, c = R.posAngle(cuePos); let d = Math.abs(th - c); d = Math.min(d, 2 * Math.PI - d); I += opt.cueAmp * Math.exp(-d * d / (2 * 0.25 * 0.25)); }
        I += opt.noise * gauss(rnd);
        out[i] = r[i] + opt.dt / opt.tau * (-r[i] + f(I));
      }
      R.r = out; R.t++; R.hist.push(Float64Array.from(out)); return out;
    };
    // decodifica a posição pelo vetor de população; devolve {pos (0–8, contínua), amp (atividade média), width (fração ativa)}
    R.read = function () { let x = 0, y = 0, s = 0, act = 0; for (let i = 0; i < n; i++) { const th = 2 * Math.PI * i / n; x += R.r[i] * Math.cos(th); y += R.r[i] * Math.sin(th); s += R.r[i]; if (R.r[i] > 0.5) act++; }
      let a = Math.atan2(y, x); if (a < 0) a += 2 * Math.PI; return { pos: a / (2 * Math.PI) * 8, amp: s / n, frac: act / n, conc: s ? Math.hypot(x, y) / s : 0 }; };
    return R;
  }
  // um ensaio completo: pré (pre passos) → ponto (cue passos) → atraso (delay passos)
  function ringTrial(opt, pos, T) { T = Object.assign({ pre: 20, cue: 40, delay: 300 }, T || {}); const R = Ring(opt);
    for (let t = 0; t < T.pre; t++) R.step(null); for (let t = 0; t < T.cue; t++) R.step(pos); const endCue = R.read();
    for (let t = 0; t < T.delay; t++) R.step(null); return { R, endCue, end: R.read() }; }
  const posErr = (a, b) => { let d = Math.abs(a - b) % 8; return Math.min(d, 8 - d); };

  // ---------- Hopfield moderna / atenção (extra do projetor) ----------
  // nova consulta = Σ_μ softmax(β · semelhança)_μ · ξ^μ (semelhança = sobreposição com cada memória)
  function softmax(z, beta) { const m = Math.max(...z.map(v => beta * v)); const e = z.map(v => Math.exp(beta * v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); }
  function modern(pats, q, beta) { const sim = pats.map(p => overlap(q, p)), w = softmax(sim, beta), N = q.length, out = new Array(N).fill(0);
    pats.forEach((p, k) => { for (let i = 0; i < N; i++) out[i] += w[k] * p[i]; }); return { sim, w, out }; }

  const HOP = { rng, gauss, perm, randPat, hebb, field, energy, overlap, corr, same, flip, erase, dilute, asym, zeros, Runner, settle, classify, Ring, ringTrial, posErr, softmax, modern };
  root.HOP = HOP;
  if (typeof module !== 'undefined') module.exports = HOP;
})(typeof window !== 'undefined' ? window : globalThis);
