# http-basic-auth-proxy-worker

A [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) that proxies browser-initiated
fetch request to support
[HTTP Basic Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#Basic_authentication_scheme).

This is useful to support HTTP Basic Authentication in
[`<audio>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio) and
[`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) elements.
Previously, you could include credentials in `src` URLs (eg. `<video src="https://USERNAME:PASSWORD@example.com">`), but
this is now
[disallowed by some web browsers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#Access_using_credentials_in_the_URL).

## Getting Started

Install from [npm](https://www.npmjs.com/package/http-basic-auth-proxy-worker).

```bash
npm install --save http-basic-auth-proxy-worker
```

Install the `worker.js` file at the root of your application or at a location that matches
your desired
[scope](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/scope).

### Example webpack configuration

```javascript
module.exports = {
  entry: {
    main: "./src/index.js",
    worker: "./node_modules/http-basic-auth-proxy-worker/worker.js"
  }
};
```

Register the service-worker in your entrypoint script, and pass it its initial configuration.

```javascript
if (!navigator.serviceWorker) {
  throw new Error('Cannot initialize, because the Service Worker API is not available.');
}

const init = () => {
  navigator.serviceWorker.controller.postMessage({
    baseURL: "https://example.com/",
    proxyBaseURL: `${window.location.origin}/proxy/`,
    username: "username",
    password: "password"
  });
};

// Triggered when a new worker is activated.
navigator.serviceWorker.addEventListener('controllerchange', init);

navigator.serviceWorker.register('./worker.js').then((registration) => {
  if (registration.active) {
    init();
  }
});
```

## Configuration

The service worker must be configured before it can be used.

| Name         | Description                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| baseURL      | **Required** The destination/backend base URL to proxy requests to.                                                                                                           |
| proxyBaseURL | **Required** The base URL of requests that you wish to proxy. Must match the origin of the service worker.                                                                    |
| username     | If present, an HTTP Basic Authentication header will be added, and the [`request.mode`](https://developer.mozilla.org/en-US/docs/Web/API/Request/mode) will be set to 'cors'. |
| password     | See "username" above.                                                                                                                                                         |

## Web Server

You must configure your web server to support [CORS requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS),
by adding the requisite access control headers:

### Example Nginx configuration

```
location / {
    root /var/www/html;
    autoindex on;

    auth_basic "Restricted Content";
    auth_basic_user_file /etc/nginx/cybertron.spacectrl.com.htpasswd;

    add_header Access-Control-Allow-Credentials true always;
    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Methods GET,POST,HEAD,DELETE,PUT,OPTIONS always;
    add_header Access-Control-Allow-Headers authorization,chrome-proxy,range always;

    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Credentials true always;
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Methods GET,POST,HEAD,DELETE,PUT,OPTIONS always;
        add_header Access-Control-Allow-Headers authorization,chrome-proxy,range always;
        return 204;
    }
}
```
