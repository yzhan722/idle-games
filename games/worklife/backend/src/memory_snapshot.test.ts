import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot, parseSnapshot } from "./memory_snapshot";
import type { EnhancedPlayerState, UserRecord } from "./types";

describe("memory_snapshot", () => {
  it("round-trips users and player gold so a restart can restore progress", () => {
    const user: UserRecord = {
      id: "u1",
      guestDeviceId: "dev-1",
      googleSub: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const state = {
      inventory: { gold: 50, wood_1: 3 },
      activeClassId: "woodcutter",
    } as EnhancedPlayerState;

    const json = JSON.stringify(
      buildSnapshot({
        users: [user],
        states: [["u1", state]],
        parties: [],
      })
    );
    const loaded = parseSnapshot(JSON.parse(json));
    assert.equal(loaded.users[0]?.guestDeviceId, "dev-1");
    assert.equal(loaded.states[0]?.[1].inventory.gold, 50);
    assert.equal(loaded.states[0]?.[1].inventory.wood_1, 3);
  });

  it("returns an empty snapshot for garbage input", () => {
    const loaded = parseSnapshot(null);
    assert.deepEqual(loaded.users, []);
    assert.deepEqual(loaded.states, []);
  });
});
