/**
 * 選取工具：矩形選取、套索、魔術棒。
 * 在已選取的範圍內按下並拖曳 → 挖出成為物件並跟著移動。
 */

/** 按在選取範圍內就挖出為物件，回傳 true 表示進入拖曳物件模式 */
function liftIfInside(app, p, s) {
  if (!app.selection.contains(p)) {
    app.selection.clear();
    return false;
  }
  s.liftId = app.selection.lift();
  s.objStart = app.objects.getPos(s.liftId);
  return true;
}

function moveLifted(app, p, s) {
  app.objects.moveTo(s.liftId, s.objStart.x + p.x - s.start.x, s.objStart.y + p.y - s.start.y);
}

/** 游標移到選取範圍內顯示「移動」 */
function hover(app, p) {
  app.canvas.canvas.style.cursor = app.selection.contains(p) ? 'move' : 'crosshair';
}

/** 在預覽層畫黑白雙色虛線 */
function strokePreview(app, drawPath) {
  const { octx } = app.canvas;
  const z = app.store.get('zoom');
  app.canvas.clearOverlay();
  octx.lineWidth = 1 / z;
  octx.beginPath();
  drawPath(octx);
  octx.setLineDash([]);
  octx.strokeStyle = '#fff';
  octx.stroke();
  octx.setLineDash([4 / z, 4 / z]);
  octx.strokeStyle = '#000';
  octx.stroke();
  octx.setLineDash([]);
}

const base = { cursor: 'crosshair', isSelection: true, modifiesCanvas: false, onHover: hover };

export const selectRect = {
  ...base,
  id: 'select', name: '矩形選取', icon: '⬚', key: 'm',
  onDown(app, p, s) { liftIfInside(app, p, s); },
  onMove(app, p, s) {
    if (s.liftId != null) return moveLifted(app, p, s);
    const x = Math.min(s.start.x, p.x), y = Math.min(s.start.y, p.y);
    const w = Math.abs(p.x - s.start.x), h = Math.abs(p.y - s.start.y);
    strokePreview(app, c => c.rect(x, y, w, h));
  },
  onUp(app, p, s) {
    app.canvas.clearOverlay();
    if (s.liftId == null) app.selection.setRect(s.start, p);
  },
};

export const lasso = {
  ...base,
  id: 'lasso', name: '套索', icon: '➰', key: 'q',
  onDown(app, p, s) {
    if (!liftIfInside(app, p, s)) s.points = [p];
  },
  onMove(app, p, s) {
    if (s.liftId != null) return moveLifted(app, p, s);
    s.points.push(p);
    strokePreview(app, c => {
      s.points.forEach((q, i) => (i ? c.lineTo(q.x + 0.5, q.y + 0.5) : c.moveTo(q.x + 0.5, q.y + 0.5)));
      c.closePath();
    });
  },
  onUp(app, p, s) {
    app.canvas.clearOverlay();
    if (s.liftId == null) app.selection.setPolygon(s.points);
  },
};

export const magicWand = {
  ...base,
  id: 'wand', name: '魔術棒', icon: '🪄', key: 'w',
  onDown(app, p, s) {
    if (!liftIfInside(app, p, s)) app.selection.setWand(p);
  },
  onMove(app, p, s) {
    if (s.liftId != null) moveLifted(app, p, s);
  },
};
