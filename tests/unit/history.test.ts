import { describe, it, expect, vi } from 'vitest';
import {
  createHistory,
  diffObjects,
  applyObjectChanges,
  type ObjectState,
} from '../../src/engine/core/history';
import { fakeCanvas, fakeObjects } from './fakes';

const obj = (id: number, x = 0, y = 0, assetId = 'a1'): ObjectState => ({ id, assetId, x, y, w: 10, h: 10 });

function setup(opts: Partial<Parameters<typeof createHistory>[0]> = {}) {
  const canvas = fakeCanvas(100, 80);
  const objects = fakeObjects();
  const onChange = vi.fn();
  const history = createHistory({ canvas, objects, onChange, ...opts });
  return { canvas, objects, history, onChange };
}

describe('history：畫布 patch', () => {
  it('復原 / 重做單一筆畫', () => {
    const { canvas, history } = setup();
    history.push();
    canvas.paint(10, 10);
    history.undo();
    expect(canvas.px(10, 10)).toBe(255);
    history.redo();
    expect(canvas.px(10, 10)).toBe(0);
  });

  it('只儲存被改到的區域', () => {
    const { canvas, history } = setup();
    history.push();
    canvas.paint(10, 10);
    canvas.paint(12, 11);
    history.commit();
    const [entry] = history.entries().undo;
    expect(entry.canvas).toMatchObject({ kind: 'patch', x: 10, y: 10 });
    expect(entry.canvas?.before).toMatchObject({ width: 3, height: 2 });
    // 3×2 像素 × 4 bytes × (before + after)，遠小於整張 100×80
    expect(history.bytes).toBeLessThan(100 * 80 * 4);
  });

  it('沒有任何變化時不產生紀錄', () => {
    const { history } = setup();
    history.push();
    history.commit();
    expect(history.steps).toBe(0);
  });

  it('畫布尺寸改變時存整張前後狀態，復原會還原尺寸', () => {
    const { canvas, history } = setup();
    canvas.paint(5, 5);
    history.push();
    canvas.setSize(40, 30, false);
    history.undo();
    expect([canvas.width, canvas.height]).toEqual([100, 80]);
    expect(canvas.px(5, 5)).toBe(0);
    history.redo();
    expect([canvas.width, canvas.height]).toEqual([40, 30]);
  });

  it('新的操作會清除重做紀錄並通知丟棄', () => {
    const onDiscard = vi.fn();
    const { canvas, history } = setup({ onDiscard });
    history.push();
    canvas.paint(1, 1);
    history.undo();
    history.push();
    canvas.paint(2, 2);
    history.commit();
    expect(history.entries().redo).toHaveLength(0);
    expect(onDiscard).toHaveBeenCalled();
  });

  it('超過步數上限時丟棄最舊的紀錄', () => {
    const onDiscard = vi.fn();
    const { canvas, history } = setup({ maxSteps: 3, onDiscard });
    for (let i = 0; i < 5; i++) {
      history.push();
      canvas.paint(i, 0);
    }
    history.commit();
    expect(history.steps).toBe(3);
    expect(onDiscard).toHaveBeenCalled();
  });

  it('超過容量上限時回報 overQuota', () => {
    const { canvas, history, onChange } = setup({ maxBytes: 10 });
    history.push();
    canvas.paint(1, 1);
    canvas.paint(50, 50);
    history.commit();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ overQuota: true }));
  });

  it('revert 放棄進行中的一步並還原', () => {
    const { canvas, history } = setup();
    history.push();
    canvas.paint(3, 3);
    history.revert();
    expect(canvas.px(3, 3)).toBe(255);
    expect(history.steps).toBe(0);
  });

  it('進行中的一步也算可以復原', () => {
    const { history, onChange } = setup();
    history.push();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ canUndo: true }));
  });
});

describe('history：一步的範圍', () => {
  it('一般操作在目前事件處理結束後自動完成', async () => {
    const { canvas, history } = setup();
    history.push();
    canvas.paint(1, 1);
    await Promise.resolve();
    expect(history.steps).toBe(1);
  });

  it('群組中的多次 push 合併成同一步，結束群組時才完成', async () => {
    const { canvas, objects, history } = setup();
    history.beginGroup();
    history.push();
    canvas.paint(1, 1);
    await Promise.resolve();
    expect(history.steps).toBe(0); // 拖曳中尚未完成
    history.push(); // 例如挖出選取範圍
    objects.add(obj(1));
    canvas.paint(2, 2);
    history.endGroup();
    expect(history.steps).toBe(1);
    history.undo();
    expect([canvas.px(1, 1), canvas.px(2, 2), objects.list.length]).toEqual([255, 255, 0]);
  });

  it('完成新的一步後，重做紀錄立即清除', () => {
    const { canvas, history, onChange } = setup();
    history.push();
    canvas.paint(1, 1);
    history.undo();
    history.beginGroup();
    history.push();
    canvas.paint(5, 5);
    history.endGroup();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ canRedo: false }));
  });
});

describe('history：物件操作', () => {
  it('記錄新增、移動、刪除，並可復原 / 重做', () => {
    const { objects, history } = setup();
    history.push();
    objects.add(obj(1));
    history.push();
    objects.move(1, 20, 30);
    history.push();
    objects.remove(1);
    history.commit();

    history.undo();
    expect(objects.list).toEqual([obj(1, 20, 30)]);
    history.undo();
    expect(objects.list).toEqual([obj(1, 0, 0)]);
    history.undo();
    expect(objects.list).toEqual([]);
    history.redo();
    history.redo();
    expect(objects.list).toEqual([obj(1, 20, 30)]);
  });

  it('同一步同時改畫布與物件（例如挖出選取範圍）', () => {
    const { canvas, objects, history } = setup();
    canvas.paint(10, 10);
    history.push();
    canvas.paint(10, 10, 255); // 挖空
    objects.add(obj(7, 10, 10));
    history.commit();
    expect(history.steps).toBe(1);
    history.undo();
    expect(canvas.px(10, 10)).toBe(0);
    expect(objects.list).toEqual([]);
  });

  it('紀錄只引用圖片 id，可列出所有被引用的圖片', () => {
    const { objects, history } = setup();
    history.push();
    objects.add(obj(1, 0, 0, 'img-A'));
    history.push();
    objects.add(obj(2, 0, 0, 'img-B'));
    history.commit();
    expect(history.referencedAssets()).toEqual(new Set(['img-A', 'img-B']));
  });
});

describe('diffObjects / applyObjectChanges', () => {
  it('還原時保留原本的疊放位置', () => {
    const before = [obj(1), obj(2), obj(3)];
    const after = [obj(1), obj(3)];
    const changes = diffObjects(before, after);
    expect(changes).toHaveLength(1);
    expect(applyObjectChanges(after, changes, 'before').map(o => o.id)).toEqual([1, 2, 3]);
  });

  it('沒有變化的物件不會出現在紀錄中', () => {
    expect(diffObjects([obj(1, 5, 5)], [obj(1, 5, 5)])).toEqual([]);
  });
});
