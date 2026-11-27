// mode-survivor.js — 打工割草模式：技能池、进化、班次状态、三选一与 HUD
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
  playSfx,
  savePetState,
  gameMode,
  player,
  spawnInteractVfx,
  survivorSessionCoins,
  survivorSessionKills,
  addCoins,
  setPlayerEmote,
  starTarget,
  enemies,
  isTapEcho
} from './game.js?v=hd60';
import {
  getBotanicalBlessings,
  getCollageLuckBlessing,
  getCrochetWarmGuard,
  getActiveHotCocoaBuff,
  getPressedFlowerBlessing,
  getStarGuidanceBonus,
  getWatercolorFocusWard,
  getMailboxHeartfeltBonus,
  getBentoLunchWard,
  getMemoryPuzzleBonus,
  getKittenLuckWard,
  getGreetingCardBlessing,
  PICNIC_RULES,
  describePicnicWard,
  getPicnicShiftWard,
  POTTERY_RULES,
  describePotteryWard,
  getPotteryShiftWard
} from './data-room.js?v=hd60';

// [[split 1]]
let lastParkourHudKey = '';
const survivorVfxBursts = [];

const SURVIVOR_SKILL_POOL = [
  {
    id: 'blaster',
    name: '鲸鱼水炮',
    img: './assets/upg_blaster.webp?v=hd60',
    maxLv: 3,
    desc: '强化水弹连发数量、追踪弹速与单发威力。',
    synergy: '满级+冰泡凝滞 → 深海蓝鲸巨浪'
  },
  {
    id: 'teaBlade',
    name: '茗香茶刃',
    img: './assets/upg_blade.webp?v=hd60',
    maxLv: 3,
    desc: '增加环绕乌龙茶刃飞叶数量、转速与切割伤害。',
    synergy: '满级+猫爪闪电链 → 星海茶刃风暴'
  },
  {
    id: 'frostBubble',
    name: '冰泡凝滞',
    img: './assets/sk_frost_bubble.webp?v=hd60',
    maxLv: 3,
    desc: '周期发射寒霜冰泡弹，命中绽放冰雾大幅减速周围怪物。',
    synergy: '共鸣核心：鲸鱼水炮'
  },
  {
    id: 'catLightning',
    name: '猫爪闪电链',
    img: './assets/sk_cat_lightning.webp?v=hd60',
    maxLv: 3,
    desc: '攻击与茶刃触发萌爪星雷跳跃，在多只怪物间弹射雷伤。',
    synergy: '共鸣核心：茗香茶刃'
  },
  {
    id: 'onigiriHeal',
    name: '饭团急救',
    img: './assets/sk_onigiri_heal.webp?v=hd60',
    maxLv: 3,
    desc: '立即恢复35体力与饱食，每秒持续回血并扩大吸宝距离。',
    synergy: '打工续航 · 经验磁吸'
  },
  {
    id: 'starPhantom',
    name: '星光幻影',
    img: './assets/sk_star_phantom.webp?v=hd60',
    maxLv: 3,
    desc: '移速与闪避减伤提升12%/级，移动时放飞追踪星影弹。',
    synergy: '灵巧身法 · 星影追击'
  },
  {
    id: 'critCharm',
    name: '暴击护符',
    img: './assets/sk_crit_charm.webp?v=hd60',
    maxLv: 3,
    desc: '暴击率+12%/级、暴击伤害+30%/级，暴击概率爆额外金币。',
    synergy: '会心爆发 · 招财福袋'
  }
];

const SURVIVOR_EVOLUTIONS = [
  {
    id: 'superWhale',
    isEvolution: true,
    reqWeapon: 'blaster',
    reqPassive: 'frostBubble',
    name: '深海蓝鲸巨浪',
    img: './assets/upg_super_whale.webp?v=hd60',
    desc: '超武觉醒！水炮进化为贯通巨浪幼鲸，并周期掀起全屏深海潮汐。',
    synergy: '鲸鱼水炮 × 冰泡凝滞 共鸣完成'
  },
  {
    id: 'superTeablade',
    isEvolution: true,
    reqWeapon: 'teaBlade',
    reqPassive: 'catLightning',
    name: '星海茶刃风暴',
    img: './assets/upg_super_teablade.webp?v=hd60',
    desc: '超武觉醒！双环六叶翠玉茶刃极速旋切，高频引爆猫爪星雷链。',
    synergy: '茗香茶刃 × 猫爪闪电链 共鸣完成'
  }
];

