import type { Tool } from '../types';
import { selectRect, lasso, magicWand } from './select';
import pencil from './pencil';
import brush from './brush';
import spray from './spray';
import eraser from './eraser';
import fill from './fill';
import picker from './picker';
import text from './text';
import { line, rect, ellipse } from './shapes';

// 工具註冊表：新增工具只要建立檔案並加到這個陣列即可
export const TOOLS: Tool[] = [
  selectRect,
  lasso,
  magicWand,
  pencil,
  brush,
  spray,
  eraser,
  fill,
  picker,
  text,
  line,
  rect,
  ellipse,
];

const byId = new Map(TOOLS.map(t => [t.id, t]));
export const getTool = (id: string): Tool | undefined => byId.get(id);
