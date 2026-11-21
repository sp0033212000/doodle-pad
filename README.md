# 塗鴉板 Doodle Pad

受傳統小畫家啟發的網頁繪圖 app：鉛筆、筆刷、圖形、油漆桶、矩形選取 / 套索 / 魔術棒、
可編輯的貼上物件、裁切與調整大小、兩指縮放。

**線上版：** https://sp0033212000.github.io/doodle-pad/

```bash
npm install
npm run dev      # 開發伺服器 http://localhost:5173
npm run build    # 輸出到 dist/
```

## 專案結構

```
src/
├── main.js                 組裝入口：建立 app 物件、掛載各模組
├── config.js               常數（調色盤、粗細範圍、預設狀態…）
├── core/
│   ├── store.js            狀態管理 get / set / on
│   ├── history.js          復原 / 重做
│   └── shortcuts.js        鍵盤快捷鍵
├── canvas/
│   ├── canvasManager.js    主畫布 + 預覽層 API
│   ├── interaction.js      指標事件 → 目前工具
│   └── resizeHandle.js     右下角調整大小把手
├── tools/                  每個工具一個檔案，index.js 為註冊表
├── services/
│   ├── fileService.js      新增 / 開啟 / 儲存 / 拖曳開檔
│   └── clipboard.js        剪貼簿貼上（浮動圖層）
├── ui/
│   ├── components/         共用元件（group、button）
│   ├── toolbar/
│   │   ├── Toolbar.js      上方工具列，依 DEFAULT_SECTIONS 排列
│   │   └── sections/       檔案、編輯、工具、選項、色彩 各區塊
│   └── StatusBar.js
├── utils/                  dom、color、floodFill、image
└── styles/                 base / toolbar / canvas / statusbar
```

## 擴充方式

- **新增工具**：在 `src/tools/` 建立檔案，匯出 `{ id, name, icon, key, cursor, onDown, onMove, onUp }`，加入 `tools/index.js` 的 `TOOLS` 陣列。按鈕與快捷鍵會自動出現。
- **新增工具列區塊**：在 `ui/toolbar/sections/` 寫一個 `createXxxSection(app)` 回傳 DOM，加入 `Toolbar.js` 的 `DEFAULT_SECTIONS`。
- 模組之間透過 `app.store` 溝通：`store.set('size', 5)`、`store.on('size', fn)`。

## 選取工具（`tools/select.js`、`canvas/selection.js`）

- **⬚ 矩形選取**（M）、**➰ 套索**（Q，自由手繪框選）、**🪄 魔術棒**（W，點一下選取顏色相近的相連區域）
- 選取後出現螞蟻線與操作列：✂️ 剪下、📄 複製、⤢ 轉為物件、🗑 刪除
- `Ctrl/⌘+X` / `Ctrl/⌘+C` 後用 `Ctrl/⌘+V` 貼回，會成為可編輯的物件
- 直接拖曳選取範圍內部 → 挖出並移動（成為物件，可再縮放 / 鎖定）
- `Delete` 清除內容、`Esc` 取消、`Ctrl/⌘+A` 全選
- 挖空的地方以「次色」填滿

## 影像：裁切 / 調整大小（`services/imageOps.js`、`ui/dialogs/ResizeDialog.js`）

- **⌗ 裁切**（`Ctrl/⌘+Shift+X`，或選取操作列上的按鈕）：把畫布裁成選取範圍；套索 / 魔術棒選取時，範圍外以次色填滿
- **⤡ 調整大小**：以百分比或像素設定，可維持長寬比。作用對象依序為
  選取的物件 → 選取範圍（挖出成物件後縮放）→ 整張圖片
- 裁切 / 縮放整張圖片時，未鎖定的物件會跟著位移 / 縮放；皆可復原

## 縮放畫布（`canvas/zoom.js`）

- 觸控板兩指捏合、觸控螢幕兩指捏合（同時可兩指拖曳平移）
- `Ctrl/⌘ + 滾輪`、`Ctrl/⌘ + =` / `-` / `0`（重設 100%）
- 狀態列右下角 `− 100% +`；範圍 10% – 800%，200% 以上顯示像素格
- 只改變檢視，不改變畫布實際像素；縮放時以手指 / 游標位置為中心

## 貼上物件（`canvas/objectLayer.js`）

- `Ctrl/⌘+V` 或工具列「📋 貼上」→ 圖片成為浮在畫布上的**物件**
- 物件失去焦點後仍保留，可隨時再點選來移動、縮放（右下角把手，Shift 保持比例）、方向鍵微調
- 選取時出現操作列：**🔒 鎖定到畫布**（`Enter`）、✂️ 剪下、📄 複製、🗑 刪除（`Delete`）
- 剪下 / 複製：`Ctrl/⌘+X` / `Ctrl/⌘+C`，再 `Ctrl/⌘+V` 貼回（保留縮放後大小；複製每次往右下錯開 10px）
- 圖片比畫布大時，畫布的長 / 寬會自動擴大
- 存檔時未鎖定的物件也會一起輸出；所有動作皆可復原
