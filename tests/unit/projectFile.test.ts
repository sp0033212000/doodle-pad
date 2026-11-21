import { describe, it, expect } from 'vitest';
import {
  encodeProject,
  decodeProject,
  ProjectFileError,
  type PixelCodec,
} from '../../src/engine/persistence/projectFile';
import type { DocumentSnapshot } from '../../src/engine/persistence/document';
import { createBuffer } from '../../src/engine/utils/pixels';

/** 測試用編碼：直接把像素轉成 base64（不經過 PNG） */
const rawCodec: PixelCodec = {
  encode: buf => Buffer.from(buf.data).toString('base64'),
  decode: async (data, w, h) => createBuffer(w, h, new Uint8ClampedArray(Buffer.from(data, 'base64'))),
};

function sampleDoc(): DocumentSnapshot {
  const canvas = createBuffer(4, 3);
  canvas.data.fill(200);
  const patch = createBuffer(1, 1, new Uint8ClampedArray([1, 2, 3, 255]));
  return {
    version: 1,
    canvas,
    objects: [{ id: 1, assetId: 'a', x: 1, y: 2, w: 3, h: 4 }],
    settings: { tool: 'brush', size: 7, primary: '#ff0000', secondary: '#ffffff', shapeMode: 'fill' },
    assets: [{ id: 'a', pixels: createBuffer(2, 2) }],
    history: {
      undo: [
        { id: 5, bytes: 8, objects: [], canvas: { kind: 'patch', x: 1, y: 1, before: patch, after: patch } },
      ],
      redo: [],
    },
  };
}

describe('.doodle 專案檔', () => {
  it('不含復原紀錄時，history 為 null', () => {
    const file = encodeProject(sampleDoc(), { includeHistory: false, codec: rawCodec });
    expect(file.format).toBe('doodle-pad');
    expect(file.history).toBeNull();
  });

  it('經過 JSON 來回轉換後內容不變（含復原紀錄）', async () => {
    const doc = sampleDoc();
    const json = JSON.stringify(encodeProject(doc, { includeHistory: true, codec: rawCodec }));
    const back = await decodeProject(JSON.parse(json), rawCodec);
    expect(back.objects).toEqual(doc.objects);
    expect(back.settings).toEqual(doc.settings);
    expect(Array.from(back.canvas.data)).toEqual(Array.from(doc.canvas.data));
    expect(back.assets.map(a => a.id)).toEqual(['a']);
    expect(back.history.undo[0]).toMatchObject({ id: 5, canvas: { kind: 'patch', x: 1, y: 1 } });
    expect(Array.from(back.history.undo[0].canvas!.after.data)).toEqual([1, 2, 3, 255]);
  });

  it('拒絕不是專案檔的內容', async () => {
    await expect(decodeProject({ hello: 1 }, rawCodec)).rejects.toBeInstanceOf(ProjectFileError);
    await expect(decodeProject(null, rawCodec)).rejects.toBeInstanceOf(ProjectFileError);
  });

  it('拒絕較新的版本', async () => {
    const file = { ...encodeProject(sampleDoc(), { includeHistory: false, codec: rawCodec }), version: 99 };
    await expect(decodeProject(file, rawCodec)).rejects.toThrow(/version/);
  });
});
