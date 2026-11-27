/** 记着游戏走到了钟表的哪一刻，没走到的就是欠着要补的；钟往回拨不倒扣。 */
export class WallClock {
  /** 已经结算到的时刻（毫秒），存档就记它。 */
  at: number;
  hidden: boolean;

  constructor(now: number, hidden: boolean) {
    this.at = now;
    this.hidden = hidden;
  }

  /** 画一帧：页面没藏起来、画面却停了五秒以上（合盖睡眠之类），返回要补的秒数；藏着时不走。 */
  frame(now: number): number {
    if (this.hidden) return 0;
    const gap = (now - this.at) / 1000;
    this.at = now;
    return gap > 5 ? gap : 0;
  }

  /** 藏到后台。停在最后一帧那一刻：睡眠醒来先报藏、再报显时，睡着的那段也不丢。 */
  hide(): void {
    this.hidden = true;
  }

  /** 回到前台，返回要补的秒数；没藏过就是 0。 */
  show(now: number): number {
    if (!this.hidden) return 0;
    this.hidden = false;
    const gap = Math.max(0, (now - this.at) / 1000);
    this.at = now;
    return gap;
  }
}
