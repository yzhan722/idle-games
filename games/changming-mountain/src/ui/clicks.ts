/** 双击保护：一次点击算数后，短时间内在原处的下一次不算，免得点在刚换上来的另一个按钮上；马上去点别处不受影响。 */
export class ClickGate {
  private last = { at: -Infinity, x: 0, y: 0 };
  private readonly ms: number;
  private readonly near: number;

  constructor(ms = 300, near = 40) {
    this.ms = ms;
    this.near = near;
  }

  /** 这次点击算不算数。 */
  pass(now: number, x: number, y: number): boolean {
    const { last } = this;
    if (now - last.at < this.ms && Math.hypot(x - last.x, y - last.y) < this.near) return false;
    this.last = { at: now, x, y };
    return true;
  }
}
