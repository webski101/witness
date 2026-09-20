import assert from "node:assert/strict";
import test from "node:test";
import { isBlockedAddress, validateTargetUrl } from "./ssrf";

test("blocks private, metadata, and IPv4-mapped IPv6 addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456:789a::1",
    "fe80::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:172.16.0.1",
    "::ffff:169.254.169.254",
    "::ffff:100.64.0.1",
    "::ffff:c0a8:101",
    "::ffff:a9fe:a9fe",
    "::ffff:ac10:1",
    "::192.168.1.1",
    "64:ff9b::c0a8:1",
    "64:ff9b::169.254.169.254",
    "2002:c0a8:101::",
    "2002:a9fe:a9fe::1",
  ]) {
    assert.equal(isBlockedAddress(address), true, address);
  }
});

test("allows public IPv4 and IPv6 addresses", () => {
  for (const address of ["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888", "::ffff:8.8.8.8"]) {
    assert.equal(isBlockedAddress(address), false, address);
  }
});

test("validateTargetUrl rejects mapped metadata and private literals", async () => {
  await assert.rejects(() => validateTargetUrl("http://[::ffff:169.254.169.254]/", false), /blocked network address/);
  await assert.rejects(() => validateTargetUrl("http://[::ffff:172.16.0.1]/", false), /blocked network address/);
  await assert.rejects(() => validateTargetUrl("http://127.1/", false), /blocked network address/);
  await assert.rejects(() => validateTargetUrl("http://2130706433/", false), /blocked network address/);
  await assert.rejects(() => validateTargetUrl("http://localhost/service", false), /localhost is blocked/);
  await assert.rejects(() => validateTargetUrl("http://user:pass@example.com/", false), /embedded credentials/);
  const allowed = await validateTargetUrl("http://8.8.8.8/", false);
  assert.equal(allowed.hostname, "8.8.8.8");
});
