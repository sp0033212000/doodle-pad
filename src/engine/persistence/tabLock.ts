/**
 * 跨分頁鎖（Web Locks API）：同一時間只有一個分頁可以編輯作品。
 *
 * 回傳是否立即取得鎖。沒有取得時會排隊等待，
 * 等其他分頁關閉、鎖被釋放後呼叫 onLateAcquire。
 * 瀏覽器不支援 Web Locks 時視為取得。
 */
export async function acquireTabLock(name: string, onLateAcquire: () => void): Promise<boolean> {
  const locks = navigator.locks;
  if (!locks) return true;

  const holdForever = () => new Promise<void>(() => {});
  const acquired = await new Promise<boolean>(resolve => {
    void locks.request(name, { ifAvailable: true }, lock => {
      if (!lock) {
        resolve(false);
        return undefined;
      }
      resolve(true);
      return holdForever();
    });
  });

  if (!acquired) {
    void locks.request(name, () => {
      onLateAcquire();
      return holdForever();
    });
  }
  return acquired;
}
