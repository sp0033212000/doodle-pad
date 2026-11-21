// 介面入口（暫時的原生 JS 介面，將由 Vue 取代）：建立引擎並掛載工具列與狀態列
import './styles/base.css';
import './styles/toolbar.css';
import './styles/canvas.css';
import './styles/statusbar.css';
import './styles/dialog.css';

import { createEngine, startEngine } from './engine';
import { createToolbar } from './ui/toolbar/Toolbar.js';
import { createStatusBar } from './ui/StatusBar.js';

const app = createEngine();

document.getElementById('app').append(createToolbar(app), app.stage, createStatusBar(app));

startEngine(app);
