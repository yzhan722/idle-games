import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPublicApiPath, isRateLimitExempt, requestPathname } from "./http_public_path";

describe("auth public paths", () => {
  it("strips query strings before matching", () => {
    assert.equal(requestPathname("/health?ready=1"), "/health");
    assert.equal(isPublicApiPath("/auth/guest?x=1"), true);
    assert.equal(isPublicApiPath("/player/state?x=1"), false);
  });

  it("strips trailing slashes", () => {
    assert.equal(isPublicApiPath("/auth/guest/"), true);
    assert.equal(isPublicApiPath("/player/state/"), false);
  });

  it("does not allow prefix bypass of public routes", () => {
    assert.equal(isPublicApiPath("/auth/guest-evil"), false);
    assert.equal(isPublicApiPath("/auth/guest/resume-token"), false);
    assert.equal(isPublicApiPath("/health-check"), false);
    assert.equal(isPublicApiPath("/content/admin"), false);
    assert.equal(isPublicApiPath("/ws/admin"), false);
  });

  it("does not treat /public-route-evil as public", () => {
    assert.equal(isPublicApiPath("/public-route-evil"), false);
  });

  it("rate-limit exemption is exact /health only", () => {
    assert.equal(isRateLimitExempt("/health"), true);
    assert.equal(isRateLimitExempt("/health?live=1"), true);
    assert.equal(isRateLimitExempt("/health-evil"), false);
    assert.equal(isRateLimitExempt("/content"), false);
  });
});
