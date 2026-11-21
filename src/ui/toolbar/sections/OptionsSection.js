import { h } from '../../../engine/utils/dom';
import { createGroup } from '../../components/group.js';
import { SIZE_RANGE, SHAPE_MODES } from '../../../engine/config';

export function createOptionsSection(app) {
  const { store } = app;

  const range = h('input', {
    type: 'range',
    'data-control': 'size',
    min: SIZE_RANGE.min,
    max: SIZE_RANGE.max,
    value: store.get('size'),
    onInput: e => store.set('size', +e.target.value),
    onChange: e => e.target.blur(), // 放開後交還焦點，快捷鍵才能繼續使用
  });
  const sizeLabel = h('span', {}, String(store.get('size')));
  store.on('size', v => {
    range.value = v;
    sizeLabel.textContent = v;
  });

  const modeSelect = h(
    'select',
    {
      'data-control': 'shape-mode',
      onChange: e => {
        store.set('shapeMode', e.target.value);
        e.target.blur();
      },
    },
    SHAPE_MODES.map(m => h('option', { value: m.value }, m.label)),
  );
  modeSelect.value = store.get('shapeMode');

  return createGroup(
    '選項',
    [
      h('div', { class: 'size-wrap' }, '粗細 ', range, ' ', sizeLabel, 'px'),
      h('div', { class: 'fill-opt' }, '圖形：', modeSelect),
    ],
    { bodyClass: 'options' },
  );
}
