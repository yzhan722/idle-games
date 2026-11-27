export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** 数字显示：小数只在需要时出现。 */
export function num(v: number): string {
  const a = Math.abs(v);
  const short = (n: number): string => n.toFixed(Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2);
  if (a >= 1e8) return `${short(v / 1e8)}亿`;
  if (a >= 1e4) return `${short(v / 1e4)}万`;
  if (a >= 100) return Math.floor(v).toString();
  return (Math.floor(v * 10) / 10).toString();
}

export function rate(v: number): string {
  const a = Math.abs(v);
  const text = a >= 10 ? v.toFixed(1) : a >= 0.1 ? v.toFixed(2) : v.toFixed(3);
  return (v > 0 ? "+" : "") + text;
}

/** 顶栏用的短写法：太小就不显示。 */
export function brief(v: number): string {
  const a = Math.abs(v);
  if (a < 0.005) return "";
  return (v > 0 ? "+" : "") + (a >= 10 ? Math.round(v).toString() : a >= 0.1 ? v.toFixed(1) : v.toFixed(2));
}

export function clock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function duration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} 小时 ${m} 分` : m ? `${m} 分 ${Math.floor(sec % 60)} 秒` : `${Math.floor(sec)} 秒`;
}

function morphNode(from: Node, to: Node): void {
  if (from.nodeType === Node.TEXT_NODE) {
    if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
    return;
  }
  const a = from as Element;
  const b = to as Element;
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const { name, value } of [...b.attributes]) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  morphChildren(a, b);
}

function morphChildren(from: Element, to: Element): void {
  const next = [...to.childNodes];
  next.forEach((n, i) => {
    const old = from.childNodes[i];
    if (!old) from.appendChild(n);
    else if (old.nodeType !== n.nodeType || old.nodeName !== n.nodeName || key(old) !== key(n)) from.replaceChild(n, old);
    else morphNode(old, n);
  });
  while (from.childNodes.length > next.length) from.lastChild!.remove();
}

const key = (n: Node): string => (n instanceof Element ? (n.getAttribute("data-key") ?? "") : "");

const last = new WeakMap<Element, string>();

/** 用新的 HTML 更新节点，尽量保留原有元素，按钮不会在按下与抬起之间被换掉。 */
export function render(el: Element, html: string): void {
  if (last.get(el) === html) return;
  last.set(el, html);
  const t = document.createElement("template");
  t.innerHTML = html;
  const holder = document.createElement("div");
  holder.append(t.content);
  morphChildren(el, holder);
}
