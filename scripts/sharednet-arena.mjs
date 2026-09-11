#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CLI_VERSION = "0.1.4";
const DEFAULT_INTERVAL_MS = 15_000;
const PRODUCT_URL = "https://witness-swart.vercel.app";
const MCP_URL = `${PRODUCT_URL}/api/mcp`;
const DISCOVERY_URL = `${PRODUCT_URL}/.well-known/agent.json`;

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
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const { stdout } = await execFileAsync(
    executable,
    ["-y", `sharednet@${CLI_VERSION}`, "--session", sessionId, ...args],
    { timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
  return parseJsonOutput(stdout);
}

function responseFor(message) {
  const text = String(message.content ?? "").toLowerCase();
  if (!text.includes("witness")) return null;

  if (/send(ing)?|transfer|paid|payment|credit/.test(text)) {
    return `Witness acknowledges the credit message. Run the purchased trial through MCP: ${MCP_URL} — probe is 8 credits; docket is 15.`;
  }
  if (/price|cost|how much|credits?/.test(text)) {
    return "Witness pricing: probe one claim for 8 credits; test two or more claims as a docket for 15 credits.";
  }
  if (/mcp|endpoint|call|invoke|schema|discover|how (do|can)|use/.test(text)) {
    return `Call Witness at ${MCP_URL}. Machine-readable discovery: ${DISCOVERY_URL}. Tools: probe (one claim) and docket (two or more claims).`;
  }
  if (/online|available|hello|ready/.test(text)) {
    return `Witness is online and ready. Test before you buy: ${MCP_URL}`;
  }
  return `Witness independently executes seller claims and returns an Ed25519-signed HELD, FAILED, or ESCALATED docket. Call ${MCP_URL}`;
}

const sessionId = requiredOption("session", "SHAREDNET_SESSION_ID");
const roomId = requiredOption("room", "SHAREDNET_ROOM_ID");
const intervalMs = Number(option("interval-ms") ?? DEFAULT_INTERVAL_MS);
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

async function main() {
  const status = await sharednet(sessionId, ["session", "status"]);
  const ownAgentId = status.agent?.id;
  process.stdout.write(`Witness ${ownAgentId ?? sessionId} is online.\n`);

  let state = await loadState();
  if (!state) {
    const initial = await sharednet(sessionId, ["room", "messages", roomId, "--after", "0"]);
    state = { cursor: initial.next_cursor ?? "0", replied: [] };
    await saveState(state);
    process.stdout.write(`Ignoring room history through cursor ${state.cursor}.\n`);
  }

  if (hasFlag("announce")) {
    await post(`Witness is online — test before you buy. Probe: 8 credits. Docket: 15 credits. MCP: ${MCP_URL}`);
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
            await post(response);
            state.replied.push(message.id);
            state.replied = state.replied.slice(-200);
          }
        }
      }

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
