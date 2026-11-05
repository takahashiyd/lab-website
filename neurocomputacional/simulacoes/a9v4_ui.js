// Aula 9 (v4) — componentes visuais das simulações (canvas, toque). Depende de hop_core.js, desenhos.js e a9v4_lib.js.
// Cada componente monta seu próprio HTML dentro de um elemento e devolve um objeto (host.sim) usado pelos botões "ver na simulação" e pelos testes.
(function (root) {
  'use strict';
  const H = root.HOP, L = root.A9L, D = root.DESENHOS;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = (v, d = 2) => Number(v).toFixed(d).replace('.', ',').replace('-', '−');
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const raf = root.requestAnimationFrame ? root.requestAnimationFrame.bind(root) : (f) => setTimeout(f, 16);
  let UID = 0;
  const PX_ON = '#142033', PX_OFF = '#f8fafc', PX_GRAY = '#a7b2c0';

  if (!document.getElementById('a9ui-css')) {
    const st = document.createElement('style'); st.id = 'a9ui-css';
    st.textContent = `
.a9sim{display:grid;gap:10px;min-width:0}
.a9sim>*,.a9pair>div>*{min-width:0}
.a9sim canvas{width:100%;display:block;border-radius:10px;border:1px solid var(--line);background:var(--bg);touch-action:manipulation}
.a9sim canvas.grid{max-width:340px;margin:0 auto;background:${PX_OFF}}
.a9btns{display:flex;flex-wrap:wrap;gap:8px}
.a9btns button{padding:10px 13px;min-height:44px;font-size:15px}
.a9seg{display:grid;gap:4px;font:600 13px/1.2 var(--body,inherit)}
.a9seg>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:6px}
.a9seg label{border:1.5px solid var(--line);border-radius:8px;text-align:center;padding:9px 4px;cursor:pointer;min-height:42px;display:grid;place-items:center;background:var(--bg);font:600 14px/1.15 var(--body,inherit)}
.a9seg input{position:absolute;opacity:0;pointer-events:none}
.a9seg label:has(input:checked){border-color:var(--accent);background:var(--soft);color:var(--accent)}
.a9seg label:focus-within{outline:3px solid var(--accent);outline-offset:1px}
.a9rng{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;font:600 14px/1.2 var(--body,inherit);align-items:center}
.a9rng input{grid-column:1/-1;width:100%;accent-color:var(--you);min-height:30px}
.a9rng output{font:700 14px var(--mono,monospace);color:var(--you)}
.a9read{font:600 14px/1.45 var(--mono,monospace);color:var(--accent);min-height:1.4em}
.a9res{font:700 15px/1.35 var(--body,inherit);padding:8px 10px;border-radius:8px;background:var(--soft);min-height:2.6em}
.a9res.ok{color:var(--ok)} .a9res.bad{color:var(--warn)}
.a9note{font-size:14px;color:var(--muted)}
.a9mem{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font:600 13px/1.2 var(--body,inherit);color:var(--muted)}
.a9mem figure{margin:0;display:grid;gap:2px;justify-items:center;font:500 11.5px/1.1 var(--body,inherit);color:var(--fg)}
.a9mem canvas{width:44px;height:44px;border-radius:6px;border:1px solid var(--line)}
.a9bars{display:grid;gap:4px;font:500 13px/1.2 var(--body,inherit)}
.a9bar{display:grid;grid-template-columns:7.5em minmax(0,1fr) 3.4em;gap:6px;align-items:center}
.a9bar .tr{height:12px;border-radius:6px;background:var(--bg);border:1px solid var(--line);position:relative;overflow:hidden}
.a9bar .tr i{position:absolute;top:0;bottom:0;background:var(--accent)}
.a9bar .tr i.neg{background:var(--warn)}
.a9bar .tr b{position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--muted)}
.a9bar span:last-child{font:600 12.5px var(--mono,monospace);text-align:right}
.a9pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:0}
.a9pair>div{display:grid;gap:4px;min-width:0;align-content:start}
.a9pair h4{margin:0;font:700 13px/1.2 var(--body,inherit);min-height:2.4em;display:flex;align-items:flex-end}
.a9pair h4.bad{color:var(--warn)} .a9pair h4.good{color:var(--ok)}
.a9pair .a9res{font-size:13px;min-height:4.2em}
.a9cases{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.a9cases button{padding:8px 3px;min-height:52px;font-size:12.5px;line-height:1.15;background:var(--bg);color:var(--fg);border:1.5px solid var(--line)}
.a9cases button.on{border-color:var(--accent);background:var(--soft);color:var(--accent)}
.a9word{font:800 clamp(34px,11vw,72px)/1.1 var(--display,inherit);text-align:center;padding:28px 8px;border-radius:12px;background:var(--soft);color:var(--fg);min-height:2.6em;display:grid;place-items:center}
.a9word small{display:block;font:600 14px var(--mono,monospace);color:var(--muted)}
`;
    document.head.appendChild(st);
  }

  // ---------- canvas ----------
  function surface(cv, aspect) {
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    const W = Math.max(120, Math.floor(cv.clientWidth || (cv.parentNode && cv.parentNode.clientWidth) || 300)), Hh = Math.round(W * aspect);
    if (cv._w !== W || cv._h !== Hh || cv._dpr !== dpr) { cv.width = W * dpr; cv.height = Hh * dpr; cv._w = W; cv._h = Hh; cv._dpr = dpr; cv.style.height = Hh + 'px'; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, Hh); return { g, W, H: Hh };
  }
  // desenha um estado 10 × 10 (+1 escuro, −1 claro, 0 cinza = apagado); valores contínuos em tons de cinza
  function drawGrid(g, x0, y0, size, s, opt) {
    opt = opt || {}; const n = Math.round(Math.sqrt(s.length)), c = size / n;
    g.fillStyle = PX_OFF; g.fillRect(x0, y0, size, size);
    for (let k = 0; k < s.length; k++) { const r = Math.floor(k / n), q = k % n, v = s[k];
      if (opt.cont) { const t = Math.round(248 - (v + 1) / 2 * (248 - 20)); g.fillStyle = `rgb(${t},${t + 2},${Math.min(255, t + 8)})`; }
      else g.fillStyle = v > 0 ? PX_ON : v < 0 ? PX_OFF : PX_GRAY;
      g.fillRect(x0 + q * c, y0 + r * c, c, c); }
    if (!opt.thin) { g.strokeStyle = 'rgba(100,116,139,.35)'; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < n; i++) { g.moveTo(x0 + i * c, y0); g.lineTo(x0 + i * c, y0 + size); g.moveTo(x0, y0 + i * c); g.lineTo(x0 + size, y0 + i * c); } g.stroke(); }
    if (opt.last >= 0) { const r = Math.floor(opt.last / n), q = opt.last % n; g.strokeStyle = '#f0a645'; g.lineWidth = 3; g.strokeRect(x0 + q * c + 1.5, y0 + r * c + 1.5, c - 3, c - 3); }
  }
  function thumb(s, size) { const cv = document.createElement('canvas'); cv.width = cv.height = 2 * (size || 44); const g = cv.getContext('2d'); drawGrid(g, 0, 0, cv.width, s, { thin: true }); return cv; }
  function bars(el, items) { // items: [{nome, m}]
    el.innerHTML = items.map(it => { const w = Math.abs(it.m) * 50, l = it.m >= 0 ? 50 : 50 - w;
      return `<div class="a9bar"><span>${esc(it.nome)}</span><span class="tr"><b></b><i class="${it.m < 0 ? 'neg' : ''}" style="left:${l}%;width:${w}%"></i></span><span>${fmt(it.m)}</span></div>`; }).join('');
  }
  function seg(name, opts, val, label) { return `<div class="a9seg">${label ? `<span>${label}</span>` : ''}<div>${opts.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}"${v === val ? ' checked' : ''}>${t}</label>`).join('')}</div></div>`; }
  function sparkline(cv, ys, opt) {
    opt = opt || {}; const { g, W, H: Hh } = surface(cv, opt.aspect || 0.3); const m = { l: 8, r: 8, t: 18, b: 8 };
    g.fillStyle = css('--muted'); g.font = '600 12px ' + (css('--mono') || 'monospace'); g.fillText(opt.title || '', m.l, 13);
    if (!ys.length) return; const lo = Math.min(...ys), hi = Math.max(...ys), n = Math.max(ys.length - 1, opt.minN || 100);
    const X = (i) => m.l + i / n * (W - m.l - m.r), Y = (v) => m.t + (hi - v) / ((hi - lo) || 1) * (Hh - m.t - m.b);
    g.strokeStyle = css('--accent'); g.lineWidth = 2; g.beginPath(); ys.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
    g.fillStyle = css('--accent'); g.beginPath(); g.arc(X(ys.length - 1), Y(ys[ys.length - 1]), 3.5, 0, 7); g.fill();
    g.textAlign = 'right'; g.fillStyle = css('--fg'); g.fillText(fmt(ys[ys.length - 1], 1), W - m.r, 13); g.textAlign = 'left';
  }
  function whenVisible(el, f) {
    if (!('IntersectionObserver' in root)) { f(); return; }
    const io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) { io.disconnect(); f(); } }, { rootMargin: '200px' }); io.observe(el);
  }
  const resultText = (c) => c.tipo === 'memoria' ? `✓ lembrou: ${c.nome}` : c.tipo === 'negativo' ? `terminou no negativo (invertido) de: ${c.nome}` : 'terminou numa mistura: não é nenhum desenho guardado';

  // ======================= Atividade 2 · Desenhe e lembre =======================
  function DrawSim(host, opt) {
    opt = Object.assign({ seed: L.A2.seed, big: false }, opt || {}); const id = 'a9d' + (UID++);
    host.innerHTML = `<div class="a9sim">
      <div class="a9mem" data-k="mem"></div>
      <canvas class="grid" data-k="cv" aria-label="estado da rede: 100 neurônios"></canvas>
      <div class="a9res" data-k="res">Escolha uma pista.</div>
      <canvas data-k="en" aria-label="energia ao longo da lembrança"></canvas>
      <div class="a9bars" data-k="bars"></div>
      ${seg(id + 't', L.A2.nomes.map((k, i) => [String(i), D[k].nome]), '0', 'Pista a partir de')}
      <label class="a9rng">Ruído (pixels trocados) <output data-k="fo">20%</output><input type="range" data-k="frac" min="0" max="100" step="10" value="20"></label>
      <div class="a9btns"><button class="ghost" data-k="ruido">Pista com ruído</button><button class="ghost" data-k="metade">Metade de cima</button><button class="ghost" data-k="rabisco">Rabisco ao acaso</button></div>
      <div class="a9btns"><button data-k="run">▶ Lembrar</button><button class="ghost" data-k="semente">Outra semente</button></div>
      <p class="a9note">Toque nos pixels para desenhar a sua pista. <button class="ghost" data-k="limpar" style="padding:6px 10px;min-height:34px;font-size:13px">Limpar</button> <button class="ghost" data-k="guardar" style="padding:6px 10px;min-height:34px;font-size:13px">Guardar este desenho</button> <span data-k="sd"></span></p>
    </div>`;
    const $ = (k) => host.querySelector(`[data-k="${k}"]`);
    const S = { seed: opt.seed, alvo: 0, frac: 0.2, kind: 'ruido', extras: [], s: null, R: null, busy: false, last: -1, result: null, done: false };
    let stop = null;
    const pats = () => L.A2.pats().concat(S.extras.map(e => e.v)), names = () => L.A2.nomes.map(k => D[k].nome).concat(S.extras.map(e => e.nome));
    let W = H.hebb(pats());
    function mem() { const box = $('mem'); box.innerHTML = '<span>Guardadas:</span>'; pats().forEach((p, i) => { const f = document.createElement('figure'); f.appendChild(thumb(p)); const c = document.createElement('figcaption'); c.textContent = names()[i]; f.appendChild(c); box.appendChild(f); }); }
    function draw() {
      const cv = $('cv'), { g, W: w } = surface(cv, 1); drawGrid(g, 0, 0, w, S.s, { last: S.last });
      sparkline($('en'), S.R ? S.R.E : [H.energy(W, S.s)], { title: 'energia', aspect: 0.28, minN: 300 });
      bars($('bars'), pats().map((p, i) => ({ nome: 'parecido c/ ' + names()[i], m: H.overlap(S.s, p) })));
      $('sd').textContent = `semente ${S.seed}`;
    }
    function setState(s, msg) { if (stop) stop(); S.busy = false; S.s = s; S.R = null; S.last = -1; S.result = null; S.done = false; $('res').className = 'a9res'; $('res').textContent = msg; draw(); }
    function cue(kind) { S.kind = kind; const p = pats()[S.alvo];
      const s = L.cue(kind, p, { frac: S.frac }, S.seed), nm = names()[S.alvo];
      setState(s, kind === 'ruido' ? `Pista: ${nm} com ${Math.round(S.frac * 100)}% dos pixels trocados. Toque em Lembrar.` : kind === 'metade' ? `Pista: só a metade de cima de ${nm} (cinza = apagado). Toque em Lembrar.` : 'Pista: rabisco ao acaso (não é nenhum desenho). Toque em Lembrar.'); }
    function run() {
      if (S.busy) return; if (stop) stop();
      S.R = H.Runner(W, S.s, { seed: S.seed * 7919 + 1 }); S.s = S.R.s; S.busy = true; S.done = false; $('res').className = 'a9res'; $('res').textContent = 'Lembrando… cada neurônio, um de cada vez, segue o voto dos outros.';
      let alive = true; stop = () => { alive = false; S.busy = false; };
      const per = opt.big ? 2 : 3;
      const loop = () => { if (!alive) return; let fin = false;
        for (let k = 0; k < per && !fin; k++) { const t0 = S.R.sweeps; S.R.step(); S.last = S.R.lastChanged >= 0 ? S.R.lastChanged : S.last;
          if (S.R.sweeps > t0 && ((S.R.stableSweeps >= 1 && !S.R.s.includes(0)) || S.R.sweeps >= 50)) fin = true; }
        S.s = S.R.s; draw();
        if (fin) { alive = false; S.busy = false; S.done = true; S.last = -1; const c = H.classify(S.s, pats(), names()); S.result = c; draw();
          $('res').className = 'a9res ' + (c.tipo === 'memoria' ? 'ok' : 'bad'); $('res').textContent = resultText(c) + ` · parou depois de ${S.R.t} atualizações; a energia nunca subiu.`; }
        else raf(loop); };
      raf(loop);
    }
    host.querySelectorAll(`[name="${id}t"]`).forEach(r => r.addEventListener('change', () => { S.alvo = +r.value; cue(S.kind === 'rabisco' ? 'ruido' : S.kind); }));
    $('frac').addEventListener('input', () => { S.frac = +$('frac').value / 100; $('fo').textContent = $('frac').value + '%'; cue('ruido'); });
    ['ruido', 'metade', 'rabisco'].forEach(k => $(k).addEventListener('click', () => cue(k)));
    $('run').addEventListener('click', run);
    $('semente').addEventListener('click', () => { S.seed++; cue(S.kind); });
    $('limpar').addEventListener('click', () => setState(new Array(100).fill(-1), 'Toque nos pixels para desenhar. Depois: Lembrar ou Guardar este desenho.'));
    $('guardar').addEventListener('click', () => { if (S.extras.length >= 3) { $('res').textContent = 'Já há 3 desenhos seus guardados (máximo).'; return; }
      const v = S.s.map(x => x > 0 ? 1 : -1); S.extras.push({ v, nome: 'seu ' + (S.extras.length + 1) }); W = H.hebb(pats()); mem(); draw();
      $('res').className = 'a9res'; $('res').textContent = `Guardado (regra de Hebb): agora a rede tem ${pats().length} memórias. Estrague-o e veja se ela lembra.`; });
    $('cv').addEventListener('pointerdown', (ev) => { const r = ev.target.getBoundingClientRect(), q = Math.floor((ev.clientX - r.left) / r.width * 10), rr = Math.floor((ev.clientY - r.top) / r.height * 10);
      if (q < 0 || q > 9 || rr < 0 || rr > 9) return; const s = S.s.slice(), k = rr * 10 + q; s[k] = s[k] > 0 ? -1 : 1; setState(s, 'Sua pista. Toque em Lembrar (ou continue desenhando).'); });
    root.addEventListener('resize', () => draw());
    mem(); cue('ruido');
    const api = { S, cue, run, busy: () => S.busy, seed: (n) => { S.seed = n; cue(S.kind); }, setFrac: (f) => { S.frac = f; $('frac').value = Math.round(f * 100); $('fo').textContent = Math.round(f * 100) + '%'; },
      setAlvo: (i) => { S.alvo = i; const r = host.querySelector(`[name="${id}t"][value="${i}"]`); if (r) r.checked = true; },
      demo: (k) => { if (k === 'ruido20') { api.setAlvo(0); api.setFrac(0.2); cue('ruido'); run(); } else if (k === 'metade') { api.setAlvo(0); cue('metade'); run(); } else if (k === 'ruido60') { api.setAlvo(0); api.setFrac(0.6); cue('ruido'); run(); } else if (k === 'rabisco') { cue('rabisco'); run(); } } };
    host.sim = api; return api;
  }

  // ======================= Atividade 3 (i) · CA3 com lesão =======================
  function LesionSim(host, opt) {
    opt = Object.assign({ seed: 1 }, opt || {}); const id = 'a9l' + (UID++);
    host.innerHTML = `<div class="a9sim">
      ${seg(id + 'c', [['intacta', 'CA3 intacta'], ['lesao', 'CA3 com lesão (sem ligações)']], 'intacta', 'Rede')}
      <canvas class="grid" data-k="cv"></canvas>
      <div class="a9res" data-k="res"></div>
      <div class="a9btns"><button class="ghost" data-k="metade">Pista: metade de cima</button><button class="ghost" data-k="inteira">Pista: inteira</button><button data-k="run">▶ Lembrar</button></div>
    </div>`;
    const $ = (k) => host.querySelector(`[data-k="${k}"]`);
    const P = L.A2.pats(), Wi = H.hebb(P), W0 = H.zeros(100), nome = D[L.A2.nomes[0]].nome;
    const S = { lesao: false, pista: 'metade', s: null, m0: 0, m1: null, busy: false, done: false };
    let stop = null;
    function draw() { const { g, W: w } = surface($('cv'), 1); drawGrid(g, 0, 0, w, S.s); }
    function cue(k) { if (stop) stop(); S.pista = k; S.s = k === 'metade' ? H.erase(P[0], 'cima') : P[0].slice(); S.m0 = H.overlap(S.s, P[0]); S.m1 = null; S.done = false;
      $('res').className = 'a9res'; $('res').textContent = `Pista: ${k === 'metade' ? 'metade de cima' : 'inteira'} da ${nome} · parecido com a ${nome}: ${fmt(S.m0)}. Toque em Lembrar.`; draw(); }
    function run() { if (S.busy) return; const R = H.Runner(S.lesao ? W0 : Wi, S.s, { seed: opt.seed }); S.busy = true; let alive = true; stop = () => { alive = false; S.busy = false; };
      const loop = () => { if (!alive) return; let fin = false; for (let k = 0; k < 4 && !fin; k++) { const t0 = R.sweeps; R.step(); if (R.sweeps > t0 && (R.stableSweeps >= 1 || R.sweeps >= 3)) fin = true; }
        S.s = R.s; draw(); if (!fin) { raf(loop); return; }
        alive = false; S.busy = false; S.done = true; S.m1 = H.overlap(S.s, P[0]); const ok = S.m1 >= 0.98;
        $('res').className = 'a9res ' + (ok ? 'ok' : 'bad');
        $('res').textContent = `parecido com a ${nome}: ${fmt(S.m0)} → ${fmt(S.m1)}` + (S.lesao ? ' · sem ligações recorrentes não há voto: a saída é a própria pista.' : ok ? ' · completou.' : ''); };
      raf(loop); }
    host.querySelectorAll(`[name="${id}c"]`).forEach(r => r.addEventListener('change', () => { S.lesao = r.value === 'lesao'; cue(S.pista); }));
    $('metade').addEventListener('click', () => cue('metade')); $('inteira').addEventListener('click', () => cue('inteira')); $('run').addEventListener('click', run);
    root.addEventListener('resize', draw);
    cue('metade');
    const api = { S, cue, run, busy: () => S.busy, lesao: (b) => { S.lesao = b; host.querySelector(`[name="${id}c"][value="${b ? 'lesao' : 'intacta'}"]`).checked = true; },
      demo: (k) => { api.lesao(k !== 'intacta'); cue(k === 'inteira' ? 'inteira' : 'metade'); run(); } };
    host.sim = api; return api;
  }

  // ======================= Atividade 3 (ii) · caixa que muda de forma (Wills) =======================
  function MorphSim(host, opt) {
    opt = Object.assign({ seed: 1, n: 20 }, opt || {});
    host.innerHTML = `<div class="a9sim">
      <canvas data-k="box" aria-label="a caixa"></canvas>
      <label class="a9rng">Forma da caixa <output data-k="fo">quadrado</output><input type="range" data-k="j" min="0" max="6" step="1" value="0"></label>
      <div class="a9btns"><button data-k="one">▶ Colocar o rato</button><button class="ghost" data-k="all">Testar as 7 formas (${opt.n}× cada)</button><button class="ghost" data-k="semente">Outra semente</button></div>
      <div class="a9bars" data-k="bars"></div>
      <div class="a9res" data-k="res">Escolha a forma e coloque o rato na caixa.</div>
      <canvas data-k="ch" aria-label="gráfico: em que mapa a rede termina, para cada forma"></canvas>
    </div>`;
    const $ = (k) => host.querySelector(`[data-k="${k}"]`);
    const M = L.WILLS.maps(), S = { j: 0, seed: opt.seed, rnd: H.rng(opt.seed), last: null, sweep: null, busy: false };
    const nomeForma = (j) => j === 0 ? 'quadrado' : j === 6 ? 'círculo' : j === 3 ? 'meio do caminho' : (j < 3 ? 'mais quadrado' : 'mais círculo');
    function draw() {
      const { g, W, H: Hh } = surface($('box'), 0.42), lam = S.j / 6, sz = Hh * 0.8, x0 = 12, y0 = Hh * 0.1;
      g.strokeStyle = css('--fg'); g.lineWidth = 4; g.beginPath(); if (g.roundRect) g.roundRect(x0, y0, sz, sz, lam * sz / 2); else g.rect(x0, y0, sz, sz); g.stroke();
      g.fillStyle = css('--you'); g.beginPath(); g.arc(x0 + sz * 0.62, y0 + sz * 0.4, 6, 0, 7); g.fill();
      const gx = x0 + sz + 18, gs = Math.min(Hh * 0.8, W - gx - 8);
      if (S.last) { drawGrid(g, gx, y0, gs, S.last.s, { thin: true }); g.fillStyle = css('--muted'); g.font = '600 11px ' + css('--mono'); g.fillText('células de lugar', gx, Hh - 1); }
      else { g.fillStyle = css('--muted'); g.font = '13px ' + css('--body'); g.fillText('as células de lugar aparecem aqui', gx, y0 + 20); }
      bars($('bars'), [{ nome: 'mapa do quadrado', m: S.last ? S.last.mq : 0 }, { nome: 'mapa do círculo', m: S.last ? S.last.mc : 0 }]);
      chart();
    }
    function chart() {
      const { g, W, H: Hh } = surface($('ch'), 0.6), m = { l: 34, r: 10, t: 40, b: 34 };
      const X = (j) => m.l + j / 6 * (W - m.l - m.r), Y = (v) => m.t + (1 - v) * (Hh - m.t - m.b);
      g.strokeStyle = css('--line'); g.lineWidth = 1; g.beginPath(); g.moveTo(m.l, m.t); g.lineTo(m.l, Hh - m.b); g.lineTo(W - m.r, Hh - m.b); g.stroke();
      g.fillStyle = css('--muted'); g.font = '11px ' + css('--body'); g.textAlign = 'center'; g.fillText('quadrado', X(0) + 18, Hh - m.b + 14); g.fillText('meio', X(3), Hh - m.b + 14); g.fillText('círculo', X(6) - 16, Hh - m.b + 14);
      g.fillText('forma da caixa →', (m.l + W) / 2, Hh - 4); g.textAlign = 'right'; g.fillText('100%', m.l - 3, Y(1) + 4); g.fillText('0', m.l - 3, Y(0) + 4); g.textAlign = 'left';
      if (!S.sweep) { g.fillStyle = css('--muted'); g.font = '13px ' + css('--body'); g.fillText('Toque em "Testar as 7 formas".', m.l + 10, Hh / 2); return; }
      const line = (key, col, dash) => { g.strokeStyle = col; g.lineWidth = 2.5; g.setLineDash(dash || []); g.beginPath(); S.sweep.forEach((o, j) => j ? g.lineTo(X(j), Y(o[key])) : g.moveTo(X(j), Y(o[key]))); g.stroke(); g.setLineDash([]);
        S.sweep.forEach((o, j) => { g.fillStyle = col; g.beginPath(); g.arc(X(j), Y(o[key]), 3.5, 0, 7); g.fill(); }); };
      line('cue', css('--muted'), [5, 4]); line('q', css('--accent'));
      g.font = '600 11.5px ' + css('--body'); g.fillStyle = css('--accent'); g.fillText('vezes no mapa do quadrado', m.l + 6, 12); g.fillStyle = css('--muted'); g.fillText('- - pista: semelhança com o quadrado', m.l + 6, 24);
    }
    function setJ(j) { S.j = j; $('j').value = j; $('fo').textContent = nomeForma(j); }
    function one() { const t = L.WILLS.trial(M, S.j, S.rnd); S.last = t; draw();
      const msg = t.mapa === 'Q' ? 'a rede escolheu o mapa do QUADRADO' : t.mapa === 'C' ? 'a rede escolheu o mapa do CÍRCULO' : 'a rede terminou num estado intermediário';
      $('res').className = 'a9res ' + (t.mapa === 'outro' ? 'bad' : 'ok'); $('res').textContent = `${nomeForma(S.j)}: pista ${fmt((1 + t.cq) / 2 * 100, 0)}% parecida com o quadrado → ${msg}.`; return t; }
    function all() { S.sweep = L.WILLS.sweep(M, opt.n, S.seed * 13 + 1); draw();
      $('res').className = 'a9res'; $('res').textContent = `A pista (tracejado) muda aos poucos; a escolha da rede (linha cheia) muda de repente, no meio. Tentativas que terminaram numa média dos dois mapas: ${Math.round(S.sweep.reduce((a, o) => a + o.outro, 0) * opt.n)} de ${7 * opt.n}.`; }
    $('j').addEventListener('input', () => { setJ(+$('j').value); draw(); });
    $('one').addEventListener('click', one); $('all').addEventListener('click', all);
    $('semente').addEventListener('click', () => { S.seed++; S.rnd = H.rng(S.seed); S.last = null; S.sweep = null; draw(); $('res').textContent = `semente ${S.seed}.`; });
    root.addEventListener('resize', draw); setJ(0); draw();
    const api = { S, M, one, all, setJ, busy: () => false, demo: () => { setJ(3); one(); all(); } };
    host.sim = api; return api;
  }

  // ======================= Atividade 4 · lista de palavras (DRM) =======================
  function WordList(host, opt) {
    opt = Object.assign({ ms: L.DRM.ms, onEnd: null, big: false }, opt || {});
    host.innerHTML = `<div class="a9sim"><div class="a9word" data-k="w"><span>15 palavras, uma de cada vez<small>preste atenção; não anote</small></span></div>
      <div class="a9btns"><button data-k="go">▶ Ver a lista</button><button class="ghost" data-k="skip">O professor leu em voz alta</button></div></div>`;
    const $ = (k) => host.querySelector(`[data-k="${k}"]`); const S = { i: -1, playing: false, done: false }; let timer = null;
    function end() { clearTimeout(timer); S.playing = false; S.done = true; $('w').innerHTML = '<span>Fim da lista<small>agora, sem voltar: marque abaixo</small></span>'; $('go').disabled = true; $('go').textContent = 'A lista passa uma vez só'; opt.onEnd && opt.onEnd(); }
    function next() { S.i++; if (S.i >= L.DRM.lista.length) { end(); return; } $('w').innerHTML = `<span>${esc(L.DRM.lista[S.i])}<small>${S.i + 1} de ${L.DRM.lista.length}</small></span>`; timer = setTimeout(next, opt.ms); }
    $('go').addEventListener('click', () => { if (S.playing || S.done) return; S.playing = true; S.i = -1; next(); });
    $('skip').addEventListener('click', () => { clearTimeout(timer); S.playing = false; end(); });
    const api = { S, end }; host.sim = api; return api;
  }

  // ======================= Atividade 5 · quebre a memória =======================
  function BreakSim(host, opt) {
    opt = Object.assign({ seed: 1, per: 25 }, opt || {});
    const keys = Object.keys(L.CASOS);
    host.innerHTML = `<div class="a9sim">
      <div class="a9cases">${keys.map(k => `<button data-c="${k}">${k} · ${L.CASOS[k].rot}</button>`).join('')}</div>
      <div class="a9pair"><div><h4 class="good" data-k="gl">rede boa</h4><canvas class="grid" data-k="g"></canvas><div class="a9res" data-k="gr"></div></div>
        <div><h4 class="bad" data-k="bl">quebrada</h4><canvas class="grid" data-k="b"></canvas><div class="a9res" data-k="br"></div></div></div>
      <div class="a9btns"><button data-k="again">▶ Rodar de novo</button><button class="ghost" data-k="semente">Outra semente</button><span class="a9note" data-k="sd"></span></div>
    </div>`;
    const $ = (k) => host.querySelector(`[data-k="${k}"]`);
    const S = { c: null, seed: opt.seed, busy: false, res: {} }; let stop = null;
    function side(cfg) { const net = L.buildNet(cfg, S.seed); const st = { cfg, net, R: H.Runner(net.W, net.s, { rnd: net.rnd, T: cfg.T || 0 }), phase: cfg.T ? 'quente' : 'frio', done: false, F: null };
      st.R0 = st.R; return st; }
    function tick(st, n) { // avança n atualizações; mesma sequência de sorteios que L.runSide
      for (let k = 0; k < n && !st.done; k++) {
        const R = st.R, t0 = R.sweeps; R.step();
        if (R.sweeps === t0) continue;
        if (st.phase === 'quente') { if (R.sweeps >= (st.cfg.sweeps || 40)) { if (st.cfg.esfria) { st.phase = 'frio'; st.R = H.Runner(st.net.W, R.s, { rnd: st.net.rnd }); st.cool = true; } else st.done = true; } }
        else if ((R.stableSweeps >= 1 && R.stable() && !R.s.includes(0)) || R.sweeps >= (st.cool ? 50 : 60)) st.done = true;
      } }
    function label(st) { const sm = L.summary(st.net, st.R, st.cfg), nm = st.net.labels[st.net.alvo]; st.sm = sm;
      if (!sm.parou) return { t: `não parou: depois de ${st.R.sweeps} rodadas, ainda mudando${sm.sobe ? '; a energia subiu várias vezes' : ''}.`, ok: false };
      if (sm.tipo === 'memoria') return { t: sm.idx === sm.alvo ? `✓ lembrou: ${sm.nome}` : `terminou em: ${sm.nome} (a pista era ${nm})`, ok: sm.idx === sm.alvo };
      if (sm.mistura3) return { t: 'parou numa mistura dos 3 desenhos, que ninguém guardou', ok: false };
      if (sm.tipo === 'negativo') return { t: `terminou no negativo de: ${sm.nome}`, ok: false };
      return { t: `mistura (borrão): não é nenhum desenho guardado (parecido com ${nm}: ${fmt(sm.mAlvo)})`, ok: false }; }
    function draw(sides) { ['g', 'b'].forEach((k, i) => { const st = sides[i], { g, W } = surface($(k), 1); drawGrid(g, 0, 0, W, st.R.s);
      if (st.done) { const lb = label(st); $(k + 'r').className = 'a9res ' + (lb.ok ? 'ok' : 'bad'); $(k + 'r').textContent = lb.t; }
      else $(k + 'r').textContent = st.phase === 'quente' ? `com ruído… rodada ${st.R.sweeps}` : `lembrando… rodada ${st.R.sweeps}`; }); }
    function show(c) { if (stop) stop(); S.c = c; const C = L.CASOS[c]; host.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === c));
      $('gl').textContent = 'boa · ' + C.gl; $('bl').textContent = 'quebrada · ' + C.bl; $('sd').textContent = `semente ${S.seed}`;
      const sides = [side(C.good), side(C.bad)]; S.sides = sides; S.busy = true; let alive = true; stop = () => { alive = false; S.busy = false; };
      draw(sides);
      const loop = () => { if (!alive) return; sides.forEach(st => tick(st, opt.per)); draw(sides);
        if (sides.every(st => st.done)) { alive = false; S.busy = false; S.res[c] = sides.map(st => st.sm); } else raf(loop); };
      raf(loop); }
    host.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => show(b.dataset.c)));
    $('again').addEventListener('click', () => S.c && show(S.c)); $('semente').addEventListener('click', () => { S.seed++; S.c && show(S.c); });
    root.addEventListener('resize', () => S.sides && draw(S.sides));
    const api = { S, show, busy: () => S.busy, cur: () => S.c, seed: (n) => { S.seed = n; S.c && show(S.c); } };
    host.sim = api; return api;
  }

  // ======================= Atividade 6 · segurar uma informação (anel) =======================
  function RingSim(host, opt) {
    opt = Object.assign({ seed: 1, forca: 'medida', per: 3 }, opt || {}); const id = 'a9r' + (UID++);
    host.innerHTML = `<div class="a9sim">
      ${seg(id + 'f', [['fraca', 'fraca'], ['medida', 'na medida'], ['forte', 'forte demais']], opt.forca, 'Força da recorrência')}
      <canvas data-k="ring" aria-label="anel de 48 neurônios"></canvas>
      <div class="a9res" data-k="res">Toque em Mostrar o ponto.</div>
      <canvas data-k="ras" aria-label="atividade de cada neurônio ao longo do tempo"></canvas>
      <div class="a9btns"><button data-k="go">▶ Mostrar o ponto</button><button class="ghost" data-k="semente">Outra semente</button><span class="a9note" data-k="sd"></span></div>
    </div>`;
    const $ = (k) => host.querySelector(`[data-k="${k}"]`); const T = L.RING.T, TT = T.pre + T.cue + T.delay;
    const S = { forca: opt.forca, seed: opt.seed, pos: L.RING.posOf(opt.seed), R: null, t: 0, busy: false, verdict: null, read: null }; let stop = null;
    function phase() { return S.t < T.pre ? 'antes' : S.t < T.pre + T.cue ? 'ponto' : S.t < TT ? 'atraso' : 'resposta'; }
    function draw() {
      const { g, W, H: Hh } = surface($('ring'), 0.62), cx = W / 2, cy = Hh / 2, rad = Math.min(W, Hh) * 0.36, n = 48, r = S.R ? S.R.r : new Float64Array(n);
      g.strokeStyle = css('--line'); g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.stroke();
      for (let p = 0; p < 8; p++) { const a = p / 8 * 2 * Math.PI; g.fillStyle = css('--muted'); g.font = '600 12px ' + css('--mono'); g.textAlign = 'center'; g.fillText(String(p + 1), cx + Math.cos(a) * (rad + 22), cy + Math.sin(a) * (rad + 22) + 4); }
      const acc = css('--accent');
      for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad; g.fillStyle = css('--bg'); g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
        g.globalAlpha = Math.min(1, r[i]); g.fillStyle = acc; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.globalAlpha = 1; g.strokeStyle = css('--line'); g.stroke(); }
      const ph = phase();
      if (ph === 'ponto') { const a = S.pos / 8 * 2 * Math.PI; g.fillStyle = css('--you'); g.beginPath(); g.arc(cx + Math.cos(a) * rad * 0.62, cy + Math.sin(a) * rad * 0.62, 11, 0, 7); g.fill(); }
      g.fillStyle = css('--fg'); g.font = '700 14px ' + css('--body'); g.textAlign = 'center';
      g.fillText(ph === 'ponto' ? 'ponto!' : ph === 'atraso' ? `atraso: ${fmt((S.t - T.pre - T.cue) * L.RING.msPorPasso / 1000, 1)} s` : ph === 'resposta' ? 'onde estava?' : '', cx, cy + 5);
      if (ph === 'resposta' && S.verdict === 'certo') { const a = S.read.pos / 8 * 2 * Math.PI; g.strokeStyle = css('--ok'); g.lineWidth = 3; g.beginPath(); g.moveTo(cx + Math.cos(a) * 20, cy + 10 + Math.sin(a) * 20); g.lineTo(cx + Math.cos(a) * rad * 0.8, cy + Math.sin(a) * rad * 0.8); g.stroke(); }
      g.textAlign = 'left';
      raster();
    }
    function raster() {
      const { g, W, H: Hh } = surface($('ras'), 0.42), m = { l: 8, r: 8, t: 18, b: 16 }, n = 48, hist = S.R ? S.R.hist : [];
      g.fillStyle = css('--muted'); g.font = '600 11.5px ' + css('--mono'); g.fillText('neurônios (vertical) × tempo →', m.l, 12);
      const cw = (W - m.l - m.r) / TT, ch = (Hh - m.t - m.b) / n, acc = css('--accent');
      g.fillStyle = css('--bg'); g.fillRect(m.l, m.t, W - m.l - m.r, Hh - m.t - m.b);
      g.fillStyle = 'rgba(240,166,69,.25)'; g.fillRect(m.l + T.pre * cw, m.t, T.cue * cw, Hh - m.t - m.b);
      g.fillStyle = acc; hist.forEach((r, t) => { for (let i = 0; i < n; i++) if (r[i] > 0.05) { g.globalAlpha = Math.min(1, r[i]); g.fillRect(m.l + t * cw, m.t + i * ch, Math.max(1, cw + 0.3), ch + 0.3); } }); g.globalAlpha = 1;
      g.fillStyle = css('--muted'); g.font = '11px ' + css('--body'); g.fillText('ponto', m.l + T.pre * cw, Hh - 3); g.fillText('atraso (3 s)', m.l + (T.pre + T.cue + 20) * cw, Hh - 3);
    }
    function go() {
      if (stop) stop(); S.pos = L.RING.posOf(S.seed); S.R = H.Ring({ g: L.RING.forcas[S.forca], seed: S.seed }); S.t = 0; S.verdict = null; S.busy = true; $('sd').textContent = `semente ${S.seed}`;
      $('res').className = 'a9res'; $('res').textContent = `O ponto aparece na posição ${S.pos + 1}…`;
      let alive = true; stop = () => { alive = false; S.busy = false; };
      const loop = () => { if (!alive) return;
        for (let k = 0; k < opt.per && S.t < TT; k++) { const ph = phase(); S.R.step(ph === 'ponto' ? S.pos : null); S.t++; }
        if (S.t >= TT) { alive = false; S.busy = false; S.read = S.R.read(); S.verdict = L.RING.verdict(S.read, S.pos);
          const v = S.verdict; $('res').className = 'a9res ' + (v === 'certo' ? 'ok' : 'bad');
          $('res').textContent = v === 'sumiu' ? `A atividade sumiu no atraso: a rede esqueceu (o ponto estava em ${S.pos + 1}).` : v === 'espalhou' ? `O anel inteiro acendeu: a rede perdeu a posição (o ponto estava em ${S.pos + 1}).` :
            v === 'certo' ? `A bolha ficou no lugar: a rede aponta para ${fmt(S.read.pos + 1, 1)} (o ponto estava em ${S.pos + 1}).` : `A bolha andou: a rede aponta para ${fmt(S.read.pos + 1, 1)} (o ponto estava em ${S.pos + 1}).`; }
        else if (phase() === 'atraso') $('res').textContent = 'O ponto sumiu. Atraso…';
        draw(); if (alive) raf(loop); };
      raf(loop);
    }
    host.querySelectorAll(`[name="${id}f"]`).forEach(r => r.addEventListener('change', () => { S.forca = r.value; go(); }));
    $('go').addEventListener('click', go); $('semente').addEventListener('click', () => { S.seed++; go(); });
    root.addEventListener('resize', draw); draw(); $('sd').textContent = `semente ${S.seed}`;
    const api = { S, go, busy: () => S.busy, forca: (f) => { S.forca = f; host.querySelector(`[name="${id}f"][value="${f}"]`).checked = true; go(); } };
    host.sim = api; return api;
  }

  // ======================= Extra (projetor) · Hopfield moderna / atenção =======================
  function AttnSim(host, opt) {
    opt = Object.assign({ seed: 3 }, opt || {}); const id = 'a9a' + (UID++); const names = L.ATT.nomes, P = names.map(L.pat);
    host.innerHTML = `<div class="a9sim">
      ${seg(id + 'q', names.map((k, i) => [String(i), D[k].nome]), '0', 'Consulta a partir de')}
      <label class="a9rng">Ruído na consulta <output data-k="no">40%</output><input type="range" data-k="noise" min="0" max="60" step="5" value="40"></label>
      <label class="a9rng">Nitidez (β): 0 = média de tudo; alto = só a mais parecida <output data-k="bo">8</output><input type="range" data-k="beta" min="0" max="40" step="1" value="8"></label>
      <div class="a9pair"><div><h4>consulta</h4><canvas class="grid" data-k="q"></canvas></div><div><h4>o que volta (média ponderada das memórias)</h4><canvas class="grid" data-k="o"></canvas></div></div>
      <div class="a9bars" data-k="w"></div>
      <p class="a9note">Cada memória ganha um peso: softmax(β × semelhança com a consulta). A saída é a média das memórias com esses pesos. A camada de atenção dos Transformers pode ser lida como um passo de lembrança de uma Hopfield moderna como esta: a consulta (<i>query</i>) puxa as memórias (<i>keys</i>) mais parecidas (Ramsauer et al., 2020).</p>
      <div class="a9btns"><button class="ghost" data-k="semente">Outra semente</button></div>
    </div>`;
    const $ = (k) => host.querySelector(`[data-k="${k}"]`); const S = { i: 0, noise: 0.4, beta: 8, seed: opt.seed, q: null };
    function upd() { S.q = H.flip(P[S.i], S.noise, H.rng(S.seed * 97 + S.i)); draw(); }
    function draw() { const r = H.modern(P, S.q, S.beta); S.r = r;
      let s = surface($('q'), 1); drawGrid(s.g, 0, 0, s.W, S.q); s = surface($('o'), 1); drawGrid(s.g, 0, 0, s.W, r.out, { cont: true });
      $('w').innerHTML = r.w.map((w, k) => `<div class="a9bar"><span>${esc(D[names[k]].nome)}</span><span class="tr"><i style="left:0;width:${100 * w}%"></i></span><span>${Math.round(100 * w)}%</span></div>`).join(''); }
    host.querySelectorAll(`[name="${id}q"]`).forEach(r => r.addEventListener('change', () => { S.i = +r.value; upd(); }));
    $('noise').addEventListener('input', () => { S.noise = +$('noise').value / 100; $('no').textContent = $('noise').value + '%'; upd(); });
    $('beta').addEventListener('input', () => { S.beta = +$('beta').value; $('bo').textContent = $('beta').value; draw(); });
    $('semente').addEventListener('click', () => { S.seed++; upd(); }); root.addEventListener('resize', draw); upd();
    const api = { S, draw, setBeta: (b) => { S.beta = b; $('beta').value = b; $('bo').textContent = b; draw(); } }; host.sim = api; return api;
  }

  root.A9UI = { DrawSim, LesionSim, MorphSim, WordList, BreakSim, RingSim, AttnSim, whenVisible, drawGrid, thumb, fmt };
})(window);
