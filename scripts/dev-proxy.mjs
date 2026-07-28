import http from "node:http";

const listenPort = 3000;
const nextPort = 3001;
const prefix = "/proxy/3000";

const upstreamPath = (url = "/") => url === "/" ? prefix : `${prefix}${url}`;

const server = http.createServer((request, response) => {
  const proxyRequest = http.request({
    hostname: "127.0.0.1",
    port: nextPort,
    method: request.method,
    path: upstreamPath(request.url),
    headers: request.headers,
  }, (proxyResponse) => {
    response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
    proxyResponse.pipe(response);
  });

  proxyRequest.on("error", (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    response.end(`Next.js server is not ready: ${error.message}`);
  });

  request.pipe(proxyRequest);
});

server.on("upgrade", (request, socket, head) => {
  const proxyRequest = http.request({
    hostname: "127.0.0.1",
    port: nextPort,
    method: request.method,
    path: upstreamPath(request.url),
    headers: request.headers,
  });

  proxyRequest.on("upgrade", (proxyResponse, proxySocket, proxyHead) => {
    const headers = Object.entries(proxyResponse.headers)
      .flatMap(([name, value]) => Array.isArray(value)
        ? value.map((item) => `${name}: ${item}`)
        : value === undefined ? [] : [`${name}: ${value}`])
      .join("\r\n");
    socket.write(`HTTP/1.1 ${proxyResponse.statusCode} ${proxyResponse.statusMessage}\r\n${headers}\r\n\r\n`);
    if (proxyHead.length) socket.write(proxyHead);
    if (head.length) proxySocket.write(head);
    proxySocket.pipe(socket).pipe(proxySocket);
  });

  proxyRequest.on("error", () => socket.destroy());
  proxyRequest.end();
});

server.listen(listenPort, "0.0.0.0", () => {
  console.log(`Development proxy listening on http://localhost:${listenPort}`);
});
