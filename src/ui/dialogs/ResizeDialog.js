import { h } from '../../utils/dom.js';
import { openDialog } from '../components/dialog.js';

/**
 * 調整大小對話框：可用百分比或像素，可維持長寬比。
 * 作用對象依序為：選取的物件 → 選取範圍 → 整張圖片。
 */
export function openResizeDialog(app) {
  const target = app.image.resizeTarget();
  const { w: ow, h: oh } = target;
  const ratio = oh / ow;
  let unit = 'percent';

  const numInput = value => h('input', { type: 'number', min: 1, value, class: 'num' });
  const inW = numInput(100);
  const inH = numInput(100);
  const keep = h('input', { type: 'checkbox', checked: true });
  const preview = h('div', { class: 'dialog-note' });

  const unitRadio = (value, label) => {
    const r = h('input', { type: 'radio', name: 'resize-unit', value, checked: value === unit });
    r.addEventListener('change', () => switchUnit(value));
    return h('label', { class: 'radio' }, r, label);
  };

  /** 依輸入值算出新的像素尺寸 */
  function result() {
    const vw = +inW.value || 0, vh = +inH.value || 0;
    const nw = unit === 'percent' ? ow * vw / 100 : vw;
    const nh = unit === 'percent' ? oh * vh / 100 : vh;
    return { nw: app.image.clampSize(nw), nh: app.image.clampSize(nh) };
  }

  function renderPreview() {
    const { nw, nh } = result();
    preview.textContent = `目前 ${ow} × ${oh} px　→　新尺寸 ${nw} × ${nh} px`;
  }

  function switchUnit(next) {
    const { nw, nh } = result();
    unit = next;
    if (unit === 'percent') {
      inW.value = Math.round(nw / ow * 100);
      inH.value = Math.round(nh / oh * 100);
    } else {
      inW.value = nw;
      inH.value = nh;
    }
    renderPreview();
  }

  // 維持長寬比：改一邊時同步另一邊
  inW.addEventListener('input', () => {
    if (keep.checked && inW.value) {
      inH.value = unit === 'percent' ? inW.value : Math.round(+inW.value * ratio);
    }
    renderPreview();
  });
  inH.addEventListener('input', () => {
    if (keep.checked && inH.value) {
      inW.value = unit === 'percent' ? inH.value : Math.round(+inH.value / ratio);
    }
    renderPreview();
  });

  renderPreview();

  openDialog({
    title: `調整大小 — ${target.label}`,
    body: [
      h('div', { class: 'dialog-row' }, h('span', { class: 'dialog-label' }, '單位'),
        unitRadio('percent', '百分比'), unitRadio('pixel', '像素')),
      h('div', { class: 'dialog-row' }, h('span', { class: 'dialog-label' }, '水平'), inW),
      h('div', { class: 'dialog-row' }, h('span', { class: 'dialog-label' }, '垂直'), inH),
      h('label', { class: 'dialog-row check' }, keep, '維持長寬比'),
      preview,
    ],
    onOk() {
      const { nw, nh } = result();
      target.apply(nw, nh);
    },
  });
}
