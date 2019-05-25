# http-basic-auth-proxy-worker

A [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) that proxies fetch request in
order to support
[HTTP Basic Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#Basic_authentication_scheme).

This can be used to support HTTP Basic Authentication in
[`<audio>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio) and
[`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) elements that
[are not permitted to include credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#Access_using_credentials_in_the_URL).
in `src` URLs (eg. `<video src="https://USERNAME:PASSWORD@example.com">`).

Additionally, if the `request.origin` does not match this service worker's origin, then the
[`request.mode`](https://developer.mozilla.org/en-US/docs/Web/API/Request/mode) will be set to "cors".

Resources in [`<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) elements are *not* proxied.

## Getting Started

Install from [npm](https://www.npmjs.com/package/http-basic-auth-proxy-worker).

```bash
npm install --save http-basic-auth-proxy-worker
```

Install the `worker.js` file at the root of your application or at a location that matches your desired
[scope](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/scope).

```javascript
// webpack.config.js
module.exports = {
  entry: {
    main: "./src/index.js",
    worker: "./node_modules/http-basic-auth-proxy-worker/worker.js"
  }
};
```

Register the service worker in your entrypoint script:

```javascript
// index.js
const config = {
  baseUrl: "https://example.com/",
  username: "username",
  password: "password"
};

navigator.serviceWorker.addEventListener("message", event => {
  event.ports[0].postMessage(config);
});

navigator.serviceWorker.register("./worker.js");
```

This service worker sends its client(s) a message to request a configuration object.
This service worker maintains a cache of its configuration, but a client can invalidate this cache by sending the
a message:

```javascript
// You can specify any message text; it is not used.
navigator.serviceWorker.controller.postMessage("");
```

## Configuration

This service worker must be configured before it can be used.
The configuration object may contain the following properties:

| Name     | Description                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| baseUrl  | **Required** A URL prefix. If a fetched `request.url` begins with the "baseUrl", then it will be proxied.     |
| username | If present, an HTTP Basic Authentication header will be included in proxied requests.                         |
| password | If present, this value will be added to the HTTP Basic Authentication header. Ignored if "username" is empty. |

## Web Server

You may need to configure your web server to support [CORS requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS),
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

## Developing

### Chrome

- Navigate to chrome://flags/#unsafely-treat-insecure-origin-as-secure.
- Enable this option, and then add your local domain to this list, eg. "localhost"

### Firefox

- Navigate to about:debugging#workers 
- Disable "multi content processes" by setting “dom.ipc.multiOptOut” to `true` in about:config.

