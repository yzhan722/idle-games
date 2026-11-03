import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InFlightMap, writeDedupeKey } from "../../frontend/src/services/requestGuard";

describe("write request guard", () => {
  it("reuses the same promise for an identical in-flight write", async () => {
    const inflight = new InFlightMap<number>();
    let runs = 0;
    const fn = () => {
      runs += 1;
      return new Promise<number>((resolve) => setTimeout(() => resolve(runs), 20));
    };
    const key = writeDedupeKey("POST", "/trading/purchase", JSON.stringify({ listingId: "a", quantity: 1 }));
    const [a, b] = await Promise.all([inflight.run(key, fn), inflight.run(key, fn)]);
    assert.equal(a, 1);
    assert.equal(b, 1);
    assert.equal(runs, 1);
  });

  it("allows a second write after the first settles", async () => {
    const inflight = new InFlightMap<string>();
    const key = writeDedupeKey("POST", "/equipment/equip", "{}");
    await inflight.run(key, async () => "one");
    const second = await inflight.run(key, async () => "two");
    assert.equal(second, "two");
  });
});
