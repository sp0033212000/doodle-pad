/**
 * 以像素內容計算圖片 id（同步、快速；用於圖片庫去重複）。
 * 兩條獨立的 32 位元雜湊（FNV-1a 與 Murmur 式混合）組成 64 位元，
 * 加上尺寸，碰撞機率對本用途可忽略。
 */
export function hashPixels(data: Uint8ClampedArray | Uint8Array, width: number, height: number): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9747b28c ^ width ^ (height << 16);
  const words = new Uint32Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 4));
  for (let i = 0; i < words.length; i++) {
    const v = words[i];
    h1 ^= v;
    h1 = Math.imul(h1, 0x01000193);
    let k = Math.imul(v, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    h2 ^= Math.imul(k, 0x1b873593);
    h2 = (h2 << 13) | (h2 >>> 19);
    h2 = (Math.imul(h2, 5) + 0xe6546b64) | 0;
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${width}x${height}-${hex(h1)}${hex(h2)}`;
}
