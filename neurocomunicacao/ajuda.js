/* Ajuda dos laboratórios: o link "Ver a resposta" só aparece depois que o aluno faz o exercício.
 * Exercício feito = um quadro de resultado (.result que começa escondido) ficou visível;
 * sem quadro de resultado = o aluno tocou num botão da seção; sem botões = resposta sempre disponível.
 * Guarda no celular (localStorage nc-feito-AULA-ID) para a página de respostas e para as próximas visitas. */
(() => {
  const AULA = Number(document.currentScript && document.currentScript.dataset.aula) || 0;
  const chave = id => `nc-feito-${AULA}-${id}`;
  const le = k => { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } };
  const grava = k => { try { localStorage.setItem(k, '1'); } catch (e) {} };
  const visivel = el => !el.hidden && getComputedStyle(el).display !== 'none';

  document.querySelectorAll('section.exp').forEach(sec => {
    const link = sec.querySelector('.ajuda a[data-resp]');
    if (!link) return;
    const aviso = sec.querySelector('.ajuda .trava');
    const libera = () => { grava(chave(sec.id)); link.hidden = false; if (aviso) aviso.hidden = true; };
    const results = [...sec.querySelectorAll('.result')].filter(r => r.hidden);
    const temBotao = !!sec.querySelector('button');
    if (!results.length && !temBotao) { link.hidden = false; if (aviso) aviso.hidden = true; return; }
    if (le(chave(sec.id))) { libera(); return; }
    link.hidden = true; if (aviso) aviso.hidden = false;
    if (results.length) {
      const obs = new MutationObserver(() => { if (results.some(visivel)) { libera(); obs.disconnect(); } });
      results.forEach(r => obs.observe(r, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] }));
    } else {
      sec.addEventListener('click', e => { if (e.target.closest('button')) libera(); }, { once: false });
    }
  });
})();
