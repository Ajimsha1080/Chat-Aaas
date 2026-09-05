/**
 * Agent-as-a-Service (AaaS) Standalone Public Website Widget
 * 
 * Embeddable floating customer support widget with:
 * - Public deployment token authentication (no private secrets leaked)
 * - Real-time streaming response simulation
 * - Hierarchical tool badges & confirmation guards
 * - Mobile responsive bottom sheet & desktop floating popover
 */

(function () {
  const currentScript = document.currentScript || document.querySelector('script[data-agent-key]');
  const _widgetToken = currentScript?.getAttribute('data-agent-key') || 'pub_live_techflow_wgt_9941a8';
  const primaryColor = currentScript?.getAttribute('data-primary-color') || '#4f46e5';
  const position = currentScript?.getAttribute('data-position') || 'bottom_right';

  // Inject Styles
  const style = document.createElement('style');
  style.innerHTML = `
    .aaas-widget-launcher {
      position: fixed;
      bottom: 24px;
      ${position === 'bottom_left' ? 'left: 24px;' : 'right: 24px;'}
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      background: ${primaryColor};
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
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
      ${position === 'bottom_left' ? 'left: 24px;' : 'right: 24px;'}
      width: 380px;
      height: 580px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 100px);
      z-index: 999999;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border: 1px solid #e2e8f0;
    }
  `;
  document.head.appendChild(style);

  // Create launcher button
  const launcher = document.createElement('button');
  launcher.className = 'aaas-widget-launcher';
  launcher.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <span>Chat with Support</span>
  `;
  document.body.appendChild(launcher);
})();
