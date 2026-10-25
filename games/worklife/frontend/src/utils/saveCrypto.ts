/**
 * Authenticated Save Encryption (AES-256-GCM)
 * Format: WLS1.<base64url(iv[12] || ciphertext || authTag[16])>
 * Compatible between WebCrypto (browser) and Node.js crypto.
 */

const SAVE_PREFIX = "WLS1.";
const SAVE_SECRET_MATERIAL = "worklife-isekai-encrypted-save-v1-key-2026";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function getAesKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest("SHA-256", enc.encode(SAVE_SECRET_MATERIAL));
  return crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export interface EncryptedSaveEnvelope {
  v: 1;
  exportedAt: number;
  userId?: string;
  session?: {
    userId: string;
    token: string;
    username?: string | null;
    resumeToken?: string | null;
  };
  state: Record<string, any>;
}

export async function encryptSaveEnvelope(envelope: EncryptedSaveEnvelope): Promise<string> {
  const key = await getAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(envelope));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const cipherBytes = new Uint8Array(cipherBuf);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, iv.length);
  return `${SAVE_PREFIX}${toBase64Url(combined)}`;
}

export async function decryptSaveEnvelope(saveCode: string): Promise<EncryptedSaveEnvelope> {
  const trimmed = saveCode.trim();
  if (!trimmed.startsWith(SAVE_PREFIX)) {
    throw new Error("存档格式无效：仅支持导入加密存档（WLS1），不支持明文 JSON");
  }
  const body = trimmed.slice(SAVE_PREFIX.length);
  let combined: Uint8Array;
  try {
    combined = fromBase64Url(body);
  } catch {
    throw new Error("存档密文损坏，无法解析");
  }
  if (combined.length < 12 + 16 + 2) {
    throw new Error("存档密文长度不合法");
  }
  const iv = combined.slice(0, 12);
  const cipherBytes = combined.slice(12);
  const key = await getAesKey();
  let plainBuf: ArrayBuffer;
  try {
    plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);
  } catch {
    throw new Error("存档解密失败：密文已被篡改或损坏");
  }
  const parsed = JSON.parse(new TextDecoder().decode(plainBuf));
  if (!parsed || parsed.v !== 1 || typeof parsed.state !== "object" || !parsed.state) {
    throw new Error("存档内容结构无效");
  }
  return parsed as EncryptedSaveEnvelope;
}
