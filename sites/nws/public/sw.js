/* nws.co.il service worker (29.10.2026): web push notifications for urgent flashes only (edge function nws-push).
   No caching and no offline pages: this worker only shows a pushed notification and opens its story when it is clicked. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  var title = d.title || 'חדשות נתניה והשרון';
  var url = typeof d.url === 'string' && d.url.indexOf('https://nws.co.il/') === 0 ? d.url : 'https://nws.co.il/';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/push-badge.png',
    dir: 'rtl',
    lang: 'he',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: url }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || 'https://nws.co.il/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url === url && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(url);
  }));
});

/* the browser replaced the subscription: save the new one */
self.addEventListener('pushsubscriptionchange', function (e) {
  var KEY = 'BJxRa_tfNNHinWk2J84gFmbDbHTnYTK-3dTXPgDhTCFJfatCNaxO05_ORXwlOGWJHf_GM0IbGupUlVVwak7oVl0';
  function k(s) { var p = (s + '===').slice(0, s.length + (4 - s.length % 4) % 4).replace(/-/g, '+').replace(/_/g, '/'), b = atob(p), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  e.waitUntil(self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: k(KEY) }).then(function (sub) {
    return fetch('https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/nws-push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'sub', sub: sub.toJSON() }) });
  }).catch(function () {}));
});
