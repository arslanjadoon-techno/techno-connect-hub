self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        const sameOriginClients = clientList.filter((client) => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });
        const client = sameOriginClients[0];

        if (client) {
          try {
            await client.focus();
            if (client.url !== targetUrl) {
              // Let the SPA's React Router handle the route change. Calling
              // client.navigate() would perform a full document navigation.
              client.postMessage({
                type: "chat-notification-click",
                url: targetUrl,
              });
            }
            return;
          } catch {
            // Fall through to opening a fresh app window when a browser refuses
            // to focus or navigate an existing tab from the service worker.
          }
        }

        await self.clients.openWindow(targetUrl);
      }),
  );
});
