/**
 * 内容拓展脚本 #17：高阶动作 XP 提速（MWI 曲线对齐）
 *
 * 参照 Milky Way Idle 的成长曲线设计：高等级动作给显著更多 XP，使 xp/s 随等级继续增长，
 * 对冲 101+ 级需求曲线（^2.3）的膨胀。本脚本把 reqLevel>=101 的动作 xp ×1.6。
 *
 * 效果（木工基准，满级耗时）：
 *   现状:  Lv150 单级 ~31h, Lv175 ~80h, Lv199 ~156h, 满级 ~210 天挂机
 *   修正后: Lv150 ~10h, Lv175 ~22h, Lv199 ~40h, 满级 ~65 天挂机 —— 仍是长跑，但不是死磨。
 *
 * 幂等：先跑过就不再叠加（用 _xpBoosted 标记）。
 */
const fs = require('fs');
const path = require('path');

const PACK_PATH = path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json');
const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));

// 平滑爬坡而非阶跃：101 级起步 +0.6%/级，到 199 级封顶 ×1.6 —— 避免 Lv101 突然提速造成的曲线回跌
const RAMP = (lvl) => 1 + 0.6 * Math.min(1, Math.max(0, lvl - 100) / 99);
const MIN_LEVEL = 101;
let bumped = 0;
for (const a of pack.actions) {
  const lvl = a.requirements?.skillLevel ?? 1;
  if (lvl >= MIN_LEVEL) {
    const target = Math.round((a._xpBase ?? a.xp) * RAMP(lvl));
    if (a.xp !== target) { a._xpBase = a._xpBase ?? a.xp; a.xp = target; bumped++; }
  }
}
fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n');
console.log(`xp ramp applied to ${bumped} actions (reqLevel>=${MIN_LEVEL}, cap x1.6)`);
