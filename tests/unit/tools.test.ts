import { describe, it, expect } from 'vitest';
import { sizeFor } from '../../src/engine/tools/helpers';
import { createStore } from '../../src/engine/core/store';
import { DEFAULT_STATE, type App, type AppState } from '../../src/engine';

const app = { store: createStore<AppState>({ ...DEFAULT_STATE, size: 20 }) } as unknown as App;
const session = (pointerType: string, pressure?: number) => ({
  button: 0,
  start: { x: 0, y: 0 },
  last: { x: 0, y: 0 },
  shift: false,
  pointerType,
  pressure,
});

describe('sizeFor（下筆力道）', () => {
  it('滑鼠與手指維持粗細設定', () => {
    expect(sizeFor(app, session('mouse', 0.1))).toBe(20);
    expect(sizeFor(app, session('touch', 1))).toBe(20);
  });

  it('觸控筆依力道在 15%–100% 之間變化，最小 1px', () => {
    expect(sizeFor(app, session('pen', 1))).toBe(20);
    expect(sizeFor(app, session('pen', 0))).toBe(3);
    expect(sizeFor(app, session('pen', 0.5))).toBe(12);
    app.store.set('size', 1);
    expect(sizeFor(app, session('pen', 0))).toBe(1);
  });
});
