const AUTH_HEADER_NAME = "Authorization";

let config = {}; // { baseURL, proxyBaseURL, username, password }

const toBackendURL = url => url.replace(config.proxyBaseURL, config.baseURL);

const getAuthHeader = () => {
  const { username, password } = config;
  if (!username) {
    return null;
  }
  const credentials = !password ? username : `${username}:${password}`;
  return `Basic ${btoa(credentials)}`;
};

const withAuthHeader = (headers, authHeader) => {
  const updatedHeaders = new Headers(headers);
  updatedHeaders.append(AUTH_HEADER_NAME, authHeader);
  return updatedHeaders;
};

const cloneCORSRequest = (request, authHeader, backendURL) =>
  new Request(backendURL, {
    body: request.body,
    cache: request.cache,
    credentials: request.credentials,
    headers: withAuthHeader(request.headers, authHeader),
    integrity: request.integrity,
    method: request.method,
    mode: "cors",
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy
  });

const proxy = request => {
  // If there's an authHeader then send a request with mode='cors';
  // otherwise, just fetch from the backend URL.
  const authHeader = getAuthHeader();
  const backendURL = toBackendURL(request.url);
  const proxyRequest = authHeader
    ? cloneCORSRequest(request, authHeader, backendURL)
    : new Request(backendURL, request);
  return fetch(proxyRequest);
};

self.onmessage = ({ data }) => {
  config = data;
};

self.addEventListener("fetch", event => {
  const { request } = event;
  if (!request.url.startsWith(config.proxyBaseURL)) {
    return;
  }
  event.respondWith(proxy(request));
});
