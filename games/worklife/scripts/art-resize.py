"""把 T1 图按「最大显示尺寸的 2～3 倍」重采样（WL-COM5），原图要先整份备份。

用法：python scripts/art-resize.py <原图目录 t1> <输出目录 t1> [--report report.json]
      python scripts/art-resize.py <原图目录 t1> frontend/src/assets/t1_small --small   # 列表用的小图

- 目标边长按类别定（TARGET），理由见 docs/PERF.md；立绘（character）不动。
- 预乘透明度后用 LANCZOS 缩小，避免边缘发灰；已经不大于目标的不放大、不重编码。
- 每张都和原图比：两边都缩到「2 倍显示尺寸」叠在深、浅两种底色上算 PSNR；低于 MIN_PSNR 就提高质量、再放大目标重试，
  都不行或者没变小就保留原图。只写变小了的文件。
"""
import argparse
import io
import json
import math
import os
import sys

import numpy as np
from PIL import Image

# 类别 -> (目标边长, 最大显示边长 CSS px)
TARGET = {
    "monsters": (768, 240),
    "trees": (640, 220),
    "equipment": (512, 220),
    "consumables": (512, 220),
    "materials": (512, 220),
    "skills": (256, 64),
    "ui": (192, 64),
}
# 列表、格子里最大显示 72 px 的小图（SMALL_PX 与 manifest.ts 的用法对应）
SMALL_PX = 216
SMALL = {folder: (SMALL_PX, 72) for folder in ("trees", "equipment", "consumables", "materials", "character")}
# 导航、行内图标最大显示 32 px；头像框最大 64 px
SMALL_UI = (96, 32)
SMALL_AVATAR = (160, 60)
OVERRIDE = {"ui/avatar_": (256, 64)}
MIN_PSNR = 40.0
QUALITIES = (86, 92, 96)
# 纹理细的图缩到目标边长会糊：逐级放大目标再试，最多两倍
LADDER = (1, 1.34, 1.67, 2)
BACKGROUNDS = ((33, 26, 20), (236, 228, 214))


def rule_for(key, small=False):
    if small:
        if key.startswith("ui/"):
            return SMALL_AVATAR if key.startswith("ui/avatar_") else SMALL_UI
        return SMALL.get(key.split("/")[0])
    for prefix, rule in OVERRIDE.items():
        if key.startswith(prefix):
            return rule
    return TARGET.get(key.split("/")[0])


def premultiplied_resize(im, size):
    a = np.asarray(im.convert("RGBA"), dtype=np.float32)
    alpha = a[..., 3:4] / 255.0
    pre = a[..., :3] * alpha
    channels = [Image.fromarray(pre[..., i], mode="F").resize(size, Image.LANCZOS) for i in range(3)]
    small_alpha = np.clip(np.asarray(Image.fromarray(a[..., 3], mode="F").resize(size, Image.LANCZOS)), 0, 255)
    rgb = np.stack([np.asarray(c) for c in channels], axis=-1)
    safe = np.maximum(small_alpha[..., None] / 255.0, 1e-3)
    rgb = np.where(small_alpha[..., None] > 0.5, rgb / safe, 0)
    out = np.concatenate([np.clip(rgb, 0, 255), small_alpha[..., None]], axis=-1)
    return Image.fromarray(np.rint(out).astype(np.uint8), mode="RGBA")


def encode(im, quality):
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=quality, alpha_quality=95, method=6)
    return buf.getvalue()


def psnr(a, b, shown):
    """两张图都缩到同一显示尺寸、叠在两种底色上再比，取差的那个。"""
    worst = math.inf
    ra, rb = premultiplied_resize(a, shown), premultiplied_resize(b, shown)
    for bg in BACKGROUNDS:
        pics = []
        for im in (ra, rb):
            base = Image.new("RGBA", shown, bg + (255,))
            base.alpha_composite(im)
            pics.append(np.asarray(base.convert("RGB"), dtype=np.float64))
        mse = float(np.mean((pics[0] - pics[1]) ** 2))
        worst = min(worst, 99.0 if mse == 0 else 10 * math.log10(255 * 255 / mse))
    return worst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--report")
    ap.add_argument("--retry", help="上一次的报告：只重做其中因画质保留的")
    ap.add_argument("--small", action="store_true", help="生成列表用的小图，不看原文件大小")
    args = ap.parse_args()
    previous = {r["key"]: r for r in json.load(open(args.retry, encoding="utf-8"))} if args.retry else {}
    rows = []
    for folder, _, names in os.walk(args.src):
        for name in sorted(names):
            if not name.endswith(".webp"):
                continue
            path = os.path.join(folder, name)
            rel = os.path.relpath(path, args.src).replace("\\", "/")
            key = rel[: -len(".webp")]
            rule = rule_for(key, args.small)
            before = os.path.getsize(path)
            row = {"key": key, "before": before, "after": before, "action": "keep"}
            if key in previous and previous[key]["action"] != "keep-quality":
                rows.append(previous[key])
                continue
            rows.append(row)
            if rule is None:
                continue
            target, shown_px = rule
            with Image.open(path) as opened:
                im = opened.convert("RGBA")
            row["size"] = list(im.size)
            if target >= max(im.size):
                continue
            shown_scale = min(1.0, shown_px * 2 / max(im.size))
            shown = (max(1, round(im.width * shown_scale)), max(1, round(im.height * shown_scale)))
            value, data = -1.0, b""
            for step in LADDER if not args.small else LADDER[:1]:
                edge = round(target * step)
                if edge >= max(im.size):
                    break
                scale = edge / max(im.size)
                size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
                small = premultiplied_resize(im, size)
                for q in QUALITIES:
                    data = encode(small, q)
                    with Image.open(io.BytesIO(data)) as back:
                        value = psnr(im, back.convert("RGBA"), shown)
                    row.update(quality=q, psnr=round(value, 2), newSize=list(size), candidate=len(data))
                    if value >= MIN_PSNR or len(data) >= before:
                        break
                if value >= MIN_PSNR:
                    break
            if not args.small and (value < MIN_PSNR or len(data) >= before):
                row["action"] = "keep-quality" if value < MIN_PSNR else "keep-bytes"
                continue
            row.update(after=len(data), action="resize")
            os.makedirs(os.path.dirname(os.path.join(args.out, rel)), exist_ok=True)
            with open(os.path.join(args.out, rel), "wb") as fh:
                fh.write(data)
        sys.stdout.flush()
    total = lambda k: sum(r[k] for r in rows)
    done = [r for r in rows if r["action"] == "resize"]
    print(f"{len(rows)} 张：重采样 {len(done)}，保留 {len(rows) - len(done)}")
    print(f"总量 {total('before') / 1e6:.2f} MB -> {total('after') / 1e6:.2f} MB")
    for r in sorted(done, key=lambda r: r["psnr"])[:12]:
        print(f"  PSNR {r['psnr']:.2f} q{r['quality']} {r['key']} {r['before']} -> {r['after']}")
    for r in rows:
        if r["action"].startswith("keep-"):
            print(f"  {r['action']} {r['key']} psnr={r.get('psnr')} {r['before']} / {r.get('candidate')}")
    if args.report:
        with open(args.report, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
