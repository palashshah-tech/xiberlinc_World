/* ============================================================
   Router — hash-based routing for Xiberlinc World
   ============================================================ */

import { WorldView } from './views/WorldView.js';
import { InstructionsView } from './views/InstructionsView.js';
import { TaskView } from './views/TaskView.js';
import { TransitionView } from './views/TransitionView.js';
import { CompleteView } from './views/CompleteView.js';
import { AdminView } from './views/AdminView.js';
import { RoomView } from './views/RoomView.js';
import { Storage } from './utils/storage.js';

const routes = {
  '': WorldView,
  'world': WorldView,
  'instructions': InstructionsView,
  'task/vwm-pure': (params) => TaskView('vwm-pure', params),
  'task/vwm-distractor': (params) => TaskView('vwm-distractor', params),
  'task/ant': (params) => TaskView('ant', params),
  'transition': TransitionView,
  'complete': CompleteView,
  'admin': AdminView,
  'room': RoomView,
};

let currentParams = {};

export function navigate(route, params = {}) {
  currentParams = params;
  window.location.hash = `#/${route}`;
}

function parseHash() {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  return hash || '';
}

function handleRouteChange() {
  const route = parseHash();
  const handler = routes[route];

  // Route protection: redirect to World login if no active session
  const protectedRoutes = ['instructions', 'task/vwm-pure', 'task/vwm-distractor', 'task/ant', 'transition', 'complete', 'room'];
  if (protectedRoutes.includes(route)) {
    const session = Storage.getCurrentSession();
    if (!session) {
      console.warn(`Unauthorized access to protected route /#/${route}. Redirecting to home login.`);
      window.location.hash = '#/';
      return;
    }
  }

  // Clear style tags dynamically added by previous view
  document.querySelectorAll('head style[data-view-style]').forEach(el => el.remove());

  if (handler) {
    handler(currentParams);
  } else {
    WorldView();
  }

  currentParams = {};
  window.scrollTo(0, 0);
}

export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();
}

export function injectStyle(css) {
  const style = document.createElement('style');
  style.setAttribute('data-view-style', '');
  style.textContent = css;
  document.head.appendChild(style);
}