const SURVIVOR_BOSS_NAMES = [
  '加班狂魔 · 章鱼主管',
  '死线催命 · 摸鱼大魔王',
  '终极考勤 · 深渊KPI巨兽'
];

const survivorRun = {
  shiftLv: 1,
  shiftXp: 0,
  shiftXpNext: 16,
  skills: {
    blaster: 1,
    teaBlade: 1,
    frostBubble: 0,
    catLightning: 0,
    onigiriHeal: 0,
    starPhantom: 0,
    critCharm: 0
  },
  evolved: {
    superWhale: false,
    superTeablade: false
  },
  overclockBonus: 0,
  choosingSkill: false,
  queuedModals: [],
  currentChoices: [],
  nextBossKills: 12,
  bossWave: 0,
  frostTimer: 1.3,
  phantomTimer: 1.0,
  tsunamiTimer: 3.6,
  lightningIcd: 0,
  isNewKillRecord: false,
  // AR-11 本班次打开的便当午餐（来自便当袋，离开打工模式即吃完）
  lunch: null,
  // AR-12 本班次剩余的猫咪九命护身次数（按小猫好感合计在开班时发放）
  kittenSavesLeft: 0,
  kittenSavesMax: 0,
  // AR-13 本班次的野餐好心情佑护（周末野餐后进入打工时消耗 1 次，离开打工模式即结束）
  picnic: null,
  // AR-14 本班次的陶艺佑护（烧好陶器后进入打工时消耗 1 次，离开打工模式即结束）
  pottery: null
};

function getShiftBadgeTitle(bestKills) {
  if (bestKills >= 80) return '深海王牌店长';
  if (bestKills >= 45) return '星海金牌销冠';
  if (bestKills >= 20) return '元气熟练工';
  if (bestKills >= 5) return '勤勉实习生';
  return '新晋打工人';
}

function updateBestShiftRecord() {
  const rec = player.bestShiftRecord;
  let dirty = false;
  if (survivorSessionKills > rec.bestKills) {
    rec.bestKills = survivorSessionKills;
    survivorRun.isNewKillRecord = true;
    dirty = true;
  }
  if (survivorSessionCoins > rec.bestCoins) {
    rec.bestCoins = survivorSessionCoins;
    dirty = true;
  }
  if (survivorRun.shiftLv > rec.bestShiftLv) {
    rec.bestShiftLv = survivorRun.shiftLv;
    dirty = true;
  }
  if (dirty) savePetState();
}

function getActiveTeaShiftBuff() {
  const b = player.afternoonTea?.activeBuff;
  if (b && b.remainingSec > 0) return b;
  return null;
}
// [[split 7]]

