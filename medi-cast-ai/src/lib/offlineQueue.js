const KEY = 'medicast_offline_queue';
export const enqueueOffline = (url, body, headers = {}) => {
  const q = JSON.parse(localStorage.getItem(KEY) || '[]');
  q.push({ url, body, headers, ts: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(q));
};
export const flushOfflineQueue = async () => {
  if (!navigator.onLine) return;
  const q = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (!q.length) return;
  const rem = [];
  for (const item of q) {
    try {
      const r = await fetch(item.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...item.headers }, body: JSON.stringify(item.body) });
      if (!r.ok) rem.push(item);
    } catch { rem.push(item); }
  }
  localStorage.setItem(KEY, JSON.stringify(rem));
};
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushOfflineQueue);
  setTimeout(flushOfflineQueue, 3000);
}
