import { createGroup } from '../../components/group.js';
import { createButton } from '../../components/button.js';

export function createToolsSection(app) {
  const buttons = app.tools.map(tool => createButton({
    label: tool.icon,
    title: `${tool.name} (${tool.key.toUpperCase()})`,
    className: 'tool',
    dataset: { tool: tool.id },
    onClick: () => app.setTool(tool.id),
  }));

  const sync = current => buttons.forEach(b => b.classList.toggle('active', b.dataset.tool === current));
  app.store.on('tool', sync);
  sync(app.store.get('tool'));

  return createGroup('工具', buttons, { bodyClass: 'tools-grid' });
}
