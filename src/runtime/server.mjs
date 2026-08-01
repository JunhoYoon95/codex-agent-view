import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";

import { createMonitorStore } from "../core/index.mjs";
import {
  DEFAULT_PORT,
  LOOPBACK_HOST,
  MAX_EVENT_BODY_BYTES,
  RUNTIME_SCHEMA_VERSION,
  createRuntimeToken,
  removeRuntimeInfo,
  writeRuntimeInfo,
} from "./config.mjs";

const STATIC_FILES = new Map([
  ["/", { url: new URL("../../public/index.html", import.meta.url), type: "text/html; charset=utf-8" }],
  ["/assets/app.js", { url: new URL("../../public/app.js", import.meta.url), type: "text/javascript; charset=utf-8" }],
  ["/assets/styles.css", { url: new URL("../../public/styles.css", import.meta.url), type: "text/css; charset=utf-8" }],
]);

const SECURITY_HEADERS = {
  "cache-control": "no-store",
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  "cross-origin-opener-policy": "same-origin",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

function sendJson(response, statusCode, value, extraHeaders = {}) {
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "content-type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  response.end(`${JSON.stringify(value)}\n`);
}

function isLoopbackHostHeader(value) {
  if (typeof value !== "string") {
    return false;
  }
  const hostname = value.startsWith("[")
    ? value.slice(1, value.indexOf("]"))
    : value.split(":", 1)[0];
  return hostname === LOOPBACK_HOST || hostname === "localhost" || hostname === "::1";
}

function hasToken(request, token) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return false;
  }
  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function readJsonBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_EVENT_BODY_BYTES) {
      const error = new Error("event body is too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (bytes === 0) {
    const error = new Error("event body is required");
    error.statusCode = 400;
    throw error;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("event body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

export async function startMonitorServer({
  host = LOOPBACK_HOST,
  port = DEFAULT_PORT,
  env = process.env,
  store = createMonitorStore(),
  token = createRuntimeToken(),
  now = Date.now,
} = {}) {
  if (host !== LOOPBACK_HOST) {
    throw new Error(`monitor server must bind to ${LOOPBACK_HOST}`);
  }

  const server = createServer(async (request, response) => {
    try {
      if (!isLoopbackHostHeader(request.headers.host)) {
        sendJson(response, 421, { error: "loopback host required" });
        return;
      }

      const requestUrl = new URL(request.url || "/", `http://${LOOPBACK_HOST}`);
      if (request.method === "GET" && requestUrl.pathname === "/api/health") {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (requestUrl.pathname.startsWith("/api/") && !hasToken(request, token)) {
        sendJson(response, 401, { error: "authorization required" });
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/api/state") {
        sendJson(response, 200, store.getSnapshot());
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/api/events") {
        const payload = await readJsonBody(request);
        const result = store.ingest(payload, { receivedAtMs: now() });
        sendJson(response, 202, { status: result.status });
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/internal/shutdown"
      ) {
        response.once("finish", () => {
          queueMicrotask(() => {
            void close().catch(() => {});
          });
        });
        sendJson(response, 202, { status: "shutting_down" });
        return;
      }

      const asset = request.method === "GET" ? STATIC_FILES.get(requestUrl.pathname) : null;
      if (asset) {
        const body = await readFile(fileURLToPath(asset.url));
        response.writeHead(200, {
          ...SECURITY_HEADERS,
          "content-type": asset.type,
        });
        response.end(body);
        return;
      }

      sendJson(response, 404, { error: "not found" });
    } catch (error) {
      sendJson(response, error?.statusCode || 500, {
        error: error?.statusCode ? error.message : "internal server error",
      });
    }
  });

  server.requestTimeout = 5_000;
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 2_000;
  server.maxHeadersCount = 64;

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("monitor server did not expose a TCP address");
  }

  const runtimeInfo = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    host,
    port: address.port,
    token,
    pid: process.pid,
    started_at_ms: now(),
  };
  try {
    await writeRuntimeInfo(runtimeInfo, env);
  } catch (error) {
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
    throw error;
  }

  let closePromise = null;
  async function close() {
    if (closePromise) {
      return closePromise;
    }
    closePromise = (async () => {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections?.();
      });
      await removeRuntimeInfo(token, env);
    })();
    return closePromise;
  }

  return {
    close,
    runtimeInfo,
    server,
    store,
    url: `http://${host}:${address.port}/#token=${encodeURIComponent(token)}`,
  };
}
