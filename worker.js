// This service worker may terminated at any time, so this cache may be reset.
let configCache = null;

const getConfig = async clientId => {
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
    messageChannel.port1.onmessage = event => {
      const config = event.data.error ? null : event.data;
      resolve(config);
    };
  });
  client.postMessage("get-configuration", [messageChannel.port2]);

  const config = await messagePromise;
  if (!config) {
    return;
  }

  // Update cache
  configCache = config;
  return config;
};

const withAuthHeader = (headers, { username, password }) => {
  const credentials = !password ? username : `${username}:${password}`;
  const updatedHeaders = new Headers(headers);
  updatedHeaders.append("Authorization", `Basic ${btoa(credentials)}`);
  return updatedHeaders;
};

const proxyFetch = async ({ clientId, request }) => {
  const config = await getConfig(clientId);
  const options = {};

  // Do not proxy if doing so would trigger a bug that can occur when Chrome Dev Tools is open.
  // If a "username" is supplied, then the request.mode will not be 'same-origin', which will trigger this bug.
  // https://stackoverflow.com/a/49719964
  // https://bugs.chromium.org/p/chromium/issues/detail?id=823392
  if (
    request.cache === "only-if-cached" &&
    (request.mode !== "same-origin" || (config && config.username))
  ) {
    options.cache = "default";
  }

  if (config && config.username && request.url.startsWith(config.baseUrl)) {
    options.credentials = "include";
    options.headers = withAuthHeader(request.headers, config);
    options.mode = "cors";
  }
  return fetch(request, options);
};

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  // Avoid a deadlock that can occur if this service worker attempts to fetch the script that has its configuration.
  // This can occur when the browser is refreshed after this service worker is registered.
  if (event.request.destination === "script") {
    return;
  }
  event.respondWith(proxyFetch(event));
});

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("message", () => {
  // Invalidate cache
  configCache = null;
});
