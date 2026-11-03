import { createHash, randomBytes } from "node:crypto";

/** 恢复凭证明文至少 32 字节。只把 SHA-256 十六进制摘要写入存储。 */
export const GUEST_RESUME_BYTES = 32;

export function newGuestResumeToken(): string {
  return randomBytes(GUEST_RESUME_BYTES).toString("base64url");
}

export function hashGuestResumeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
