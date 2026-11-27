import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PARTY_RECOVERY, recoveryStep } from "./partyRaidData";

const OLD_PAGE = PARTY_RECOVERY.reloadMinAgeMs;

describe("组队清波被拒后的恢复", () => {
  it("第 1 次原地重打，每满 2 次重新对账，满 6 次且页面开了很久才刷新整页", () => {
    const steps = (age: number) => [1, 2, 3, 4, 5, 6, 7, 8, 12].map((n) => recoveryStep(n, "party_wave_order", age));
    assert.deepEqual(steps(OLD_PAGE), ["retry", "resync", "retry", "resync", "retry", "reload", "retry", "resync", "reload"]);
    assert.deepEqual(steps(60_000), ["retry", "resync", "retry", "resync", "retry", "resync", "retry", "resync", "resync"], "刚刷新过还不行就不再刷");
    assert.equal(recoveryStep(0, undefined, OLD_PAGE), "retry");
  });

  it("不在队里、没有活动：立刻对账；等级不够：对账、刷新都没用", () => {
    assert.equal(recoveryStep(1, "party_op_failed", 0), "resync");
    assert.equal(recoveryStep(6, "party_op_failed", OLD_PAGE), "resync");
    for (const n of [1, 2, 6]) assert.equal(recoveryStep(n, "party_level_required", OLD_PAGE), "retry");
    assert.equal(recoveryStep(2, undefined, 0), "resync", "断网、超时也算");
  });
});
