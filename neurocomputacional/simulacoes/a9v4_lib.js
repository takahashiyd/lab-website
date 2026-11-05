// Aula 9 (v4) — cenários das atividades (sem desenho na tela). Depende de hop_core.js e desenhos.js.
// A página do celular, o projetor e o teste (test_a9v4.py) usam estas mesmas funções: o que o teste confere é o que o aluno vê.
(function (root) {
  'use strict';
  const H = root.HOP, D = root.DESENHOS;
  const pat = (k) => D[k].v.slice();

  // ---------- Atividade 2: as 3 memórias (casa, coração, nota musical: |r| ≤ 0,10 entre si) ----------
  const A2 = { nomes: ['casa', 'coracao', 'nota'], seed: 1 };
  A2.pats = () => A2.nomes.map(pat);
  A2.W = () => H.hebb(A2.pats());
  // pistas reproduzíveis: o sorteio depende da semente e do tipo de pista
  const KIND = { ruido: 11, metade: 23, rabisco: 37 };
  function cue(kind, p, opt, seed) {
    const rnd = H.rng(seed * 1009 + (KIND[kind] || 1) + Math.round(100 * (opt.frac || 0)));
    if (kind === 'ruido') return H.flip(p, opt.frac, rnd);
    if (kind === 'metade') return H.erase(p, 'cima');
    if (kind === 'rabisco') return H.randPat(p.length, rnd);
    return p.slice();
  }
  // lembra até parar (ou até maxSweeps); devolve o Runner (estado final em R.s, energia em R.E)
  const recall = (W, s, seed, opt) => H.Runner(W, s, Object.assign({ seed: seed * 7919 + 1 }, opt || {})).run((opt && opt.maxSweeps) || 50);

  // ---------- Atividade 3 (i): lesão de CA3 = todas as ligações recorrentes cortadas ----------
  // ---------- Atividade 3 (ii): caixa que muda de forma (Wills et al., 2005; modelo) ----------
  // 2 mapas de 100 células de lugar (±1 ao acaso, ≈ 1/3 das células trocam entre os mapas).
  // Pista da forma λ (0 = quadrado … 1 = círculo): nas células em que os mapas diferem, cada uma segue o círculo com probabilidade λ; 10% de ruído.
  const WILLS = { N: 100, seed: 2005, formas: ['quadrado', '', '', 'meio do caminho', '', '', 'círculo'] };
  WILLS.maps = (seed) => { const r = H.rng(seed || WILLS.seed); const Q = H.randPat(WILLS.N, r), C = Q.map(v => r() < 1 / 3 ? -v : v); return { Q, C, W: H.hebb([Q, C]) }; };
  WILLS.cue = (M, lam, rnd) => M.Q.map((v, i) => { let x = v === M.C[i] ? v : (rnd() < lam ? M.C[i] : v); return rnd() < 0.1 ? -x : x; });
  WILLS.trial = (M, j, rnd) => { const lam = j / 6, c = WILLS.cue(M, lam, rnd), R = H.Runner(M.W, c, { rnd }).run(40);
    const mq = H.overlap(R.s, M.Q), mc = H.overlap(R.s, M.C); return { cue: c, s: R.s, R, cq: H.overlap(c, M.Q), cc: H.overlap(c, M.C), mq, mc, mapa: mq >= 0.98 ? 'Q' : mc >= 0.98 ? 'C' : 'outro' }; };
  WILLS.sweep = (M, n, seed) => { const rnd = H.rng(seed || 1); const out = []; for (let j = 0; j <= 6; j++) { let q = 0, c = 0, o = 0, cue = 0;
    for (let t = 0; t < n; t++) { const x = WILLS.trial(M, j, rnd); cue += (1 + x.cq) / 2; if (x.mapa === 'Q') q++; else if (x.mapa === 'C') c++; else o++; }
    out.push({ j, q: q / n, c: c / n, outro: o / n, cue: cue / n }); } return out; };

  // ---------- Atividade 4: lista DRM (para trocar de lista, troque só este objeto) ----------
  const DRM = {
    fonte: 'Lista "Música" das normas brasileiras de Stein, Feix & Rohenkohl (2006), Anexo A (reconhecimento falso de 81% nas normas)',
    critica: 'música',
    lista: ['som', 'dança', 'disco', 'ritmo', 'melodia', 'cantor', 'letra', 'rádio', 'violão', 'instrumentos', 'notas', 'harmonia', 'ouvir', 'voz', 'guitarra'],
    // teste de reconhecimento: s = estudada, x = crítica (não vale ponto), n = não relacionada
    teste: [['som', 's'], ['janela', 'n'], ['rádio', 's'], ['montanha', 'n'], ['melodia', 's'], ['música', 'x'], ['garfo', 'n'], ['instrumentos', 's'], ['bicicleta', 'n'], ['voz', 's'], ['tesoura', 'n'], ['violão', 's']],
    ms: 1500, // tempo de cada palavra na tela (1,5 s por palavra)
  };

  // ---------- Atividade 5: quebre a memória (cada caso: rede boa × quebrada, com a mesma semente) ----------
  const MIX = () => { const P = A2.pats(); return P[0].map((_, i) => Math.sign(P[0][i] + P[1][i] + P[2][i])); };
  function buildNet(cfg, seed) {
    const rnd = H.rng(seed * 104729 + 17);
    let names = cfg.nomes || A2.nomes, P = names.map(pat), labels = names.map(k => D[k].nome);
    if (cfg.extra) { for (let k = 0; k < cfg.extra; k++) P.push(H.randPat(100, rnd)); }
    let W = H.hebb(P);
    if (cfg.dilui) W = H.dilute(W, cfg.dilui, rnd);
    if (cfg.assim) W = H.asym(W, cfg.assim, rnd);
    let s;
    const alvo = cfg.alvo !== undefined ? cfg.alvo : 0;
    if (cfg.pista === 'mistura') { s = MIX(); H.perm(100, rnd).slice(0, cfg.trocas || 0).forEach(i => { s[i] = -s[i]; }); }
    else if (cfg.pista === 'inteira') s = P[alvo].slice();
    else s = H.flip(P[alvo], cfg.ruido === undefined ? 0.2 : cfg.ruido, rnd);
    return { P: P.slice(0, names.length), Pall: P, labels, W, s, alvo, cfg, rnd };
  }
  const BOA = { nomes: A2.nomes, ruido: 0.2 };
  const CASOS = {
    a: { rot: 'Guardar demais', good: BOA, bad: { nomes: A2.nomes, extra: 22, ruido: 0.2 }, gl: '3 memórias', bl: '25 memórias' },
    b: { rot: 'Desenhos parecidos', good: BOA, bad: { nomes: ['coracao', 'gato', 'peixe'], alvo: 1, ruido: 0.2 }, gl: 'casa, coração, nota', bl: 'coração, gato, peixe' },
    c: { rot: 'Pista ambígua', good: BOA, bad: { nomes: A2.nomes, pista: 'mistura', trocas: 2 }, gl: 'pista: casa', bl: 'pista: maioria dos 3' },
    d: { rot: 'Assimétricas', good: BOA, bad: { nomes: A2.nomes, ruido: 0.2, assim: 1 }, gl: 'simétricas', bl: 'assimétricas' },
    e: { rot: 'Apagar 50%', good: BOA, bad: { nomes: A2.nomes, ruido: 0.2, dilui: 0.5 }, gl: 'todas as ligações', bl: 'metade apagada' },
    f: { rot: 'Ruído alto', good: { nomes: A2.nomes, pista: 'inteira' }, bad: { nomes: A2.nomes, pista: 'inteira', T: 1.2, sweeps: 40 }, gl: 'sem ruído', bl: 'ruído alto (T = 1,2)' },
    g: { rot: 'Pouco ruído', good: { nomes: A2.nomes, pista: 'mistura', trocas: 0 }, bad: { nomes: A2.nomes, pista: 'mistura', trocas: 0, T: 0.4, sweeps: 20, esfria: true }, gl: 'sem ruído', bl: 'pouco ruído (T = 0,4), depois sem' },
  };
  // roda um lado de um caso até o fim (sem animação); devolve o resumo
  function runSide(cfg, seed) {
    const net = buildNet(cfg, seed), R = H.Runner(net.W, net.s, { rnd: net.rnd, T: cfg.T || 0 });
    if (cfg.T) { for (let k = 0; k < (cfg.sweeps || 40); k++) R.sweep(); }
    let F = R; if (cfg.esfria) { F = H.Runner(net.W, R.s, { rnd: net.rnd }).run(50); }
    else if (!cfg.T) R.run(60);
    return summary(net, F, cfg);
  }
  function summary(net, R, cfg) {
    const c = H.classify(R.s, net.P, net.labels), ms = net.P.map(p => H.overlap(R.s, p));
    let up = false; for (let i = 1; i < R.E.length; i++) if (R.E[i] > R.E[i - 1] + 1e-9) up = true;
    const parou = !cfg.T || cfg.esfria ? R.stable() : false;
    const mix = H.same(R.s, MIX());
    return { s: R.s, tipo: c.tipo, nome: c.nome, idx: c.idx, m: c.m, ms, parou, sobe: up, mistura3: mix, sweeps: R.sweeps, alvo: net.alvo, mAlvo: ms[net.alvo] };
  }

  // ---------- Atividade 6: anel de memória de trabalho ----------
  const RING = { forcas: { fraca: 0.4, medida: 0.7, forte: 2 }, T: { pre: 20, cue: 40, delay: 300 }, msPorPasso: 10 };
  RING.trial = (forca, pos, seed) => H.ringTrial({ g: RING.forcas[forca], seed }, pos, RING.T);
  RING.verdict = (rd, pos) => rd.amp < 0.05 ? 'sumiu' : (rd.frac > 0.8 || rd.conc < 0.3) ? 'espalhou' : (H.posErr(rd.pos, pos) <= 0.5 ? 'certo' : 'errado');
  RING.posOf = (seed) => Math.floor(H.rng(seed * 31 + 5)() * 8);

  // ---------- extra do projetor: Hopfield moderna / atenção ----------
  const ATT = { nomes: ['casa', 'coracao', 'gato', 'nota', 'sol', 'peixe'] };

  root.A9L = { A2, cue, recall, WILLS, DRM, MIX, buildNet, CASOS, runSide, summary, RING, ATT, pat };
})(window);
