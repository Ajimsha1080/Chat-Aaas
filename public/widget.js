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
  const launcherLogoUrl = currentScript?.getAttribute('data-launcher-logo-url') || '';
  const launcherText = currentScript?.getAttribute('data-launcher-text') || 'Chat with Us';
  const bottomPaddingNum = parseInt(currentScript?.getAttribute('data-bottom-padding') || '20', 10) || 20;
  const sidePaddingNum = parseInt(currentScript?.getAttribute('data-side-padding') || '20', 10) || 20;
  const isLeft = position === 'bottom_left';

  // Inject Styles
  const style = document.createElement('style');
  style.innerHTML = `
    .aaas-widget-launcher {
      position: fixed;
      bottom: ${bottomPaddingNum}px;
      ${isLeft ? `left: ${sidePaddingNum}px;` : `right: ${sidePaddingNum}px;`}
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${primaryColor};
      color: #ffffff;
      width: 56px;
      height: 56px;
      padding: 0;
      border-radius: ${isLeft ? '24px 24px 24px 4px' : '24px 24px 4px 24px'};
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      cursor: pointer;
      border: none;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-radius 0.25s ease;
    }
    .aaas-widget-launcher:hover {
      transform: scale(1.06);
    }
    .aaas-widget-launcher.aaas-launcher-open {
      border-radius: ${isLeft ? '24px 24px 24px 4px' : '24px 24px 4px 24px'};
    }
    .aaas-widget-container {
      display: flex;
      position: fixed;
      bottom: ${bottomPaddingNum + 68}px;
      ${isLeft ? `left: ${sidePaddingNum}px;` : `right: ${sidePaddingNum}px;`}
      width: 380px;
      height: 560px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      z-index: 999999;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border: 1px solid #e2e8f0;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.96);
      pointer-events: none;
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;
    }
    .aaas-widget-container.aaas-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .aaas-widget-header {
      background: #ffffff;
      color: #0f172a;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
    }
    .aaas-widget-header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .aaas-widget-header-brand h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .aaas-widget-close {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .aaas-widget-close:hover {
      color: #0f172a;
      background: #f1f5f9;
    }
    .aaas-widget-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .aaas-msg-wrapper {
      display: flex;
      flex-direction: column;
      max-width: 85%;
    }
    .aaas-msg-wrapper.aaas-msg-bot-wrap {
      align-self: flex-start;
    }
    .aaas-msg-wrapper.aaas-msg-user-wrap {
      align-self: flex-end;
    }
    .aaas-msg {
      padding: 12px 14px;
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.5;
    }
    .aaas-msg-bot {
      background: #f1f5f9;
      color: #0f172a;
      border-top-left-radius: 4px;
    }
    .aaas-msg-user {
      background: ${primaryColor};
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .aaas-msg-meta {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
      font-weight: 500;
    }
    .aaas-msg-bot-wrap .aaas-msg-meta {
      padding-left: 2px;
    }
    .aaas-msg-user-wrap .aaas-msg-meta {
      text-align: right;
      padding-right: 2px;
    }
    .aaas-widget-notice {
      margin: 0 16px 8px;
      padding: 10px 12px;
      background: #f1f5f9;
      border-radius: 14px;
      font-size: 11px;
      line-height: 1.4;
      color: #64748b;
      text-align: center;
    }
    .aaas-widget-input-row {
      margin: 0 16px 14px;
      padding: 6px 8px 6px 14px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .aaas-widget-input-row:focus-within {
      border-color: #64748b;
    }
    .aaas-widget-input {
      flex: 1;
      border: none;
      font-size: 13px;
      outline: none;
      background: transparent;
      color: #0f172a;
    }
    .aaas-widget-paperclip {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
    }
    .aaas-widget-paperclip:hover {
      color: #64748b;
    }
    .aaas-widget-send {
      background: ${primaryColor};
      color: #ffffff;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.15s ease;
    }
    .aaas-widget-send:active {
      transform: scale(0.95);
    }
    @media (max-width: 480px) {
      .aaas-widget-launcher {
        bottom: 16px;
        right: 16px;
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
    }
  `;
  document.head.appendChild(style);

  // Create Container
  const container = document.createElement('div');
  container.className = 'aaas-widget-container';
  container.innerHTML = `
    <div class="aaas-widget-header">
      <div class="aaas-widget-header-brand">
        <button class="aaas-widget-close" title="Minimize">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        ${launcherLogoUrl ? `<img src="${launcherLogoUrl}" alt="Logo" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'" />` : ''}
        <h4>${launcherText || 'AI Assistant'}</h4>
      </div>
      <button class="aaas-widget-close" title="Close">✕</button>
    </div>
    <div class="aaas-widget-messages">
      <div class="aaas-msg-wrapper aaas-msg-bot-wrap">
        <div class="aaas-msg aaas-msg-bot">
          Welcome 👋 ,<br>Got any questions ? We are happy to help.
        </div>
        <div class="aaas-msg-meta">${launcherText || 'AI'} · Just now</div>
      </div>
    </div>
    <div class="aaas-widget-notice">
      Our agents are not available right now, but you can still send messages, we'll reach out once we are back.
    </div>
    <form class="aaas-widget-input-row">
      <input type="text" class="aaas-widget-input" placeholder="Enter your message" />
      <button type="button" class="aaas-widget-paperclip" title="Attach file">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </button>
      <button type="submit" class="aaas-widget-send" title="Send message">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
      </button>
    </form>
  `;
  document.body.appendChild(container);

  // Icon SVG Definitions
  const iconSvgs = {
    chat_dots: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.03 2 11c0 2.68 1.31 5.09 3.4 6.69-.17 1.25-.8 2.82-1.92 3.86-.23.21-.11.6.2.62 2.37.13 4.67-.93 6.07-1.92.73.16 1.48.25 2.25.25 5.523 0 10-4.03 10-9s-4.477-9-10-9zm-4.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" /></svg>',
    chat_lines: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8.414l-4.707 4.707A1 1 0 0 1 2 22V5a2 2 0 0 1 2-2zm3 5a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H7zm0 4a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7z" /></svg>',
    help_filled: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.88 15.75h-1.75v-1.75h1.75v1.75zm1.5-6.22l-.79.81c-.63.64-1.02 1.16-1.02 2.41h-1.5v-.5c0-.83.34-1.58.88-2.12l.93-.94c.28-.28.45-.66.45-1.09 0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5H8.38c0-1.99 1.62-3.62 3.62-3.62s3.62 1.62 3.62 3.62c0 .78-.31 1.49-.84 1.98z" /></svg>',
    chat_double: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1v3.5a.5.5 0 0 0 .854.354L10.707 16H17a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" /><path d="M13 18h2.293l3.853 3.854A.5.5 0 0 0 20 21.5V18h1a2 2 0 0 0 2-2v-7a2 2 0 0 0-1-1.732V14a3 3 0 0 1-3 3h-5.268A2 2 0 0 0 13 18z" opacity="0.9" /></svg>',
    chat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.03 2 11c0 2.68 1.31 5.09 3.4 6.69-.17 1.25-.8 2.82-1.92 3.86-.23.21-.11.6.2.62 2.37.13 4.67-.93 6.07-1.92.73.16 1.48.25 2.25.25 5.523 0 10-4.03 10-9s-4.477-9-10-9zm-4.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" /></svg>',
    bot: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
    sparkles: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
    support: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>',
    help: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.88 15.75h-1.75v-1.75h1.75v1.75zm1.5-6.22l-.79.81c-.63.64-1.02 1.16-1.02 2.41h-1.5v-.5c0-.83.34-1.58.88-2.12l.93-.94c.28-.28.45-.66.45-1.09 0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5H8.38c0-1.99 1.62-3.62 3.62-3.62s3.62 1.62 3.62 3.62c0 .78-.31 1.49-.84 1.98z" /></svg>',
    zap: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
  };

  // Create launcher button
  const launcher = document.createElement('button');
  launcher.className = 'aaas-widget-launcher';

  let iconHtml = iconSvgs[launcherIcon] || iconSvgs.chat;
  if ((launcherIcon === 'logo' || launcherIcon === 'custom') && launcherLogoUrl) {
    iconHtml = `<img src="${launcherLogoUrl}" alt="Logo" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='${iconSvgs.chat.replace(/'/g, "\\'")}' + '<span>' + '${launcherText}' + '</span>';" />`;
  }

  launcher.innerHTML = `
    ${iconHtml}
    <span>${launcherText}</span>
  `;
  document.body.appendChild(launcher);

  const chevronDownSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

  function setLauncherState(isOpen) {
    if (isOpen) {
      launcher.classList.add('aaas-launcher-open');
      launcher.innerHTML = chevronDownSvg;
      launcher.setAttribute('aria-label', 'Close chat');
    } else {
      launcher.classList.remove('aaas-launcher-open');
      launcher.innerHTML = `${iconHtml}<span>${launcherText}</span>`;
      launcher.setAttribute('aria-label', 'Open chat');
    }
  }

  // Event Listeners
  launcher.addEventListener('click', () => {
    const willOpen = !container.classList.contains('aaas-open');
    if (willOpen) {
      container.classList.add('aaas-open');
      setLauncherState(true);
      container.querySelector('.aaas-widget-input')?.focus();
    } else {
      container.classList.remove('aaas-open');
      setLauncherState(false);
    }
  });

  container.querySelector('.aaas-widget-close').addEventListener('click', () => {
    container.classList.remove('aaas-open');
    setLauncherState(false);
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
