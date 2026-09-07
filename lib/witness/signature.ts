import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";
import { canonicalize } from "./canonical";
import { getStore, type WitnessStore } from "./store";

export interface PublicKeyDescription {
  algorithm: "Ed25519";
  publicKey: string;
  publicKeyFormat: "spki-pem";
  publicKeyId: string;
  trustEnvironment: "production" | "development";
  note: string;
}

interface KeyMaterial {
  privateKey: KeyObject;
  publicKey: KeyObject;
  trustEnvironment: "production" | "development";
}

function importPrivate(raw: string): KeyObject {
  if (raw.includes("BEGIN PRIVATE KEY")) return createPrivateKey(raw);
  return createPrivateKey({ key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8" });
}

function importPublic(raw: string): KeyObject {
  if (raw.includes("BEGIN PUBLIC KEY")) return createPublicKey(raw);
  return createPublicKey({ key: Buffer.from(raw, "base64"), format: "der", type: "spki" });
}

function loadKeys(store: WitnessStore): KeyMaterial {
  const envPrivate = process.env.WITNESS_PRIVATE_KEY;
  const envPublic = process.env.WITNESS_PUBLIC_KEY;
  if (envPrivate && envPublic) {
    return {
      privateKey: importPrivate(envPrivate),
      publicKey: importPublic(envPublic),
      trustEnvironment: "production",
    };
  }

  let privateDer = store.getMetadata("development_private_key");
  let publicDer = store.getMetadata("development_public_key");
  if (!privateDer || !publicDer) {
    const pair = generateKeyPairSync("ed25519");
    privateDer = pair.privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
    publicDer = pair.publicKey.export({ format: "der", type: "spki" }).toString("base64");
    store.setMetadata("development_private_key", privateDer);
    store.setMetadata("development_public_key", publicDer);
  }
  return {
    privateKey: importPrivate(privateDer),
    publicKey: importPublic(publicDer),
    trustEnvironment: "development",
  };
}

export function getPublicKeyDescription(store = getStore()): PublicKeyDescription {
  const keys = loadKeys(store);
  const der = keys.publicKey.export({ format: "der", type: "spki" });
  const publicKeyId = `ed25519:${createHash("sha256").update(der).digest("hex").slice(0, 24)}`;
  return {
    algorithm: "Ed25519",
    publicKey: keys.publicKey.export({ format: "pem", type: "spki" }).toString(),
    publicKeyFormat: "spki-pem",
    publicKeyId,
    trustEnvironment: keys.trustEnvironment,
    note:
      keys.trustEnvironment === "production"
        ? "Persistent production key supplied by the deployment environment."
        : "Development key persisted in the local Witness store. Do not treat this as production trust evidence.",
  };
}

export function signPayload(payload: unknown, store = getStore()) {
  const keys = loadKeys(store);
  const bytes = Buffer.from(canonicalize(payload));
  const digest = createHash("sha256").update(bytes).digest("hex");
  const signature = sign(null, bytes, keys.privateKey).toString("base64");
  const description = getPublicKeyDescription(store);
  return {
    unsignedDigest: digest,
    signatureAlgorithm: "Ed25519" as const,
    signature,
    publicKeyId: description.publicKeyId,
    trustEnvironment: keys.trustEnvironment,
  };
}

export function verifyPayload(payload: unknown, signatureBase64: string, publicKeyPem: string): boolean {
  return verify(
    null,
    Buffer.from(canonicalize(payload)),
    createPublicKey(publicKeyPem),
    Buffer.from(signatureBase64, "base64"),
  );
}
