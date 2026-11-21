import { h } from '../../engine/utils/dom';
import { createFileSection } from './sections/FileSection.js';
import { createEditSection } from './sections/EditSection.js';
import { createImageSection } from './sections/ImageSection.js';
import { createToolsSection } from './sections/ToolsSection.js';
import { createOptionsSection } from './sections/OptionsSection.js';
import { createColorSection } from './sections/ColorSection.js';

// 上方工具列的區塊，依序排列；要新增/調整順序只改這裡
export const DEFAULT_SECTIONS = [
  createFileSection,
  createEditSection,
  createImageSection,
  createToolsSection,
  createOptionsSection,
  createColorSection,
];

export function createToolbar(app, sections = DEFAULT_SECTIONS) {
  return h(
    'div',
    { class: 'toolbar' },
    sections.map(create => create(app)),
  );
}
