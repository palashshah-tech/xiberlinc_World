/* ============================================================
   Xiberlinc World — Main Entry Point
   ============================================================ */

import './styles/index.css';
import './styles/tasks.css';
import './styles/admin.css';
import './styles/world.css';
import { initRouter } from './router.js';
import { initLenisSmoothScroll, initCustomCursor } from './engine/motionEngine.js';

// Initialize Motion Engine
initLenisSmoothScroll();
initCustomCursor();

// Initialize SPA router
initRouter();
