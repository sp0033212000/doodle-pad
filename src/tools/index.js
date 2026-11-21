// 工具註冊表：新增工具只要建立檔案並加到這個陣列即可
import { selectRect, lasso, magicWand } from './select.js';
import pencil from './pencil.js';
import brush from './brush.js';
import spray from './spray.js';
import eraser from './eraser.js';
import fill from './fill.js';
import picker from './picker.js';
import text from './text.js';
import { line, rect, ellipse } from './shapes.js';

export const TOOLS = [
  selectRect, lasso, magicWand,
  pencil, brush, spray, eraser, fill, picker, text,
  line, rect, ellipse,
];

const byId = new Map(TOOLS.map(t => [t.id, t]));
export const getTool = id => byId.get(id);
