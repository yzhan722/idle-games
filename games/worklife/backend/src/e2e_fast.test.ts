import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyE2eFastContent, isE2eFast } from "./e2e_fast";

describe("e2e fast fixture", () => {
  it("does not mutate durations unless E2E_FAST=1", () => {
    assert.equal(isE2eFast(), false);
    const pack = applyE2eFastContent({
      actions: [{ id: "act_chop_wood_t1", duration: 5000 }],
    } as never);
    assert.equal((pack.actions as Array<{ duration: number }>)[0].duration, 5000);
  });
});
