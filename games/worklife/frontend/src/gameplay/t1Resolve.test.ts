import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listResolvedKeys, resolveT1Url } from "../assets/t1/resolve";
import { p0RequiredKeys } from "../assets/t1/contract";

describe("T1 production asset resolver", () => {
  it("prefers webp over png over svg for the same canonical key", () => {
    const files = {
      "./monsters/slime.svg": "svg-url",
      "./monsters/slime.png": "png-url",
      "./monsters/slime.webp": "webp-url",
    };
    assert.equal(resolveT1Url(files, "monsters/slime"), "webp-url");
    assert.equal(resolveT1Url({ "./monsters/slime.svg": "svg-url", "./monsters/slime.png": "png-url" }, "monsters/slime"), "png-url");
    assert.equal(resolveT1Url({ "./monsters/slime.svg": "svg-url" }, "monsters/slime"), "svg-url");
  });

  it("throws on duplicate same-extension canonical keys", () => {
    assert.throws(
      () =>
        resolveT1Url(
          {
            "./monsters/slime.png": "a",
            "monsters\\slime.png": "b",
          },
          "monsters/slime"
        ),
      /duplicate T1 asset/
    );
  });

  it("returns undefined for missing and unknown keys", () => {
    assert.equal(resolveT1Url({ "./monsters/slime.svg": "x" }, "monsters/forest_boss"), undefined);
    assert.equal(resolveT1Url({ "./monsters/slime.svg": "x" }, "not-a-key"), undefined);
  });

  it("normalizes Windows separators when matching", () => {
    const files = { "monsters\\crab.webp": "ok" };
    assert.equal(resolveT1Url(files, "monsters/crab"), "ok");
    assert.equal(resolveT1Url(files, "monsters\\crab"), "ok");
  });

  it("resolves every P0 required key from a mixed-extension map", () => {
    const files: Record<string, string> = {};
    for (const key of p0RequiredKeys()) {
      files[`./${key}.svg`] = `url:${key}`;
    }
    files["./monsters/slime.webp"] = "prod-slime";
    for (const key of p0RequiredKeys()) {
      const url = resolveT1Url(files, key);
      assert.ok(url, key);
    }
    assert.equal(resolveT1Url(files, "monsters/slime"), "prod-slime");
    assert.ok(listResolvedKeys(files).includes("monsters/slime"));
  });
});
