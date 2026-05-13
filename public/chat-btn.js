// Widget de chat Nova — PRO LIG Corredora de Propiedades
// Se inyecta en todas las páginas públicas como panel flotante
(function () {
  if (window.self !== window.top) return;

  const SID = 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  let ocupado = false;
  let abierto = false;
  let iniciado = false;

  // ── Fuentes (si no están ya cargadas) ────────────────────────────────────
  if (!document.querySelector('link[href*="Playfair+Display"]')) {
    const lnk = document.createElement('link');
    lnk.rel = 'stylesheet';
    lnk.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap';
    document.head.appendChild(lnk);
  }

  // ── Estilos ──────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #nova-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 9990;
      width: 56px; height: 56px; border-radius: 50%;
      background: #1a3320;
      border: 1.5px solid rgba(46,125,50,0.5);
      box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 0 rgba(46,125,50,0.3);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.3s;
      animation: nova-pulse 3s ease-in-out infinite;
    }
    @keyframes nova-pulse {
      0%,100% { box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 0 rgba(46,125,50,0.25); }
      50%      { box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 10px rgba(46,125,50,0); }
    }
    #nova-fab:hover { transform: scale(1.08); }
    #nova-fab.open { animation: none; background: #0d1410; border-color: rgba(245,240,232,0.12); }
    #nova-fab svg { transition: opacity 0.15s, transform 0.2s; }
    #nova-fab .ico-chat { position: absolute; }
    #nova-fab .ico-close { position: absolute; opacity: 0; transform: rotate(-90deg); }
    #nova-fab.open .ico-chat { opacity: 0; transform: rotate(90deg); }
    #nova-fab.open .ico-close { opacity: 1; transform: rotate(0deg); }

    #nova-panel {
      position: fixed; bottom: 92px; right: 24px; z-index: 9989;
      width: 360px; height: 540px;
      background: #07090a;
      border: 1px solid rgba(245,240,232,0.08);
      border-radius: 16px;
      display: flex; flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(46,125,50,0.1);
      transform: translateY(20px) scale(0.96); opacity: 0;
      pointer-events: none;
      transition: transform 0.28s cubic-bezier(0.23,1,0.32,1), opacity 0.28s cubic-bezier(0.23,1,0.32,1);
    }
    #nova-panel.open {
      transform: translateY(0) scale(1); opacity: 1;
      pointer-events: all;
    }

    /* Header */
    .nv-header {
      background: #1a3320;
      padding: 14px 16px;
      display: flex; align-items: center; gap: 11px;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(46,125,50,0.2);
    }
    .nv-avatar {
      width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #2e7d32 0%, #1a3320 100%);
      border: 1.5px solid rgba(76,175,80,0.4);
      display: flex; align-items: center; justify-content: center;
    }
    .nv-avatar svg { width: 20px; height: 20px; }
    .nv-info { flex: 1; min-width: 0; }
    .nv-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14px; font-weight: 500; font-style: italic;
      color: #f5f0e8; line-height: 1.2;
    }
    .nv-sub {
      font-size: 10.5px; color: rgba(245,240,232,0.45);
      letter-spacing: 0.04em; margin-top: 1px;
    }
    .nv-status {
      display: flex; align-items: center; gap: 5px;
      font-size: 10px; color: #4caf50; letter-spacing: 0.06em;
    }
    .nv-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #4caf50;
      box-shadow: 0 0 6px rgba(76,175,80,0.6);
    }

    /* Chips */
    .nv-chips {
      display: flex; gap: 5px; padding: 8px 12px;
      overflow-x: auto; flex-shrink: 0;
      background: #0d1410;
      border-bottom: 1px solid rgba(245,240,232,0.05);
      scrollbar-width: none;
    }
    .nv-chips::-webkit-scrollbar { display: none; }
    .nv-chip {
      white-space: nowrap; padding: 4px 11px;
      border-radius: 20px; border: 1px solid rgba(46,125,50,0.3);
      background: transparent; font-size: 11px; color: rgba(245,240,232,0.55);
      cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif;
      transition: all 0.15s; flex-shrink: 0;
    }
    .nv-chip:hover { background: rgba(46,125,50,0.15); border-color: rgba(76,175,80,0.5); color: #4caf50; }

    /* Mensajes */
    .nv-msgs {
      flex: 1; overflow-y: auto; padding: 14px 12px;
      display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin; scrollbar-color: rgba(46,125,50,0.2) transparent;
    }
    .nv-row { display: flex; gap: 7px; align-items: flex-end; }
    .nv-row.user { flex-direction: row-reverse; }
    .nv-av {
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 9px;
    }
    .nv-av.nova {
      background: #1a3320; border: 1px solid rgba(46,125,50,0.4);
    }
    .nv-av.nova svg { width: 13px; height: 13px; }
    .nv-av.user { background: rgba(245,240,232,0.08); color: rgba(245,240,232,0.4); font-size: 10px; }
    .nv-burbuja {
      max-width: 80%; padding: 9px 13px;
      font-size: 13px; line-height: 1.6;
      border-radius: 14px;
    }
    .nv-burbuja.nova {
      background: #131c14; border: 1px solid rgba(46,125,50,0.18);
      color: rgba(245,240,232,0.88); border-bottom-left-radius: 4px;
    }
    .nv-burbuja.user {
      background: #2e7d32; color: #f5f0e8;
      border-bottom-right-radius: 4px;
    }
    .nv-burbuja a {
      color: #4caf50; text-decoration: none; border-bottom: 1px solid rgba(76,175,80,0.4);
    }
    .nv-typing {
      display: flex; gap: 4px; padding: 10px 13px;
      background: #131c14; border: 1px solid rgba(46,125,50,0.18);
      border-radius: 14px; border-bottom-left-radius: 4px; width: fit-content;
    }
    .nv-typing span {
      width: 5px; height: 5px; background: #4caf50; border-radius: 50%;
      animation: nv-bounce 1.1s infinite;
    }
    .nv-typing span:nth-child(2) { animation-delay: 0.18s; }
    .nv-typing span:nth-child(3) { animation-delay: 0.36s; }
    @keyframes nv-bounce {
      0%,60%,100% { transform: translateY(0); }
      30% { transform: translateY(-5px); }
    }

    /* Input */
    .nv-footer {
      padding: 10px 10px;
      border-top: 1px solid rgba(245,240,232,0.06);
      background: #0d1410;
      display: flex; gap: 7px; align-items: flex-end;
      flex-shrink: 0;
    }
    .nv-input {
      flex: 1; background: rgba(245,240,232,0.05);
      border: 1px solid rgba(245,240,232,0.1);
      border-radius: 10px; padding: 9px 12px;
      font-size: 13px; color: #f5f0e8;
      font-family: 'DM Sans', system-ui, sans-serif;
      resize: none; outline: none;
      min-height: 38px; max-height: 100px;
      line-height: 1.5; transition: border-color 0.2s;
    }
    .nv-input:focus { border-color: rgba(46,125,50,0.5); }
    .nv-input::placeholder { color: rgba(245,240,232,0.25); }
    .nv-send {
      width: 38px; height: 38px; border-radius: 9px;
      background: #2e7d32; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.2s, transform 0.1s;
    }
    .nv-send:hover { background: #4caf50; }
    .nv-send:active { transform: scale(0.93); }
    .nv-send:disabled { background: rgba(46,125,50,0.2); cursor: not-allowed; }
    .nv-send svg { width: 15px; height: 15px; }

    @media (max-width: 440px) {
      #nova-panel { right: 0; left: 0; bottom: 80px; width: 100%; border-radius: 16px 16px 0 0; height: 70vh; }
      #nova-fab { right: 16px; bottom: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ── SVG Nova (casa + hojas) ───────────────────────────────────────────────
  const SVG_NOVA = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" fill="#2e7d32" opacity="0.9"/>
    <path d="M9 22V13h6v9" stroke="#f5f0e8" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="18" cy="6" r="3" fill="#4caf50" opacity="0.7"/>
    <path d="M16.5 6c0-1.5 1.5-3 3-2" stroke="#f5f0e8" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  </svg>`;

  const SVG_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="#f5f0e8" stroke-width="2.2" stroke-linecap="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>`;

  const SVG_SEND = `<svg viewBox="0 0 24 24" fill="none" stroke="#f5f0e8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="#f5f0e8" stroke="none"/>
  </svg>`;

  // ── Botón flotante ────────────────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.id = 'nova-fab';
  fab.title = 'Hablar con Nova';
  fab.setAttribute('aria-label', 'Abrir chat Nova');
  fab.innerHTML = `
    <svg class="ico-chat" viewBox="0 0 24 24" fill="none" width="26" height="26">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" fill="#4caf50" opacity="0.85"/>
      <path d="M9 22V13h6v9" stroke="#f5f0e8" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="18.5" cy="5.5" r="3" fill="#1a3320" stroke="#4caf50" stroke-width="1.2"/>
      <path d="M17.5 5.5h2M18.5 4.5v2" stroke="#4caf50" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
    <svg class="ico-close" viewBox="0 0 24 24" fill="none" stroke="#f5f0e8" stroke-width="2.2" stroke-linecap="round" width="22" height="22">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  `;

  // ── Panel de chat ─────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'nova-panel';
  panel.innerHTML = `
    <div class="nv-header">
      <div class="nv-avatar">${SVG_NOVA}</div>
      <div class="nv-info">
        <div class="nv-name">Nova</div>
        <div class="nv-sub">Asistente PRO LIG · La Ligua</div>
      </div>
      <div class="nv-status"><div class="nv-dot"></div>En línea</div>
    </div>
    <div class="nv-chips" id="nv-chips">
      <button class="nv-chip" data-msg="¿Qué propiedades tienen disponibles?">Ver propiedades</button>
      <button class="nv-chip" data-msg="¿Cuánto cuesta arrendar en La Ligua?">Precios arriendo</button>
      <button class="nv-chip" data-msg="Quiero vender mi propiedad, ¿cómo funciona?">Vender</button>
      <button class="nv-chip" data-msg="¿Cómo agendar una visita?">Agendar visita</button>
    </div>
    <div class="nv-msgs" id="nv-msgs"></div>
    <div class="nv-footer">
      <textarea id="nv-txt" class="nv-input" placeholder="Escribe tu consulta…" rows="1"></textarea>
      <button class="nv-send" id="nv-send" title="Enviar">${SVG_SEND}</button>
    </div>
  `;

  // ── Insertar en DOM ───────────────────────────────────────────────────────
  function montar() {
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    document.getElementById('nv-txt').addEventListener('keydown', tecla);
    document.getElementById('nv-txt').addEventListener('input', crecer);
    document.getElementById('nv-send').addEventListener('click', enviar);
    document.querySelectorAll('.nv-chip').forEach(c => {
      c.addEventListener('click', () => sugerir(c.dataset.msg));
    });
    fab.addEventListener('click', togglePanel);
  }

  if (document.body) { montar(); }
  else { document.addEventListener('DOMContentLoaded', montar); }

  // ── Lógica del panel ──────────────────────────────────────────────────────
  function togglePanel() {
    abierto = !abierto;
    fab.classList.toggle('open', abierto);
    panel.classList.toggle('open', abierto);
    if (abierto && !iniciado) {
      iniciado = true;
      agregarMensaje('Hola, soy Nova, asistente de <strong>PRO LIG</strong>. Puedo ayudarte a encontrar propiedades, consultar precios o agendar visitas en La Ligua. ¿En qué te ayudo?', false);
    }
    if (abierto) setTimeout(() => document.getElementById('nv-txt').focus(), 300);
  }

  function agregarMensaje(html, esUser) {
    const msgs = document.getElementById('nv-msgs');
    const row = document.createElement('div');
    row.className = 'nv-row' + (esUser ? ' user' : '');
    const av = document.createElement('div');
    av.className = 'nv-av ' + (esUser ? 'user' : 'nova');
    av.innerHTML = esUser ? 'Tú' : SVG_NOVA;
    const b = document.createElement('div');
    b.className = 'nv-burbuja ' + (esUser ? 'user' : 'nova');
    b.innerHTML = html;
    row.appendChild(av);
    row.appendChild(b);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function mostrarTyping() {
    const msgs = document.getElementById('nv-msgs');
    const row = document.createElement('div');
    row.className = 'nv-row'; row.id = 'nv-typing';
    const av = document.createElement('div');
    av.className = 'nv-av nova'; av.innerHTML = SVG_NOVA;
    const t = document.createElement('div');
    t.className = 'nv-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    row.appendChild(av); row.appendChild(t);
    msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight;
  }

  function quitarTyping() {
    const el = document.getElementById('nv-typing');
    if (el) el.remove();
  }

  function formatearRespuesta(txt) {
    return txt
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s<"]+\/propiedad\/\d+)/g,
        '<br><a href="$1" target="_blank">📷 Ver ficha</a>')
      .replace(/(https?:\/\/wa\.me\/[^\s<"]+)/g,
        '<a href="$1" target="_blank">💬 WhatsApp</a>');
  }

  async function enviar() {
    if (ocupado) return;
    const txt = document.getElementById('nv-txt');
    const msg = txt.value.trim();
    if (!msg) return;
    txt.value = ''; txt.style.height = 'auto';
    agregarMensaje(msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'), true);
    mostrarTyping();
    ocupado = true;
    document.getElementById('nv-send').disabled = true;
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: msg, sesionId: SID })
      });
      const d = await r.json();
      quitarTyping();
      agregarMensaje(d.error ? 'Hubo un problema, intenta de nuevo.' : formatearRespuesta(d.respuesta), false);
    } catch (e) {
      quitarTyping();
      agregarMensaje('Error de conexión. Intenta de nuevo.', false);
    }
    ocupado = false;
    document.getElementById('nv-send').disabled = false;
    document.getElementById('nv-txt').focus();
  }

  function sugerir(msg) {
    if (!abierto) togglePanel();
    document.getElementById('nv-txt').value = msg;
    setTimeout(enviar, 100);
  }

  function tecla(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  function crecer(e) {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }
})();
