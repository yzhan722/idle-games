import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { decryptSaveEnvelope, encryptSaveEnvelope } from "../frontend/src/utils/saveCrypto";

describe("导出存档不带登录凭证", () => {
  it("导出再读回：只有存档；旧文件里的 session 认得出，但读出来就没有了", async () => {
    const plain = await encryptSaveEnvelope({ v: 1, exportedAt: 1, userId: "u1", state: { inventory: { gold: 3 } } });
    assert.deepEqual(await decryptSaveEnvelope(plain), { v: 1, exportedAt: 1, userId: "u1", state: { inventory: { gold: 3 } } });
    const legacy = await encryptSaveEnvelope({
      v: 1, exportedAt: 2, userId: "u1", state: { inventory: {} },
      session: { userId: "u1", token: "jwt-secret", resumeToken: "resume-secret" },
    } as any);
    const read = await decryptSaveEnvelope(legacy);
    assert.deepEqual(read, { v: 1, exportedAt: 2, userId: "u1", state: { inventory: {} } });
    assert.doesNotMatch(JSON.stringify(read), /secret/);
  });

  it("设置面板的导出、导入代码里不出现登录凭证", () => {
    const src = readFileSync(new URL("../frontend/src/components/ProgressionPanels.tsx", import.meta.url), "utf8");
    const body = src.slice(src.indexOf("const exportData"), src.indexOf("const handleFileChange"));
    assert.ok(body.includes("encryptSaveEnvelope") && body.includes("importEncryptedSave"));
    assert.doesNotMatch(body, /token|session|applySession/i);
  });
});
