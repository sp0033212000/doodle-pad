import type { Store } from './core/store';
import type { CanvasManager } from './canvas/canvasManager';
import type { History } from './core/history';
import type { AssetStore } from './core/assets';
import type { ObjectLayer } from './canvas/objectLayer';
import type { Selection } from './canvas/selection';
import type { Clipboard } from './services/clipboard';
import type { ImageOps } from './services/imageOps';
import type { Zoom } from './canvas/zoom';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface Rect extends Point, Size {}

export type ShapeMode = 'stroke' | 'fill' | 'both';

export type TextAlign = 'left' | 'center' | 'right';

/** 文字工具的格式 */
export interface TextStyle {
  /** 字型代號（見 config.ts 的 TEXT_FONTS） */
  font: string;
  /** 字級（畫布像素） */
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  align: TextAlign;
  /** 以次色填滿文字背景 */
  fill: boolean;
}

/** 與 ImageData 相容的像素緩衝區（純資料，可在非 DOM 環境測試） */
export interface PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** 可繪製且有尺寸的圖片來源 */
export type SizedImageSource = CanvasImageSource & { width: number; height: number };

export interface AppState {
  tool: string;
  size: number;
  primary: string;
  secondary: string;
  shapeMode: ShapeMode;
  cursorPos: Point | null;
  canvasSize: Size;
  canUndo: boolean;
  canRedo: boolean;
  /** 復原紀錄總容量（bytes） */
  historyBytes: number;
  /** 復原紀錄是否超過容量上限 */
  historyOverQuota: boolean;
  zoom: number;
  /** 放大鏡倍率 */
  magnify: number;
  textStyle: TextStyle;
  hasSelection: boolean;
  hasRegion: boolean;
  canPasteInternal: boolean;
  /** 每次文件內容改變就遞增（自動保存用） */
  revision: number;
  /** 唯讀模式（作品已在其他分頁開啟） */
  readOnly: boolean;
  /** 只用筆（Apple Pencil）畫圖；手指用來平移與縮放 */
  penOnly: boolean;
  /** penOnly 是否由系統自動決定（使用者手動切換後為 false） */
  penOnlyAuto: boolean;
  /** 是否偵測過觸控筆 */
  penDetected: boolean;
  /** 左鍵 / 筆 / 手指改用次色（取代右鍵） */
  useSecondary: boolean;
}

/** 一次指標操作（按下 → 放開）期間的狀態 */
export interface ToolSession {
  button: number;
  start: Point;
  last: Point;
  shift: boolean;
  timer?: ReturnType<typeof setInterval>;
  points?: Point[];
  liftId?: number | null;
  objStart?: Point | null;
  /** mouse / pen / touch */
  pointerType?: string;
  /** 下筆力道 0–1（觸控筆才有意義） */
  pressure?: number;
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
  key: string;
  cursor: string;
  /** 選取類工具：在畫布上按下不會清除選取範圍 */
  isSelection?: boolean;
  /** false：不自動記錄復原點 */
  modifiesCanvas?: boolean;
  /** true：按一下即完成，不追蹤拖曳 */
  oneShot?: boolean;
  init?(app: App): void;
  onDown?(app: App, p: Point, s: ToolSession): void;
  onMove?(app: App, p: Point, s: ToolSession): void;
  onUp?(app: App, p: Point, s: ToolSession): void;
  onHover?(app: App, p: Point): void;
}

/** 所有模組共用的應用程式物件 */
export interface App {
  store: Store<AppState>;
  tools: Tool[];
  getTool(): Tool;
  isPinching: boolean;
  /** 中止進行中的筆畫並還原 */
  cancelStroke(): void;
  /** 註冊「尚未完成的操作」，在其他動作前會先被確定 */
  addPending(fn: () => void): void;
  finishPending(): void;
  setTool(id: string): void;
  swapColors(): void;
  cut(): void;
  copy(): void;

  canvas: CanvasManager;
  history: History;
  assets: AssetStore;
  objects: ObjectLayer;
  selection: Selection;
  clipboard: Clipboard;
  image: ImageOps;
  zoom: Zoom;
  stage: HTMLElement;
}