function resetSurvivorRun() {
  survivorRun.shiftLv = 1;
  survivorRun.shiftXp = 0;
  survivorRun.shiftXpNext = 16;
  survivorRun.skills = {
    blaster: 1,
    teaBlade: 1,
    frostBubble: 0,
    catLightning: 0,
    onigiriHeal: 0,
    starPhantom: 0,
    critCharm: 0
  };
  survivorRun.evolved = {
    superWhale: false,
    superTeablade: false
  };
  const teaBuff = getActiveTeaShiftBuff();
  survivorRun.teaShieldMax = teaBuff ? Math.max(0, Math.round(teaBuff.startingShield || 0)) : 0;
  survivorRun.teaShield = survivorRun.teaShieldMax;
  survivorRun.lastDisplayedShield = Math.ceil(survivorRun.teaShield);
  const crochetGuard = getCrochetWarmGuard();
  survivorRun.knitShieldMax = crochetGuard.active ? crochetGuard.cozyShieldBonus : 0;
  survivorRun.knitShield = survivorRun.knitShieldMax;
  survivorRun.lastDisplayedKnitShield = Math.ceil(survivorRun.knitShield);
  const collageBless = getCollageLuckBlessing();
  survivorRun.startingCoinPouch = collageBless.active ? collageBless.startingCoinPouch : 0;
  const kittenWard = getKittenLuckWard();
  survivorRun.kittenSavesMax = kittenWard.saveCharges;
  survivorRun.kittenSavesLeft = kittenWard.saveCharges;
  survivorRun.overclockBonus = 0;
  survivorRun.choosingSkill = false;
  survivorRun.queuedModals = [];
  survivorRun.currentChoices = [];
  survivorRun.nextBossKills = 12;
  survivorRun.bossWave = 0;
  survivorRun.frostTimer = 1.2;
  survivorRun.phantomTimer = 0.9;
  survivorRun.tsunamiTimer = 3.5;
  survivorRun.lightningIcd = 0;
  survivorRun.isNewKillRecord = false;
  survivorVfxBursts.length = 0;
  document.getElementById('survivor-skill-modal')?.classList.add('hidden');
}

