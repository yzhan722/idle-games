import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enhancementRequestUserColumn } from "./sql_identifiers";

describe("SQL identifier whitelist", () => {
  it("allows only requester/provider column names", () => {
    assert.equal(enhancementRequestUserColumn("requester"), "requester_id");
    assert.equal(enhancementRequestUserColumn("provider"), "provider_id");
  });

  it("rejects injected identifier strings", () => {
    assert.throws(() => enhancementRequestUserColumn("requester_id; DROP TABLE users;--"), /invalid_enhancement_request_type/);
    assert.throws(() => enhancementRequestUserColumn("1=1"), /invalid_enhancement_request_type/);
  });
});
