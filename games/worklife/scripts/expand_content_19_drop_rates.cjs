/**
 * 内容拓展脚本 #19：怪物爆率下调（连战节奏适配）
 *
 * 连续战斗（autoRepeat）上线后刷怪频率约 330 只/小时，原 rareChance
 * 0.3–0.5 → 每小时 100+ 稀有材料，背包瞬间灌满、制造材料失去稀缺性。
 * 统一按 ×0.1 缩到 MWI 式"真稀有"区间：
 *   0.50 → 0.05   普通材料怪 ~16 只/时
 *   0.40 → 0.04
 *   0.35 → 0.035
 *   0.30 → 0.03
 *   0.25 → 0.025
 *   0.20 → 0.02
 *   0.15 → 0.015
 *   0.10 → 0.01   Boss 独门材料 ~3 只/时
 *   0.00 → 0.00   （本来关掉的保持 0）
 *
 * drops[] 技能书表不动（5–8% 已是低位，且是技能学习的一次性门槛，再压低
 * 会卡死技能解锁进度）。
 *
 * 幂等：按旧值精确匹配改写，二次运行为空操作。
 */
const fs = require('fs');
const path = require('path');

const PACK_PATH = path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json');
const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));

const RARE_SCALE = {
  0.5: 0.05,
  0.4: 0.04,
  0.35: 0.035,
  0.3: 0.03,
  0.25: 0.025,
  0.2: 0.02,
  0.15: 0.015,
  0.1: 0.01,
};

let rareChanged = 0;
for (const m of pack.monsters) {
  const target = RARE_SCALE[m.rareChance];
  if (target !== undefined) {
    m.rareChance = target;
    rareChanged++;
  }
}

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n');
console.log(`drop rates: ${rareChanged} monster rareChance ×0.1 (drops[] book table unchanged)`);