function syncSurvivorSkillStrip() {
  const stripEl = document.getElementById('surv-skill-strip');
  if (!stripEl) return;
  if (gameMode !== 'survivor') {
    stripEl.classList.add('hidden');
    return;
  }
  const badges = [];
  const teaBuff = getActiveTeaShiftBuff();
  if (teaBuff) {
    const shieldLeft = Math.ceil(survivorRun.teaShield || 0);
    badges.push({
      img: './assets/tea_platter_signature.webp?v=hd60',
      tag: shieldLeft > 0 ? `盾${shieldLeft}` : `茶+${Math.round((teaBuff.coinBonusPct || 0) * 100)}%`,
      isSuper: true,
      title: `${teaBuff.name} · ${teaBuff.buffTitle}`
    });
  }
  const botBless = getBotanicalBlessings();
  if (botBless && botBless.totalLevel >= 3) {
    badges.push({
      img: './assets/ui_btn_terrarium.webp?v=hd60',
      tag: `花Lv${botBless.totalLevel}`,
      isSuper: botBless.bloomCount > 0,
      title: `微缩花房佑护 · 金+${Math.round(botBless.luckCoinPct * 100)}% 自愈+${botBless.hpRegenPerSec.toFixed(1)}/s 磁+${Math.round(botBless.magnetPct * 100)}%`
    });
  }
  const collageBless = getCollageLuckBlessing();
  if (collageBless && collageBless.active) {
    badges.push({
      img: './assets/ui_btn_collage_frame.webp?v=hd60',
      tag: `框+${collageBless.startingCoinPouch}金`,
      isSuper: true,
      title: `手账幸运佑护（${collageBless.frameStyleName}） · 幸运掉宝+${Math.round(collageBless.luckyDropBonus * 100)}% 磁吸+${Math.round(collageBless.gemMagnetBonusPct * 100)}% 开局+${collageBless.startingCoinPouch}金`
    });
  }
  const crochetGuard = getCrochetWarmGuard();
  if (crochetGuard && crochetGuard.active) {
    const kShield = Math.ceil(survivorRun.knitShield || 0);
    badges.push({
      img: './assets/ui_btn_crochet_basket.webp?v=hd60',
      tag: kShield > 0 ? `绒盾${kShield}` : `减伤${Math.round(crochetGuard.damageReductionPct * 100)}%`,
      isSuper: true,
      title: `暖绒手作守护（Lv.${crochetGuard.totalLevel}/9） · 减伤+${Math.round(crochetGuard.damageReductionPct * 100)}% 暖绒护盾+${crochetGuard.cozyShieldBonus} 爱心磁吸+${Math.round(crochetGuard.heartMagnetBonusPct * 100)}%`
    });
  }
  const cocoaBuff = getActiveHotCocoaBuff();
  if (cocoaBuff) {
    badges.push({
      img: './assets/ui_btn_cocoa_bar.webp?v=hd60',
      tag: `暖速+${Math.round((cocoaBuff.attackHastePct || 0) * 100)}%`,
      isSuper: true,
      title: `${cocoaBuff.name} · ${cocoaBuff.buffTitle}（攻速+${Math.round((cocoaBuff.attackHastePct || 0) * 100)}% 财运+${Math.round((cocoaBuff.coinLuckPct || 0) * 100)}%）`
    });
  }
  const pressedBless = getPressedFlowerBlessing();
  if (pressedBless.active) {
    badges.push({
      img: './assets/ui_btn_pressed_flowers.webp?v=hd60',
      tag: `再生${pressedBless.hpRegenPerSec.toFixed(1)}`,
      isSuper: true,
      title: `幸运再生佑护（压花 Lv.${pressedBless.totalLevel}/9） · 幸运掉宝+${Math.round(pressedBless.luckyDropBonus * 100)}% 体力再生+${pressedBless.hpRegenPerSec.toFixed(2)}/秒 金币幸运+${Math.round(pressedBless.coinLuckPct * 100)}%`
    });
  }
  const focusWard = getWatercolorFocusWard();
  if (focusWard.active) {
    badges.push({
      img: './assets/ui_btn_watercolor_easel.webp?v=hd60',
      tag: `画${focusWard.gallerySize}/${focusWard.total}`,
      isSuper: focusWard.gallerySize >= focusWard.total,
      title: `画意专注守护（画廊 ${focusWard.gallerySize}/${focusWard.total} 幅） · 暴击+${(focusWard.critChanceBonus * 100).toFixed(1)}% 专注攻速+${(focusWard.focusHastePct * 100).toFixed(1)}%`
    });
  }
  const lunchWard = getBentoLunchWard();
  if (lunchWard.active) {
    badges.push({
      img: './assets/bento_box_finished.webp?v=hd31',
      tag: lunchWard.rescuesLeft > 0 ? `救急${lunchWard.rescuesLeft}` : `续${lunchWard.regenPerSec.toFixed(1)}`,
      isSuper: lunchWard.rescuesLeft > 0,
      title: `便当续航（${lunchWard.name}） · 体力回复+${lunchWard.regenPerSec.toFixed(1)}/秒 · 饭团救急 ${Math.round(lunchWard.rescuePct * 100)}% 剩 ${lunchWard.rescuesLeft}/${lunchWard.rescueCharges} 次`
    });
  }
  const memoryBonus = getMemoryPuzzleBonus();
  if (memoryBonus.active) {
    badges.push({
      img: './assets/puzzle_piece_memory.webp?v=hd60',
      tag: `忆+${Math.round(memoryBonus.coinLuckPct * 100)}%`,
      isSuper: memoryBonus.distinct >= memoryBonus.total,
      title: `回忆拾光（拼好 ${memoryBonus.distinct}/${memoryBonus.total} 段回忆） · 打工金币+${(memoryBonus.coinLuckPct * 100).toFixed(0)}%`
    });
  }
  const kittenWard = getKittenLuckWard();
  if (kittenWard.active) {
    const savesLeft = Math.max(0, survivorRun.kittenSavesLeft || 0);
    badges.push({
      img: './assets/ui_btn_kitten_corner.webp?v=hd60',
      tag: savesLeft > 0 ? `护身${savesLeft}` : `猫运+${Math.round(kittenWard.luckyDropBonus * 100)}%`,
      isSuper: savesLeft > 0,
      title: `猫咪幸运佑护（小猫好感 ${kittenWard.totalAffection}/${kittenWard.maxAffection}） · 幸运掉宝+${(kittenWard.luckyDropBonus * 100).toFixed(1)}% · 九命护身 剩 ${savesLeft}/${survivorRun.kittenSavesMax || 0} 次`
    });
  }
  const cardBless = getGreetingCardBlessing();
  if (cardBless.active) {
    badges.push({
      img: './assets/ui_btn_greeting_card.webp?v=hd60',
      tag: `贺${cardBless.occasions}/${cardBless.totalOccasions}`,
      isSuper: cardBless.occasions >= cardBless.totalOccasions,
      title: `贺卡心意（收集 ${cardBless.occasions}/${cardBless.totalOccasions} 种节日季节贺卡） · 班次经验+${(cardBless.shiftXpBonusPct * 100).toFixed(1)}%`
    });
  }
  const picnicWard = getPicnicShiftWard();
  if (picnicWard.active) {
    badges.push({
      img: './assets/ui_btn_picnic_basket.webp?v=hd60',
      tag:
        picnicWard.effect === 'coin'
          ? `野金+${Math.round(picnicWard.coinPct * 100)}%`
          : picnicWard.effect === 'regen'
            ? `野续${picnicWard.regenPerSec.toFixed(1)}`
            : `野速+${Math.round(picnicWard.hastePct * 100)}%`,
      isSuper: picnicWard.anticipation >= PICNIC_RULES.prepMax,
      title: `野餐好心情（${picnicWard.spotName} · ${picnicWard.wardName}） · ${describePicnicWard(picnicWard.spotId, picnicWard.anticipation)} · 期待章 ${picnicWard.anticipation}/${PICNIC_RULES.prepMax} · 之后还剩 ${picnicWard.chargesLeft} 个班次`
    });
  }
  const potteryWard = getPotteryShiftWard();
  if (potteryWard.active) {
    badges.push({
      img: './assets/ui_btn_pottery_wheel.webp?v=hd60',
      tag:
        potteryWard.effect === 'guard'
          ? `陶盾${Math.round(potteryWard.guardPct * 100)}%`
          : potteryWard.effect === 'coin'
            ? `陶金+${Math.round(potteryWard.coinPct * 100)}%`
            : `陶磁+${Math.round(potteryWard.magnetPct * 100)}%`,
      isSuper: potteryWard.combos >= POTTERY_RULES.totalCombos,
      title: `陶艺佑护（${potteryWard.shapeName} · ${potteryWard.glazeName} · ${potteryWard.wardName}） · ${describePotteryWard(potteryWard.glazeId, potteryWard.shapeId, potteryWard.combos)} · 陶艺图鉴 ${potteryWard.combos}/${POTTERY_RULES.totalCombos} · 之后还剩 ${potteryWard.chargesLeft} 个班次`
    });
  }
  const heartfelt = getMailboxHeartfeltBonus();
  if (heartfelt.active) {
    badges.push({
      img: './assets/ui_btn_mailbox.webp?v=hd60',
      tag: `信${heartfelt.replies}`,
      isSuper: heartfelt.stampKinds >= heartfelt.totalStampKinds,
      title: `信笺心意（回信 ${heartfelt.replies} 封 · 邮票 ${heartfelt.stampKinds}/${heartfelt.totalStampKinds} 种） · 班次经验+${(heartfelt.shiftXpBonusPct * 100).toFixed(1)}%`
    });
  }
  const starGuide = getStarGuidanceBonus();
  if (starGuide.active) {
    badges.push({
      img: './assets/ui_btn_telescope.webp?v=hd60',
      tag: `星${starGuide.count}/${starGuide.total}`,
      isSuper: starGuide.count >= starGuide.total,
      title: `星辉指引（星图 ${starGuide.count}/${starGuide.total} 座） · 暴击+${(starGuide.critChanceBonus * 100).toFixed(1)}% 宝石磁吸+${Math.round(starGuide.gemMagnetPct * 100)}%`
    });
  }
  for (const evo of SURVIVOR_EVOLUTIONS) {
    if (survivorRun.evolved[evo.id]) {
      badges.push({ img: evo.img, tag: 'MAX', isSuper: true, title: evo.name });
    }
  }
  for (const sk of SURVIVOR_SKILL_POOL) {
    const lv = survivorRun.skills[sk.id] || 0;
    if (lv <= 0) continue;
    if (sk.id === 'blaster' && survivorRun.evolved.superWhale) continue;
    if (sk.id === 'teaBlade' && survivorRun.evolved.superTeablade) continue;
    badges.push({ img: sk.img, tag: `Lv${lv}`, isSuper: false, title: sk.name });
  }
  if (badges.length === 0) {
    stripEl.classList.add('hidden');
    return;
  }
  stripEl.classList.remove('hidden');
  stripEl.innerHTML = badges
    .map(
      (b) =>
        `<span class="surv-strip-pill ${b.isSuper ? 'is-super' : ''}" title="${b.title}"><img loading="lazy" src="${b.img}" alt="" /><i class="surv-strip-lv">${b.tag}</i></span>`
    )
    .join('');
}

