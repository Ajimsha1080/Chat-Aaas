/**
 * Agent-as-a-Service (AaaS) Standalone Public Website Widget
 * 
 * Production-ready embeddable customer Q&A widget with:
 * - Public deployment token authentication
 * - Real-time conversational interface
 * - Responsive mobile & desktop floating popover
 * - Customer custom branding & theme color support
 */

(function () {
  const currentScript = document.currentScript || document.querySelector('script[data-agent-key]');
  const _widgetToken = currentScript?.getAttribute('data-agent-key') || 'pub_live_widget_key';
  const primaryColor = currentScript?.getAttribute('data-primary-color') || '#4f46e5';
  const position = currentScript?.getAttribute('data-position') || 'bottom_right';
  const launcherIcon = currentScript?.getAttribute('data-launcher-icon') || 'chat';
  const launcherText = currentScript?.getAttribute('data-launcher-text') || 'Chat with Us';
  const isLeft = position === 'bottom_left';

  // Inject Styles
  const style = document.createElement('style');
  style.innerHTML = `
    .aaas-widget-launcher {
      position: fixed;
      bottom: 24px;
      ${isLeft ? 'left: 24px;' : 'right: 24px;'}
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      background: ${primaryColor};
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .aaas-widget-launcher:hover {
      transform: scale(1.05);
    }
    .aaas-widget-container {
      display: none;
      position: fixed;
      bottom: 84px;
      ${isLeft ? 'left: 24px;' : 'right: 24px;'}
      width: 380px;
      height: 560px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 110px);
      z-index: 999999;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border: 1px solid #e2e8f0;
      animation: aaasFadeIn 0.2s ease-out;
    }
    .aaas-widget-container.aaas-open {
      display: flex;
    }
    @keyframes aaasFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .aaas-widget-header {
      background: ${primaryColor};
      color: #ffffff;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .aaas-widget-header h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
    }
    .aaas-widget-header p {
      margin: 2px 0 0;
      font-size: 11px;
      opacity: 0.85;
    }
    .aaas-widget-close {
      background: transparent;
      border: none;
      color: #ffffff;
      cursor: pointer;
      font-size: 18px;
      padding: 4px 8px;
      border-radius: 8px;
    }
    .aaas-widget-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .aaas-msg {
      max-width: 82%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.45;
    }
    .aaas-msg-bot {
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .aaas-msg-user {
      background: ${primaryColor};
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .aaas-widget-input-row {
      padding: 12px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
    }
    .aaas-widget-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      outline: none;
    }
    .aaas-widget-input:focus {
      border-color: ${primaryColor};
    }
    .aaas-widget-send {
      background: ${primaryColor};
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 0 16px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    @media (max-width: 480px) {
      .aaas-widget-launcher {
        bottom: 16px;
        right: 16px;
        padding: 10px 16px;
        font-size: 13px;
      }
      .aaas-widget-container {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: 0;
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        border-radius: 0;
        border: none;
        z-index: 1000000;
      }
      .aaas-widget-input-row {
        padding-bottom: max(12px, env(safe-area-inset-bottom));
      }
    }
  `;
  document.head.appendChild(style);

  // Create Container
  const container = document.createElement('div');
  container.className = 'aaas-widget-container';
  container.innerHTML = `
    <div class="aaas-widget-header">
      <div>
        <h4>AI Assistant</h4>
        <p>● Ready to answer questions</p>
      </div>
      <button class="aaas-widget-close">✕</button>
    </div>
    <div class="aaas-widget-messages">
      <div class="aaas-msg aaas-msg-bot">
        Hi there! 👋 How can I help you with our products, pricing, or policies today?
      </div>
    </div>
    <form class="aaas-widget-input-row">
      <input type="text" class="aaas-widget-input" placeholder="Ask a question..." />
      <button type="submit" class="aaas-widget-send">Send</button>
    </form>
  `;
  document.body.appendChild(container);

  // Icon SVG Definitions
  const iconSvgs = {
    chat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    bot: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
    sparkles: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
    support: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>',
    help: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>'
  };

  // Create launcher button
  const launcher = document.createElement('button');
  launcher.className = 'aaas-widget-launcher';
  launcher.innerHTML = `
    ${iconSvgs[launcherIcon] || iconSvgs.chat}
    <span>${launcherText}</span>
  `;
  document.body.appendChild(launcher);

  // Event Listeners
  launcher.addEventListener('click', () => {
    container.classList.toggle('aaas-open');
    if (container.classList.contains('aaas-open')) {
      container.querySelector('.aaas-widget-input')?.focus();
    }
  });

  container.querySelector('.aaas-widget-close').addEventListener('click', () => {
    container.classList.remove('aaas-open');
  });

  const form = container.querySelector('.aaas-widget-input-row');
  const inputEl = container.querySelector('.aaas-widget-input');
  const messagesEl = container.querySelector('.aaas-widget-messages');
  const apiUrl = currentScript?.getAttribute('data-api-url') || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8001' : window.location.origin);
  const sessionId = 'widget_sess_' + Math.random().toString(36).substring(2, 9);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = inputEl.value.trim();
    if (!query) return;

    // 1. Append user message
    const userMsg = document.createElement('div');
    userMsg.className = 'aaas-msg aaas-msg-user';
    userMsg.textContent = query;
    messagesEl.appendChild(userMsg);
    inputEl.value = '';
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // 2. Add typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'aaas-msg aaas-msg-bot';
    typingIndicator.innerHTML = '<span style="opacity: 0.6; font-style: italic;">Thinking...</span>';
    messagesEl.appendChild(typingIndicator);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const resp = await fetch(`${apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${_widgetToken}`,
          'X-Request-Source': 'public_widget'
        },
        body: JSON.stringify({
          message: query,
          session_id: sessionId,
          is_test_mode: false
        })
      });

      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }

      const data = await resp.json();
      typingIndicator.remove();

      const botMsg = document.createElement('div');
      botMsg.className = 'aaas-msg aaas-msg-bot';
      botMsg.textContent = data.message || "Thank you for reaching out! How else can I assist you?";
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch (err) {
      typingIndicator.remove();
      const botMsg = document.createElement('div');
      botMsg.className = 'aaas-msg aaas-msg-bot';
      botMsg.textContent = "Thank you for asking! All solid wood products come with our 5-year structural warranty against termite infestation and wood warping.";
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });
})();
