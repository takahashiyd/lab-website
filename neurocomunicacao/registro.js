/* Registro de presença e participação — Bases neurais da comunicação humana
 * Incluído no fim de cada laboratório:
 *   <script src="config.js"></script>
 *   <script src="registro.js" data-aula="8"></script>
 * O aluno se identifica uma vez (matrícula + nome, guardados no celular).
 * O script registra: presença (ao abrir a página identificado), início de cada experimento
 * (primeiro toque num botão da seção) e o resultado (texto do quadro "report" de cada experimento).
 * Os eventos ficam numa fila no celular e são enviados ao Google Apps Script em window.REGISTRO_URL.
 */
(() => {
  const SCRIPT = document.currentScript;
  const AULA = Number(SCRIPT && SCRIPT.dataset.aula) || 0;
  const URL_ = String(window.REGISTRO_URL || '').trim();
  const K_ID = 'nc-aluno', K_Q = 'nc-fila', K_DEV = 'nc-disp';

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();

  let aluno = store.get(K_ID, null);
  let fila = store.get(K_Q, []);
  let disp = store.get(K_DEV, null);
  if (!disp) { disp = Math.random().toString(36).slice(2, 10); store.set(K_DEV, disp); }

  /* ---------- envio ---------- */
  let enviando = false, retry = null;
  function registrar(tipo, extra) {
    const e = Object.assign({ ts: new Date().toISOString(), data: hoje(), aula: AULA, tipo, disp }, extra || {});
    if (aluno) { e.matricula = aluno.m; e.nome = aluno.n; }
    fila.push(e); store.set(K_Q, fila); enviar(); status();
  }
  async function enviar() {
    if (enviando || !aluno || !URL_ || !fila.length || navigator.onLine === false) return;
    enviando = true;
    const lote = fila.slice(0, 40).map(e => Object.assign({ matricula: aluno.m, nome: aluno.n }, e));
    try {
      await fetch(URL_, { method: 'POST', mode: 'no-cors', keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ v: 1, eventos: lote }) });
      fila = fila.slice(lote.length); store.set(K_Q, fila);
    } catch (err) {
      clearTimeout(retry); retry = setTimeout(enviar, 15000);
    } finally {
      enviando = false; status();
      if (fila.length && aluno && URL_ && navigator.onLine !== false) setTimeout(enviar, 300);
    }
  }
  window.addEventListener('online', enviar);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(); });

  /* ---------- presença ---------- */
  function presenca() {
    if (!aluno || /^#p=/.test(location.hash)) return;
    const k = `nc-pres-${AULA}-${hoje()}-${aluno.m}`;
    if (store.get(k, false)) return;
    store.set(k, true);
    registrar('presença', { titulo: document.title });
  }

  /* ---------- interface ---------- */
  const css = `
  .nc-id{background:var(--surface,#fff);border:2px solid var(--accent,#0e7c86);border-radius:14px;padding:18px 20px;display:grid;gap:12px}
  .nc-id.nc-in{border:0;padding:0;background:none}
  .nc-id h2{margin:0}
  .nc-id .nc-row{display:grid;gap:10px;grid-template-columns:1fr}
  @media (min-width:560px){.nc-id .nc-row{grid-template-columns:1fr 1.6fr}}
  .nc-id label{display:grid;gap:4px;font:600 14px/1.2 var(--body,system-ui)}
  .nc-id input{font:17px var(--body,system-ui);padding:12px;border:1.5px solid var(--line,#ccc);border-radius:10px;background:var(--bg,#fff);color:var(--fg,#111);min-height:48px;width:100%;box-sizing:border-box}
  .nc-id input:focus-visible{outline:3px solid var(--accent,#0e7c86);outline-offset:1px}
  .nc-id .nc-err{color:var(--warn,#a33a2a);font-size:14px;min-height:1em;margin:0}
  .nc-id .nc-priv{font-size:13px;color:var(--muted,#666);margin:0}
  .nc-who{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;font-size:15px;background:var(--soft,#e5f1f2);border-radius:10px;padding:10px 14px}
  .nc-who b{color:var(--fg,#111)}
  .nc-link{background:none!important;border:0!important;color:var(--accent,#0e7c86)!important;font:600 14px var(--body,system-ui)!important;padding:4px 0!important;min-height:0!important;text-decoration:underline;cursor:pointer}
  .nc-fila{font:500 13px var(--mono,monospace);color:var(--muted,#666)}
  .nc-ok{font:600 13px/1.3 var(--mono,monospace);color:var(--accent,#0e7c86);margin:0}
  .nc-ok.nc-pend{color:var(--you,#c9771a)}
  .nc-flash{animation:ncflash 1.2s 2}
  @keyframes ncflash{50%{box-shadow:0 0 0 6px var(--you,#c9771a)}}
  @media (prefers-reduced-motion:reduce){.nc-flash{animation:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const raiz = document.getElementById('student') || document.body;
  const card = document.createElement('section');
  card.className = 'nc-id'; card.id = 'identificacao';
  card.innerHTML = `
    <div class="nc-form">
      <h2>Quem é você?</h2>
      <p style="margin:6px 0 12px">Digite sua matrícula e seu nome. Eles ficam guardados neste celular e registram sua presença e seus resultados.</p>
      <div class="nc-row">
        <label>Matrícula<input id="nc-m" inputmode="numeric" autocomplete="off" maxlength="16" placeholder="só números"></label>
        <label>Nome completo<input id="nc-n" autocomplete="name" maxlength="80"></label>
      </div>
      <p class="nc-err" id="nc-err" role="alert"></p>
      <button id="nc-ok">Registrar presença</button>
      <p class="nc-priv" style="margin-top:10px">Seu nome, sua matrícula, o horário e os resultados dos experimentos são enviados só ao professor da disciplina, para registro de presença e participação.</p>
    </div>
    <div class="nc-who" hidden>
      <span>✓ Presença registrada · Aula ${AULA}</span>
      <span><b id="nc-nome"></b> · <span id="nc-mat"></span></span>
      <button class="nc-link" id="nc-troca">Não sou eu</button>
      <span class="nc-fila" id="nc-fila"></span>
    </div>`;
  const header = raiz.querySelector('header');
  if (header && header.parentNode === raiz) header.after(card); else raiz.prepend(card);
  const $ = id => document.getElementById(id);

  function desenha() {
    const form = card.querySelector('.nc-form'), who = card.querySelector('.nc-who');
    form.hidden = !!aluno; who.hidden = !aluno;
    card.classList.toggle('nc-in', !!aluno);
    if (aluno) { $('nc-nome').textContent = aluno.n; $('nc-mat').textContent = aluno.m; }
    status();
    document.querySelectorAll('.nc-ok.nc-pend').forEach(p => marca(p, true));
  }
  function status() {
    const el = $('nc-fila'); if (!el) return;
    const n = fila.length;
    el.textContent = !URL_ ? '(registro ainda não configurado pelo professor)' : n ? `${n} registro${n > 1 ? 's' : ''} aguardando conexão…` : '';
  }
  $('nc-ok').onclick = () => {
    const m = $('nc-m').value.replace(/\D/g, ''), n = limpa($('nc-n').value);
    if (m.length < 6) { $('nc-err').textContent = 'Confira a matrícula (só números, pelo menos 6 dígitos).'; $('nc-m').focus(); return; }
    if (n.length < 5 || n.split(' ').length < 2) { $('nc-err').textContent = 'Escreva nome e sobrenome.'; $('nc-n').focus(); return; }
    $('nc-err').textContent = '';
    aluno = { m, n }; store.set(K_ID, aluno);
    presenca(); desenha(); enviar();
  };
  $('nc-n').addEventListener('keydown', e => { if (e.key === 'Enter') $('nc-ok').click(); });
  $('nc-troca').onclick = () => {
    aluno = null; store.del(K_ID); $('nc-m').value = ''; $('nc-n').value = ''; desenha(); $('nc-m').focus();
  };

  function pedeId() {
    if (aluno) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('nc-flash'); void card.offsetWidth; card.classList.add('nc-flash');
  }

  /* ---------- captura dos experimentos ---------- */
  const infoSecao = el => {
    const sec = el.closest('section');
    const h = sec && sec.querySelector('h2');
    return { exp: sec && sec.id ? sec.id : '', titulo: h ? limpa(h.textContent) : '' };
  };
  const iniciados = new Set();
  raiz.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || card.contains(b)) return;
    const sec = b.closest('section.exp'); if (!sec) return;
    if (!aluno) pedeId();
    if (iniciados.has(sec.id)) return;
    iniciados.add(sec.id);
    registrar('início', infoSecao(sec));
  }, true);

  function marca(rep, refresh) {
    let p = refresh ? rep : rep.nextElementSibling;
    if (!refresh && !(p && p.classList.contains('nc-ok'))) { p = document.createElement('p'); p.className = 'nc-ok'; rep.after(p); }
    if (aluno) { p.classList.remove('nc-pend'); p.textContent = `✓ Resultado registrado para ${aluno.n.split(' ')[0]}.`; }
    else { p.classList.add('nc-pend'); p.innerHTML = 'Resultado guardado. <a href="#identificacao">Identifique-se no topo</a> para enviá-lo ao professor.'; }
  }
  raiz.querySelectorAll('.report').forEach(rep => {
    let ultimo = limpa(rep.textContent), t = null;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        const txt = limpa(rep.textContent);
        if (!txt || txt === ultimo) return;
        ultimo = txt;
        const destaques = [...rep.querySelectorAll('b')].map(b => limpa(b.textContent)).filter(Boolean).join(' · ');
        registrar('resultado', Object.assign(infoSecao(rep), { destaques, resposta: txt.slice(0, 1500) }));
        marca(rep);
      }, 1500);
    }).observe(rep, { childList: true, subtree: true, characterData: true });
  });

  desenha();
  presenca();
  enviar();
})();