function syncSurvivorBossBar() {
  const barEl = document.getElementById('survivor-boss-bar');
  if (!barEl) return;
  if (gameMode !== 'survivor') {
    barEl.classList.add('hidden');
    return;
  }
  const boss = enemies.find((e) => e.isBoss && e.hp > 0);
  if (!boss) {
    barEl.classList.add('hidden');
    return;
  }
  barEl.classList.remove('hidden');
  const pct = Math.max(0, Math.min(100, Math.round((boss.hp / Math.max(1, boss.maxHp)) * 100)));
  const nameEl = document.getElementById('surv-boss-name');
  const hpTextEl = document.getElementById('surv-boss-hp-text');
  const fillEl = document.getElementById('surv-boss-fill');
  if (nameEl) nameEl.textContent = `班次首领 · ${boss.bossName || '深海摸鱼大魔王'}`;
  if (hpTextEl) hpTextEl.textContent = `${pct}%`;
  if (fillEl) fillEl.style.width = `${pct}%`;
}

function rollSurvivorChoices() {
  const result = [];
  for (const evo of SURVIVOR_EVOLUTIONS) {
    if (
      !survivorRun.evolved[evo.id] &&
      (survivorRun.skills[evo.reqWeapon] || 0) >= 3 &&
      (survivorRun.skills[evo.reqPassive] || 0) >= 3
    ) {
      result.push({
        id: evo.id,
        isEvolution: true,
        tagLabel: '超武觉醒',
        name: evo.name,
        img: evo.img,
        desc: evo.desc,
        synergy: evo.synergy
      });
    }
  }

  const candidates = SURVIVOR_SKILL_POOL.filter((sk) => (survivorRun.skills[sk.id] || 0) < sk.maxLv);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const sk of candidates) {
    if (result.length >= 3) break;
    const curLv = survivorRun.skills[sk.id] || 0;
    const nextLv = curLv + 1;
    result.push({
      id: sk.id,
      isEvolution: false,
      tagLabel: curLv === 0 ? '新秘技 · Lv.1' : `Lv.${curLv} → Lv.${nextLv}${nextLv >= sk.maxLv ? ' 满级' : ''}`,
      name: sk.name,
      img: sk.img,
      desc: sk.desc,
      synergy: sk.synergy
    });
  }

  const fallbackPool = [
    {
      id: 'supply_heal',
      isEvolution: false,
      tagLabel: '班次补给',
      name: '暖心饭团便当',
      img: './assets/sk_onigiri_heal.webp?v=hd60',
      desc: '立即恢复全部体力与饱食度，并获得护体元气。',
      synergy: '即时满血续航'
    },
    {
      id: 'supply_coins',
      isEvolution: false,
      tagLabel: '班次奖金',
      name: '深海绩效红包',
      img: './assets/ui_badge_shift.webp?v=hd60',
      desc: '立即发放 +45 打工金币奖励，计入本班绩效。',
      synergy: '即时金币赏金'
    },
    {
      id: 'supply_overclock',
      isEvolution: false,
      tagLabel: '全武超载',
      name: '星耀火力增幅',
      img: './assets/sk_crit_charm.webp?v=hd60',
      desc: '本班次全武器与超武最终伤害永久提升 +18%。',
      synergy: '无限叠加强化'
    }
  ];
  for (const fb of fallbackPool) {
    if (result.length >= 3) break;
    result.push(fb);
  }
  return result.slice(0, 3);
}

