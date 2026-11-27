import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pngSize, rasterDamage, webpSize } from "./art-image-meta";

describe("art image metadata", () => {
  it("reads PNG IHDR without a heavy dependency", () => {
    const buf = Buffer.alloc(24);
    buf[0] = 0x89;
    buf.write("PNG", 1, "ascii");
    buf.writeUInt32BE(1024, 16);
    buf.writeUInt32BE(768, 20);
    assert.deepEqual(pngSize(buf), { width: 1024, height: 768 });
  });

  it("reads VP8X WebP canvas size", () => {
    const buf = Buffer.alloc(30);
    buf.write("RIFF", 0, "ascii");
    buf.write("WEBP", 8, "ascii");
    buf.write("VP8X", 12, "ascii");
    buf[24] = 1023 & 0xff;
    buf[25] = (1023 >> 8) & 0xff;
    buf[26] = 0;
    buf[27] = 767 & 0xff;
    buf[28] = (767 >> 8) & 0xff;
    buf[29] = 0;
    assert.deepEqual(webpSize(buf), { width: 1024, height: 768 });
  });

  it("reads VP8 (lossy, no alpha) WebP size", () => {
    const buf = Buffer.alloc(40);
    buf.write("RIFF", 0, "ascii");
    buf.write("WEBP", 8, "ascii");
    buf.write("VP8 ", 12, "ascii");
    buf.set([0x9d, 0x01, 0x2a], 23);
    buf.writeUInt16LE(160, 26);
    buf.writeUInt16LE(120, 28);
    assert.deepEqual(webpSize(buf), { width: 160, height: 120 });
    buf[23] = 0;
    assert.equal(webpSize(buf), undefined);
  });

  it("reads VP8L (lossless) WebP size, the container PIL writes for lossless alpha", () => {
    const buf = Buffer.alloc(30);
    buf.write("RIFF", 0, "ascii");
    buf.write("WEBP", 8, "ascii");
    buf.write("VP8L", 12, "ascii");
    buf[20] = 0x2f;
    // 1024×1024 → width-1 = 1023 (14 bits), height-1 = 1023 (14 bits), packed little-endian
    const w1 = 1023, h1 = 1023;
    const packed = w1 | (h1 << 14); // 28 bits + alpha_is_used + version bits above
    buf[21] = packed & 0xff;
    buf[22] = (packed >> 8) & 0xff;
    buf[23] = (packed >> 16) & 0xff;
    buf[24] = (packed >> 24) & 0xff;
    assert.deepEqual(webpSize(buf), { width: 1024, height: 1024 });
    // a non-square check catches swapped bit groups
    const buf2 = Buffer.from(buf);
    const p2 = 639 | (479 << 14);
    buf2[21] = p2 & 0xff; buf2[22] = (p2 >> 8) & 0xff; buf2[23] = (p2 >> 16) & 0xff; buf2[24] = (p2 >> 24) & 0xff;
    assert.deepEqual(webpSize(buf2), { width: 640, height: 480 });
  });

  it("damage check: cut-off files, broken chunks and blank pictures are caught, whole ones pass", () => {
    const whole = (bytes = 4000) => {
      const buf = Buffer.alloc(bytes);
      buf.write("RIFF", 0, "ascii");
      buf.writeUInt32LE(bytes - 8, 4);
      buf.write("WEBP", 8, "ascii");
      buf.write("VP8X", 12, "ascii");
      buf.writeUInt32LE(10, 16);
      buf[24] = 255;
      buf[27] = 255;
      buf.write("VP8 ", 30, "ascii");
      buf.writeUInt32LE(bytes - 38, 34);
      return buf;
    };
    assert.equal(rasterDamage(whole(), "webp"), undefined);
    assert.match(rasterDamage(whole().subarray(0, 3000), "webp")!, /cut off/);
    const inner = whole();
    inner.writeUInt32LE(9000, 34);
    assert.match(rasterDamage(inner, "webp")!, /cut off inside/);
    assert.match(rasterDamage(whole(600), "webp")!, /blank/);
    assert.match(rasterDamage(Buffer.alloc(4000), "webp")!, /unreadable/);
    const png = Buffer.alloc(4000);
    png[0] = 0x89;
    png.write("PNG", 1, "ascii");
    assert.match(rasterDamage(png, "png")!, /IEND/);
    png.write("IEND", png.length - 8, "ascii");
    assert.equal(rasterDamage(png, "png"), undefined);
  });
});
