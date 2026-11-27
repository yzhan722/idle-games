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
    // Lossy bitstream: 3-byte frame tag, start code 9d 01 2a, then 14-bit width and height.
    const start = 23;
    if (buf.length < start + 7) return undefined;
    if (buf[start] !== 0x9d || buf[start + 1] !== 0x01 || buf[start + 2] !== 0x2a) return undefined;
    const width = buf.readUInt16LE(start + 3) & 0x3fff;
    const height = buf.readUInt16LE(start + 5) & 0x3fff;
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

/**
 * Cheap damage check without a decoder: the container must be complete (a cut-off download or write
 * still has a readable header) and must hold more than a flat picture would need.
 */
export function rasterDamage(buf: Buffer, ext: string): string | undefined {
  const size = rasterSize(buf, ext);
  if (!size) return "unreadable header";
  if (ext === "webp") {
    const declared = buf.readUInt32LE(4) + 8;
    if (declared > buf.length) return `cut off: ${buf.length} of ${declared} bytes`;
    for (let at = 12; at < declared; ) {
      if (at + 8 > declared) return "broken chunk list";
      const end = at + 8 + buf.readUInt32LE(at + 4);
      if (end > declared) return `cut off inside ${buf.toString("ascii", at, at + 4).trim()}`;
      at = end + ((end - at) & 1);
    }
  }
  if (ext === "png" && buf.toString("ascii", buf.length - 8, buf.length - 4) !== "IEND") return "cut off: no IEND";
  // 一张空白或纯色的图压完只有几百字节；现有最小的图标也在 2.7 KB 以上
  if (buf.length < 1500) return `only ${buf.length} bytes: blank picture?`;
  return undefined;
}
