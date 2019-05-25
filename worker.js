// This service worker may terminated at any time, so this cache won't last very long.
let configCache = null;

const getConfig = async (clientId) => {
  if (configCache) {
    return configCache;
  }
  if (!clientId) {
    return;
  }

  let client;
  try {
    client = await clients.get(clientId);
  } catch {
    return;
  }

  const messageChannel = new MessageChannel();
  const messagePromise = new Promise((resolve, reject) => {
    messageChannel.port1.onmessage = (event) => {
      const config = event.data.error ? null : event.data;
      resolve(config);
    };
  });
  client.postMessage('get-configuration', [messageChannel.port2]);

  const config = await messagePromise;
  if (!config) {
    return;
  }

  configCache = config;
  return config;
};

const withAuthHeader = (headers, { username, password }) => {
  const credentials = !password ? username : `${username}:${password}`;
  const updatedHeaders = new Headers(headers);
  updatedHeaders.append('Authorization', `Basic ${btoa(credentials)}`);
  return updatedHeaders;
};

const proxyRequest = async ({ clientId, request }) => {
  const config = await getConfig(clientId);
  if (!config || !request.url.startsWith(config.baseUrl)) {
    return fetch(request);
  }

  const options = config.username ? { headers: withAuthHeader(request.headers, config) } : {};
  if (request.origin !== self.origin){
    options.mode = 'cors';
  }
  return fetch(new Request(request, options));
};

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Avoid a deadlock which can occur if this service worker attempts to fetch the script which has the proxy config.
  // This can occur when the browser is refreshed after this service worker is registered.
  if (event.request.destination === 'script') {
    return;
  }
  event.respondWith(proxyRequest(event));
});

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('message', () => {
  // Invalidate cache
  configCache = null;
});
