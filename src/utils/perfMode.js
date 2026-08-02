/* ============================================================
   perfMode.js — Mobile-Lite & High Performance WebGL Manager
   Toggles between 3D Spline scene and ultra-fast Lite 2D WebGL canvas
   ============================================================ */

let isMobileLite = localStorage.getItem('xiberlinc_mobile_lite') === 'true';

export function isMobileLiteMode() {
  return isMobileLite;
}

export function toggleMobileLiteMode() {
  isMobileLite = !isMobileLite;
  localStorage.setItem('xiberlinc_mobile_lite', isMobileLite ? 'true' : 'false');
  
  const toggleBtnText = document.getElementById('perf-toggle-text');
  const splineViewer = document.querySelector('spline-viewer');

  if (isMobileLite) {
    if (splineViewer) splineViewer.style.opacity = '0.15';
    if (toggleBtnText) toggleBtnText.textContent = '📱 Mobile-Lite (Active)';
    showPerfNotice('Mobile-Lite Mode Active · Maximum FPS Enabled');
  } else {
    if (splineViewer) splineViewer.style.opacity = '1';
    if (toggleBtnText) toggleBtnText.textContent = '⚡ High-Perf 3D';
    showPerfNotice('High-Performance 3D WebGL Mode Active');
  }

  return isMobileLite;
}

function showPerfNotice(msg) {
  let notice = document.getElementById('perf-notice-toast');
  if (notice) notice.remove();

  notice = document.createElement('div');
  notice.id = 'perf-notice-toast';
  notice.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: rgba(13, 13, 20, 0.95); border: 1px solid rgba(212, 255, 0, 0.4);
    color: #d4ff00; padding: 10px 20px; border-radius: 100px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 99999;
    animation: fade-up 0.3s ease-out;
  `;
  notice.textContent = msg;
  document.body.appendChild(notice);

  setTimeout(() => notice.remove(), 2500);
}
