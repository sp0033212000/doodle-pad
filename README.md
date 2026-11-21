# 塗鴉板 Doodle Pad

受傳統小畫家啟發的網頁繪圖 app：鉛筆、筆刷、圖形、油漆桶、矩形選取 / 套索 / 魔術棒、
可編輯的貼上物件、裁切與調整大小、兩指縮放。

**線上版：** https://sp0033212000.github.io/doodle-pad/

```bash
npm install
npm run dev        # 開發伺服器 http://localhost:5173
npm run build      # 輸出到 dist/
npm test           # 型別檢查 + lint + 單元測試 + E2E
npm run test:unit  # Vitest：引擎的純邏輯
npm run test:e2e   # Playwright：對建置後的網站做驗收測試
```

CI（`.github/workflows/ci.yml`）：每次推送與 PR 都會跑型別檢查、ESLint、Prettier、單元測試與 E2E；
推送到 `main` 且全部通過才部署到 GitHub Pages。

## 架構

分兩層：**繪圖引擎**是純 TypeScript，不依賴任何框架，負責畫布、工具、復原紀錄與所有輸入事件；
**介面**用 Vue 3 + Pinia + vue-i18n，只負責工具列、狀態列與對話框。引擎以 `markRaw` 保存，
不讓 Vue 的響應式系統追蹤繪圖時的大量運算；Pinia store 鏡像引擎狀態供元件讀取。

```
src/
├── engine/                 繪圖引擎（純 TypeScript，不依賴介面框架）
│   ├── index.ts            createEngine() / startEngine()
│   ├── types.ts            App、Tool、AppState 等型別
│   ├── config.ts           常數與預設狀態
│   ├── core/
│   │   ├── store.ts        狀態管理 get / set / on
│   │   ├── history.ts      復原紀錄（操作紀錄 + 區域 patch）
│   │   ├── assets.ts       圖片庫（內容雜湊 id、去重複、回收）
│   │   ├── shortcuts.ts    鍵盤快捷鍵（以實體按鍵判斷，不受輸入法影響）
│   │   └── focusGuard.ts   防止點擊時元素取得焦點
│   ├── canvas/             畫布、指標事件、物件圖層、選取範圍、縮放
│   ├── tools/              每個工具一個檔案，index.ts 為註冊表
│   ├── services/           剪貼簿、開檔存檔、裁切與調整大小
│   └── utils/              像素運算、flood fill、雜湊、DOM 小工具
│   └── i18n.ts             引擎 DOM 的翻譯鍵（由介面層提供翻譯）
├── App.vue                 建立引擎、掛載畫布
├── components/             Vue 元件：工具列各區塊、狀態列、對話框
├── stores/editor.ts        Pinia：鏡像引擎狀態，動作轉交引擎
├── composables/            介面邏輯（例如調整大小的換算）
├── i18n/                   vue-i18n 語系檔
└── styles/
tests/
├── unit/                   Vitest
└── e2e/                    Playwright（選擇器契約見 helpers.ts）
```

### 復原紀錄（`engine/core/history.ts`）

每一步不存整張畫布，只記錄「改了什麼」：

- **畫布**：被改到那塊區域「改之前 / 改之後」的像素；畫布尺寸改變時才存整張。
- **物件**：每個物件改之前 / 改之後的狀態（位置、大小、引用的圖片 id）。圖片本身存在圖片庫，
  相同內容只存一份，不再被物件或紀錄引用時自動回收。
- 拖曳類操作以 `beginGroup()` / `endGroup()` 合併成同一步；一般操作在事件處理結束後自動完成。
- 上限：最近 100 步；總容量超過 200 MB 時回報 `historyOverQuota`。

### 擴充方式

- **新增工具**：在 `src/engine/tools/` 建立檔案，匯出符合 `Tool` 介面的物件，加入 `tools/index.ts` 的 `TOOLS`。
  按鈕與快捷鍵會自動出現。
- 模組之間透過 `app.store` 溝通：`store.set('size', 5)`、`store.on('size', fn)`。

## 自動保存（`engine/persistence/`）

- 作品自動存在瀏覽器的 IndexedDB：畫布、未鎖定的物件、工具設定，以及**復原紀錄**（重新整理後仍可 `Cmd+Z`）
- 操作後 1 秒沒有新操作才寫入；切換分頁或關閉頁面時立刻寫入；拖曳中不會寫入一半的步驟
- 復原紀錄的步驟與圖片只寫入新增的部分
- 同時開兩個分頁時，第二個分頁為唯讀（Web Locks API），第一個分頁關閉後自動切換成可編輯
- 復原紀錄超過 200 MB 時跳出提醒，可清空紀錄（作品保留）

## 專案檔 `.doodle`（`engine/persistence/projectFile.ts`）

- 「📦 匯出專案」：單一 JSON 檔，圖片以 base64 PNG 內嵌；保留畫布、未鎖定的物件、圖片庫與工具設定
- 可勾選「包含復原紀錄」（預設不含，檔案較小）；匯出後詢問是否清空復原紀錄以釋放瀏覽器空間
- 「📂 開啟」或拖進畫布即可載入 `.doodle`（也可開啟一般圖片）
- 復原紀錄超過容量上限時，提醒對話框會建議先匯出專案檔