function openSurvivorSkillModal(kickerText = '打工班次升级 · 暂停保护中') {
  if (gameMode !== 'survivor') return;
  if (survivorRun.choosingSkill) {
    survivorRun.queuedModals.push(kickerText);
    return;
  }
  const modalEl = document.getElementById('survivor-skill-modal');
  const gridEl = document.getElementById('surv-card-grid');
  const kickerEl = document.getElementById('surv-modal-kicker');
  const titleEl = document.getElementById('surv-modal-title');
  if (!modalEl || !gridEl) return;

  const choices = rollSurvivorChoices();
  survivorRun.currentChoices = choices;
  survivorRun.choosingSkill = true;
  if (kickerEl) kickerEl.textContent = kickerText;
  if (titleEl) {
    const hasEvo = choices.some((c) => c.isEvolution);
    titleEl.textContent = hasEvo
      ? `班次 Lv.${survivorRun.shiftLv} · 超武共鸣觉醒！`
      : `班次 Lv.${survivorRun.shiftLv} · 三选一手账秘技`;
  }

  gridEl.innerHTML = '';
  choices.forEach((ch) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `surv-skill-card ${ch.isEvolution ? 'is-evolution' : ''}`.trim();
    btn.dataset.skillId = ch.id;
    btn.innerHTML = `
      <span class="surv-card-tag">${ch.tagLabel}</span>
      <img src="${ch.img}" alt="" class="surv-card-thumb" />
      <span class="surv-card-name">${ch.name}</span>
      <span class="surv-card-desc">${ch.desc}</span>
      <span class="surv-card-synergy">${ch.synergy}</span>
    `;
    const onSelect = (ev) => {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.type === 'click' && isTapEcho(ev)) return;
      }
      applySurvivorSkillChoice(ch.id);
    };
    btn.addEventListener('pointerup', onSelect);
    btn.addEventListener('click', onSelect);
    gridEl.appendChild(btn);
  });

  modalEl.classList.remove('hidden');
  playSfx('star');
}

