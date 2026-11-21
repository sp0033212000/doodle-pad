import type { App, Point, Tool } from '../types';
import { h } from '../utils/dom';

let input: HTMLTextAreaElement | null = null;
let pos: Point | null = null;

const fontSize = (app: App) => Math.max(12, app.store.get('size') * 4);
const fontFamily = () => getComputedStyle(document.body).fontFamily;
const isActive = () => input?.style.display === 'block';

function autosize(app: App) {
  if (!input) return;
  const fs = fontSize(app);
  const { octx } = app.canvas;
  const lines = input.value.split('\n');
  octx.font = `${fs}px ${fontFamily()}`;
  const w = Math.max(40, ...lines.map(l => octx.measureText(l).width + 12));
  input.style.width = w + 'px';
  input.style.height = lines.length * fs * 1.2 + 6 + 'px';
}

function commit(app: App) {
  if (!input || !isActive()) return;
  const value = input.value;
  input.style.display = 'none';
  const at = pos;
  pos = null;
  if (!value.trim() || !at) return;

  app.history.push();
  const { ctx } = app.canvas;
  const fs = fontSize(app);
  ctx.font = `${fs}px ${fontFamily()}`;
  ctx.fillStyle = input.style.color || app.store.get('primary');
  ctx.textBaseline = 'top';
  value.split('\n').forEach((line, i) => ctx.fillText(line, at.x + 1, at.y + 1 + i * fs * 1.2));
}

const text: Tool = {
  id: 'text',
  name: '文字',
  icon: '🔤',
  key: 't',
  cursor: 'text',
  oneShot: true,
  modifiesCanvas: false, // 在 commit 時才記錄復原點

  init(app) {
    const el = h('textarea', { class: 'text-input', spellcheck: 'false' });
    input = el;
    app.canvas.holder.append(el);
    el.addEventListener('input', () => autosize(app));
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        el.value = '';
        commit(app);
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit(app);
      e.stopPropagation(); // 輸入文字時不觸發快捷鍵
    });
    app.store.on('primary', c => {
      if (isActive()) el.style.color = c;
    });
    app.addPending(() => commit(app));
  },

  onDown(app, p) {
    if (!input) return;
    const el = input;
    pos = p;
    const fs = fontSize(app);
    Object.assign(el.style, {
      display: 'block',
      left: p.x + 'px',
      top: p.y + 'px',
      fontSize: fs + 'px',
      color: app.store.get('primary'),
      width: '40px',
      height: fs * 1.3 + 'px',
    });
    el.value = '';
    setTimeout(() => el.focus(), 0);
  },
};

export default text;
