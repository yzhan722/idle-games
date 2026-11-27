/** 美术图的载入。图在 src/art/，文件名即名字；还没到的图返回 null，由调用方决定怎么办。 */
const urls = import.meta.glob("../art/*.webp", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

const images = new Map<string, HTMLImageElement>();

for (const [path, url] of Object.entries(urls)) {
  const img = new Image();
  img.onload = () => images.set(path.slice(path.lastIndexOf("/") + 1, -5), img);
  img.src = url;
}

/** 已载入的张数，底图缓存用它判断要不要重画。 */
export const artCount = (): number => images.size;

export const art = (name: string): HTMLImageElement | null => images.get(name) ?? null;

export const artUrl = (name: string): string | null => urls[`../art/${name}.webp`] ?? null;

/** 以底边中点为脚点画一张贴图，按高度缩放。 */
export function stand(ctx: CanvasRenderingContext2D, img: HTMLImageElement | HTMLCanvasElement, x: number, y: number, height: number): void {
  const w = (img.width / img.height) * height;
  ctx.drawImage(img, x - w / 2, y - height, w, height);
}

/** 铺满画布，保持比例；fx、fy 是画面焦点。 */
export function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, fx: number, fy: number): void {
  const k = Math.max(w / img.width, h / img.height);
  const dw = img.width * k;
  const dh = img.height * k;
  ctx.drawImage(img, (w - dw) * fx, (h - dh) * fy, dw, dh);
}

const dark = new Map<string, HTMLCanvasElement>();

/** 蒙灰的版本：积灰的灯用。 */
export function sooty(name: string): HTMLCanvasElement | null {
  const img = art(name);
  if (!img) return null;
  const old = dark.get(name);
  if (old) return old;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "rgba(16,20,26,0.8)";
  g.fillRect(0, 0, c.width, c.height);
  dark.set(name, c);
  return c;
}
