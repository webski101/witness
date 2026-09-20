import http from "node:http";
import https from "node:https";
import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { Readable } from "node:stream";
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

const blockedAddresses = new BlockList();
for (const [base, bits] of [
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
] as const) {
  blockedAddresses.addSubnet(base, bits, "ipv4");
}
blockedAddresses.addAddress("::", "ipv6");
blockedAddresses.addAddress("::1", "ipv6");
blockedAddresses.addSubnet("fc00::", 7, "ipv6");
blockedAddresses.addSubnet("fe80::", 10, "ipv6");
blockedAddresses.addSubnet("fec0::", 10, "ipv6");
blockedAddresses.addSubnet("ff00::", 8, "ipv6");

export function hostOf(url: URL): string {
  const hostname = url.hostname;
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

function parseIpv6Groups(address: string): number[] | undefined {
  let ip = address.toLowerCase();
  const dotted = /:(\d{1,3}(?:\.\d{1,3}){3})$/u.exec(ip);
  if (dotted) {
    const octets = dotted[1].split(".").map(Number);
    if (octets.length !== 4 || octets.some((octet) => octet < 0 || octet > 255)) return undefined;
    ip = `${ip.slice(0, dotted.index)}:${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const parts = (head: string) => (head ? head.split(":") : []);
  let groups: string[];
  if (ip.includes("::")) {
    const [head, tail, extra] = ip.split("::");
    if (extra !== undefined) return undefined;
    const left = parts(head);
    const right = parts(tail);
    const missing = 8 - left.length - right.length;
    if (missing <= 0) return undefined;
    groups = [...left, ...Array.from({ length: missing }, () => "0"), ...right];
  } else {
    groups = ip.split(":");
  }
  if (groups.length !== 8 || groups.some((group) => group === "" || group.length > 4 || /[^0-9a-f]/u.test(group))) {
    return undefined;
  }
  return groups.map((group) => Number.parseInt(group, 16));
}

function groupsToIpv4(groups: number[], start: number): string {
  return `${groups[start] >> 8}.${groups[start] & 255}.${groups[start + 1] >> 8}.${groups[start + 1] & 255}`;
}

function encodedIpv4(address: string): string | undefined {
  const groups = parseIpv6Groups(address);
  if (!groups) return undefined;
  if (groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0xffff) {
    return groupsToIpv4(groups, 6);
  }
  if (groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0 && (groups[6] !== 0 || groups[7] > 1)) {
    return groupsToIpv4(groups, 6);
  }
  if (groups[0] === 0x64 && groups[1] === 0xff9b && groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0) {
    return groupsToIpv4(groups, 6);
  }
  if (groups[0] === 0x2002) return groupsToIpv4(groups, 1);
  return undefined;
}

export function isBlockedAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  const kind = isIP(normalized);
  if (kind === 4) return blockedAddresses.check(normalized, "ipv4");
  if (kind === 6) {
    if (blockedAddresses.check(normalized, "ipv6")) return true;
    const embedded = encodedIpv4(normalized);
    return embedded ? blockedAddresses.check(embedded, "ipv4") : false;
  }
  return true;
}

export function isDemoUrl(url: URL): boolean {
  return (
    (hostOf(url) === "127.0.0.1" || hostOf(url) === "localhost") &&
    url.port === "43147" &&
    DEMO_PATHS.has(url.pathname)
  );
}

export async function resolveAllowedAddresses(url: URL): Promise<string[]> {
  const host = hostOf(url);
  const literalKind = isIP(host);
  const addresses = literalKind
    ? [host]
    : (await dnsLookup(host, { all: true, verbatim: true })).map(({ address }) => address);
  if (addresses.length === 0 || addresses.some((address) => isBlockedAddress(address))) {
    throw new Error("targetUrl resolves to a blocked network address");
  }
  return addresses;
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
  const host = hostOf(url);
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("localhost is blocked for custom seller URLs");
  }
  await resolveAllowedAddresses(url);
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

function pinnedLookup(address: string): NonNullable<https.RequestOptions["lookup"]> {
  const family = isIP(address) === 6 ? 6 : 4;
  return ((_hostname, options, callback) => {
    if (options && "all" in options && options.all) {
      (callback as (err: Error | null, addresses: { address: string; family: number }[]) => void)(null, [
        { address, family },
      ]);
      return;
    }
    (callback as (err: Error | null, address: string, family: number) => void)(null, address, family);
  }) as NonNullable<https.RequestOptions["lookup"]>;
}

async function fetchPinned(url: URL, options: {
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  address: string;
}): Promise<Response> {
  const isTls = url.protocol === "https:";
  const port = url.port ? Number(url.port) : isTls ? 443 : 80;
  const hostname = hostOf(url);
  return await new Promise((resolve, reject) => {
    const request = (isTls ? https : http).request(
      {
        protocol: url.protocol,
        hostname,
        port,
        path: `${url.pathname}${url.search}`,
        method: options.method,
        headers: options.headers,
        servername: isTls ? hostname : undefined,
        lookup: pinnedLookup(options.address),
        signal: options.signal,
      },
      (incoming) => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(incoming.headersDistinct)) {
          if (!value) continue;
          for (const item of value) headers.append(key, item);
        }
        resolve(
          new Response(Readable.toWeb(incoming) as ReadableStream<Uint8Array>, {
            status: incoming.statusCode ?? 0,
            statusText: incoming.statusMessage,
            headers,
          }),
        );
      },
    );
    request.on("error", reject);
    if (options.body !== undefined) request.write(options.body);
    request.end();
  });
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
    const addresses = await resolveAllowedAddresses(validated);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("seller request timed out")), NETWORK_TIMEOUT_MS);
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetchPinned(validated, {
        method: options.method,
        headers: {
          accept: "application/json, text/plain;q=0.8",
          ...(options.method === "POST" ? { "content-type": "application/json" } : {}),
          ...options.headers,
        },
        body: options.method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
        signal: controller.signal,
        address: addresses[0],
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
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
