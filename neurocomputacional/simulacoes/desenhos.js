// Aula 9 (v4) — desenhos 10 × 10 (100 neurônios; '#' = ligado/preto = +1, '.' = desligado/branco = −1).
// Fonte: fontes/figs_aula9v4/desenhos_10x10.json (o mesmo das figuras dos slides; gerado por make_aula9_v4_figs.py).
// Cópia idêntica em site_neurocomputacional/simulacoes/desenhos.js. Conferido em fontes/test_a9v4.py:
// os 3 da Atividade 2 (casa, coração, nota musical) têm |r| ≤ 0,10 entre si; o trio "parecido" da Atividade 5 b
// é coração, gato e peixe (coração × gato r = 0,60; coração × peixe 0,54; gato × peixe 0,45). Evitar árvore como desenho principal.
(function (root) {
  const D = {
    casa: { nome: 'casa', px: [
      '....##....',
      '...####...',
      '..######..',
      '.########.',
      '##########',
      '.#......#.',
      '.#.##...#.',
      '.#.##.#.#.',
      '.#.##...#.',
      '.########.'] },
    coracao: { nome: 'coração', px: [
      '..........',
      '.##....##.',
      '####..####',
      '##########',
      '##########',
      '.########.',
      '..######..',
      '...####...',
      '....##....',
      '..........'] },
    arvore: { nome: 'árvore', px: [
      '....##....',
      '...####...',
      '..######..',
      '.########.',
      '..######..',
      '.########.',
      '##########',
      '....##....',
      '....##....',
      '...####...'] },
    gato: { nome: 'gato', px: [
      '.#......#.',
      '.##....##.',
      '.########.',
      '##.####.##',
      '##########',
      '###.##.###',
      '.########.',
      '..######..',
      '...#..#...',
      '..........'] },
    guarda_chuva: { nome: 'guarda-chuva', px: [
      '....##....',
      '..######..',
      '.########.',
      '##########',
      '#.#.##.#.#',
      '....##....',
      '....##....',
      '....##....',
      '.#..##....',
      '..##......'] },
    nota: { nome: 'nota musical', px: [
      '.....####.',
      '.....#####',
      '.....#..##',
      '.....#....',
      '.....#....',
      '.....#....',
      '..####....',
      '.#####....',
      '.#####....',
      '..###.....'] },
    sol: { nome: 'sol', px: [
      '#...##...#',
      '.#......#.',
      '...####...',
      '..######..',
      '#.######.#',
      '#.######.#',
      '..######..',
      '...####...',
      '.#......#.',
      '#...##...#'] },
    peixe: { nome: 'peixe', px: [
      '..........',
      '..####....',
      '.######..#',
      '########.#',
      '##.#######',
      '##########',
      '########.#',
      '.######..#',
      '..####....',
      '..........'] },
  };
  Object.keys(D).forEach(k => { D[k].id = k; D[k].v = D[k].px.join('').split('').map(c => c === '#' ? 1 : -1); });
  root.DESENHOS = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
