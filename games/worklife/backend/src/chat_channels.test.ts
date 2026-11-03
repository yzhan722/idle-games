import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { membershipKeyForSend, membershipKeys, payloadChannel } from "./chat_channels";

describe("chat_channels", () => {
  it("joins world plus profession and party keys when both exist", () => {
    assert.deepEqual(
      membershipKeys({ classId: "woodcutter", partyId: "p1" }),
      ["world", "profession:woodcutter", "party:p1"]
    );
  });

  it("omits profession/party keys when the player has none", () => {
    assert.deepEqual(membershipKeys({}), ["world"]);
  });

  it("routes profession sends only to the same class key", () => {
    assert.equal(
      membershipKeyForSend("profession", { classId: "woodcutter", partyId: "p1" }),
      "profession:woodcutter"
    );
    assert.equal(membershipKeyForSend("profession", {}), null);
  });

  it("routes party sends only to the player's party key", () => {
    assert.equal(
      membershipKeyForSend("party", { classId: "woodcutter", partyId: "p1" }),
      "party:p1"
    );
    assert.equal(membershipKeyForSend("party", { classId: "woodcutter" }), null);
  });

  it("keeps UI payload channel names so the client filter still matches", () => {
    assert.equal(payloadChannel("profession"), "profession");
    assert.equal(payloadChannel("party"), "party");
    assert.equal(payloadChannel("world"), "world");
  });
});
