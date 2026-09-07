import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import {
  MAX_REDIRECTS,
  MAX_RESPONSE_BYTES,
  NETWORK_TIMEOUT_MS,
} from "./constants";

const DEMO_PATHS = new Set([
  "/api/demo/plainword",
  "/api/demo/omnibrain",
  "/api/demo/northstar",
]);

function ipv4ToNumber(ip: string): number {
  return ip.split(".").reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function inV4Range(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
}

export function isBlockedAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (isIP(normalized) === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ].some(([base, bits]) => inV4Range(normalized, String(base), Number(bits)));
  }
  if (isIP(normalized) === 6) {
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/u.test(normalized) ||
      normalized.startsWith("ff") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }
  return true;
}

export function isDemoUrl(url: URL): boolean {
  return (
    (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    url.port === "43147" &&
    DEMO_PATHS.has(url.pathname)
  );
}

export async function validateTargetUrl(raw: string, allowDemo = true): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("targetUrl must be a valid absolute URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("targetUrl must use http or https");
  }
  if (url.username || url.password) {
    throw new Error("targetUrl must not contain embedded credentials");
  }
  if (allowDemo && isDemoUrl(url)) return url;
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
    throw new Error("localhost is blocked for custom seller URLs");
  }
  const literalKind = isIP(url.hostname);
  const addresses = literalKind
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error("targetUrl resolves to a blocked network address");
  }
  return url;
}

export interface SellerResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

async function readBoundedBody(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_RESPONSE_BYTES) throw new Error("seller response exceeded the body limit");
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("seller response exceeded the body limit");
    }
    chunks.push(value);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchExternalSeller(options: {
  target: URL;
  allowedOrigin: string;
  method: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<SellerResponse> {
  let current = options.target;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const validated = await validateTargetUrl(current.toString(), false);
    if (validated.origin !== options.allowedOrigin) {
      throw new Error("request or redirect left the seller-origin grant");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("seller request timed out")), NETWORK_TIMEOUT_MS);
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(validated, {
        method: options.method,
        redirect: "manual",
        headers: {
          accept: "application/json, text/plain;q=0.8",
          ...(options.method === "POST" ? { "content-type": "application/json" } : {}),
          ...options.headers,
        },
        body: options.method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("seller returned a redirect without a location");
        if (redirect === MAX_REDIRECTS) throw new Error("seller exceeded the redirect limit");
        current = new URL(location, current);
        continue;
      }
      return {
        status: response.status,
        body: await readBoundedBody(response),
        headers: Object.fromEntries(response.headers.entries()),
      };
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }
  throw new Error("seller exceeded the redirect limit");
}
