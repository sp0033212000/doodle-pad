import { tr } from '../i18n';

/** Blob / File → 已載入的 HTMLImageElement */
export function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(tr('engine.msg.imageLoadFailed')));
    };
    img.src = url;
  });
}
