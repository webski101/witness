#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const encodedCredentials = process.env.SHAREDNET_CREDENTIALS_B64;
const roomId = process.env.SHAREDNET_ROOM_ID;
const agentHandle = process.env.SHAREDNET_AGENT_HANDLE ?? "witness";
const sharednetExecutable = process.env.SHAREDNET_CLI_BIN ?? "sharednet";

if (!encodedCredentials || !roomId) {
  throw new Error(
    "SHAREDNET_CREDENTIALS_B64 and SHAREDNET_ROOM_ID are required.",
  );
}

const credentials = Buffer.from(encodedCredentials, "base64").toString("utf8");
JSON.parse(credentials);

const sharednetDirectory = join(homedir(), ".config", "sharednet");
const credentialsPath = join(sharednetDirectory, "credentials.json");
await mkdir(sharednetDirectory, { recursive: true, mode: 0o700 });
await writeFile(credentialsPath, credentials, { mode: 0o600 });

function parseJsonOutput(stdout) {
  const start = stdout.indexOf("{");
  if (start < 0) {
    throw new Error(`SharedNet returned non-JSON output: ${stdout.trim()}`);
  }
  return JSON.parse(stdout.slice(start));
}

async function sharednet(args) {
  const { stdout } = await execFileAsync(sharednetExecutable, args, {
    env: process.env,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  return parseJsonOutput(stdout);
}

// Render containers are ephemeral, so a local SharedNet session file cannot be
// carried across deploys. Start a genuine Cloud-hosted runtime identity on each
// boot, then join the room already authorized for this account.
const started = await sharednet([
  "session",
  "start",
  "--agent",
  agentHandle,
  "--runtime",
  "custom",
  "--new",
]);
const sessionId = started.session_id ?? started.instance?.id;
if (!sessionId) throw new Error("SharedNet did not return a session id.");

const joined = await sharednet([
  "--session",
  sessionId,
  "room",
  "join",
  roomId,
]);
if (joined.room?.id !== roomId) {
  throw new Error(`SharedNet joined ${joined.room?.id ?? "no room"}, expected ${roomId}.`);
}

process.stdout.write(`Cloud session ${sessionId} joined ${roomId} as ${agentHandle}.\n`);

const child = spawn(
  process.execPath,
  [
    "scripts/sharednet-arena.mjs",
    "--session",
    sessionId,
    "--room",
    roomId,
    "--ignore-history",
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
