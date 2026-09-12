#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { MCP_URL, responseFor } from "./sharednet-response.mjs";

const execFileAsync = promisify(execFile);
const CLI_VERSION = "0.1.4";
const DEFAULT_INTERVAL_MS = 15_000;
const SENDER_COOLDOWN_MS = 5 * 60_000;

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function requiredOption(name, envName) {
  const value = option(name) ?? process.env[envName];
  if (!value) {
    throw new Error(`Missing --${name} or ${envName}.`);
  }
  return value;
}

function parseJsonOutput(stdout) {
  const start = stdout.indexOf("{");
  if (start < 0) throw new Error(`SharedNet returned non-JSON output: ${stdout.trim()}`);
  return JSON.parse(stdout.slice(start));
}

async function sharednet(sessionId, args) {
  const configuredExecutable = process.env.SHAREDNET_CLI_BIN;
  const executable = configuredExecutable ?? (process.platform === "win32" ? "npx.cmd" : "npx");
  const executableArgs = configuredExecutable
    ? ["--session", sessionId, ...args]
    : ["-y", `sharednet@${CLI_VERSION}`, "--session", sessionId, ...args];
  const { stdout } = await execFileAsync(
    executable,
    executableArgs,
    { timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
  return parseJsonOutput(stdout);
}

const sessionId = requiredOption("session", "SHAREDNET_SESSION_ID");
const roomId = requiredOption("room", "SHAREDNET_ROOM_ID");
const intervalMs = Number(option("interval-ms") ?? DEFAULT_INTERVAL_MS);
if (!Number.isFinite(intervalMs) || intervalMs < 5_000) {
  throw new Error("--interval-ms must be a number of at least 5000.");
}
const stateDirectory = join(homedir(), ".config", "witness-arena");
const statePath = join(stateDirectory, `${roomId}-${sessionId}.json`);
let stopping = false;

process.on("SIGINT", () => {
  stopping = true;
  process.stdout.write("\nStopping Witness Arena runner...\n");
});
process.on("SIGTERM", () => {
  stopping = true;
});

async function loadState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function saveState(state) {
  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

async function post(content) {
  await sharednet(sessionId, ["room", "post", roomId, "--content", content]);
  process.stdout.write(`[post] ${content}\n`);
}

async function newestCursor() {
  let cursor = "0";
  let hasMore = true;
  while (hasMore) {
    const page = await sharednet(sessionId, ["room", "messages", roomId, "--after", cursor]);
    cursor = page.next_cursor ?? cursor;
    hasMore = Boolean(page.has_more);
  }
  return cursor;
}

async function main() {
  const status = await sharednet(sessionId, ["session", "status"]);
  const ownAgentId = status.agent?.id;
  process.stdout.write(`Witness ${ownAgentId ?? sessionId} is online.\n`);

  let state = await loadState();
  if (!state || hasFlag("ignore-history")) {
    state = { cursor: await newestCursor(), replied: [], senderCooldowns: {} };
    await saveState(state);
    process.stdout.write(`Ignoring room history through cursor ${state.cursor}.\n`);
  }
  state.replied ??= [];
  state.senderCooldowns ??= {};

  if (hasFlag("announce")) {
    await post(`Witness is online — test before you buy. Free discovery and signature verification. Probe: 8 credits. Docket: 15 credits. MCP: ${MCP_URL}`);
  }

  process.stdout.write(`Listening in ${roomId}; polling every ${intervalMs / 1000}s. Press Ctrl+C to stop.\n`);

  while (!stopping) {
    try {
      const batch = await sharednet(sessionId, [
        "room",
        "messages",
        roomId,
        "--after",
        String(state.cursor),
      ]);

      for (const message of batch.items ?? []) {
        const isOwn = message.sender_agent_id === ownAgentId || message.sender_instance_id === sessionId;
        if (!isOwn && !state.replied.includes(message.id)) {
          const response = responseFor(message);
          if (response) {
            const senderKey = message.sender_principal_id ?? message.sender_instance_id ?? "unknown";
            const lastReply = Number(state.senderCooldowns[senderKey] ?? 0);
            const cooldownPassed = Date.now() - lastReply >= SENDER_COOLDOWN_MS;
            if (response.kind === "payment" || cooldownPassed) {
              await post(response.content);
              state.senderCooldowns[senderKey] = Date.now();
              state.replied.push(message.id);
              state.replied = state.replied.slice(-200);
            }
          }
        }
      }

      const cutoff = Date.now() - 6 * 60 * 60_000;
      state.senderCooldowns = Object.fromEntries(
        Object.entries(state.senderCooldowns).filter(([, timestamp]) => Number(timestamp) >= cutoff),
      );

      state.cursor = batch.next_cursor ?? state.cursor;
      await saveState(state);
    } catch (error) {
      process.stderr.write(`[retry] ${error instanceof Error ? error.message : String(error)}\n`);
    }

    if (!stopping) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