## SEO

- `index.html`：標題、描述、canonical、robots、Open Graph 與 Twitter 卡片（分享圖 `public/og-image.png`，
  由 `node scripts/generate-og-image.mjs` 產生）、`WebApplication` 結構化資料，以及沒有 JavaScript 時的說明文字
- 切換語言時，頁面標題與描述跟著更新
- `public/sitemap.xml`：專案網站在子路徑下，`robots.txt` 只在網域根目錄有效，
  所以請到 [Google Search Console](https://search.google.com/search-console) 手動提交
  `https://sp0033212000.github.io/doodle-pad/sitemap.xml`

## 語言

- 繁體中文與英文；預設依瀏覽器語言（中文顯示繁中，其他顯示英文）
- 狀態列右下角切換，選擇會被記住；畫布上的操作列與提示訊息也會跟著切換

## 平板版面

- 寬度 900px 以下（例如 iPad 直向）改用**側邊工具列**：選單、復原 / 重做、所有工具、目前顏色
- 檔案、編輯、影像、粗細與調色盤收在「☰」展開的設定面板，點背景關閉
- 觸控裝置上按鈕至少 44px

## Apple Pencil / 觸控筆

- **壓力感應**：筆刷與鉛筆的粗細隨下筆力道在 15%–100% 之間變化（粗細設定為最大值）
- **只用筆畫圖**：第一次偵測到筆時自動開啟；手指改為單指平移、兩指縮放（物件仍可用手指拖曳）。
  可在「選項」或側邊工具列（✍️）切換，手動設定會被記住
- **使用主色 / 次色**：觸控裝置沒有右鍵，用這個開關讓筆或手指改畫次色
- 使用 coalesced pointer events，快速筆畫也平滑

## PWA

- 可「加到主畫面」（iPad / iPhone / Android / 桌機 Chrome），以全螢幕開啟、離線也能使用
- 第一次載入完成後顯示「已可離線使用」；有新版本時顯示提示，按「重新整理」才更新
- 圖示由 `public/favicon.svg` 產生：`node scripts/generate-icons.mjs`

## 選取工具（`engine/tools/select.ts`、`engine/canvas/selection.ts`）

- **⬚ 矩形選取**（M）、**➰ 套索**（Q，自由手繪框選）、**🪄 魔術棒**（W，點一下選取顏色相近的相連區域）
- 選取後出現螞蟻線與操作列：✂️ 剪下、📄 複製、⤢ 轉為物件、🗑 刪除
- `Ctrl/⌘+X` / `Ctrl/⌘+C` 後用 `Ctrl/⌘+V` 貼回，會成為可編輯的物件
- 直接拖曳選取範圍內部 → 挖出並移動（成為物件，可再縮放 / 鎖定）
- `Delete` 清除內容、`Esc` 取消、`Ctrl/⌘+A` 全選
- 挖空的地方以「次色」填滿

## 影像：裁切 / 調整大小（`engine/services/imageOps.ts`）

- **⌗ 裁切**（`Ctrl/⌘+Shift+X`，或選取操作列上的按鈕）：把畫布裁成選取範圍；套索 / 魔術棒選取時，範圍外以次色填滿
- **⤡ 調整大小**：以百分比或像素設定，可維持長寬比。作用對象依序為
  選取的物件 → 選取範圍（挖出成物件後縮放）→ 整張圖片
- 裁切 / 縮放整張圖片時，未鎖定的物件會跟著位移 / 縮放；皆可復原

## 縮放畫布（`engine/canvas/zoom.ts`）

- 觸控板兩指捏合、觸控螢幕兩指捏合（同時可兩指拖曳平移）
- `Ctrl/⌘ + 滾輪`、`Ctrl/⌘ + =` / `-` / `0`（重設 100%）
- 狀態列右下角 `− 100% +`；範圍 10% – 800%，200% 以上顯示像素格
- 只改變檢視，不改變畫布實際像素；縮放時以手指 / 游標位置為中心

## 貼上物件（`engine/canvas/objectLayer.ts`）

- `Ctrl/⌘+V` 或工具列「📋 貼上」→ 圖片成為浮在畫布上的**物件**
- 物件失去焦點後仍保留，可隨時再點選來移動、縮放（右下角把手，Shift 保持比例）、方向鍵微調
- 選取時出現操作列：**🔒 鎖定到畫布**（`Enter`）、✂️ 剪下、📄 複製、🗑 刪除（`Delete`）
- 剪下 / 複製：`Ctrl/⌘+X` / `Ctrl/⌘+C`，再 `Ctrl/⌘+V` 貼回（保留縮放後大小；複製每次往右下錯開 10px）
- 圖片比畫布大時，畫布的長 / 寬會自動擴大
- 存檔時未鎖定的物件也會一起輸出；所有動作皆可復原
