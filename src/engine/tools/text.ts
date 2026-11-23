import type { App, Point, TextAlign, TextStyle, Tool } from '../types';
import { h } from '../utils/dom';
import { labelProps } from '../i18n';
import { TEXT_FONTS, TEXT_SIZE_RANGE } from '../config';

/**
 * 文字工具：在畫布上點一下開啟文字框，上方出現格式列
 * （字型、大小、粗體、斜體、底線、刪除線、對齊、背景填色）。
 * 格式即時套用到文字框；按 Ctrl/⌘+Enter、點畫布其他地方或切換工具時寫入畫布。
 * 格式設定會沿用到下一個文字框。
 */

/** 文字框邊框寬度（canvas px），畫到畫布時要扣掉 */
const BORDER = 1;
const LINE_HEIGHT = 1.2;
/** 格式列的螢幕高度，文字框太靠近上緣時改放到下方 */
const BAR_SPACE = 44;

let box: HTMLDivElement | null = null;
let input: HTMLTextAreaElement | null = null;
let pos: Point | null = null;
let syncBar: (() => void) | null = null;

const isActive = () => box?.style.display === 'block';
const styleOf = (app: App) => app.store.get('textStyle');

const familyOf = (st: TextStyle) => TEXT_FONTS[st.font] || getComputedStyle(document.body).fontFamily;
const fontOf = (st: TextStyle) =>
  `${st.italic ? 'italic ' : ''}${st.bold ? 'bold ' : ''}${st.size}px ${familyOf(st)}`;

function decorationOf(st: TextStyle) {
  const parts = [st.underline && 'underline', st.strike && 'line-through'].filter(Boolean);
  return parts.length ? parts.join(' ') : 'none';
}

/** 把格式套用到文字框外觀，並依內容調整大小 */
function applyStyle(app: App) {
  if (!input) return;
  const st = styleOf(app);
  Object.assign(input.style, {
    fontFamily: familyOf(st),
    fontSize: st.size + 'px',
    fontWeight: st.bold ? '700' : '400',
    fontStyle: st.italic ? 'italic' : 'normal',
    textDecoration: decorationOf(st),
    textAlign: st.align,
    background: st.fill ? app.store.get('secondary') : '',
  });
  autosize(app);
}

function autosize(app: App) {
  if (!input) return;
  const st = styleOf(app);
  const { octx } = app.canvas;
  const lines = input.value.split('\n');
  octx.font = fontOf(st);
  const w = Math.max(40, ...lines.map(l => octx.measureText(l).width + 12));
  input.style.width = w + 'px';
  input.style.height = lines.length * st.size * LINE_HEIGHT + 2 * BORDER + 4 + 'px';
}

function setStyle(app: App, patch: Partial<TextStyle>) {
  app.store.set('textStyle', { ...styleOf(app), ...patch });
}

/** 把文字框的內容畫到畫布上，外觀與文字框一致 */
function commit(app: App) {
  if (!input || !box || !isActive()) return;
  const value = input.value;
  const boxW = input.offsetWidth;
  const boxH = input.offsetHeight;
  box.style.display = 'none';
  const at = pos;
  pos = null;
  if (!value.trim() || !at) return;

  app.history.push();
  const { ctx } = app.canvas;
  const st = styleOf(app);
  ctx.save();
  if (st.fill) {
    ctx.fillStyle = app.store.get('secondary');
    ctx.fillRect(at.x, at.y, boxW, boxH);
  }
  ctx.font = fontOf(st);
  ctx.fillStyle = input.style.color || app.store.get('primary');
  ctx.textBaseline = 'alphabetic';

  const lh = st.size * LINE_HEIGHT;
  const innerW = boxW - 2 * BORDER;
  const thickness = Math.max(1, Math.round(st.size / 15));
  value.split('\n').forEach((line, i) => {
    const m = ctx.measureText(line);
    // 與 CSS 相同：字放在行高的正中間
    const ascent = m.fontBoundingBoxAscent ?? st.size * 0.8;
    const descent = m.fontBoundingBoxDescent ?? st.size * 0.2;
    const top = at.y + BORDER + i * lh;
    const baseline = top + (lh - ascent - descent) / 2 + ascent;
    const offset: Record<TextAlign, number> = {
      left: 0,
      center: (innerW - m.width) / 2,
      right: innerW - m.width,
    };
    const x = at.x + BORDER + offset[st.align];
    ctx.fillText(line, x, baseline);
    if (st.underline) ctx.fillRect(x, baseline + Math.max(1, st.size * 0.08), m.width, thickness);
    if (st.strike) ctx.fillRect(x, baseline - st.size * 0.3, m.width, thickness);
  });
  ctx.restore();
}