function applySurvivorSkillChoice(skillId) {
  if (!survivorRun.choosingSkill) return;
  const chosen = survivorRun.currentChoices.find((c) => c.id === skillId) || survivorRun.currentChoices[0];
  if (!chosen) return;

  if (skillId === 'superWhale') {
    survivorRun.evolved.superWhale = true;
    survivorRun.tsunamiTimer = 0.25;
    player.cheerTimer = 2.0;
    setPlayerEmote('超武觉醒：深海蓝鲸巨浪！横扫全场咯~', 2.6, 'cheer', true);
  } else if (skillId === 'superTeablade') {
    survivorRun.evolved.superTeablade = true;
    player.cheerTimer = 2.0;
    setPlayerEmote('超武觉醒：星海茶刃风暴！双环飞叶全开~', 2.6, 'cheer', true);
  } else if (skillId === 'supply_heal') {
    player.hp = player.maxHp;
    player.hunger = player.maxHunger;
    setPlayerEmote('吃饱暖心饭团，体力全满继续冲!', 2.0, 'happy', true);
  } else if (skillId === 'supply_coins') {
    addCoins(45, player.x, player.y - 30);
    setPlayerEmote('领到深海绩效红包 +45 金币!', 2.0, 'happy', true);
  } else if (skillId === 'supply_overclock') {
    survivorRun.overclockBonus += 0.18;
    setPlayerEmote('星耀火力超载 +18%!', 2.0, 'proud', true);
  } else if (skillId in survivorRun.skills) {
    survivorRun.skills[skillId] = Math.min(3, (survivorRun.skills[skillId] || 0) + 1);
    if (skillId === 'onigiriHeal') {
      player.hp = Math.min(player.maxHp, player.hp + 35);
      player.hunger = Math.min(player.maxHunger, player.hunger + 25);
    }
    player.happyTimer = 1.4;
    setPlayerEmote(`习得『${chosen.name}』Lv.${survivorRun.skills[skillId]}!`, 2.0, 'happy', true);
  }

  playSfx('star');
  spawnInteractVfx(player.x, player.y - 24, 'sparkle', 9);
  survivorRun.choosingSkill = false;
  survivorRun.currentChoices = [];
  document.getElementById('survivor-skill-modal')?.classList.add('hidden');
  syncSurvivorHud();
  syncSurvivorSkillStrip();

  if (survivorRun.queuedModals.length > 0 && gameMode === 'survivor') {
    const nextKicker = survivorRun.queuedModals.shift();
    openSurvivorSkillModal(nextKicker);
  }
}
// [[split 8]]

