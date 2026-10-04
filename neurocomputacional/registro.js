/* Registro de presença e de atividades — Neurociência Computacional (UFRN)
 * Uso no fim de cada página de atividades:
 *   <script src="config.js"></script>
 *   <script src="registro.js" data-aula="1"></script>
 * O aluno se identifica uma vez (nome + matrícula do SIGAA, guardados no aparelho).
 * Registra: presença (ao se identificar ou abrir a página já identificado) e cada envio de atividade,
 * via window.Registro.atividade(id, titulo, destaques, resposta).
 * Os eventos ficam numa fila no aparelho e são enviados ao Google Apps Script em window.REGISTRO_URL.
 * Se o endereço ainda não estiver configurado, a fila é guardada e enviada depois.
 */
(() => {
  const SCRIPT = document.currentScript;
  const AULA = Number(SCRIPT && SCRIPT.dataset.aula) || 0;
  const CURSO = 'Neurociência Computacional';
  const URL_ = String(window.REGISTRO_URL || '').trim();
  const K_ID = 'ncomp-aluno', K_Q = 'ncomp-fila', K_DEV = 'ncomp-disp';

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
    const e = Object.assign({ ts: new Date().toISOString(), data: hoje(), curso: CURSO, aula: AULA, tipo, disp }, extra || {});
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

  function presenca() {
    if (!aluno) return;
    const k = `ncomp-pres-${AULA}-${hoje()}-${aluno.m}`;
    if (store.get(k, false)) return;
    store.set(k, true);
    registrar('presença', { titulo: document.title });
  }

  /* ---------- cartão de identificação ---------- */
  const raiz = document.getElementById('student') || document.body;
  const card = document.createElement('section');
  card.className = 'nc-id'; card.id = 'identificacao';
  card.innerHTML = `
    <div class="nc-form">
      <h2>Identifique-se</h2>
      <p class="nc-lead">Digite seu nome e sua matrícula do SIGAA. Eles ficam guardados neste aparelho e registram sua presença e as atividades que você enviar.</p>
      <div class="nc-row">
        <label>Matrícula (SIGAA)<input id="nc-m" inputmode="numeric" autocomplete="off" maxlength="16" placeholder="só números"></label>
        <label>Nome completo<input id="nc-n" autocomplete="name" maxlength="80"></label>
      </div>
      <p class="nc-err" id="nc-err" role="alert"></p>
      <button id="nc-ok">Registrar presença</button>
      <p class="nc-priv">Seu nome, sua matrícula, o horário e suas respostas são enviados só ao professor da disciplina, para registro de presença e participação.</p>
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
    card.querySelector('.nc-form').hidden = !!aluno;
    card.querySelector('.nc-who').hidden = !aluno;
    card.classList.toggle('nc-in', !!aluno);
    if (aluno) { $('nc-nome').textContent = aluno.n; $('nc-mat').textContent = aluno.m; }
    status();
    document.dispatchEvent(new CustomEvent('registro:aluno', { detail: aluno }));
  }
  function status() {
    const el = $('nc-fila'); if (!el) return;
    const n = fila.length;
    el.textContent = !URL_ ? (n ? `${n} registro${n > 1 ? 's' : ''} guardado${n > 1 ? 's' : ''} neste aparelho` : '') :
      n ? `${n} registro${n > 1 ? 's' : ''} aguardando conexão…` : '';
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
  $('nc-troca').onclick = () => { aluno = null; store.del(K_ID); $('nc-m').value = ''; $('nc-n').value = ''; desenha(); $('nc-m').focus(); };

  function pedeId() {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('nc-flash'); void card.offsetWidth; card.classList.add('nc-flash');
  }

  /* ---------- API usada pela página ---------- */
  window.Registro = {
    identificado: () => !!aluno,
    aluno: () => aluno,
    pedeId,
    atividade(id, titulo, destaques, resposta) {
      if (!aluno) { pedeId(); return false; }
      registrar('atividade', { exp: id, titulo, destaques: limpa(destaques), resposta: String(resposta || '').slice(0, 3000) });
      return true;
    },
  };

  desenha();
  presenca();
  enviar();
})();
