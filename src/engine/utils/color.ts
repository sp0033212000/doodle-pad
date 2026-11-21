/**
 * 顏色工具。顏色一律以 HEX 字串表示：
 *  - 不透明：#rrggbb
 *  - 半透明：#rrggbbaa（Canvas 與 CSS 都能直接使用）
 */
export type RGBA = [number, number, number, number];

export interface HSV {
  /** 色相 0–360 */
  h: number;
  /** 飽和度 0–1 */
  s: number;
  /** 明度 0–1 */
  v: number;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export const isHexColor = (value: string) => HEX_RE.test(value.trim());

/** 解析 #rgb / #rrggbb / #rrggbbaa；格式錯誤時回傳 null */
export function parseHex(value: string): RGBA | null {
  const m = HEX_RE.exec(value.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = [...hex].map(c => c + c).join('');
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), hex.length === 8 ? n(6) : 255];
}

export function hexToRgba(hex: string): RGBA {
  return parseHex(hex) ?? [0, 0, 0, 255];
}

const toHex2 = (v: number) =>
  Math.round(Math.max(0, Math.min(255, v)))
    .toString(16)
    .padStart(2, '0');

/** RGBA → HEX（完全不透明時省略 alpha） */
export function rgbToHex(r: number, g: number, b: number, a = 255): string {
  return '#' + [r, g, b].map(toHex2).join('') + (Math.round(a) >= 255 ? '' : toHex2(a));
}

/** 標準化成小寫 HEX（#rrggbb 或 #rrggbbaa） */
export function normalizeHex(value: string): string | null {
  const c = parseHex(value);
  return c && rgbToHex(...c);
}

/** 不透明度 0–1 */
export const alphaOf = (hex: string) => hexToRgba(hex)[3] / 255;

/** 去掉透明度 */
export function opaque(hex: string): string {
  const [r, g, b] = hexToRgba(hex);
  return rgbToHex(r, g, b);
}

/** 設定透明度（0–1） */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgba(hex);
  return rgbToHex(r, g, b, alpha * 255);
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb),
    min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToRgb({ h, s, v }: HSV): [number, number, number] {
  const c = v * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const [r1, g1, b1] =
    hh < 1
      ? [c, x, 0]
      : hh < 2
        ? [x, c, 0]
        : hh < 3
          ? [0, c, x]
          : hh < 4
            ? [0, x, c]
            : hh < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = v - c;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}
