import { skipWaiting, clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "CribNotes";
  const options = {
    body: payload.body || "You have a new update.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || "cribnotes",
    data: {
      url: payload.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const targetUrl = new URL(url, self.location.origin).href;

    for (const client of clientList) {
      if ("focus" in client && client.url === targetUrl) {
        return client.focus();
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(targetUrl);
    }
  })());
});
