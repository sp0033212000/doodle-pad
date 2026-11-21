import { h } from '../../../engine/utils/dom';
import { createGroup } from '../../components/group.js';
import { PALETTE } from '../../../engine/config';

export function createColorSection(app) {
  const { store } = app;

  const custom = h('input', {
    type: 'color',
    title: '自訂色彩',
    onInput: e => store.set('primary', e.target.value),
    onChange: e => e.target.blur(),
  });
  const primary = h('div', {
    class: 'sw primary',
    title: '主要色彩（左鍵）；點一下自訂',
    onClick: () => custom.click(),
  });
  const secondary = h('div', {
    class: 'sw secondary',
    title: '次要色彩（右鍵）；點一下互換 (X)',
    onClick: () => app.swapColors(),
  });

  const palette = h(
    'div',
    { class: 'palette' },
    PALETTE.map(c =>
      h('div', {
        title: c,
        style: { background: c },
        onClick: () => store.set('primary', c),
        onContextmenu: e => {
          e.preventDefault();
          store.set('secondary', c);
        },
      }),
    ),
  );

  const sync = () => {
    primary.style.background = store.get('primary');
    secondary.style.background = store.get('secondary');
    custom.value = store.get('primary');
  };
  store.on('primary', sync);
  store.on('secondary', sync);
  sync();

  return createGroup(
    '色彩（左鍵＝主色，右鍵＝次色）',
    [h('div', { class: 'current' }, primary, secondary), palette, custom],
    { bodyClass: 'colors' },
  );
}
