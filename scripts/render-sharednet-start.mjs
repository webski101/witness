#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const encodedCredentials = process.env.SHAREDNET_CREDENTIALS_B64;
const sessionId = process.env.SHAREDNET_SESSION_ID;
const roomId = process.env.SHAREDNET_ROOM_ID;

if (!encodedCredentials || !sessionId || !roomId) {
  throw new Error(
    "SHAREDNET_CREDENTIALS_B64, SHAREDNET_SESSION_ID, and SHAREDNET_ROOM_ID are required.",
  );
}

const credentials = Buffer.from(encodedCredentials, "base64").toString("utf8");
JSON.parse(credentials);

const sharednetDirectory = join(homedir(), ".config", "sharednet");
const credentialsPath = join(sharednetDirectory, "credentials.json");
await mkdir(sharednetDirectory, { recursive: true, mode: 0o700 });
await writeFile(credentialsPath, credentials, { mode: 0o600 });

const child = spawn(
  process.execPath,
  [
    "scripts/sharednet-arena.mjs",
    "--session",
    sessionId,
    "--room",
    roomId,
    "--announce",
  ],
  { stdio: "inherit", env: process.env },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
