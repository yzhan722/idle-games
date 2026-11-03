import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { isLeakingInternalError, mapThrownError } from "./http_errors";

describe("500 error sanitization", () => {
  it("maps unknown errors to a generic internal_error body", () => {
    const mapped = mapThrownError(new Error("ECONNREFUSED 127.0.0.1:5432 password=secret SELECT * FROM users"));
    assert.equal(mapped.status, 500);
    assert.equal(mapped.body.error, "internal_error");
    assert.equal(mapped.body.message, "服务器内部错误，请稍后重试");
    assert.equal(isLeakingInternalError(mapped.body), false);
    assert.equal(JSON.stringify(mapped.body).includes("5432"), false);
    assert.equal(JSON.stringify(mapped.body).includes("password"), false);
    assert.equal(JSON.stringify(mapped.body).includes("SELECT"), false);
  });

  it("does not include stack frames in the body", () => {
    const err = new Error("boom");
    err.stack = "Error: boom\n    at Object.<anonymous> (D:\\\\project\\\\worklife\\\\backend\\\\src\\\\index.ts:99:11)";
    const mapped = mapThrownError(err);
    assert.equal(mapped.body.message?.includes("index.ts"), false);
    assert.equal(mapped.body.message?.includes("at Object"), false);
  });

  it("keeps known client errors as 4xx", () => {
    assert.equal(mapThrownError(new Error("Unauthorized")).status, 401);
    assert.equal(mapThrownError(new Error("state_version_conflict")).status, 409);
    // Fastify content-type / body errors carry a 4xx statusCode and stay 4xx (a bodiless DELETE
    // declaring application/json used to surface as 500).
    const emptyBody = mapThrownError({ code: "FST_ERR_CTP_EMPTY_JSON_BODY", statusCode: 400, message: "Body cannot be empty" });
    assert.equal(emptyBody.status, 400);
    assert.equal(emptyBody.body.error, "invalid_request");
    assert.equal(JSON.stringify(emptyBody.body).includes("Body cannot"), false);
    const limited = mapThrownError({ error: "rate_limited", message: "internal plugin text" });
    assert.equal(limited.status, 429);
    assert.deepEqual(limited.body, {
      error: "rate_limited",
      message: "请求过于频繁，请稍后重试",
    });
    const zod = z.object({ a: z.string() }).safeParse({ a: 1 });
    assert.equal(zod.success, false);
    if (!zod.success) {
      assert.equal(mapThrownError(zod.error).status, 400);
    }
  });
});
