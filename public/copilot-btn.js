// Botón flotante "Volver al Copiloto" — se inyecta en todos los dashboards
// Incluir con: <script src="/copilot-btn.js"></script>
(function () {
  // Si corre dentro de un iframe (workspace embebido), no inyectar
  if (window.self !== window.top) return;
  const style = document.createElement('style');
  style.textContent = `
    #nova-copilot-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #0C1525;
      border: 1px solid rgba(201,169,110,0.35);
      border-radius: 50px;
      color: #C9A96E;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,110,0.1);
      transition: all 0.2s ease;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    #nova-copilot-btn:hover {
      background: #121E30;
      border-color: rgba(201,169,110,0.6);
      box-shadow: 0 6px 32px rgba(0,0,0,0.6), 0 0 20px rgba(201,169,110,0.1);
      transform: translateY(-2px);
      color: #D4B882;
    }
    #nova-copilot-btn:active { transform: translateY(0); }
    #nova-copilot-btn .btn-icon {
      font-size: 15px;
      line-height: 1;
    }
    @media (max-width: 600px) {
      #nova-copilot-btn {
        bottom: 16px;
        right: 16px;
        padding: 10px 14px;
      }
      #nova-copilot-btn .btn-label { display: none; }
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('a');
  btn.id = 'nova-copilot-btn';
  btn.href = '/workspace';
  btn.title = 'Volver al Copiloto Nova';
  btn.innerHTML = '<span class="btn-icon">✦</span><span class="btn-label">Nova Copiloto</span>';

  // Esperar a que el DOM esté listo
  if (document.body) {
    document.body.appendChild(btn);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(btn));
  }
})();
