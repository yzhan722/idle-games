export type RasterSize = { width: number; height: number };

export function pngSize(buf: Buffer): RasterSize | undefined {
  if (buf.length < 24) return undefined;
  if (buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") return undefined;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function webpSize(buf: Buffer): RasterSize | undefined {
  if (buf.length < 30) return undefined;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return undefined;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  if (chunk === "VP8 ") {
    const start = 23;
    if (buf.length < start + 10) return undefined;
    const width = buf.readUInt16LE(start + 6) & 0x3fff;
    const height = buf.readUInt16LE(start + 8) & 0x3fff;
    return { width, height };
  }
  if (chunk === "VP8L") {
    // Lossless bitstream (what PIL writes for lossless-alpha WebP): signature 0x2f, then
    // 14-bit width-1 and 14-bit height-1 packed little-endian across the next four bytes.
    if (buf.length < 25 || buf[20] !== 0x2f) return undefined;
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }
  return undefined;
}

export function rasterSize(buf: Buffer, ext: string): RasterSize | undefined {
  if (ext === "png") return pngSize(buf);
  if (ext === "webp") return webpSize(buf);
  return undefined;
}
