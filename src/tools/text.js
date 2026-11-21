import { h } from '../utils/dom.js';

let input = null;
let pos = null;

const fontSize = app => Math.max(12, app.store.get('size') * 4);
const fontFamily = () => getComputedStyle(document.body).fontFamily;
const isActive = () => input?.style.display === 'block';

function autosize(app) {
  const fs = fontSize(app);
  const { octx } = app.canvas;
  const lines = input.value.split('\n');
  octx.font = `${fs}px ${fontFamily()}`;
  const w = Math.max(40, ...lines.map(l => octx.measureText(l).width + 12));
  input.style.width = w + 'px';
  input.style.height = lines.length * fs * 1.2 + 6 + 'px';
}

function commit(app) {
  if (!isActive()) return;
  const value = input.value;
  input.style.display = 'none';
  if (!value.trim() || !pos) { pos = null; return; }

  app.history.push();
  const { ctx } = app.canvas;
  const fs = fontSize(app);
  ctx.font = `${fs}px ${fontFamily()}`;
  ctx.fillStyle = input.style.color || app.store.get('primary');
  ctx.textBaseline = 'top';
  value.split('\n').forEach((line, i) => ctx.fillText(line, pos.x + 1, pos.y + 1 + i * fs * 1.2));
  pos = null;
}

export default {
  id: 'text', name: '文字', icon: '🔤', key: 't', cursor: 'text',
  oneShot: true,
  modifiesCanvas: false,   // 在 commit 時才記錄復原點

  init(app) {
    input = h('textarea', { class: 'text-input', spellcheck: 'false' });
    app.canvas.holder.append(input);
    input.addEventListener('input', () => autosize(app));
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; commit(app); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit(app);
      e.stopPropagation();   // 輸入文字時不觸發快捷鍵
    });
    app.store.on('primary', c => { if (isActive()) input.style.color = c; });
    app.addPending(() => commit(app));
  },

  onDown(app, p) {
    pos = p;
    const fs = fontSize(app);
    Object.assign(input.style, {
      display: 'block', left: p.x + 'px', top: p.y + 'px',
      fontSize: fs + 'px', color: app.store.get('primary'),
      width: '40px', height: fs * 1.3 + 'px',
    });
    input.value = '';
    setTimeout(() => input.focus(), 0);
  },
};