// ---------- 格式列 ----------
function createBar(app: App) {
  const focusInput = () => input?.focus();

  const fontSelect = h(
    'select',
    {
      dataset: { text: 'font' },
      title: labelProps({ title: 'engine.text.font' }).title,
      onChange: (e: Event) => {
        setStyle(app, { font: (e.target as HTMLSelectElement).value });
        focusInput();
      },
    },
    Object.keys(TEXT_FONTS).map(key => {
      const l = labelProps({ text: `engine.text.fonts.${key}` });
      return h('option', { value: key, dataset: l.dataset }, l.text);
    }),
  );

  const sizeInput = h('input', {
    type: 'number',
    class: 'text-size',
    min: TEXT_SIZE_RANGE.min,
    max: TEXT_SIZE_RANGE.max,
    dataset: { text: 'size' },
    title: labelProps({ title: 'engine.text.size' }).title,
    onInput: (e: Event) => {
      const v = Math.round(Number((e.target as HTMLInputElement).value));
      if (v >= TEXT_SIZE_RANGE.min && v <= TEXT_SIZE_RANGE.max) setStyle(app, { size: v });
    },
    onChange: () => syncBar?.(), // 超出範圍時改回實際使用的值
    onKeydown: (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        syncBar?.();
        focusInput();
      }
    },
  });

  type Toggle = 'bold' | 'italic' | 'underline' | 'strike' | 'fill';
  const toggle = (key: Toggle, label: string, cls = '') => {
    const l = labelProps({ title: `engine.text.${key}` });
    return h(
      'button',
      {
        class: `obj-btn text-toggle ${cls}`,
        title: l.title,
        dataset: { text: key, ...l.dataset },
        onClick: () => {
          setStyle(app, { [key]: !styleOf(app)[key] });
          focusInput();
        },
      },
      label,
    );
  };
  const toggles = [
    toggle('bold', 'B', 't-bold'),
    toggle('italic', 'I', 't-italic'),
    toggle('underline', 'U', 't-underline'),
    toggle('strike', 'S', 't-strike'),
  ];

  const alignSelect = h(
    'select',
    {
      dataset: { text: 'align' },
      title: labelProps({ title: 'engine.text.align' }).title,
      onChange: (e: Event) => {
        setStyle(app, { align: (e.target as HTMLSelectElement).value as TextAlign });
        focusInput();
      },
    },
    (['left', 'center', 'right'] as const).map(a => {
      const l = labelProps({ text: `engine.text.aligns.${a}` });
      return h('option', { value: a, dataset: l.dataset }, l.text);
    }),
  );

  const fillLabel = labelProps({ icon: '🎨', text: 'engine.text.fillLabel', title: 'engine.text.fill' });
  const fillBtn = h(
    'button',
    {
      class: 'obj-btn text-toggle',
      title: fillLabel.title,
      dataset: { text: 'fill', ...fillLabel.dataset },
      onClick: () => {
        setStyle(app, { fill: !styleOf(app).fill });
        focusInput();
      },
    },
    fillLabel.text,
  );

  syncBar = () => {
    const st = styleOf(app);
    fontSelect.value = st.font;
    sizeInput.value = String(st.size);
    alignSelect.value = st.align;
    for (const btn of [...toggles, fillBtn]) {
      const on = !!st[btn.dataset.text as Toggle];
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    }
  };

  return h(
    'div',
    {
      class: 'text-bar',
      onPointerdown: (e: Event) => e.stopPropagation(),
      // 在格式列打字不觸發快捷鍵
      onKeydown: (e: Event) => e.stopPropagation(),
    },
    fontSelect,
    sizeInput,
    ...toggles,
    alignSelect,
    fillBtn,
  );
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
    box = h('div', { class: 'text-box' }, createBar(app), el);
    app.canvas.holder.append(box);
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
    app.store.on('secondary', () => {
      if (isActive()) applyStyle(app);
    });
    app.store.on('textStyle', () => {
      syncBar?.();
      if (isActive()) applyStyle(app);
    });
    app.addPending(() => commit(app));
  },

  onDown(app, p) {
    if (!input || !box) return;
    const el = input;
    pos = p;
    Object.assign(box.style, { display: 'block', left: p.x + 'px', top: p.y + 'px' });
    box.classList.toggle('bar-below', p.y * app.store.get('zoom') < BAR_SPACE);
    el.style.color = app.store.get('primary');
    el.value = '';
    syncBar?.();
    applyStyle(app);
    setTimeout(() => el.focus(), 0);
  },
};

export default text;
