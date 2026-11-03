import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { createMemoryStorage } from "./storage_memory";

describe("memory storage persistence", () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "worklife-persist-"));
    file = path.join(dir, "save.json");
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("restores guest gold after a process restart", async () => {
    const first = createMemoryStorage({ persistPath: file });
    const user = await first.findOrCreateGuestUser("device-alpha");
    const state = await first.getOrCreatePlayerState(user.id, "1.0.0");
    state.inventory.gold = 77;
    await first.savePlayerState(user.id, state);
    await first.close();

    const second = createMemoryStorage({ persistPath: file });
    const again = await second.findOrCreateGuestUser("device-alpha");
    const restored = await second.getOrCreatePlayerState(again.id, "1.0.0");
    assert.equal(again.id, user.id);
    assert.equal(restored.inventory.gold, 77);
    await second.close();
  });
});
