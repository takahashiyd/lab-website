/* Modo professor (placar da turma e respostas). Só abre com o link secreto do professor (#p=CHAVE);
 * aqui fica apenas o hash SHA-256 da chave, que não permite descobri-la. */
(() => {
  const H = 'ade77932aa8d14aac860bb5971fd807430dae91c58ed9d7e136b2b33fe023443';
  let ok = false;
  window.ncProf = () => ok;
  async function check() {
    const m = location.hash.match(/^#p=([\w-]+)/);
    let v = false;
    if (m && window.crypto && crypto.subtle) {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m[1]));
      v = [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('') === H;
    }
    const mudou = v !== ok; ok = v;
    if (mudou) window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  window.addEventListener('hashchange', e => { if (e.isTrusted) check(); });
  check();
})();