function syncParkourHud() {
  const hudEl = document.getElementById('parkour-hud');
  if (!hudEl) return;
  if (gameMode !== 'parkour') {
    hudEl.classList.add('hidden');
    lastParkourHudKey = '';
    return;
  }
  hudEl.classList.remove('hidden');
  const totalStars = player.starsCollected || 0;
  const combo = starTarget.combo || 0;
  const nextBounty = 16 + (combo + 1) * 6;
  const key = `${totalStars}|${combo}|${nextBounty}`;
  if (key === lastParkourHudKey) return;
  lastParkourHudKey = key;
  const totalEl = document.getElementById('parkour-total-chip');
  const comboEl = document.getElementById('parkour-combo-chip');
  const bountyEl = document.getElementById('parkour-bounty-val');
  if (totalEl) totalEl.textContent = `摘星 ${totalStars}`;
  if (comboEl) {
    comboEl.textContent = combo > 0 ? `星链 ×${combo}` : '星链 待触发';
    comboEl.classList.toggle('is-hot', combo >= 2);
  }
  if (bountyEl) bountyEl.textContent = `+${nextBounty}`;
}

function syncSurvivorHud() {
  const hudEl = document.getElementById('survivor-hud');
  if (!hudEl) return;
  if (gameMode !== 'survivor') {
    hudEl.classList.add('hidden');
    syncSurvivorSkillStrip();
    syncSurvivorBossBar();
    return;
  }
  hudEl.classList.remove('hidden');
  updateBestShiftRecord();
  const lvEl = document.getElementById('surv-lv-chip');
  const xpFillEl = document.getElementById('surv-xp-mini-fill');
  const killEl = document.getElementById('surv-kill-chip');
  const coinEl = document.getElementById('surv-coin-val');
  const recChipEl = document.getElementById('surv-record-chip');
  const recValEl = document.getElementById('surv-record-val');
  if (lvEl) lvEl.textContent = `班次 Lv.${survivorRun.shiftLv}`;
  if (xpFillEl) {
    const pct = Math.max(0, Math.min(100, Math.round((survivorRun.shiftXp / Math.max(1, survivorRun.shiftXpNext)) * 100)));
    xpFillEl.style.width = `${pct}%`;
  }
  if (killEl) killEl.textContent = `击退 ${survivorSessionKills}`;
  if (coinEl) coinEl.textContent = `+${survivorSessionCoins}`;
  if (recValEl) {
    const best = player.bestShiftRecord.bestKills || 0;
    recValEl.textContent = survivorRun.isNewKillRecord ? `新纪录 ${best}` : `纪录 ${best}`;
  }
  if (recChipEl) {
    recChipEl.classList.toggle('is-new-best', Boolean(survivorRun.isNewKillRecord));
  }
}
// [[split end]]
export {
  survivorVfxBursts,
  SURVIVOR_BOSS_NAMES,
  survivorRun,
  getShiftBadgeTitle,
  updateBestShiftRecord,
  getActiveTeaShiftBuff,
  resetSurvivorRun,
  syncSurvivorSkillStrip,
  syncSurvivorBossBar,
  openSurvivorSkillModal,
  applySurvivorSkillChoice,
  syncParkourHud,
  syncSurvivorHud
};
