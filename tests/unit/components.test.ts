// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { i18n } from '../../src/i18n';
import { useEditorStore } from '../../src/stores/editor';
import { createStore } from '../../src/engine/core/store';
import { DEFAULT_STATE, TOOLS, type App, type AppState } from '../../src/engine';
import ToolsSection from '../../src/components/toolbar/ToolsSection.vue';
import EditSection from '../../src/components/toolbar/EditSection.vue';
import QuotaDialog from '../../src/components/dialogs/QuotaDialog.vue';

/** 只有 store 與少數方法的假引擎，足以驅動介面元件 */
function fakeEngine() {
  const store = createStore<AppState>({ ...DEFAULT_STATE });
  const app = {
    store,
    setTool: vi.fn((id: string) => store.set('tool', id)),
    history: { undo: vi.fn(), redo: vi.fn(), clear: vi.fn() },
    cut: vi.fn(),
    copy: vi.fn(),
  };
  return app as unknown as App & typeof app;
}

let pinia: ReturnType<typeof createPinia>;
let engine: ReturnType<typeof fakeEngine>;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  engine = fakeEngine();
  useEditorStore().bind(engine);
});

const mountWith = (component: object) => mount(component, { global: { plugins: [pinia, i18n] } });

describe('ToolsSection', () => {
  it('列出所有工具，點擊會切換工具並標示目前工具', async () => {
    const wrapper = mountWith(ToolsSection);
    const buttons = wrapper.findAll('[data-tool]');
    expect(buttons).toHaveLength(TOOLS.length);

    await wrapper.find('[data-tool=brush]').trigger('click');
    expect(engine.setTool).toHaveBeenCalledWith('brush');
    expect(wrapper.find('[data-tool=brush]').classes()).toContain('active');
  });

  it('按鈕提示包含翻譯後的名稱與快捷鍵', () => {
    const wrapper = mountWith(ToolsSection);
    expect(wrapper.find('[data-tool=pencil]').attributes('title')).toBe('鉛筆 (P)');
  });
});

describe('EditSection', () => {
  it('依引擎狀態啟用 / 停用按鈕', async () => {
    const wrapper = mountWith(EditSection);
    expect(wrapper.find('[data-action=undo]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-action=cut]').attributes('disabled')).toBeDefined();

    engine.store.set('canUndo', true);
    engine.store.set('hasRegion', true);
    await nextTick();
    expect(wrapper.find('[data-action=undo]').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[data-action=cut]').attributes('disabled')).toBeUndefined();

    await wrapper.find('[data-action=undo]').trigger('click');
    expect(engine.history.undo).toHaveBeenCalled();
  });
});

describe('QuotaDialog', () => {
  it('顯示目前容量；主要按鈕開啟匯出，也可以直接清空', async () => {
    engine.store.set('historyBytes', 250 * 1024 * 1024);
    const editor = useEditorStore();
    const wrapper = mount(QuotaDialog, { global: { plugins: [pinia, i18n] }, attachTo: document.body });
    await nextTick();
    const dialog = document.body.querySelector('.dialog')!;
    expect(dialog.textContent).toContain('250 MB');
    expect(dialog.textContent).toContain('200 MB');

    (document.body.querySelector('[data-action=dialog-ok]') as HTMLButtonElement).click();
    expect(editor.dialog).toBe('export');

    (document.body.querySelector('[data-action=quota-clear]') as HTMLButtonElement).click();
    expect(engine.history.clear).toHaveBeenCalled();
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });
});
