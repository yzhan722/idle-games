import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStorage } from "./storage_memory";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";

const contentPack = enhancedContentPack as EnhancedContentPack;

describe("combat life action", () => {
  it("grants slime gold once per completed duration, not on a partial tick", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("slayer");
    const state = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    const gold0 = state.inventory.gold || 0;
    const t0 = new Date();
    const started = await storage.startLifeAction({
      userId: user.id,
      actionId: "act_combat_slime",
      quantity: 1,
      now: t0,
      contentPack,
    });
    const mid = await storage.simulateToNow({
      userId: user.id,
      state: started,
      now: new Date(t0.getTime() + 6000),
      contentPack,
    });
    assert.equal(mid.inventory.gold || 0, gold0);
    assert.equal(mid.mode, "life_action");
    const done = await storage.simulateToNow({
      userId: user.id,
      state: mid,
      now: new Date(t0.getTime() + 13000),
      contentPack,
    });
    assert.equal(done.inventory.gold || 0, gold0 + 10);
    assert.equal(done.mode, "idle");
    const again = await storage.simulateToNow({
      userId: user.id,
      state: done,
      now: new Date(t0.getTime() + 26000),
      contentPack,
    });
    assert.equal(again.inventory.gold || 0, gold0 + 10);
    await storage.close();
  });
});
