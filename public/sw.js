// HC Aces PWA Service Worker for System Push Notifications
const SW_VERSION = '1.0.0';

self.addEventListener('install', (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Become available to all open pages immediately
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push events from server / Push service
self.addEventListener('push', (event) => {
  let payload = {
    title: 'HC Aces',
    body: 'Nové týmové oznámení',
    url: '/dashboard'
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const title = payload.title || 'HC Aces';
  const targetUrl = payload.url || (payload.matchId ? `/dashboard?matchId=${payload.matchId}` : '/dashboard');
  
  const options = {
    body: payload.body || payload.message || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: payload.tag || (payload.id ? `aces-${payload.id}` : `aces-${Date.now()}`),
    renotify: true,
    data: {
      url: targetUrl,
      id: payload.id
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle user clicking on the notification in Android drawer / OS notification tray
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? new URL(event.notification.data.url, self.location.origin).href
    : new URL('/dashboard', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open on this origin, focus it and navigate
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Allow client pages to post message to SW to trigger notifications or check status
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        renotify: true,
        ...options
      })
    );
  }
});
