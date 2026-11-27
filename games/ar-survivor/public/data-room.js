// data-room.js — 房间活动的数据表与规则函数（花架、拼贴、钩织、可可、压花、星座、水彩、便当、小猫、贺卡、野餐、日记、陶艺、香氛、星图、听雨、刺绣、暖炉、装扮、睡前故事）
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
  W,
  formatLocalDateKey,
  savePetState,
  gameMode,
  player,
  syncCrochetUIFn,
  syncPressedFlowerUIFn,
  BENTO_RECIPES,
  BENTO_RECIPE_BY_ID,
  ar12RandomFn,
  floatingTexts
} from './game.js?v=hd60';
import {
  survivorRun
} from './mode-survivor.js?v=hd60';

// [[split 2]]

const TERRARIUM_XP_THRESHOLDS = [0, 40, 55, 75, 95, 0];

const TERRARIUM_SPECS = {
  peach_succulent: {
    id: 'peach_succulent',
    name: '蜜桃粉胖多肉',
    shortName: '粉多肉',
    spriteKey: 'plantPeachSucculent',
    img: './assets/plant_peach_succulent.webp?v=hd60',
    xRatio: 0.30,
    note: '奶陶圆盆里胖乎乎的粉尖多肉，吸饱阳光能带来打工招财好运~'
  },
  star_lily: {
    id: 'star_lily',
    name: '星露白铃兰',
    shortName: '白铃兰',
    spriteKey: 'plantStarLily',
    img: './assets/plant_star_lily.webp?v=hd31',
    xRatio: 0.355,
    note: '薄荷描金茶杯里的垂铃白花，沁人心脾的清香能持续治愈体力~'
  },
  blue_hydrangea: {
    id: 'blue_hydrangea',
    name: '晴空蓝绣球',
    shortName: '蓝绣球',
    spriteKey: 'plantBlueHydrangea',
    img: './assets/plant_blue_hydrangea.webp?v=hd60',
    xRatio: 0.41,
    note: '亚麻藤编篮里团团簇簇的晴空蓝绣球，让宝石磁吸与会心一击更顺手~'
  }
};

function getTerrariumStageLabel(lv) {
  const safeLv = Math.max(1, Math.min(5, Math.round(Number(lv) || 1)));
  if (safeLv <= 1) return '萌芽';
  if (safeLv <= 3) return '舒叶';
  return '盛放';
}

function getBotanicalBlessings() {
  const plants = player.terrarium?.plants || {};
  const succLv = Math.max(1, Math.min(5, Number(plants.peach_succulent?.level) || 1));
  const lilyLv = Math.max(1, Math.min(5, Number(plants.star_lily?.level) || 1));
  const hydrLv = Math.max(1, Math.min(5, Number(plants.blue_hydrangea?.level) || 1));
  const totalLevel = succLv + lilyLv + hydrLv;
  const bloomCount = [succLv, lilyLv, hydrLv].filter((v) => v >= 4).length;
  const displayedCount = ['peach_succulent', 'star_lily', 'blue_hydrangea'].filter(
    (k) => Boolean(plants[k]?.deskDisplayed)
  ).length;

  const luckCoinPct = Number((0.03 + succLv * 0.03).toFixed(4));
  const treasureDropBonus = Number((0.02 + succLv * 0.025).toFixed(4));
  const hpRegenPerSec = Number((0.35 + lilyLv * 0.45).toFixed(2));
  const magnetPct = Number((0.05 + hydrLv * 0.04).toFixed(4));
  const critChanceBonus = Number((0.02 + hydrLv * 0.018).toFixed(4));

  return {
    totalLevel,
    bloomCount,
    displayedCount,
    levels: {
      peach_succulent: succLv,
      star_lily: lilyLv,
      blue_hydrangea: hydrLv
    },
    luckCoinPct,
    treasureDropBonus,
    hpRegenPerSec,
    magnetPct,
    critChanceBonus
  };
}

const COLLAGE_FRAME_STYLES = {
  lace_ivory: {
    id: 'lace_ivory',
    name: '蕾丝奶白',
    caption: '奶白蕾丝 · 书桌暖忆'
  },
  honey_kraft: {
    id: 'honey_kraft',
    name: '蜜杏牛皮',
    caption: '蜜杏手账 · 晴日拾光'
  },
  sakura_letter: {
    id: 'sakura_letter',
    name: '樱粉信笺',
    caption: '樱粉花笺 · 心愿珍藏'
  }
};

const COLLAGE_STICKER_SPECS = {
  lace_garland: {
    id: 'lace_garland',
    name: '奶油蕾丝花边',
    img: './assets/sticker_lace_garland.webp?v=hd60'
  },
  pressed_daisy: {
    id: 'pressed_daisy',
    name: '干花书签',
    img: './assets/sticker_pressed_daisy.webp?v=hd60'
  },
  whale_stamp: {
    id: 'whale_stamp',
    name: '蓝鲸纪念邮票',
    img: './assets/sticker_whale_stamp.webp?v=hd60'
  }
};

const COLLAGE_LAYOUT_PRESETS = [
  {
    name: '花边顶饰',
    lace_garland: { xPct: 50, yPct: 16, rotDeg: 0 },
    pressed_daisy: { xPct: 23, yPct: 75, rotDeg: -12 },
    whale_stamp: { xPct: 79, yPct: 24, rotDeg: 9 }
  },
  {
    name: '对角花笺',
    lace_garland: { xPct: 50, yPct: 71, rotDeg: 0 },
    pressed_daisy: { xPct: 22, yPct: 24, rotDeg: 10 },
    whale_stamp: { xPct: 78, yPct: 68, rotDeg: -8 }
  },
  {
    name: '邮戳右铭',
    lace_garland: { xPct: 46, yPct: 15, rotDeg: -4 },
    pressed_daisy: { xPct: 77, yPct: 74, rotDeg: 14 },
    whale_stamp: { xPct: 24, yPct: 26, rotDeg: -10 }
  },
  {
    name: '花束环拥',
    lace_garland: { xPct: 52, yPct: 18, rotDeg: 3 },
    pressed_daisy: { xPct: 26, yPct: 68, rotDeg: -6 },
    whale_stamp: { xPct: 76, yPct: 32, rotDeg: 12 }
  }
];

function getCollageLuckBlessing() {
  const ck = player.collageKeepsake || {};
  const stickers = ck.stickers || {};
  const enabledIds = ['lace_garland', 'pressed_daisy', 'whale_stamp'].filter((k) => Boolean(stickers[k]?.enabled));
  const stickerCount = enabledIds.length;
  const active = Boolean(ck.blessingActive && (ck.savedCount || 0) > 0);
  const previewLuckyDropBonus = Number((0.06 + stickerCount * 0.04).toFixed(4));
  const previewGemMagnetPct = Number((0.08 + stickerCount * 0.05).toFixed(4));
  const previewStartingCoinPouch = 12 + stickerCount * 6;
  const previewLuckCoinPct = Number((0.04 + stickerCount * 0.03).toFixed(4));
  const styleSpec = COLLAGE_FRAME_STYLES[ck.frameStyle] || COLLAGE_FRAME_STYLES.lace_ivory;
  return {
    active,
    savedCount: ck.savedCount || 0,
    deskDisplayed: Boolean(ck.deskDisplayed),
    frameStyle: styleSpec.id,
    frameStyleName: styleSpec.name,
    stickerCount,
    enabledIds,
    previewLuckyDropBonus,
    previewGemMagnetPct,
    previewStartingCoinPouch,
    previewLuckCoinPct,
    luckyDropBonus: active ? previewLuckyDropBonus : 0,
    gemMagnetBonusPct: active ? previewGemMagnetPct : 0,
    startingCoinPouch: active ? previewStartingCoinPouch : 0,
    luckCoinPct: active ? previewLuckCoinPct : 0
  };
}

// AR-8 毛线钩针温暖手作篮规格与「暖绒手作守护」幸存者班次增益
const CROCHET_YARN_COSTS = [2, 2, 3, 0]; // Lv.0->1: 2团, Lv.1->2: 2团, Lv.2->3: 3团

const CROCHET_KNIT_SPECS = {
  whale_scarf: {
    id: 'whale_scarf',
    name: '手织蓝鲸小围巾',
    shortName: '蓝鲸围巾',
    spriteKey: 'knitWhaleScarf',
    img: './assets/knit_whale_scarf.webp?v=hd60',
    note: '软糯海盐蓝毛线一针一线织成的小鲸鱼围巾，系在颈间就不怕微凉海风~',
    specialty: '班次减伤核心（每阶 +4.5% 减伤，木桌展示额外 +2% 减伤）',
    giftLines: [
      '哇！软乎乎的手织蓝鲸小围巾，围在脖子上暖到心窝里啦 ^w^!',
      '针脚又细密了一层！小鲸鱼尾巴贴着脸颊好软糯呀~',
      '满针蓝鲸小围巾达成！主人织的围巾是全世界最暖的宝贝!'
    ]
  },
  star_coaster: {
    id: 'star_coaster',
    name: '钩针星芒杯垫',
    shortName: '星芒杯垫',
    spriteKey: 'knitStarCoaster',
    img: './assets/knit_star_coaster.webp?v=hd60',
    note: '奶油白与蜂蜜黄交织的五角星芒钩针杯垫，托起热饮时连空气都甜丝丝~',
    specialty: '爱心磁吸核心（每阶 +14% 爱心磁吸与 +3% 爱心掉落，木桌展示额外 +6% 磁吸）',
    giftLines: [
      '好精致的钩针星芒杯垫！垫在马克杯底下像捧着一颗小星星~',
      '星芒花边钩得更饱满啦，放在木桌上亮晶晶的好治愈!',
      '满针星芒杯垫完成！以后每一杯暖饮都有主人的星光相伴 ^w^!'
    ]
  },
  cloud_pillow: {
    id: 'cloud_pillow',
    name: '绒云晚安抱枕',
    shortName: '绒云抱枕',
    spriteKey: 'knitCloudPillow',
    img: './assets/knit_cloud_pillow.webp?v=hd60',
    note: '蓬松奶绒毛线钩织的胖云朵抱枕，抱在怀里像陷进暖阳晒过的棉花云~',
    specialty: '暖绒护盾核心（每阶 +14 开局暖绒护盾，木桌展示额外 +8 护盾）',
    giftLines: [
      '蓬蓬软软的绒云晚安抱枕！抱在怀里蹭一蹭就不困也不累啦~',
      '里面又填满了暖绒毛线，捏起来像刚出炉的舒芙蕾云朵!',
      '满针绒云抱枕大功告成！带着这份软绵守护去打工超有安全感!'
    ]
  }
};

function getCrochetStageLabel(lv) {
  const safeLv = Math.max(0, Math.min(3, Math.round(Number(lv) || 0)));
  if (safeLv <= 0) return '待起针';
  if (safeLv === 1) return '初织';
  if (safeLv === 2) return '细密';
  return '满针';
}

function getCrochetWarmGuard() {
  const cb = player.crochetBasket || {};
  const knits = cb.knits || {};
  const scarfLv = Math.max(0, Math.min(3, Math.round(Number(knits.whale_scarf?.level) || 0)));
  const coasterLv = Math.max(0, Math.min(3, Math.round(Number(knits.star_coaster?.level) || 0)));
  const pillowLv = Math.max(0, Math.min(3, Math.round(Number(knits.cloud_pillow?.level) || 0)));
  const totalLevel = scarfLv + coasterLv + pillowLv;
  const unlockedIds = ['whale_scarf', 'star_coaster', 'cloud_pillow'].filter(
    (k) => (Number(knits[k]?.level) || 0) >= 1
  );
  const active = totalLevel >= 1;
  let chosenDeskId = CROCHET_KNIT_SPECS[cb.displayedKnitId] ? cb.displayedKnitId : 'whale_scarf';
  if ((Number(knits[chosenDeskId]?.level) || 0) <= 0 && unlockedIds.length > 0) {
    chosenDeskId = unlockedIds[0];
  }
  const chosenLv = Math.max(0, Math.min(3, Math.round(Number(knits[chosenDeskId]?.level) || 0)));
  const deskDisplayed = Boolean(cb.deskDisplayed && chosenLv >= 1);

  const damageReductionPct = active
    ? Number(
        Math.min(
          0.36,
          scarfLv * 0.045 + totalLevel * 0.015 + (deskDisplayed && chosenDeskId === 'whale_scarf' ? 0.02 : 0)
        ).toFixed(4)
      )
    : 0;
  const cozyShieldBonus = active
    ? Math.round(pillowLv * 14 + totalLevel * 6 + (deskDisplayed && chosenDeskId === 'cloud_pillow' ? 8 : 0))
    : 0;
  const heartMagnetBonusPct = active
    ? Number(
        (
          coasterLv * 0.14 +
          totalLevel * 0.04 +
          (deskDisplayed && chosenDeskId === 'star_coaster' ? 0.06 : 0)
        ).toFixed(4)
      )
    : 0;
  const heartDropChanceBonus = active ? Number((coasterLv * 0.03 + totalLevel * 0.01).toFixed(4)) : 0;
  const heartHealBonus = active ? coasterLv * 3 + Math.ceil(totalLevel * 0.8) : 0;

  return {
    active,
    totalLevel,
    unlockedCount: unlockedIds.length,
    levels: {
      whale_scarf: scarfLv,
      star_coaster: coasterLv,
      cloud_pillow: pillowLv
    },
    displayedKnitId: chosenDeskId,
    displayedKnitName: CROCHET_KNIT_SPECS[chosenDeskId]?.name || '手织蓝鲸小围巾',
    displayedKnitShortName: CROCHET_KNIT_SPECS[chosenDeskId]?.shortName || '蓝鲸围巾',
    displayedKnitLevel: chosenLv,
    deskDisplayed,
    damageReductionPct,
    cozyShieldBonus,
    heartMagnetBonusPct,
    heartDropChanceBonus,
    heartHealBonus
  };
}

// AR-8 暖冬棉花糖热可可吧台：3款可可基底 × 2款暖绒顶料 = 6款冬日特调
const HOT_COCOA_BASES = {
  mellow_dark: {
    id: 'mellow_dark',
    name: '醇香黑巧基底',
    shortName: '醇黑巧',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd60'
  },
  sea_salt_caramel: {
    id: 'sea_salt_caramel',
    name: '海盐焦糖可可',
    shortName: '海盐焦糖',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd60'
  },
  hazelnut_cream: {
    id: 'hazelnut_cream',
    name: '榛果奶霜可可',
    shortName: '榛果奶霜',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd60'
  }
};

const HOT_COCOA_TOPPINGS = {
  star_marshmallow: {
    id: 'star_marshmallow',
    name: '烤星芒棉花糖',
    shortName: '星芒棉花糖',
    img: './assets/cocoa_marshmallow_topping.webp?v=hd60'
  },
  cinnamon_stick: {
    id: 'cinnamon_stick',
    name: '肉桂暖香棒',
    shortName: '肉桂暖香棒',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd60'
  }
};

const HOT_COCOA_BLENDS = [
  {
    id: 'mellow_dark__star_marshmallow',
    baseId: 'mellow_dark',
    toppingId: 'star_marshmallow',
    name: '星芒烤棉醇黑巧',
    buffTitle: '星棉疾风暖意',
    attackHastePct: 0.28,
    coinLuckPct: 0.18,
    luckyDropBonus: 0.09,
    note: '微焦星芒棉花糖浮在浓醇黑巧上，捧杯轻抿浑身暖洋洋~',
    reaction: '呼呼~ 烤星芒棉花糖在醇香黑巧里慢慢化开，甜润又暖心 ^w^!'
  },
  {
    id: 'mellow_dark__cinnamon_stick',
    baseId: 'mellow_dark',
    toppingId: 'cinnamon_stick',
    name: '暖桂醇浓黑可可',
    buffTitle: '桂香极速暖流',
    attackHastePct: 0.32,
    coinLuckPct: 0.15,
    luckyDropBonus: 0.08,
    note: '肉桂暖香棒轻轻搅动丝滑黑巧，驱散困意让手速飞快!',
    reaction: '嗅嗅~ 肉桂暖香配醇黑巧太提神啦，干活手速都变快咯!'
  },
  {
    id: 'sea_salt_caramel__star_marshmallow',
    baseId: 'sea_salt_caramel',
    toppingId: 'star_marshmallow',
    name: '海盐焦糖星棉可可',
    buffTitle: '琥珀星棉招财',
    attackHastePct: 0.2,
    coinLuckPct: 0.26,
    luckyDropBonus: 0.12,
    note: '微咸海盐焦糖裹着蓬松星芒棉花糖，每一口都是招财小确幸~',
    reaction: '海盐焦糖咸甜交织，咬一口软糯棉花糖幸福感爆棚啦 ^w^!'
  },
  {
    id: 'sea_salt_caramel__cinnamon_stick',
    baseId: 'sea_salt_caramel',
    toppingId: 'cinnamon_stick',
    name: '琥珀海盐肉桂可可',
    buffTitle: '暖金焦糖吉星',
    attackHastePct: 0.22,
    coinLuckPct: 0.24,
    luckyDropBonus: 0.11,
    note: '焦糖琥珀色热可可浸润木质肉桂香，暖手又旺打工财运~',
    reaction: '暖乎乎的海盐焦糖配肉桂棒，喝完手心脚尖都热腾腾的~'
  },
  {
    id: 'hazelnut_cream__star_marshmallow',
    baseId: 'hazelnut_cream',
    toppingId: 'star_marshmallow',
    name: '榛果奶霜星云可可',
    buffTitle: '榛云双馨暖意',
    attackHastePct: 0.24,
    coinLuckPct: 0.22,
    luckyDropBonus: 0.1,
    note: '烘烤榛果与绵密奶霜托起星芒棉花糖，攻速与财运双丰收~',
    reaction: '绵密榛果奶霜蹭到鼻尖上啦，配星芒棉花糖好香甜呀 ^w^!'
  },
  {
    id: 'hazelnut_cream__cinnamon_stick',
    baseId: 'hazelnut_cream',
    toppingId: 'cinnamon_stick',
    name: '焙榛肉桂暖冬可可',
    buffTitle: '焙榛暖冬守护',
    attackHastePct: 0.26,
    coinLuckPct: 0.2,
    luckyDropBonus: 0.1,
    note: '焙烤坚果香与肉桂暖韵融为一体，冬日书桌最治愈的一杯~',
    reaction: '焙烤榛果加肉桂暖香，捧着马克杯陪主人超有干劲~'
  }
];

function getHotCocoaBlend(baseId, toppingId) {
  const id = `${baseId}__${toppingId}`;
  return HOT_COCOA_BLENDS.find((b) => b.id === id) || HOT_COCOA_BLENDS[0];
}

function getActiveHotCocoaBuff() {
  const b = player.hotCocoa?.activeBuff;
  if (b && b.remainingSec > 0) return b;
  return null;
}
// [[split 3]]
function grantInteractiveCareYarnDrop(sourceTag = 'care') {
  if (!player.crochetBasket) return 0;
  player.crochetBasket.yarnSkeins = (player.crochetBasket.yarnSkeins || 0) + 1;
  player.crochetBasket.totalYarnCollected = (player.crochetBasket.totalYarnCollected || 0) + 1;
  player.crochetBasket.careDropCount = (player.crochetBasket.careDropCount || 0) + 1;
  savePetState();
  if (typeof syncCrochetUIFn === 'function') {
    syncCrochetUIFn();
  }
  if (sourceTag !== 'silent') {
    floatingTexts.push({
      x: Math.max(70, Math.min(W - 70, player.x + (player.x > W * 0.5 ? -84 : 84))),
      y: player.y - 58,
      vx: 0,
      vy: -32,
      text: '暖绒毛线 +1',
      color: '#fb923c',
      scale: 0.96,
      life: 0.85
    });
  }
  return player.crochetBasket.yarnSkeins;
}

// AR-9 干花标本温馨压花册规格与「幸运再生佑护」幸存者班次增益
const PRESSED_PETAL_COSTS = [2, 3, 4, 0]; // Lv.0->1: 2片, Lv.1->2: 3片, Lv.2->3: 4片（消耗对应花材）
const PRESSED_BOOKMARK_IDS = ['sakura', 'ginkgo', 'babysbreath'];

const PRESSED_BOOKMARK_SPECS = {
  sakura: {
    id: 'sakura',
    name: '樱瓣干花书签',
    shortName: '樱瓣书签',
    petalName: '樱瓣',
    spriteKey: 'pressedSakuraBookmark',
    img: './assets/pressed_sakura_bookmark.webp?v=hd60',
    note: '春日窗台拾来的樱花瓣，夹进厚厚的手账本压平，再封进奶油牛皮纸书签~',
    specialty: '幸运掉宝核心（每阶 +3% 打工幸运掉宝，木桌陈列额外 +2%）',
    giftLines: [
      '哇！粉粉的樱瓣书签，夹在手账里一翻开就是春天的味道 ^w^!',
      '樱花瓣压得更平整啦，透光看还有淡淡的花脉呢~',
      '珍藏级樱瓣书签完成！主人送的春天要一直夹在最喜欢的那一页!'
    ]
  },
  ginkgo: {
    id: 'ginkgo',
    name: '银杏干花书签',
    shortName: '银杏书签',
    petalName: '银杏',
    spriteKey: 'pressedGinkgoBookmark',
    img: './assets/pressed_ginkgo_bookmark.webp?v=hd60',
    note: '秋日落在书页间的金色银杏叶，压成小扇子形状的书签，读书累了就扇扇风~',
    specialty: '体力再生核心（每阶 +0.3/秒 打工体力再生，木桌陈列额外 +0.15/秒）',
    giftLines: [
      '金灿灿的银杏小扇子书签！拿在手里暖洋洋的像秋天的阳光~',
      '银杏叶的纹路更清晰啦，夹在书里每次翻到都好安心~',
      '珍藏级银杏书签完成！有它陪着打工，累了也能慢慢恢复元气!'
    ]
  },
  babysbreath: {
    id: 'babysbreath',
    name: '满天星干花书签',
    shortName: '满天星书签',
    petalName: '满天星',
    spriteKey: 'pressedBabysbreathBookmark',
    img: './assets/pressed_babysbreath_bookmark.webp?v=hd60',
    note: '一小簇雪白满天星压成星点书签，像把晴夜窗外的星光悄悄收进了书页~',
    specialty: '金币幸运核心（每阶 +4% 打工金币幸运）',
    giftLines: [
      '小小的满天星书签像一把星星糖！好想每天都夹在手账里~',
      '星点花簇压得更饱满啦，在台灯下一闪一闪的好治愈!',
      '珍藏级满天星书签完成！主人的心意就像满天星一样数也数不清~'
    ]
  }
};

function getPressedStageLabel(lv) {
  const safeLv = Math.max(0, Math.min(3, Math.round(Number(lv) || 0)));
  if (safeLv <= 0) return '待压制';
  if (safeLv === 1) return '初压';
  if (safeLv === 2) return '平整';
  return '珍藏';
}

function getPressedFlowerBlessing() {
  const pf = player.pressedFlowers || {};
  const marks = pf.bookmarks || {};
  const lvOf = (id) => Math.max(0, Math.min(3, Math.round(Number(marks[id]?.level) || 0)));
  const sakuraLv = lvOf('sakura');
  const ginkgoLv = lvOf('ginkgo');
  const babysLv = lvOf('babysbreath');
  const totalLevel = sakuraLv + ginkgoLv + babysLv;
  const unlockedIds = PRESSED_BOOKMARK_IDS.filter((id) => lvOf(id) >= 1);
  const active = totalLevel >= 1;
  const deskDisplayed = Boolean(pf.deskDisplayed && active);
  const luckyDropBonus = active
    ? Number((sakuraLv * 0.03 + totalLevel * 0.006 + (deskDisplayed ? 0.02 : 0)).toFixed(4))
    : 0;
  const hpRegenPerSec = active
    ? Number((ginkgoLv * 0.3 + totalLevel * 0.05 + (deskDisplayed ? 0.15 : 0)).toFixed(2))
    : 0;
  const coinLuckPct = active ? Number((babysLv * 0.04 + totalLevel * 0.004).toFixed(4)) : 0;
  return {
    active,
    totalLevel,
    unlockedCount: unlockedIds.length,
    unlockedIds,
    levels: { sakura: sakuraLv, ginkgo: ginkgoLv, babysbreath: babysLv },
    deskDisplayed,
    luckyDropBonus,
    hpRegenPerSec,
    coinLuckPct
  };
}
// [[split 4]]
function grantPressedFlowerDrop(sourceTag = 'care') {
  const pf = player.pressedFlowers;
  if (!pf) return '';
  const petalId = PRESSED_BOOKMARK_IDS[(pf.careDropCount || 0) % PRESSED_BOOKMARK_IDS.length];
  pf.petals[petalId] = (pf.petals[petalId] || 0) + 1;
  pf.totalPetalsCollected = (pf.totalPetalsCollected || 0) + 1;
  pf.careDropCount = (pf.careDropCount || 0) + 1;
  savePetState();
  if (typeof syncPressedFlowerUIFn === 'function') {
    syncPressedFlowerUIFn();
  }
  if (sourceTag !== 'silent') {
    floatingTexts.push({
      x: Math.max(70, Math.min(W - 70, player.x + (player.x > W * 0.5 ? -92 : 92))),
      y: player.y - 84,
      vx: 0,
      vy: -30,
      text: `${PRESSED_BOOKMARK_SPECS[petalId].petalName} +1`,
      color: '#e48aa6',
      scale: 0.94,
      life: 0.85
    });
  }
  return petalId;
}

// AR-9 窗畔星夜天文望远镜：6 座星座（坐标为望远镜视野百分比，按序号连星 + 辨认形状）
const CONSTELLATION_SPECS = [
  {
    id: 'summer_triangle',
    name: '夏季大三角',
    shape: '三颗亮星连成的大三角',
    stars: [
      { x: 36, y: 18, name: '织女星' },
      { x: 64, y: 28, name: '天津四' },
      { x: 44, y: 82, name: '牛郎星' }
    ],
    edges: [[0, 1], [1, 2], [2, 0]],
    reaction: '织女、牛郎和天津四手拉手，连成夏夜大三角啦~'
  },
  {
    id: 'cassiopeia',
    name: '仙后座',
    shape: '五星折线成 W 字形',
    stars: [
      { x: 18, y: 30, name: '王良四' },
      { x: 34, y: 72, name: '王良一' },
      { x: 50, y: 40, name: '策' },
      { x: 66, y: 74, name: '阁道三' },
      { x: 82, y: 26, name: '阁道二' }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
    reaction: '弯弯折折的 W 形，像夜空里的温柔签名~'
  },
  {
    id: 'lyra',
    name: '天琴座',
    shape: '亮星挂着小小平行四边形',
    stars: [
      { x: 44, y: 14, name: '织女星' },
      { x: 40, y: 42, name: '织女二' },
      { x: 56, y: 46, name: '织女三' },
      { x: 58, y: 86, name: '渐台三' },
      { x: 42, y: 82, name: '渐台二' }
    ],
    edges: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 1]],
    reaction: '织女星挂着一把小竖琴，叮咚叮咚~'
  },
  {
    id: 'cygnus',
    name: '天鹅座',
    shape: '展翅飞翔的十字形',
    stars: [
      { x: 50, y: 14, name: '天津四' },
      { x: 50, y: 44, name: '天津一' },
      { x: 50, y: 88, name: '辇道增七' },
      { x: 28, y: 36, name: '天津二' },
      { x: 72, y: 54, name: '天津九' }
    ],
    edges: [[0, 1], [1, 2], [3, 1], [1, 4]],
    reaction: '展翅的星星天鹅正沿着银河飞呢~'
  },
  {
    id: 'big_dipper',
    name: '北斗七星',
    shape: '勺柄弯弯的七星大勺子',
    stars: [
      { x: 10, y: 22, name: '摇光' },
      { x: 24, y: 30, name: '开阳' },
      { x: 36, y: 36, name: '玉衡' },
      { x: 48, y: 42, name: '天权' },
      { x: 52, y: 74, name: '天玑' },
      { x: 74, y: 80, name: '天璇' },
      { x: 78, y: 46, name: '天枢' }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
    reaction: '北斗大勺子！顺着勺口就能找到北极星~'
  },
  {
    id: 'orion',
    name: '猎户座',
    shape: '三星腰带的沙漏形猎人',
    stars: [
      { x: 36, y: 14, name: '参宿四' },
      { x: 64, y: 16, name: '参宿五' },
      { x: 60, y: 46, name: '参宿三' },
      { x: 50, y: 50, name: '参宿二' },
      { x: 40, y: 54, name: '参宿一' },
      { x: 38, y: 88, name: '参宿六' },
      { x: 66, y: 86, name: '参宿七' }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [4, 5], [2, 6]],
    reaction: '三星腰带的猎户座，冬夜最神气啦~'
  }
];

const CONSTELLATION_BY_ID = Object.fromEntries(CONSTELLATION_SPECS.map((c) => [c.id, c]));

// 左下角留给「连星 n/m」进度签，干扰星不放在那里
const STARGAZE_DECOY_CANDIDATES = [
  { x: 6, y: 12 },
  { x: 94, y: 14 },
  { x: 8, y: 52 },
  { x: 93, y: 72 },
  { x: 82, y: 12 },
  { x: 91, y: 42 },
  { x: 74, y: 86 },
  { x: 22, y: 14 },
  { x: 26, y: 58 },
  { x: 88, y: 86 },
  { x: 62, y: 86 },
  { x: 8, y: 32 }
];

function getStargazeDecoys(spec) {
  const picked = [];
  for (const cand of STARGAZE_DECOY_CANDIDATES) {
    const clear = spec.stars.every((s) => Math.hypot((cand.x - s.x) * 3.4, (cand.y - s.y) * 1.5) >= 30);
    const clearOfPicked = picked.every((s) => Math.hypot((cand.x - s.x) * 3.4, (cand.y - s.y) * 1.5) >= 30);
    if (clear && clearOfPicked) picked.push(cand);
    if (picked.length >= 6) break;
  }
  return picked;
}

function getStarGuidanceBonus() {
  const collectedIds = Object.keys(player.telescope?.constellations || {}).filter((id) => CONSTELLATION_BY_ID[id]);
  const count = collectedIds.length;
  const full = count >= CONSTELLATION_SPECS.length;
  return {
    active: count >= 1,
    count,
    total: CONSTELLATION_SPECS.length,
    collectedIds,
    critChanceBonus: Number((count * 0.015 + (full ? 0.01 : 0)).toFixed(4)),
    gemMagnetPct: Number((count * 0.03 + (full ? 0.02 : 0)).toFixed(4))
  };
}

// AR-10 窗畔雨天水彩写生画架：3 题材 × 3 调色盘 = 9 幅画廊，画意专注守护随画廊收藏数成长
const WATERCOLOR_SUBJECTS = [
  {
    id: 'rainy_window',
    name: '雨天窗畔',
    shortName: '雨窗',
    title: '听雨的窗',
    spriteKey: '',
    img: './assets/watercolor_rainy_window.webp?v=hd31',
    mixIdx: [0, 1],
    note: '雨丝顺着玻璃慢慢滑落，窗棂外是一整片湿漉漉的柔光~'
  },
  {
    id: 'potted_plant',
    name: '窗台小盆栽',
    shortName: '盆栽',
    title: '窗台小盆栽',
    spriteKey: 'plantStarLily',
    img: './assets/plant_star_lily.webp?v=hd31',
    // 叠画在雨窗水彩画的窗台右侧：size 为画幅比例，cx 为水平偏移，bottomRatio 为贴图可见底边比例
    overlay: { size: 0.4, cx: 0.15, bottomRatio: 0.88 },
    mixIdx: [1, 2],
    note: '雨天的窗台上，白铃兰低着头听雨，叶尖挂着一颗小水珠~'
  },
  {
    id: 'whale_plush',
    name: '酣睡鲸鱼抱枕',
    shortName: '鲸鱼',
    title: '酣睡的小鲸',
    spriteKey: 'toyWhale',
    img: './assets/toy_whale.webp?v=hd60',
    overlay: { size: 0.44, cx: 0.13, bottomRatio: 0.82 },
    mixIdx: [2, 0],
    note: '鲸鱼抱枕窝在雨声里打盹，圆滚滚的肚皮一起一伏~'
  }
];

const WATERCOLOR_PALETTES = [
  {
    id: 'mist_blue',
    name: '雾霾蓝调',
    shortName: '雾蓝',
    filter: 'saturate(0.68) brightness(1.06) contrast(0.95)',
    wash: 'rgba(169, 196, 222, 0.5)',
    pigments: [
      { name: '雾霾蓝', color: '#a9c4de' },
      { name: '奶白', color: '#fbf6ec' },
      { name: '灰紫', color: '#c9b9d9' }
    ],
    mixNames: ['雨雾浅蓝', '晨雾淡紫', '鲸背灰蓝']
  },
  {
    id: 'peach_cream',
    name: '蜜桃奶油',
    shortName: '蜜桃',
    filter: 'sepia(0.1) saturate(1.12) hue-rotate(-10deg) brightness(1.04)',
    wash: 'rgba(246, 184, 176, 0.48)',
    pigments: [
      { name: '蜜桃粉', color: '#f6b8b0' },
      { name: '奶油黄', color: '#f8e2b0' },
      { name: '杏仁白', color: '#fbf1e4' }
    ],
    mixNames: ['蜜桃奶霜', '杏仁奶油', '晚霞桃杏']
  },
  {
    id: 'matcha_latte',
    name: '抹茶拿铁',
    shortName: '抹茶',
    filter: 'sepia(0.22) hue-rotate(32deg) saturate(0.92) brightness(1.03)',
    wash: 'rgba(185, 211, 164, 0.5)',
    pigments: [
      { name: '抹茶绿', color: '#b9d3a4' },
      { name: '拿铁棕', color: '#d9bf9f' },
      { name: '燕麦白', color: '#f6efe1' }
    ],
    mixNames: ['抹茶奶绿', '燕麦拿铁', '抹茶奶霜']
  }
];

const WATERCOLOR_SUBJECT_BY_ID = Object.fromEntries(WATERCOLOR_SUBJECTS.map((x) => [x.id, x]));
const WATERCOLOR_PALETTE_BY_ID = Object.fromEntries(WATERCOLOR_PALETTES.map((x) => [x.id, x]));
const WATERCOLOR_TOTAL_COMBOS = WATERCOLOR_SUBJECTS.length * WATERCOLOR_PALETTES.length;

function getWatercolorComboId(subjectId, paletteId) {
  return `${subjectId}__${paletteId}`;
}

// 题材贴图落在雨窗画的窗台上（窗台顶边约在画幅 73% 高度）
const WATERCOLOR_SILL_Y = 0.73;
function getWatercolorOverlayBox(subject) {
  const ov = subject && subject.overlay;
  if (!ov) return null;
  return {
    left: 0.5 + ov.cx - ov.size * 0.5,
    top: WATERCOLOR_SILL_Y - ov.bottomRatio * ov.size,
    size: ov.size
  };
}

function getWatercolorOverlayStyle(subject) {
  const box = getWatercolorOverlayBox(subject);
  if (!box) return '';
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  return `left:${pct(box.left)};top:${pct(box.top)};width:${pct(box.size)};height:${pct(box.size)}`;
}

function getWatercolorFocusWard() {
  const paintings = player.watercolor?.paintings || {};
  const gallerySize = Object.keys(paintings).filter((k) => {
    const [sid, pid] = k.split('__');
    return WATERCOLOR_SUBJECT_BY_ID[sid] && WATERCOLOR_PALETTE_BY_ID[pid];
  }).length;
  const full = gallerySize >= WATERCOLOR_TOTAL_COMBOS;
  return {
    active: gallerySize >= 1,
    gallerySize,
    total: WATERCOLOR_TOTAL_COMBOS,
    hungCount: Math.min(6, (player.watercolor?.hung || []).length),
    critChanceBonus: Number((gallerySize * 0.012 + (full ? 0.02 : 0)).toFixed(4)),
    focusHastePct: Number((gallerySize * 0.015).toFixed(4))
  };
}

// AR-10 奶油手账小邮差信箱：3 枚邮票（寄出回信数解锁）与「信笺心意」班次经验加成
const MAILBOX_STAMP_SPECS = [
  { id: 'whale', name: '蓝鲸邮票', img: './assets/stamp_whale.webp?v=hd60', unlockReplies: 0 },
  { id: 'moon', name: '晚安月亮章', img: './assets/stamp_goodnight_moon.webp?v=hd60', unlockReplies: 2 },
  { id: 'daisy', name: '雏菊干花票', img: './assets/sticker_pressed_daisy.webp?v=hd60', unlockReplies: 4 }
];

function getMailboxHeartfeltBonus() {
  const mb = player.mailbox || {};
  const replies = Math.max(0, Number(mb.totalReplies) || 0);
  const stampKinds = MAILBOX_STAMP_SPECS.filter((st) => (Number(mb.stamps?.[st.id]) || 0) > 0).length;
  const active = replies >= 1;
  return {
    active,
    replies,
    stampKinds,
    totalStampKinds: MAILBOX_STAMP_SPECS.length,
    shiftXpBonusPct: active ? Number((Math.min(0.12, replies * 0.012) + stampKinds * 0.01).toFixed(4)) : 0
  };
}

function getMailboxShiftXpMult() {
  const bonus = getMailboxHeartfeltBonus();
  return gameMode === 'survivor' && bonus.active ? 1 + bonus.shiftXpBonusPct : 1;
}

// AR-11 暖灯厨房一起做饭团便当：3 种饭团馅料 × 3 组双配菜 = 9 款便当图鉴；打包的便当在下一个幸存者班次打开（每份守护 1 个班次）
// 规格常量与加成计算放在卡片 UI 区段之前声明，周报 / 结算在模块初始化期间调用时不会触发 TDZ
const BENTO_FILLINGS = [
  {
    id: 'ume',
    name: '酸甜梅子',
    shortName: '梅子',
    color: '#f2a9b8',
    regen: 1.2,
    rescuePct: 0.35,
    rescueCharges: 1,
    placeLine: '梅子饭团捏得圆滚滚，酸酸甜甜最开胃~'
  },
  {
    id: 'salmon',
    name: '香煎鲑鱼',
    shortName: '鲑鱼',
    color: '#f6b48c',
    regen: 0.8,
    rescuePct: 0.55,
    rescueCharges: 1,
    placeLine: '鲑鱼饭团香喷喷，打工饿了咬一大口就满血~'
  },
  {
    id: 'tuna',
    name: '金枪鱼蛋黄酱',
    shortName: '金枪鱼',
    color: '#f2dd9c',
    regen: 0.9,
    rescuePct: 0.35,
    rescueCharges: 2,
    placeLine: '金枪鱼蛋黄酱饭团做了两个，留一个给你救急~'
  }
];

const BENTO_SIDES = [
  { id: 'tamago', name: '厚蛋烧', color: '#f7d774', regenBonus: 0.2, rescueBonus: 0, placeLine: '厚蛋烧卷得软软的，切成小块摆好啦~' },
  { id: 'octopus', name: '章鱼小香肠', color: '#f29a8a', regenBonus: 0, rescueBonus: 0.05, placeLine: '章鱼小香肠八只脚都张开了，好可爱！' },
  { id: 'broccoli', name: '水煮西兰花', color: '#a9d18e', regenBonus: 0.3, rescueBonus: 0, placeLine: '西兰花焯得翠绿翠绿的，营养满分~' }
];

const BENTO_SIDE_PAIRS = [
  { id: 'tamago+octopus', ids: ['tamago', 'octopus'], name: '元气野餐' },
  { id: 'tamago+broccoli', ids: ['tamago', 'broccoli'], name: '田园清爽' },
  { id: 'octopus+broccoli', ids: ['octopus', 'broccoli'], name: '森林章鱼' }
];

const BENTO_FILLING_BY_ID = Object.fromEntries(BENTO_FILLINGS.map((x) => [x.id, x]));
const BENTO_SIDE_BY_ID = Object.fromEntries(BENTO_SIDES.map((x) => [x.id, x]));
const BENTO_BAG_MAX = 3;
const BENTO_RESCUE_THRESHOLD = 0.35;

function getBentoPairId(sideA, sideB) {
  const ia = BENTO_SIDES.findIndex((s) => s.id === sideA);
  const ib = BENTO_SIDES.findIndex((s) => s.id === sideB);
  if (ia < 0 || ib < 0 || ia === ib) return '';
  return ia < ib ? `${sideA}+${sideB}` : `${sideB}+${sideA}`;
}
// [[split 5]]

function getBentoKitchenStats() {
  const bk = player.bentoKitchen || {};
  const discovered = Object.keys(bk.discovered || {}).filter((id) => BENTO_RECIPE_BY_ID[id]).length;
  const bag = Array.isArray(bk.bag) ? bk.bag.filter((b) => b && BENTO_RECIPE_BY_ID[b.recipeId]) : [];
  return {
    discovered,
    totalRecipes: BENTO_RECIPES.length,
    bagCount: bag.length,
    bagMax: BENTO_BAG_MAX,
    nextLunch: bag.length ? { ...BENTO_RECIPE_BY_ID[bag[0].recipeId] } : null,
    totalBentos: Math.max(0, Number(bk.totalBentos) || 0)
  };
}

// 当前幸存者班次打开的便当午餐（续航回血 + 低血饭团救急），仅打工模式生效
function getBentoLunchWard() {
  const lunch = survivorRun.lunch;
  const active = Boolean(gameMode === 'survivor' && lunch && BENTO_RECIPE_BY_ID[lunch.recipeId]);
  return {
    active,
    recipeId: active ? lunch.recipeId : '',
    name: active ? lunch.name : '',
    regenPerSec: active ? lunch.regen : 0,
    rescuePct: active ? lunch.rescuePct : 0,
    rescueCharges: active ? lunch.rescueCharges : 0,
    rescuesLeft: active ? lunch.rescuesLeft : 0
  };
}

// AR-11 奶油手账回忆拼图时光：每拼好 1 段不同回忆（拍立得 / 水彩 / 周报 / 原画），幸存者打工金币 +2%，集满 6 段再 +3%
const MEMORY_WALL_MAX = 6;
const MEMORY_PUZZLE_GRID = 3;
const MEMORY_PUZZLE_PIECES = MEMORY_PUZZLE_GRID * MEMORY_PUZZLE_GRID;

function getMemoryPuzzleBonus() {
  const mp = player.memoryPuzzle || {};
  const distinctAll = Object.keys(mp.completed || {}).length;
  const distinct = Math.min(MEMORY_WALL_MAX, distinctAll);
  const full = distinct >= MEMORY_WALL_MAX;
  return {
    active: distinct >= 1,
    distinct,
    distinctAll,
    total: MEMORY_WALL_MAX,
    wallCount: Math.min(MEMORY_WALL_MAX, (mp.wall || []).length),
    coinLuckPct: Number((distinct * 0.02 + (full ? 0.03 : 0)).toFixed(4))
  };
}

function getMemoryPuzzleCoinMult() {
  const bonus = getMemoryPuzzleBonus();
  return gameMode === 'survivor' && bonus.active ? 1 + bonus.coinLuckPct : 1;
}

// AR-12 窗台小猫访客喂食角 & 奶油手账节日手作贺卡：规格常量、可注入时钟与加成计算放在卡片 UI 区段之前声明，
// 周报 / 结算 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟 / 随机数：小猫来访排期与节日判定统一读这里；测试固定时间与随机种子即可完全确定
const ar12Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};
// [[split 6]]

function ar12Random() {
  const v = Number(ar12RandomFn());
  return Number.isFinite(v) ? Math.max(0, Math.min(0.999999, v)) : Math.random();
}

function makeAr12SeededRandom(seed) {
  let a = Number(seed) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KITTEN_SPECS = [
  {
    id: 'ginger',
    name: '橘子',
    fullName: '窗台橘猫 · 橘子',
    spriteKey: 'kittenGinger',
    img: './assets/kitten_ginger.webp?v=hd60',
    feedGain: 10,
    petGain: 3,
    trait: '贪吃又爱撒娇，听见猫粮罐沙沙响就竖起尾巴',
    arriveLine: '窗台上来了一只橘猫「橘子」，正眯着眼睛晒太阳~',
    feedLine: '橘子埋头吃得咔嚓咔嚓，尾巴尖都开心得翘起来啦~',
    petLine: '橘子把脑袋往你手心里蹭，呼噜呼噜~',
    fullLine: '橘子已经被摸得软成一团猫饼，让它歇会儿吧~'
  },
  {
    id: 'tuxedo',
    name: '小礼服',
    fullName: '窗台奶牛猫 · 小礼服',
    spriteKey: 'kittenTuxedo',
    img: './assets/kitten_tuxedo.webp?v=hd60',
    feedGain: 8,
    petGain: 4,
    trait: '穿着黑白小礼服的绅士猫，最喜欢被轻轻挠下巴',
    arriveLine: '是穿着小礼服的奶牛猫！它端端正正地坐在窗台上~',
    feedLine: '小礼服优雅地一粒一粒吃，吃完还舔了舔爪子~',
    petLine: '挠挠下巴，小礼服舒服得眯成了一条缝~',
    fullLine: '小礼服礼貌地甩了甩尾巴：今天的摸摸够啦~'
  }
];
const KITTEN_BY_ID = Object.fromEntries(KITTEN_SPECS.map((k) => [k.id, k]));
const KITTEN_AFFECTION_MAX = 100;
const KITTEN_TIERS = [
  { idx: 0, min: 0, name: '怯生生', coins: 0 },
  { idx: 1, min: 20, name: '熟悉', coins: 10 },
  { idx: 2, min: 50, name: '亲近', coins: 20 },
  { idx: 3, min: 80, name: '挚友', coins: 30 }
];
const KITTEN_VISIT_RULES = {
  firstDelayMs: [40000, 90000],
  gapMs: [180000, 540000],
  stayMs: [150000, 270000],
  closeFriendStayBonusMs: 90000,
  feedStayBonusMs: 60000,
  missedRetryMs: [20000, 60000],
  midnightJitterMs: [60000, 300000],
  dailyCap: 8,
  petsPerVisit: 3,
  maxStayMs: 15 * 60000
};

function getKittenTier(aff) {
  let tier = KITTEN_TIERS[0];
  for (const t of KITTEN_TIERS) {
    if (aff >= t.min) tier = t;
  }
  return tier;
}

function getKittenCornerStats(nowMs = ar12Clock.now()) {
  const kc = player.kittenCorner || {};
  const kittens = kc.kittens || {};
  const visit = kc.visit && KITTEN_BY_ID[kc.visit.kittenId] && nowMs < kc.visit.leavesAt ? kc.visit : null;
  return {
    met: KITTEN_SPECS.filter((k) => kittens[k.id] && kittens[k.id].met).length,
    totalKittens: KITTEN_SPECS.length,
    totalAffection: KITTEN_SPECS.reduce(
      (acc, k) => acc + Math.max(0, Math.min(KITTEN_AFFECTION_MAX, Number(kittens[k.id] && kittens[k.id].affection) || 0)),
      0
    ),
    maxAffection: KITTEN_SPECS.length * KITTEN_AFFECTION_MAX,
    visiting: Boolean(visit),
    visitorId: visit ? visit.kittenId : '',
    visitsToday: Math.max(0, Number(kc.visitsToday) || 0),
    dailyCap: KITTEN_VISIT_RULES.dailyCap,
    totalVisits: Math.max(0, Number(kc.totalVisits) || 0),
    totalFeeds: Math.max(0, Number(kc.totalFeeds) || 0),
    totalPets: Math.max(0, Number(kc.totalPets) || 0)
  };
}

// 猫咪幸运佑护：两只小猫好感合计（0~200）→ 幸运掉宝最高 +10%；合计 ≥40 每班次 1 次「九命护身」，≥140 两次
function getKittenLuckWard() {
  const stats = getKittenCornerStats();
  const total = stats.totalAffection;
  const active = total >= 10;
  return {
    active,
    totalAffection: total,
    maxAffection: stats.maxAffection,
    met: stats.met,
    totalKittens: stats.totalKittens,
    luckyDropBonus: active ? Number(Math.min(0.1, total * 0.0005).toFixed(4)) : 0,
    saveCharges: total >= 140 ? 2 : total >= 40 ? 1 : 0,
    saveHpPct: 0.3
  };
}

const CARD_BASES = [
  { id: 'cream_grid', name: '奶油格纹' },
  { id: 'sakura_wash', name: '樱粉水彩' },
  { id: 'mint_letter', name: '薄荷信笺' }
];
const CARD_BASE_BY_ID = Object.fromEntries(CARD_BASES.map((b) => [b.id, b]));

// 剪贴贴纸全部复用已提供的手账位图；遇见过的小猫会解锁它的剪贴贴纸
const CARD_STICKERS = {
  lace: { name: '蕾丝花边', img: './assets/sticker_lace_garland.webp?v=hd60', spriteKey: 'stickerLaceGarland' },
  daisy: { name: '雏菊干花', img: './assets/sticker_pressed_daisy.webp?v=hd60', spriteKey: 'stickerPressedDaisy' },
  whale: { name: '蓝鲸邮票', img: './assets/stamp_whale.webp?v=hd60', spriteKey: 'stampWhale' },
  moon: { name: '晚安月亮', img: './assets/stamp_goodnight_moon.webp?v=hd60', spriteKey: 'stampGoodnightMoon' },
  heart: { name: '小爱心', img: './assets/vfx_heart.webp?v=hd60', spriteKey: 'vfxHeart' },
  sparkle: { name: '星芒', img: './assets/vfx_sparkle.webp?v=hd60', spriteKey: 'vfxSparkle' },
  note: { name: '音符', img: './assets/vfx_note.webp?v=hd60', spriteKey: 'vfxNote' },
  blush: { name: '红晕贴', img: './assets/ui_mood_blush.webp?v=hd60', spriteKey: '' },
  sakura: { name: '樱花', img: './assets/vfx_season_spring.webp?v=hd60', spriteKey: 'vfxSeasonSpring' },
  chime: { name: '风铃', img: './assets/vfx_season_summer.webp?v=hd60', spriteKey: 'vfxSeasonSummer' },
  maple: { name: '枫叶', img: './assets/vfx_season_autumn.webp?v=hd60', spriteKey: 'vfxSeasonAutumn' },
  snow: { name: '雪花', img: './assets/vfx_season_winter.webp?v=hd60', spriteKey: 'vfxSeasonWinter' },
  wreath: { name: '星环花冠', img: './assets/item_star_wreath.webp?v=hd60', spriteKey: 'itemStarWreath' },
  kitten_ginger: { name: '橘子剪贴', img: './assets/kitten_ginger.webp?v=hd60', spriteKey: 'kittenGinger', kittenId: 'ginger' },
  kitten_tuxedo: { name: '小礼服剪贴', img: './assets/kitten_tuxedo.webp?v=hd60', spriteKey: 'kittenTuxedo', kittenId: 'tuxedo' }
};
const CARD_UNIVERSAL_STICKERS = ['lace', 'daisy', 'whale'];

// 4 个固定公历节日（本地日期窗口，跨年也能判定）优先，其余日子按本地月份落到四季贺卡
const CARD_OCCASIONS = [
  {
    id: 'new_year',
    kind: 'holiday',
    name: '元旦新年',
    short: '新年',
    month: 1,
    day: 1,
    before: 3,
    after: 2,
    icon: './assets/item_star_wreath.webp?v=hd60',
    helperBase: 'cream_grid',
    stickers: ['wreath', 'sparkle', 'note'],
    lines: ['新的一年，也请多多指教呀', '愿新年的每一页手账都闪闪发光', '跨年的那一刻，想和你一起数']
  },
  {
    id: 'valentine',
    kind: 'holiday',
    name: '情人节',
    short: '情人节',
    month: 2,
    day: 14,
    before: 2,
    after: 1,
    icon: './assets/vfx_heart.webp?v=hd60',
    helperBase: 'sakura_wash',
    stickers: ['heart', 'blush', 'sparkle'],
    lines: ['今天的巧克力，分你一大半', '有你在的书桌，每天都是晴天', '悄悄说，最喜欢陪着你啦']
  },
  {
    id: 'childrens_day',
    kind: 'holiday',
    name: '儿童节',
    short: '儿童节',
    month: 6,
    day: 1,
    before: 2,
    after: 1,
    icon: './assets/stamp_whale.webp?v=hd60',
    helperBase: 'mint_letter',
    stickers: ['whale', 'note', 'heart'],
    lines: ['儿童节快乐，今天可以多吃一块蛋糕', '愿你一直留着会冒泡泡的童心', '一起去追窗外的肥皂泡吧']
  },
  {
    id: 'christmas',
    kind: 'holiday',
    name: '圣诞节',
    short: '圣诞',
    month: 12,
    day: 25,
    before: 4,
    after: 1,
    icon: './assets/vfx_season_winter.webp?v=hd60',
    helperBase: 'cream_grid',
    stickers: ['snow', 'wreath', 'sparkle'],
    lines: ['圣诞快乐，袜子里藏了一颗小星星', '把今年最暖的一盏灯留给你', '雪落下来的时候，一起许个愿吧']
  },
  {
    id: 'spring',
    kind: 'season',
    name: '春樱季',
    short: '春樱',
    months: [3, 4, 5],
    icon: './assets/vfx_season_spring.webp?v=hd60',
    helperBase: 'sakura_wash',
    stickers: ['sakura', 'daisy', 'heart'],
    lines: ['樱花开了，第一片花瓣夹给你', '春风很轻，愿你的心情也轻轻的', '一起去窗边数花苞吧']
  },
  {
    id: 'summer',
    kind: 'season',
    name: '夏日季',
    short: '夏日',
    months: [6, 7, 8],
    icon: './assets/vfx_season_summer.webp?v=hd60',
    helperBase: 'mint_letter',
    stickers: ['chime', 'whale', 'sparkle'],
    lines: ['风铃叮当响，夏天也在想你', '收下这阵带着海盐味的晚风', '汽水和你，都是夏天的宝藏']
  },
  {
    id: 'autumn',
    kind: 'season',
    name: '秋枫季',
    short: '秋枫',
    months: [9, 10, 11],
    icon: './assets/vfx_season_autumn.webp?v=hd60',
    helperBase: 'cream_grid',
    stickers: ['maple', 'note', 'moon'],
    lines: ['枫叶落进手账，也落进想你的心里', '愿你每个傍晚都有热可可和晚霞', '谢谢你今天也来书桌旁陪我']
  },
  {
    id: 'winter',
    kind: 'season',
    name: '冬雪季',
    short: '冬雪',
    months: [12, 1, 2],
    icon: './assets/vfx_season_winter.webp?v=hd60',
    helperBase: 'mint_letter',
    stickers: ['snow', 'moon', 'heart'],
    lines: ['下雪啦，给你留了最软的那条围巾', '冬夜很长，晚安和好梦都送给你', '窗上的霜花，画的是我们俩']
  }
];
const CARD_OCCASION_BY_ID = Object.fromEntries(CARD_OCCASIONS.map((o) => [o.id, o]));
const CARD_ALBUM_MAX = 24;
const CARD_DAILY_REWARDS = 3;

function getLocalDayNumber(y, m, d) {
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// 按本地日期判定今天的贺卡主题：节日窗口（节前 before 天 ~ 节后 after 天）优先，否则按月份落到四季
function resolveCardOccasion(refDate = new Date()) {
  const d = refDate instanceof Date && !Number.isNaN(refDate.getTime()) ? refDate : new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const today = getLocalDayNumber(y, m, d.getDate());
  const dateKey = formatLocalDateKey(d);
  for (const occ of CARD_OCCASIONS) {
    if (occ.kind !== 'holiday') continue;
    for (const yy of [y - 1, y, y + 1]) {
      const diff = today - getLocalDayNumber(yy, occ.month, occ.day);
      if (diff >= -occ.before && diff <= occ.after) {
        return { occasion: occ, year: yy, diffDays: diff, dateKey };
      }
    }
  }
  const season = CARD_OCCASIONS.find((o) => o.kind === 'season' && o.months.includes(m)) || CARD_OCCASION_BY_ID.winter;
  return { occasion: season, year: season.id === 'winter' && m <= 2 ? y - 1 : y, diffDays: null, dateKey };
}

// 贺卡心意：每收集 1 种节日 / 季节贺卡（共 8 种），幸存者打工班次经验 +1.5%
function getGreetingCardBlessing() {
  const gc = player.greetingCards || {};
  const collected = gc.collected || {};
  const occasions = CARD_OCCASIONS.filter((o) => collected[o.id] > 0).length;
  const active = occasions >= 1;
  return {
    active,
    occasions,
    totalOccasions: CARD_OCCASIONS.length,
    albumCount: Array.isArray(gc.album) ? gc.album.length : 0,
    totalCards: Math.max(0, Number(gc.totalCards) || 0),
    shiftXpBonusPct: active ? Number((occasions * 0.015).toFixed(4)) : 0
  };
}

function getGreetingCardShiftXpMult() {
  const bless = getGreetingCardBlessing();
  return gameMode === 'survivor' && bless.active ? 1 + bless.shiftXpBonusPct : 1;
}

// AR-13 奶油手账周末野餐篮 & DeepSeek 娘手写日记本：规格常量、可注入时钟与统计 / 加成计算同样放在卡片 UI 区段之前声明，
// 周报 / 结算 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟：周末判定（本地星期几）、野餐期待章与日记“今天”统一读这里，测试固定时间即可完全确定
const ar13Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};

const AR13_WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const PICNIC_FOODS = [
  {
    id: 'sandwich',
    name: '野餐三明治',
    short: '三明治',
    img: './assets/picnic_sandwich.webp?v=hd60',
    spriteKey: 'picnicSandwich',
    fullness: 8,
    pickLine: '三明治切成小三角，最上面那块留给你~',
    eatLine: '啊呜——三明治夹着鸡蛋和生菜，在草地上吃格外香！'
  },
  {
    id: 'onigiri',
    name: '饭团三兄弟',
    short: '饭团',
    img: './assets/onigiri_trio.webp?v=hd60',
    spriteKey: 'onigiriTrio',
    fullness: 8,
    pickLine: '饭团捏得圆滚滚的，海苔要吃的时候再包~',
    eatLine: '海苔还是脆脆的！饭团三兄弟一人一个刚刚好~'
  },
  {
    id: 'macaron',
    name: '蓝鲸马卡龙',
    short: '马卡龙',
    img: './assets/pastry_whale_macaron.webp?v=hd60',
    spriteKey: 'pastryWhaleMacaron',
    fullness: 5,
    pickLine: '小蓝鲸马卡龙装进铁盒，不会被压扁~',
    eatLine: '小蓝鲸马卡龙咬一口是香草味的，甜甜的~'
  },
  {
    id: 'souffle',
    name: '草莓舒芙蕾',
    short: '舒芙蕾',
    img: './assets/pastry_souffle.webp?v=hd60',
    spriteKey: 'pastrySouffle',
    fullness: 5,
    pickLine: '舒芙蕾要轻轻放，它会害羞地塌下去~',
    eatLine: '舒芙蕾在风里轻轻晃，软乎乎的像云朵~'
  },
  {
    id: 'pudding',
    name: '焦糖布丁挞',
    short: '布丁挞',
    img: './assets/pastry_pudding_tart.webp?v=hd60',
    spriteKey: 'pastryPuddingTart',
    fullness: 6,
    pickLine: '焦糖布丁挞！脆壳要留到野餐垫上再敲开~',
    eatLine: '焦糖脆壳“咔”的一声，里面的布丁好香！'
  },
  {
    id: 'oolong',
    name: '蜜桃乌龙',
    short: '乌龙茶',
    img: './assets/tea_peach_oolong.webp?v=hd60',
    spriteKey: 'teaPeachOolong',
    fullness: 3,
    pickLine: '保温壶装满蜜桃乌龙，渴了就倒一杯~',
    eatLine: '保温壶里的蜜桃乌龙还是温温的，干杯~'
  }
];
const PICNIC_FOOD_BY_ID = Object.fromEntries(PICNIC_FOODS.map((f) => [f.id, f]));

// 三个野餐地点：各自对应一种幸存者班次佑护（野餐好心情），期待章越多佑护越强
const PICNIC_SPOTS = [
  {
    id: 'sakura_lawn',
    name: '樱花草坪',
    short: '草坪',
    icon: './assets/vfx_season_spring.webp?v=hd60',
    wardName: '花见好运',
    effect: 'coin',
    base: 0.08,
    pickLine: '樱花树下的草坪软软的，坐在这里刚刚好~',
    spreadLine: '在樱花草坪铺开野餐垫啦，花瓣落进了杯子里~'
  },
  {
    id: 'lakeside_willow',
    name: '湖畔柳荫',
    short: '湖畔',
    icon: './assets/vfx_season_summer.webp?v=hd60',
    wardName: '柳荫清风',
    effect: 'regen',
    base: 1.0,
    pickLine: '柳树荫下有湖风，吹得人想打个盹~',
    spreadLine: '湖畔柳荫铺好野餐垫啦，湖面一闪一闪的~'
  },
  {
    id: 'ginkgo_hill',
    name: '银杏小坡',
    short: '小坡',
    icon: './assets/vfx_season_autumn.webp?v=hd60',
    wardName: '暖阳活力',
    effect: 'haste',
    base: 0.06,
    pickLine: '小坡上晒得到太阳，银杏叶沙沙地响~',
    spreadLine: '银杏小坡铺好野餐垫啦，太阳暖洋洋的~'
  }
];
const PICNIC_SPOT_BY_ID = Object.fromEntries(PICNIC_SPOTS.map((s) => [s.id, s]));

const PICNIC_RULES = {
  minFoods: 2,
  maxFoods: 3,
  prepMax: 5,
  anticipationStep: 0.05,
  wardShiftsPerPicnic: 2,
  wardMaxCharges: 4,
  logMax: 12,
  baseCoins: 14,
  coinsPerAnticipation: 4,
  newSpotCoins: 10,
  baseXp: 16,
  xpPerFood: 3,
  xpPerAnticipation: 4,
  prepXp: 4
};

function isPicnicWeekend(d = ar13Clock.date()) {
  const w = d.getDay();
  return w === 0 || w === 6;
}

// 本周末的“周六”日期键：周一~周五指向即将到来的周六，周日指向昨天的周六（期待章按这个键归属到同一个周末）
function getPicnicWeekendKey(d = ar13Clock.date()) {
  const w = d.getDay();
  const off = w === 6 ? 0 : w === 0 ? -1 : 6 - w;
  return formatLocalDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + off));
}

function getDaysUntilPicnicWeekend(d = ar13Clock.date()) {
  const w = d.getDay();
  return w === 0 || w === 6 ? 0 : 6 - w;
}

function getPicnicAnticipation(refDate = ar13Clock.date()) {
  const prep = (player.picnicBasket && player.picnicBasket.prep) || {};
  if (prep.used || prep.weekendKey !== getPicnicWeekendKey(refDate)) return 0;
  return Math.min(PICNIC_RULES.prepMax, Array.isArray(prep.days) ? prep.days.length : 0);
}

function getPicnicWardValues(spotId, anticipation = 0) {
  const spot = PICNIC_SPOT_BY_ID[spotId];
  if (!spot) return { coinPct: 0, regen: 0, hastePct: 0, mult: 1 };
  const mult = 1 + PICNIC_RULES.anticipationStep * Math.max(0, Math.min(PICNIC_RULES.prepMax, Math.round(Number(anticipation) || 0)));
  return {
    coinPct: spot.effect === 'coin' ? Number((spot.base * mult).toFixed(4)) : 0,
    regen: spot.effect === 'regen' ? Number((spot.base * mult).toFixed(2)) : 0,
    hastePct: spot.effect === 'haste' ? Number((spot.base * mult).toFixed(4)) : 0,
    mult: Number(mult.toFixed(2))
  };
}

function describePicnicWard(spotId, anticipation = 0) {
  const spot = PICNIC_SPOT_BY_ID[spotId];
  if (!spot) return '';
  const v = getPicnicWardValues(spotId, anticipation);
  if (spot.effect === 'coin') return `打工金币 +${(v.coinPct * 100).toFixed(1)}%`;
  if (spot.effect === 'regen') return `体力再生 +${v.regen.toFixed(2)}/秒`;
  return `攻速 +${(v.hastePct * 100).toFixed(1)}%`;
}

function describePicnicWardShort(spotId, anticipation = 0) {
  const spot = PICNIC_SPOT_BY_ID[spotId];
  if (!spot) return '';
  const v = getPicnicWardValues(spotId, anticipation);
  if (spot.effect === 'coin') return `金币+${Number((v.coinPct * 100).toFixed(1))}%`;
  if (spot.effect === 'regen') return `再生+${v.regen.toFixed(1)}/秒`;
  return `攻速+${Number((v.hastePct * 100).toFixed(1))}%`;
}

function getPicnicStats(refDate = ar13Clock.date()) {
  const pb = player.picnicBasket || {};
  const todayKey = formatLocalDateKey(refDate);
  const doneDates = Array.isArray(pb.doneDates) ? pb.doneDates : [];
  const prep = pb.prep || {};
  const weekendKey = getPicnicWeekendKey(refDate);
  const prepDays = prep.weekendKey === weekendKey && Array.isArray(prep.days) ? prep.days.length : 0;
  return {
    todayKey,
    weekday: refDate.getDay(),
    isWeekend: isPicnicWeekend(refDate),
    weekendKey,
    daysUntil: getDaysUntilPicnicWeekend(refDate),
    doneToday: doneDates.includes(todayKey),
    preppedToday: prep.weekendKey === weekendKey && Array.isArray(prep.days) && prep.days.includes(todayKey),
    prepDays,
    anticipation: getPicnicAnticipation(refDate),
    anticipationUsed: Boolean(prep.weekendKey === weekendKey && prep.used),
    hasPlan: Boolean(pb.plan),
    totalPicnics: Math.max(0, Number(pb.totalPicnics) || 0),
    totalPreps: Math.max(0, Number(pb.totalPreps) || 0),
    spotsVisited: PICNIC_SPOTS.filter((s) => pb.spotsVisited && pb.spotsVisited[s.id] > 0).length,
    totalSpots: PICNIC_SPOTS.length,
    wardCharges: Math.max(0, Number(pb.wardCharges) || 0),
    wardSpotId: PICNIC_SPOT_BY_ID[pb.wardSpotId] ? pb.wardSpotId : '',
    wardAnticipation: Math.max(0, Number(pb.wardAntic) || 0)
  };
}

// 野餐好心情：周末完成野餐后，接下来的幸存者班次（进入打工时消耗 1 次）按野餐地点获得佑护，仅打工模式生效
function getPicnicShiftWard() {
  const w = survivorRun.picnic;
  const active = Boolean(gameMode === 'survivor' && w && PICNIC_SPOT_BY_ID[w.spotId]);
  const spot = active ? PICNIC_SPOT_BY_ID[w.spotId] : null;
  return {
    active,
    spotId: active ? w.spotId : '',
    spotName: spot ? spot.name : '',
    wardName: spot ? spot.wardName : '',
    effect: spot ? spot.effect : '',
    coinPct: active ? w.coinPct : 0,
    regenPerSec: active ? w.regen : 0,
    hastePct: active ? w.hastePct : 0,
    anticipation: active ? w.antic : 0,
    chargesLeft: Math.max(0, Number(player.picnicBasket && player.picnicBasket.wardCharges) || 0)
  };
}

function getPicnicCoinMult() {
  const ward = getPicnicShiftWard();
  return ward.active ? 1 + (ward.coinPct || 0) : 1;
}

// 手写日记本：每天一页由她按当天真实互动（周报每日计数 + 野餐 / 小猫 / 贺卡等记录）自动写成
const DIARY_STICKERS = {
  diary: { name: '日记贴', img: './assets/diary_sticker.webp?v=hd60', spriteKey: 'diarySticker' },
  lace: { name: '蕾丝花边', img: './assets/sticker_lace_garland.webp?v=hd60', spriteKey: 'stickerLaceGarland' },
  daisy: { name: '雏菊干花', img: './assets/sticker_pressed_daisy.webp?v=hd60', spriteKey: 'stickerPressedDaisy' },
  whale: { name: '蓝鲸邮票', img: './assets/stamp_whale.webp?v=hd60', spriteKey: 'stampWhale' },
  heart: { name: '小爱心', img: './assets/vfx_heart.webp?v=hd60', spriteKey: 'vfxHeart' },
  sandwich: { name: '野餐三明治', img: './assets/picnic_sandwich.webp?v=hd60', spriteKey: 'picnicSandwich', counter: 'picnics' },
  kitten: { name: '窗台小猫', img: './assets/kitten_ginger.webp?v=hd60', spriteKey: 'kittenGinger', counter: 'kittens' },
  card: { name: '手作贺卡', img: './assets/handmade_card.webp?v=hd60', spriteKey: 'handmadeCard', counter: 'cards' },
  embroidery: { name: '刺绣布贴', img: './assets/embroidery_patch.webp?v=hd60', spriteKey: 'embroideryPatch', counter: 'embroideries' }
};
const DIARY_BASE_STICKERS = ['diary', 'lace', 'daisy', 'whale', 'heart'];
const DIARY_MEMORY_STICKERS = ['embroidery', 'sandwich', 'kitten', 'card'];
const DIARY_RULES = {
  stickerMax: 3,
  dailyRewards: 3,
  coinReward: 6,
  xpReward: 5,
  maxLines: 4,
  decorKeep: 40
};

// 日记行：AR-9 ~ AR-13 的新互动排在前面，其余周报计数随后；每页最多写 4 行，多出的记在页角
const DIARY_LINE_SPECS = [
  { key: 'stories', ico: './assets/story_bookmark.webp?v=hd60' },
  { key: 'outfits', ico: './assets/ui_btn_wardrobe.webp?v=hd60' },
  { key: 'embroideries', ico: './assets/embroidery_patch.webp?v=hd60' },
  { key: 'snacks', ico: './assets/roasted_snack.webp?v=hd60' },
  { key: 'stars', ico: './assets/constellation_card.webp?v=hd60' },
  { key: 'rains', ico: './assets/rain_chime.webp?v=hd60' },
  { key: 'potteries', ico: './assets/pottery_cup.webp?v=hd60' },
  { key: 'aromas', ico: './assets/aroma_bottle.webp?v=hd60' },
  { key: 'picnics', ico: './assets/picnic_sandwich.webp?v=hd60' },
  { key: 'picnicPreps', ico: './assets/ui_btn_picnic_basket.webp?v=hd60' },
  { key: 'cards', ico: './assets/handmade_card.webp?v=hd60' },
  { key: 'kittens', ico: './assets/kitten_ginger.webp?v=hd60' },
  { key: 'puzzles', ico: './assets/puzzle_piece_memory.webp?v=hd60' },
  { key: 'bentos', ico: './assets/bento_box_finished.webp?v=hd31' },
  { key: 'letters', ico: './assets/letter_envelope.webp?v=hd60' },
  { key: 'paints', ico: './assets/watercolor_palette.webp?v=hd60' },
  { key: 'stargazes', ico: './assets/star_chart_card.webp?v=hd60' },
  { key: 'presses', ico: './assets/pressed_sakura_bookmark.webp?v=hd60' },
  { key: 'knits', ico: './assets/ui_btn_crochet_basket.webp?v=hd60' },
  { key: 'cocoas', ico: './assets/ui_btn_cocoa_bar.webp?v=hd60' },
  { key: 'collages', ico: './assets/ui_btn_collage_frame.webp?v=hd60' },
  { key: 'radioMins', ico: './assets/ui_btn_cozy_radio.webp?v=hd60' },
  { key: 'plantCares', ico: './assets/ui_btn_terrarium.webp?v=hd60' },
  { key: 'sleepMins', ico: './assets/stamp_goodnight_moon.webp?v=hd60' },
  { key: 'teas', ico: './assets/ui_btn_teatime.webp?v=hd60' },
  { key: 'focusMins', ico: './assets/ui_btn_pomodoro.webp?v=hd60' },
  { key: 'shifts', ico: './assets/ui_badge_shift.webp?v=hd60' },
  { key: 'snaps', ico: './assets/ui_btn_camera.webp?v=hd60' },
  { key: 'chats', ico: './assets/ui_btn_chat.webp?v=hd60' },
  { key: 'feeds', ico: './assets/food_rice.webp?v=hd60' }
];
const DIARY_COUNTER_KEYS = DIARY_LINE_SPECS.map((s) => s.key);

function getJournalDayActivityTotal(day) {
  if (!day || typeof day !== 'object') return 0;
  return DIARY_COUNTER_KEYS.reduce((acc, k) => acc + Math.max(0, Number(day[k]) || 0), 0);
}

// 日记页列表：周报里有真实互动的日子（不含“未来”日期）+ 今天这一页（还空着也在，等她写）
function getDiaryPageKeys(todayKey = formatLocalDateKey(ar13Clock.date())) {
  const days = (player.weeklyJournal && player.weeklyJournal.days) || {};
  const keys = Object.keys(days).filter((k) => k <= todayKey && getJournalDayActivityTotal(days[k]) > 0);
  if (!keys.includes(todayKey)) keys.push(todayKey);
  return keys.sort();
}

function getDiaryStats(refDate = ar13Clock.date()) {
  const db = player.diaryBook || {};
  const todayKey = formatLocalDateKey(refDate);
  const days = (player.weeklyJournal && player.weeklyJournal.days) || {};
  const keys = getDiaryPageKeys(todayKey);
  const written = keys.filter((k) => getJournalDayActivityTotal(days[k]) > 0).length;
  const decor = db.decor || {};
  const decorated = Object.keys(decor).filter((k) => Array.isArray(decor[k]) && decor[k].length > 0).length;
  const todayTotal = getJournalDayActivityTotal(days[todayKey]);
  const seen = db.seen || {};
  const todayNew = todayTotal > 0 && (seen.dateKey !== todayKey || todayTotal > (Number(seen.total) || 0));
  return {
    todayKey,
    pages: keys.length,
    written,
    decorated,
    totalStickers: Math.max(0, Number(db.totalStickers) || 0),
    todayTotal,
    todayNew,
    rewardsToday: db.rewardDate === todayKey ? Math.max(0, Number(db.rewardCount) || 0) : 0,
    dailyRewards: DIARY_RULES.dailyRewards
  };
}

// AR-14 窗畔手作陶艺转盘 & 小小香氛调配台：规格常量、可注入时钟与统计 / 加成计算同样放在卡片 UI 区段之前声明，
// 周报 / 日记 / 结算 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟：香氛季节（本地日期）、点香剩余时间、陶艺每日奖励统一读这里，测试固定时间即可完全确定
const ar14Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};

// 两种器型：小茶杯拉坯 3 圈、佑护 2 个班次；小花瓶拉坯 4 圈、佑护 1 个班次但效果 ×1.5
const POTTERY_SHAPES = [
  {
    id: 'cup',
    name: '手捏小茶杯',
    short: '茶杯',
    img: './assets/pottery_cup.webp?v=hd60',
    spriteKey: 'potteryCup',
    taps: 3,
    charges: 2,
    mult: 1,
    pickLine: '先做一只小茶杯吧，杯口要捏得圆圆的~',
    doneLine: '小茶杯出窑啦，杯口圆圆的，装蜜桃乌龙刚刚好~'
  },
  {
    id: 'vase',
    name: '窗畔小花瓶',
    short: '花瓶',
    img: './assets/pottery_vase.webp?v=hd60',
    spriteKey: 'potteryVase',
    taps: 4,
    charges: 1,
    mult: 1.5,
    pickLine: '做个小花瓶！瓶颈要慢慢收细，手要稳稳的~',
    doneLine: '小花瓶出窑啦，插一枝窗边的小花正好~'
  }
];
const POTTERY_SHAPE_BY_ID = Object.fromEntries(POTTERY_SHAPES.map((s) => [s.id, s]));

// 三种釉色：各对应一种幸存者班次陶艺佑护（奶白减伤 / 樱粉金币 / 青瓷宝石磁吸），陶艺图鉴收集越全佑护越强
const POTTERY_GLAZES = [
  {
    id: 'cream',
    name: '奶白釉',
    short: '奶白',
    color: '#fbf3e2',
    rgb: '250, 238, 214',
    effect: 'guard',
    base: 0.06,
    wardName: '奶白安心',
    line: '奶白釉像热牛奶一样，柔柔地裹住杯身~'
  },
  {
    id: 'sakura',
    name: '樱粉釉',
    short: '樱粉',
    color: '#f8d8de',
    rgb: '248, 210, 220',
    effect: 'coin',
    base: 0.08,
    wardName: '樱粉好运',
    line: '樱粉釉！像春天的花瓣落在杯沿上~'
  },
  {
    id: 'celadon',
    name: '青瓷釉',
    short: '青瓷',
    color: '#d6ecdf',
    rgb: '206, 232, 218',
    effect: 'magnet',
    base: 0.15,
    wardName: '青瓷聚宝',
    line: '青瓷釉清清凉凉的，像雨后的窗玻璃~'
  }
];
const POTTERY_GLAZE_BY_ID = Object.fromEntries(POTTERY_GLAZES.map((g) => [g.id, g]));

const POTTERY_RULES = {
  fireSec: 1.6,
  wardMaxCharges: 3,
  shelfShow: 4,
  shelfCardShow: 6,
  logMax: 12,
  dailyRewards: 3,
  coinReward: 10,
  newComboCoins: 8,
  xpReward: 12,
  comboStep: 0.04,
  totalCombos: POTTERY_SHAPES.length * POTTERY_GLAZES.length
};

function getPotteryComboCount() {
  const combos = (player.potteryWheel && player.potteryWheel.combos) || {};
  let n = 0;
  for (const sh of POTTERY_SHAPES) {
    for (const gl of POTTERY_GLAZES) {
      if (Number(combos[`${sh.id}_${gl.id}`]) > 0) n += 1;
    }
  }
  return n;
}

function getPotteryWardValues(glazeId, shapeId, combos = getPotteryComboCount()) {
  const glaze = POTTERY_GLAZE_BY_ID[glazeId];
  const shape = POTTERY_SHAPE_BY_ID[shapeId];
  if (!glaze || !shape) return { guardPct: 0, coinPct: 0, magnetPct: 0, mult: 1, value: 0 };
  const c = Math.max(0, Math.min(POTTERY_RULES.totalCombos, Math.round(Number(combos) || 0)));
  const mult = shape.mult * (1 + POTTERY_RULES.comboStep * c);
  const value = Number((glaze.base * mult).toFixed(4));
  return {
    guardPct: glaze.effect === 'guard' ? value : 0,
    coinPct: glaze.effect === 'coin' ? value : 0,
    magnetPct: glaze.effect === 'magnet' ? value : 0,
    mult: Number(mult.toFixed(4)),
    value
  };
}

function describePotteryWard(glazeId, shapeId, combos = getPotteryComboCount()) {
  const glaze = POTTERY_GLAZE_BY_ID[glazeId];
  if (!glaze || !POTTERY_SHAPE_BY_ID[shapeId]) return '';
  const v = getPotteryWardValues(glazeId, shapeId, combos);
  if (glaze.effect === 'guard') return `打工减伤 +${(v.guardPct * 100).toFixed(1)}%`;
  if (glaze.effect === 'coin') return `打工金币 +${(v.coinPct * 100).toFixed(1)}%`;
  return `宝石磁吸 +${(v.magnetPct * 100).toFixed(1)}%`;
}

function describePotteryWardShort(glazeId, shapeId, combos = getPotteryComboCount()) {
  const glaze = POTTERY_GLAZE_BY_ID[glazeId];
  if (!glaze || !POTTERY_SHAPE_BY_ID[shapeId]) return '';
  const v = getPotteryWardValues(glazeId, shapeId, combos);
  if (glaze.effect === 'guard') return `减伤+${Number((v.guardPct * 100).toFixed(1))}%`;
  if (glaze.effect === 'coin') return `金币+${Number((v.coinPct * 100).toFixed(1))}%`;
  return `磁吸+${Number((v.magnetPct * 100).toFixed(1))}%`;
}

function getPotteryStats(refDate = ar14Clock.date()) {
  const pw = player.potteryWheel || {};
  const todayKey = formatLocalDateKey(refDate);
  const pieces = Array.isArray(pw.pieces) ? pw.pieces : [];
  const last = pieces.length ? pieces[pieces.length - 1] : null;
  return {
    todayKey,
    shelfCount: pieces.length,
    totalPieces: Math.max(pieces.length, Number(pw.totalPieces) || 0),
    combos: getPotteryComboCount(),
    totalCombos: POTTERY_RULES.totalCombos,
    madeToday: pieces.filter((e) => e.date === todayKey).length,
    rewardsToday: pw.rewardDate === todayKey ? Math.max(0, Number(pw.rewardCount) || 0) : 0,
    dailyRewards: POTTERY_RULES.dailyRewards,
    wardCharges: Math.max(0, Number(pw.wardCharges) || 0),
    wardGlazeId: POTTERY_GLAZE_BY_ID[pw.wardGlazeId] ? pw.wardGlazeId : '',
    wardShapeId: POTTERY_SHAPE_BY_ID[pw.wardShapeId] ? pw.wardShapeId : '',
    totalWardShifts: Math.max(0, Number(pw.totalWardShifts) || 0),
    latest: last ? { ...last } : null
  };
}

// 陶艺佑护：烧好陶器后，接下来的幸存者班次（进入打工时消耗 1 次）按釉色获得佑护，仅打工模式生效
function getPotteryShiftWard() {
  const w = survivorRun.pottery;
  const active = Boolean(gameMode === 'survivor' && w && POTTERY_GLAZE_BY_ID[w.glazeId] && POTTERY_SHAPE_BY_ID[w.shapeId]);
  const glaze = active ? POTTERY_GLAZE_BY_ID[w.glazeId] : null;
  const shape = active ? POTTERY_SHAPE_BY_ID[w.shapeId] : null;
  return {
    active,
    glazeId: active ? w.glazeId : '',
    shapeId: active ? w.shapeId : '',
    glazeName: glaze ? glaze.name : '',
    shapeName: shape ? shape.name : '',
    wardName: glaze ? glaze.wardName : '',
    effect: glaze ? glaze.effect : '',
    guardPct: active ? w.guardPct : 0,
    coinPct: active ? w.coinPct : 0,
    magnetPct: active ? w.magnetPct : 0,
    combos: active ? w.combos : 0,
    chargesLeft: Math.max(0, Number(player.potteryWheel && player.potteryWheel.wardCharges) || 0)
  };
}

function getPotteryCoinMult() {
  const ward = getPotteryShiftWard();
  return ward.active ? 1 + (ward.coinPct || 0) : 1;
}

function getPotteryMagnetMult() {
  const ward = getPotteryShiftWard();
  return ward.active ? 1 + (ward.magnetPct || 0) : 1;
}

function getPotteryDamageMult() {
  const ward = getPotteryShiftWard();
  return ward.active ? Math.max(0.6, 1 - (ward.guardPct || 0)) : 1;
}

// 小小香氛调配台：季节基调按本地日期（可注入时钟）决定，心情心调由主人挑选，5 种心情 × 4 季 = 20 款香氛图鉴
const AROMA_SEASONS = {
  spring: { id: 'spring', name: '春', note: '樱花白茶', icon: './assets/vfx_season_spring.webp?v=hd60', rgb: '255, 228, 236' },
  summer: { id: 'summer', name: '夏', note: '青柠海盐', icon: './assets/vfx_season_summer.webp?v=hd60', rgb: '222, 242, 246' },
  autumn: { id: 'autumn', name: '秋', note: '桂花木质', icon: './assets/vfx_season_autumn.webp?v=hd60', rgb: '252, 232, 198' },
  winter: { id: 'winter', name: '冬', note: '雪松香草', icon: './assets/vfx_season_winter.webp?v=hd60', rgb: '236, 238, 250' }
};
const AROMA_SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'];

const AROMA_MOODS = [
  {
    id: 'bliss',
    name: '甜心',
    note: '蜜桃奶霜',
    img: './assets/ui_mood_blush.webp?v=hd60',
    rgb: '255, 218, 206',
    kelvin: 3200,
    tone: '暖桃',
    line: '甜甜的蜜桃奶霜，闻起来像被抱了一下~'
  },
  {
    id: 'focus',
    name: '专注',
    note: '薄荷柠檬草',
    img: './assets/ui_stamp_focus.webp?v=hd60',
    rgb: '226, 244, 234',
    kelvin: 5000,
    tone: '清新',
    line: '薄荷柠檬草清清爽爽的，主人敲代码也不会犯困~'
  },
  {
    id: 'cozy',
    name: '茶歇',
    note: '焦糖肉桂',
    img: './assets/ui_btn_teatime.webp?v=hd60',
    rgb: '255, 228, 192',
    kelvin: 2900,
    tone: '琥珀',
    line: '焦糖肉桂暖暖的，像刚出炉的小点心~'
  },
  {
    id: 'star',
    name: '星梦',
    note: '鸢尾白麝香',
    img: './assets/ui_pin_star.webp?v=hd60',
    rgb: '232, 232, 250',
    kelvin: 4400,
    tone: '月光',
    line: '鸢尾和白麝香，像窗外的星星落进房间~'
  },
  {
    id: 'goodnight',
    name: '好梦',
    note: '薰衣草',
    img: './assets/stamp_goodnight_moon.webp?v=hd60',
    rgb: '238, 228, 248',
    kelvin: 3500,
    tone: '薰衣草',
    line: '薰衣草软软的，今晚一定能睡个好觉~'
  }
];
const AROMA_MOOD_BY_ID = Object.fromEntries(AROMA_MOODS.map((m) => [m.id, m]));

const AROMA_RULES = {
  drops: 3,
  durationMin: 30,
  dailyRewards: 3,
  coinReward: 6,
  xpReward: 6,
  newRecipeCoins: 10,
  affectionBonus: 0.1,
  totalRecipes: AROMA_SEASON_IDS.length * AROMA_MOODS.length
};

function getAromaSeasonId(d = ar14Clock.date()) {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function getAromaRecipe(seasonId, moodId) {
  const season = AROMA_SEASONS[seasonId];
  const mood = AROMA_MOOD_BY_ID[moodId];
  if (!season || !mood) return null;
  return {
    id: `${season.id}_${mood.id}`,
    name: `${season.note} · ${mood.note}`,
    seasonId: season.id,
    moodId: mood.id,
    seasonName: season.name,
    moodName: mood.name,
    kelvin: mood.kelvin,
    tone: mood.tone,
    moodRgb: mood.rgb,
    seasonRgb: season.rgb
  };
}

// 点香中的香氛（按可注入时钟判断是否已散）：返回配方 + 剩余分钟
function getActiveAroma(nowMs = ar14Clock.now()) {
  const a = player.aromaTable && player.aromaTable.active;
  if (!a || !(Number(a.endMs) > nowMs)) return null;
  const recipe = getAromaRecipe(a.seasonId, a.moodId);
  if (!recipe) return null;
  const leftMs = Math.min(AROMA_RULES.durationMin * 60000, Number(a.endMs) - nowMs);
  return { ...recipe, startMs: a.startMs, endMs: a.endMs, leftMs, minsLeft: Math.max(1, Math.ceil(leftMs / 60000)) };
}

// 香氛舒心：点香期间，日常养成模式里的亲密度收获 +10%
function getAromaAffectionMult() {
  return gameMode === 'pet' && getActiveAroma() ? 1 + AROMA_RULES.affectionBonus : 1;
}

function getAromaStats(refDate = ar14Clock.date()) {
  const at = player.aromaTable || {};
  const todayKey = formatLocalDateKey(refDate);
  const seasonId = getAromaSeasonId(refDate);
  const disc = at.discovered || {};
  const found = Object.keys(disc).filter((k) => Number(disc[k]) > 0);
  return {
    todayKey,
    seasonId,
    discovered: found.length,
    totalRecipes: AROMA_RULES.totalRecipes,
    seasonFound: AROMA_MOODS.filter((m) => Number(disc[`${seasonId}_${m.id}`]) > 0).length,
    totalBlends: Math.max(0, Number(at.totalBlends) || 0),
    rewardsToday: at.rewardDate === todayKey ? Math.max(0, Number(at.rewardCount) || 0) : 0,
    dailyRewards: AROMA_RULES.dailyRewards,
    active: getActiveAroma(refDate.getTime())
  };
}

// AR-15 卧室星空投影灯 & 窗边听雨角：规格常量、可注入时钟、运行时状态与统计 / 加成计算同样放在卡片 UI 区段之前声明，
// 周报 / 日记 / 晚安结算 / 亲密度倍率 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟：星座卡当季（本地日期）、睡前时段、投影剩余时间、听雨的本地天气时段与小记计时统一读这里，测试固定时间即可完全确定
const ar15Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};

// 8 张星座卡：每季 2 张（按本地日期取当季可投影的两张，已收集的星座卡任何季节都能再投）；
// taps = 转动投影罩要对准的亮星数，stars = 投到天花板上的星位（星光层百分比坐标），rgb 只用浅奶油色
const STAR_CARDS = [
  {
    id: 'leo',
    name: '狮子座',
    short: '狮子',
    season: 'spring',
    taps: 5,
    rgb: '255, 236, 204',
    starNames: ['轩辕十四', '轩辕十二', '轩辕十三', '西次相', '五帝座一'],
    stars: [{ x: 16, y: 34 }, { x: 30, y: 18 }, { x: 46, y: 24 }, { x: 64, y: 50 }, { x: 86, y: 58 }],
    story: '春夜的狮子座伸了个懒腰，镰刀形的鬃毛里藏着轩辕十四~'
  },
  {
    id: 'bootes',
    name: '牧夫座',
    short: '牧夫',
    season: 'spring',
    taps: 4,
    rgb: '255, 228, 214',
    starNames: ['大角星', '招摇', '七公七', '梗河一'],
    stars: [{ x: 50, y: 86 }, { x: 34, y: 46 }, { x: 52, y: 12 }, { x: 68, y: 44 }],
    story: '牧夫座提着风筝形的灯笼，大角星暖暖的橘光照着回家的路~'
  },
  {
    id: 'scorpius',
    name: '天蝎座',
    short: '天蝎',
    season: 'summer',
    taps: 6,
    rgb: '255, 226, 220',
    starNames: ['房宿四', '心宿一', '心宿二', '心宿三', '尾宿五', '尾宿八'],
    stars: [{ x: 14, y: 18 }, { x: 28, y: 32 }, { x: 40, y: 44 }, { x: 52, y: 60 }, { x: 66, y: 80 }, { x: 84, y: 70 }],
    story: '夏夜的天蝎座弯着尾巴，心宿二像一盏小小的红灯笼~'
  },
  {
    id: 'aquila',
    name: '天鹰座',
    short: '天鹰',
    season: 'summer',
    taps: 4,
    rgb: '228, 238, 252',
    starNames: ['河鼓一', '河鼓二', '河鼓三', '吴越'],
    stars: [{ x: 22, y: 60 }, { x: 50, y: 44 }, { x: 78, y: 30 }, { x: 50, y: 84 }],
    story: '天鹰座展开翅膀，河鼓二（牛郎星）正隔着银河眨眼睛~'
  },
  {
    id: 'pegasus',
    name: '飞马座',
    short: '飞马',
    season: 'autumn',
    taps: 4,
    rgb: '236, 234, 252',
    starNames: ['室宿一', '室宿二', '壁宿一', '壁宿二'],
    stars: [{ x: 26, y: 70 }, { x: 28, y: 26 }, { x: 72, y: 72 }, { x: 70, y: 24 }],
    story: '秋夜的飞马座驮着一个大大的四边形，像星空里的一扇窗~'
  },
  {
    id: 'andromeda',
    name: '仙女座',
    short: '仙女',
    season: 'autumn',
    taps: 5,
    rgb: '250, 230, 244',
    starNames: ['壁宿二', '奎宿五', '奎宿九', '天大将军一', '仙女座大星云'],
    stars: [{ x: 12, y: 72 }, { x: 32, y: 58 }, { x: 50, y: 46 }, { x: 70, y: 34 }, { x: 88, y: 20 }],
    story: '仙女座的裙摆里藏着一团朦胧的星云，那是遥远的另一个银河哦~'
  },
  {
    id: 'gemini',
    name: '双子座',
    short: '双子',
    season: 'winter',
    taps: 5,
    rgb: '232, 240, 252',
    starNames: ['北河二', '北河三', '井宿五', '井宿三', '井宿一'],
    stars: [{ x: 30, y: 14 }, { x: 62, y: 12 }, { x: 34, y: 52 }, { x: 62, y: 50 }, { x: 46, y: 86 }],
    story: '冬夜的双子座手牵着手，北河二和北河三一起守着好梦~'
  },
  {
    id: 'canis_major',
    name: '大犬座',
    short: '大犬',
    season: 'winter',
    taps: 4,
    rgb: '240, 236, 255',
    starNames: ['天狼星', '军市一', '弧矢一', '弧矢七'],
    stars: [{ x: 46, y: 16 }, { x: 24, y: 30 }, { x: 58, y: 50 }, { x: 70, y: 82 }],
    story: '大犬座的天狼星是夜空最亮的星，像一只守夜的小狗~'
  }
];
const STAR_CARD_BY_ID = Object.fromEntries(STAR_CARDS.map((c) => [c.id, c]));
const STAR_SEASON_NAMES = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

const STAR_RULES = {
  durationMin: 20,
  dailyRewards: 2,
  coinReward: 8,
  xpReward: 8,
  newCardCoins: 12,
  bedtimeStartHour: 20,
  bedtimeEndHour: 2,
  bedtimeMult: 1.5,
  dreamDailyMax: 1,
  dreamCoins: 15,
  dreamXp: 10,
  goodnightBonus: 0.2,
  totalCards: STAR_CARDS.length
};

// 睡前时段：本地 20:00 ~ 次日 02:00（可注入时钟），这时点亮的投影奖励 ×1.5
function isStarBedtime(d = ar15Clock.date()) {
  const h = d.getHours();
  return h >= STAR_RULES.bedtimeStartHour || h < STAR_RULES.bedtimeEndHour;
}

function getStarSeasonCards(seasonId = getAromaSeasonId(ar15Clock.date())) {
  return STAR_CARDS.filter((c) => c.season === seasonId);
}

// 投影中的星座（按可注入时钟判断是否已熄灭）：返回星座卡 + 剩余分钟
function getActiveProjection(nowMs = ar15Clock.now()) {
  const a = player.starProjector && player.starProjector.active;
  if (!a || !(Number(a.endMs) > nowMs)) return null;
  const card = STAR_CARD_BY_ID[a.cardId];
  if (!card) return null;
  const leftMs = Math.min(STAR_RULES.durationMin * 60000, Number(a.endMs) - nowMs);
  return {
    cardId: card.id,
    name: card.name,
    short: card.short,
    rgb: card.rgb,
    story: card.story,
    startMs: a.startMs,
    endMs: a.endMs,
    leftMs,
    minsLeft: Math.max(1, Math.ceil(leftMs / 60000))
  };
}

function getStarStats(refDate = ar15Clock.date()) {
  const sp = player.starProjector || {};
  const todayKey = formatLocalDateKey(refDate);
  const cards = sp.cards || {};
  const seasonId = getAromaSeasonId(refDate);
  const collectedIds = STAR_CARDS.filter((c) => Number(cards[c.id] && cards[c.id].lights) > 0).map((c) => c.id);
  return {
    todayKey,
    seasonId,
    seasonCards: getStarSeasonCards(seasonId).map((c) => c.id),
    collected: collectedIds.length,
    collectedIds,
    totalCards: STAR_RULES.totalCards,
    totalLights: Math.max(0, Number(sp.totalLights) || 0),
    totalDreams: Math.max(0, Number(sp.totalDreams) || 0),
    rewardsToday: sp.rewardDate === todayKey ? Math.max(0, Number(sp.rewardCount) || 0) : 0,
    dailyRewards: STAR_RULES.dailyRewards,
    dreamsToday: sp.dreamDate === todayKey ? Math.max(0, Number(sp.dreamCount) || 0) : 0,
    bedtime: isStarBedtime(refDate),
    active: getActiveProjection(refDate.getTime())
  };
}

// 晚安联动：投影点亮期间完成晚安伴眠，好梦章金币 +20%
function getStarGoodnightMult() {
  return getActiveProjection() ? 1 + STAR_RULES.goodnightBonus : 1;
}

// 窗边听雨角：不联网、不读传感器 —— 按本地日期 + 时段确定性轮换“窗外天气”，白噪音跟着窗外天气走
const RAIN_SEGMENTS = [
  { id: 'dawn', name: '清晨', from: 5, to: 10, next: '10:00' },
  { id: 'day', name: '午后', from: 10, to: 16, next: '16:00' },
  { id: 'dusk', name: '傍晚', from: 16, to: 20, next: '20:00' },
  { id: 'night', name: '夜里', from: 20, to: 5, next: '05:00' }
];
const RAIN_SEGMENT_BY_ID = Object.fromEntries(RAIN_SEGMENTS.map((s) => [s.id, s]));

const RAIN_WEATHERS = [
  {
    id: 'drizzle',
    name: '绵绵细雨',
    short: '细雨',
    icon: './assets/watercolor_rainy_window.webp?v=hd31',
    rgb: '236, 242, 246',
    mix: '细雨沙沙 · 偶尔檐滴',
    line: '绵绵细雨沙沙沙的，像谁在窗外轻轻翻书~'
  },
  {
    id: 'eaves',
    name: '屋檐滴答',
    short: '檐滴',
    icon: './assets/rain_chime.webp?v=hd60',
    rgb: '242, 238, 230',
    mix: '檐下滴答 · 轻雨垫底',
    line: '屋檐的雨滴一颗一颗落下来，滴答、滴答~'
  },
  {
    id: 'shower',
    name: '窗边阵雨',
    short: '阵雨',
    icon: './assets/watercolor_rainy_window.webp?v=hd31',
    rgb: '232, 238, 246',
    mix: '阵雨哗哗 · 雨打窗',
    line: '阵雨哗啦啦地敲着窗，我们躲在窗边刚刚好~'
  },
  {
    id: 'thunder',
    name: '远雷细雨',
    short: '远雷',
    icon: './assets/rain_cushion.webp?v=hd60',
    rgb: '236, 236, 244',
    mix: '细雨 · 很远很远的闷雷',
    line: '远远的雷声咕噜咕噜的，别怕，我抱着坐垫陪你~'
  },
  {
    id: 'breeze',
    name: '雨后微风',
    short: '微风',
    icon: './assets/vfx_season_summer.webp?v=hd60',
    rgb: '238, 246, 240',
    mix: '雨后微风 · 风铃叮当',
    line: '雨停啦，风铃被微风吹得叮叮当当~'
  }
];
const RAIN_WEATHER_BY_ID = Object.fromEntries(RAIN_WEATHERS.map((w) => [w.id, w]));

const RAIN_VOLUMES = [
  { id: 'soft', name: '轻', mult: 0.6 },
  { id: 'mid', name: '中', mult: 1 },
  { id: 'deep', name: '浓', mult: 1.4 }
];
const RAIN_VOLUME_BY_ID = Object.fromEntries(RAIN_VOLUMES.map((v) => [v.id, v]));

const RAIN_RULES = {
  noteMin: 5,
  dailyNotes: 4,
  coinReward: 5,
  xpReward: 4,
  newEntryCoins: 8,
  calmBonus: 0.05,
  maxSessionMin: 60,
  totalEntries: RAIN_SEGMENTS.length * RAIN_WEATHERS.length
};

function getRainSegment(d = ar15Clock.date()) {
  const h = d.getHours();
  if (h >= 5 && h < 10) return RAIN_SEGMENTS[0];
  if (h >= 10 && h < 16) return RAIN_SEGMENTS[1];
  if (h >= 16 && h < 20) return RAIN_SEGMENTS[2];
  return RAIN_SEGMENTS[3];
}

// 确定性天气轮换：同一本地日期同一时段永远是同一种天气；四个时段互不相同，隔天整体再错开
function getRainWeather(d = ar15Clock.date()) {
  const seg = getRainSegment(d);
  const segIdx = RAIN_SEGMENTS.indexOf(seg);
  const n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const weather = RAIN_WEATHERS[(n * 7 + segIdx * 3) % RAIN_WEATHERS.length];
  return { ...weather, segId: seg.id, segName: seg.name, next: seg.next, entryKey: `${seg.id}_${weather.id}` };
}

// 运行时状态：是否正在听雨 / 本次听雨计时（按可注入时钟累计，满 5 分钟记一则听雨小记）
const rainRun = {
  listening: false,
  weatherId: '',
  lastTickMs: 0,
  accMs: 0,
  sessionMs: 0,
  sessionNotes: 0,
  ring: 0,
  ringSeq: 0,
  helperSeq: 0,
  tickAcc: 0,
  dayKey: '',
  lastAction: '',
  lastResult: null
};

// 运行时状态：当前挑的星座卡 / 转动投影罩对准了几颗星（pick → dial → lit）
const starRun = {
  cardId: '',
  taps: 0,
  phase: 'pick',
  spinFlash: 0,
  helperSeq: 0,
  wasActive: false,
  lastAction: '',
  lastResult: null,
  lastDream: null
};

function getRainStats(refDate = ar15Clock.date()) {
  const rc = player.rainCorner || {};
  const todayKey = formatLocalDateKey(refDate);
  const entries = rc.entries || {};
  const weather = getRainWeather(refDate);
  const found = Object.keys(entries).filter((k) => Number(entries[k]) > 0);
  return {
    todayKey,
    weather,
    segId: weather.segId,
    entries: found.length,
    totalEntries: RAIN_RULES.totalEntries,
    segFound: RAIN_WEATHERS.filter((w) => Number(entries[`${weather.segId}_${w.id}`]) > 0).length,
    totalNotes: Math.max(0, Number(rc.totalNotes) || 0),
    totalMins: Math.max(0, Number(rc.totalMins) || 0),
    rewardsToday: rc.rewardDate === todayKey ? Math.max(0, Number(rc.rewardCount) || 0) : 0,
    dailyNotes: RAIN_RULES.dailyNotes,
    listening: Boolean(rainRun.listening),
    sessionMins: Math.floor((rainRun.sessionMs || 0) / 60000),
    nextNoteMs: rainRun.listening ? Math.max(0, RAIN_RULES.noteMin * 60000 - (rainRun.accMs || 0)) : RAIN_RULES.noteMin * 60000
  };
}

// 听雨安神：日常养成模式里一边听雨，亲密度收获 +5%
function getRainCalmMult() {
  return gameMode === 'pet' && rainRun.listening ? 1 + RAIN_RULES.calmBonus : 1;
}

// AR-16 墙面刺绣绷架 & 地板小暖炉冬日角：规格常量、可注入时钟、运行时状态与统计 / 加成计算同样放在卡片 UI 区段之前声明，
// 周报 / 日记 / 亲密度倍率 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟：当季绣样（本地日期）、暖炉火力（本地月份 + 时段）、依偎 / 小火剩余时间与每日奖励统一读这里，测试固定时间即可完全确定
const ar16Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};

// 8 款季节绣样：每季 2 款（按本地日期取当季可绣的两款，已绣过的绣样任何季节都能再绣）；
// taps = 你要绣的针数（你绣一针、她接一针，一共 taps × 2 针），bestThread = 最搭的绣线（配色灵感 +4 金币），rgb 只用浅奶油色
const EMBROIDERY_PATTERNS = [
  {
    id: 'sakura',
    name: '樱花枝',
    short: '樱花',
    season: 'spring',
    taps: 4,
    bestThread: 'pink',
    rgb: '255, 230, 238',
    story: '一枝樱花斜斜地开在绷布上，像窗外刚刚飘进来的春天~'
  },
  {
    id: 'daisy',
    name: '小雏菊',
    short: '雏菊',
    season: 'spring',
    taps: 3,
    bestThread: 'cream',
    rgb: '255, 246, 216',
    story: '圆圆的小雏菊绣好啦，白白的花瓣围着暖黄的花心~'
  },
  {
    id: 'whale',
    name: '小蓝鲸',
    short: '蓝鲸',
    season: 'summer',
    taps: 4,
    bestThread: 'mist',
    rgb: '228, 238, 250',
    story: '一只小蓝鲸游上了绷布，尾巴还甩起一小朵浪花~'
  },
  {
    id: 'lemon',
    name: '柠檬片',
    short: '柠檬',
    season: 'summer',
    taps: 3,
    bestThread: 'sage',
    rgb: '250, 246, 214',
    story: '清清爽爽的柠檬片，看着就像喝到了一口夏天的汽水~'
  },
  {
    id: 'ginkgo',
    name: '银杏叶',
    short: '银杏',
    season: 'autumn',
    taps: 3,
    bestThread: 'cream',
    rgb: '252, 240, 204',
    story: '小扇子一样的银杏叶，把秋天的阳光都绣进去了~'
  },
  {
    id: 'maple',
    name: '小枫叶',
    short: '枫叶',
    season: 'autumn',
    taps: 4,
    bestThread: 'pink',
    rgb: '255, 230, 218',
    story: '一片暖暖的小枫叶，挂在墙上就像秋天没有走~'
  },
  {
    id: 'snowflake',
    name: '小雪花',
    short: '雪花',
    season: 'winter',
    taps: 4,
    bestThread: 'mist',
    rgb: '236, 242, 252',
    story: '六个角的小雪花，一针一针绣出来，一点都不冷~'
  },
  {
    id: 'mitten',
    name: '毛线手套',
    short: '手套',
    season: 'winter',
    taps: 3,
    bestThread: 'sage',
    rgb: '234, 244, 232',
    story: '一只软乎乎的毛线手套，另一只等明天再绣给你~'
  }
];
const EMBROIDERY_PATTERN_BY_ID = Object.fromEntries(EMBROIDERY_PATTERNS.map((p) => [p.id, p]));
const EMBROIDERY_SEASON_NAMES = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

// 4 种绣线：只用浅奶油色系
const EMBROIDERY_THREADS = [
  { id: 'cream', name: '奶油白', short: '奶油', rgb: '255, 248, 232' },
  { id: 'pink', name: '樱粉线', short: '樱粉', rgb: '255, 228, 236' },
  { id: 'sage', name: '鼠尾草绿', short: '草绿', rgb: '230, 242, 228' },
  { id: 'mist', name: '雾蓝线', short: '雾蓝', rgb: '228, 238, 250' }
];
const EMBROIDERY_THREAD_BY_ID = Object.fromEntries(EMBROIDERY_THREADS.map((t) => [t.id, t]));

const EMBROIDERY_RULES = {
  dailyRewards: 2,
  coinReward: 8,
  xpReward: 6,
  newPatternCoins: 10,
  bestThreadCoins: 4,
  wallMax: 4,
  totalPatterns: EMBROIDERY_PATTERNS.length
};

function getEmbroiderySeasonPatterns(seasonId = getAromaSeasonId(ar16Clock.date())) {
  return EMBROIDERY_PATTERNS.filter((p) => p.season === seasonId);
}

// 运行时状态：当前挑的绣样 / 绣线 / 你绣了几针（pick → stitch → done），不入存档
const embroideryRun = {
  patternId: '',
  threadId: '',
  taps: 0,
  phase: 'pick',
  flash: 0,
  helperSeq: 0,
  lastAction: '',
  lastResult: null
};

function getEmbroideryStats(refDate = ar16Clock.date()) {
  const eh = player.embroideryHoop || {};
  const todayKey = formatLocalDateKey(refDate);
  const patterns = eh.patterns || {};
  const seasonId = getAromaSeasonId(refDate);
  const collectedIds = EMBROIDERY_PATTERNS.filter((p) => Number(patterns[p.id] && patterns[p.id].count) > 0).map((p) => p.id);
  const pattern = EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId];
  return {
    todayKey,
    seasonId,
    seasonPatterns: getEmbroiderySeasonPatterns(seasonId).map((p) => p.id),
    collected: collectedIds.length,
    collectedIds,
    totalPatterns: EMBROIDERY_RULES.totalPatterns,
    wallCount: Array.isArray(eh.wall) ? eh.wall.length : 0,
    totalPieces: Math.max(0, Number(eh.totalPieces) || 0),
    rewardsToday: eh.rewardDate === todayKey ? Math.max(0, Number(eh.rewardCount) || 0) : 0,
    dailyRewards: EMBROIDERY_RULES.dailyRewards,
    stitching: Boolean(pattern && embroideryRun.phase === 'stitch' && embroideryRun.taps > 0),
    taps: embroideryRun.taps,
    need: pattern ? pattern.taps : 0
  };
}

// 地板小暖炉：不联网、不读任何传感器 —— 按本地月份（冬日程度）+ 时段确定性亮起，火力 0 休眠 / 1 小火 / 2 暖火 / 3 旺火
const HEARTH_SEGMENTS = [
  { id: 'dawn', name: '清晨', from: 5, to: 10, next: '10:00' },
  { id: 'day', name: '午后', from: 10, to: 16, next: '16:00' },
  { id: 'dusk', name: '傍晚', from: 16, to: 20, next: '20:00' },
  { id: 'night', name: '夜里', from: 20, to: 5, next: '05:00' }
];

// 冬日程度 × 时段（清晨 / 午后 / 傍晚 / 夜里）→ 火力；暖季（5 ~ 9 月）暖炉休息，可以一起生个 20 分钟的小火
const HEARTH_COLDNESS = [
  { id: 'warm', levels: [0, 0, 0, 0] },
  { id: 'cool', levels: [1, 0, 1, 2] },
  { id: 'chilly', levels: [2, 1, 2, 3] },
  { id: 'deep', levels: [3, 2, 3, 3] }
];
// 本地月份（1 ~ 12 月）→ 冬日程度：12 / 1 / 2 月深冬、11 月初冬、3 月早春、10 / 4 月微凉、5 ~ 9 月暖季
const HEARTH_MONTH_COLD = [3, 3, 2, 1, 0, 0, 0, 0, 0, 1, 2, 3];
const HEARTH_MONTH_TAGS = ['深冬', '深冬', '早春', '微凉', '暖季', '暖季', '暖季', '暖季', '暖季', '微凉', '初冬', '深冬'];

const HEARTH_LEVELS = [
  { id: 'rest', name: '休眠', flips: 0, bonus: 0, rgb: '250, 244, 236', texture: '' },
  { id: 'low', name: '小火', flips: 5, bonus: 0.04, rgb: '255, 242, 224', texture: '软糯' },
  { id: 'warm', name: '暖火', flips: 4, bonus: 0.06, rgb: '255, 234, 212', texture: '金黄' },
  { id: 'blaze', name: '旺火', flips: 3, bonus: 0.08, rgb: '255, 228, 204', texture: '焦香' }
];
const HEARTH_LEVEL_BY_ID = Object.fromEntries(HEARTH_LEVELS.map((l, i) => [l.id, { ...l, index: i }]));

// 4 种炉边松饼口味（同一碟烤松饼贴图，只换柔光色），4 口味 × 3 档火力 = 12 格炉边点心手帐
const HEARTH_SNACKS = [
  { id: 'honey', name: '蜂蜜松饼', short: '蜂蜜', rgb: '255, 238, 206' },
  { id: 'berry', name: '莓果松饼', short: '莓果', rgb: '255, 228, 232' },
  { id: 'cinnamon', name: '肉桂松饼', short: '肉桂', rgb: '250, 232, 214' },
  { id: 'maple', name: '枫糖松饼', short: '枫糖', rgb: '252, 236, 212' }
];
const HEARTH_SNACK_BY_ID = Object.fromEntries(HEARTH_SNACKS.map((s) => [s.id, s]));

const HEARTH_RULES = {
  dailyRewards: 3,
  coinReward: 6,
  newEntryCoins: 8,
  xpBase: 4,
  xpPerLevel: 2,
  cuddleMin: 20,
  kindleMin: 20,
  totalEntries: HEARTH_SNACKS.length * 3
};

function getHearthSegment(d = ar16Clock.date()) {
  const h = d.getHours();
  if (h >= 5 && h < 10) return HEARTH_SEGMENTS[0];
  if (h >= 10 && h < 16) return HEARTH_SEGMENTS[1];
  if (h >= 16 && h < 20) return HEARTH_SEGMENTS[2];
  return HEARTH_SEGMENTS[3];
}

function getHearthAutoLevel(d = ar16Clock.date()) {
  const cold = HEARTH_COLDNESS[HEARTH_MONTH_COLD[d.getMonth()]] || HEARTH_COLDNESS[0];
  return cold.levels[HEARTH_SEGMENTS.indexOf(getHearthSegment(d))] || 0;
}

// 一起生的小火（暖季 / 不冷的时段也能烤点心）：只认 20 分钟以内的合理记录，是否已熄由可注入时钟判断
function getHearthKindle(nowMs = ar16Clock.now()) {
  const k = player.hearthCorner && player.hearthCorner.kindle;
  if (!k || !(Number(k.endMs) > nowMs) || !(Number(k.startMs) <= nowMs)) return null;
  const leftMs = Math.min(HEARTH_RULES.kindleMin * 60000, Number(k.endMs) - nowMs);
  return { startMs: k.startMs, endMs: k.endMs, leftMs, minsLeft: Math.max(1, Math.ceil(leftMs / 60000)) };
}

// 围炉依偎：分着吃完烤松饼后 20 分钟，日常养成的亲密度收获按当时火力 +4% / +6% / +8%
function getHearthCuddle(nowMs = ar16Clock.now()) {
  const c = player.hearthCorner && player.hearthCorner.cuddle;
  if (!c || !(Number(c.endMs) > nowMs) || !(Number(c.startMs) <= nowMs)) return null;
  const lv = HEARTH_LEVELS[Math.max(1, Math.min(3, Math.round(Number(c.level) || 1)))];
  const leftMs = Math.min(HEARTH_RULES.cuddleMin * 60000, Number(c.endMs) - nowMs);
  return {
    level: HEARTH_LEVELS.indexOf(lv),
    levelId: lv.id,
    levelName: lv.name,
    bonus: lv.bonus,
    startMs: c.startMs,
    endMs: c.endMs,
    leftMs,
    minsLeft: Math.max(1, Math.ceil(leftMs / 60000))
  };
}

function getHearthState(d = ar16Clock.date()) {
  const seg = getHearthSegment(d);
  const auto = getHearthAutoLevel(d);
  const kindle = getHearthKindle(d.getTime());
  const level = Math.max(auto, kindle ? 1 : 0);
  const monthTag = HEARTH_MONTH_TAGS[d.getMonth()];
  return {
    seg,
    segId: seg.id,
    auto,
    level,
    levelId: HEARTH_LEVELS[level].id,
    levelName: HEARTH_LEVELS[level].name,
    rgb: HEARTH_LEVELS[level].rgb,
    lit: level > 0,
    kindled: Boolean(kindle) && auto < 1,
    kindle,
    monthTag,
    coldId: (HEARTH_COLDNESS[HEARTH_MONTH_COLD[d.getMonth()]] || HEARTH_COLDNESS[0]).id
  };
}

// 运行时状态：当前挑的口味 / 翻了几次面（pick → roast → shared），不入存档
const snackRun = {
  snackId: '',
  flips: 0,
  phase: 'pick',
  flip: 0,
  helperSeq: 0,
  crackleAcc: 0,
  tickAcc: 0,
  dayKey: '',
  wasLevel: -1,
  wasCuddle: false,
  wasKindle: false,
  lastAction: '',
  lastResult: null
};

function getHearthStats(refDate = ar16Clock.date()) {
  const hc = player.hearthCorner || {};
  const todayKey = formatLocalDateKey(refDate);
  const entries = hc.entries || {};
  const state = getHearthState(refDate);
  const shownLevel = HEARTH_LEVELS[Math.max(1, state.level)];
  const found = Object.keys(entries).filter((k) => Number(entries[k]) > 0);
  return {
    todayKey,
    state,
    level: state.level,
    entries: found.length,
    totalEntries: HEARTH_RULES.totalEntries,
    levelFound: HEARTH_SNACKS.filter((s) => Number(entries[`${s.id}_${shownLevel.id}`]) > 0).length,
    shownLevelId: shownLevel.id,
    totalSnacks: Math.max(0, Number(hc.totalSnacks) || 0),
    totalCuddles: Math.max(0, Number(hc.totalCuddles) || 0),
    rewardsToday: hc.rewardDate === todayKey ? Math.max(0, Number(hc.rewardCount) || 0) : 0,
    dailyRewards: HEARTH_RULES.dailyRewards,
    cuddle: getHearthCuddle(refDate.getTime()),
    roasting: Boolean(HEARTH_SNACK_BY_ID[snackRun.snackId] && snackRun.phase === 'roast' && snackRun.flips > 0)
  };
}

// 冬日亲密加成：日常养成模式里围炉依偎期间，亲密度收获按分着吃时的火力 +4% / +6% / +8%
function getHearthCuddleMult() {
  if (gameMode !== 'pet') return 1;
  const c = getHearthCuddle();
  return c ? 1 + c.bonus : 1;
}

// AR-17 季节换装衣橱 & 睡前故事书：规格常量、可注入时钟、运行时状态与统计同样放在卡片 UI 区段之前声明，
// 周报 / 日记 / 晚安八音盒结算在模块初始化期间调用时不会触发 TDZ
const ar17Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};

// 8 套季节套组：每季 2 套（按本地日期取当季可换的两套，换过的套组任何季节都能再换）；
// items 只用她已有的配饰贴图（item_*），再配一圈当季小特效（vfx_season_*）——不新造立绘、不改人物主体贴图
const WARDROBE_OUTFITS = [
  { id: 'sakura_bow', name: '樱花蝴蝶结', short: '樱结', season: 'spring', items: ['bow'], rgb: '255, 230, 238', line: '樱粉蝴蝶结配一阵花瓣，春天跟着我转圈圈~' },
  { id: 'spring_wreath', name: '春日花环', short: '春环', season: 'spring', items: ['star_wreath', 'shell_clip'], rgb: '250, 244, 226', line: '花环戴好、贝壳夹别上，去春游也不怕~' },
  { id: 'seaside_shell', name: '海边贝壳', short: '贝壳', season: 'summer', items: ['shell_clip'], rgb: '226, 240, 250', line: '一枚贝壳发卡就是一整片夏天的海~' },
  { id: 'summer_starlight', name: '夏夜星光', short: '夏星', season: 'summer', items: ['shell_clip', 'aura'], rgb: '232, 236, 252', line: '脚下一圈星光，夏夜散步就靠它照路啦~' },
  { id: 'maple_crown', name: '枫叶小皇冠', short: '枫冠', season: 'autumn', items: ['crown'], rgb: '255, 232, 214', line: '小皇冠配落叶，今天是秋天的小公主~' },
  { id: 'autumn_reader', name: '秋日书香', short: '书香', season: 'autumn', items: ['bow', 'star_wreath'], rgb: '252, 240, 210', line: '花环加蝴蝶结，适合抱本书窝在窗边~' },
  { id: 'snow_crown', name: '雪夜小皇冠', short: '雪冠', season: 'winter', items: ['crown', 'aura'], rgb: '236, 242, 252', line: '雪花落在小皇冠上，一闪一闪的~' },
  { id: 'first_snow', name: '初雪花环', short: '初雪', season: 'winter', items: ['star_wreath', 'bow'], rgb: '240, 246, 250', line: '初雪那天就要戴花环，许个暖暖的愿~' }
];
const WARDROBE_OUTFIT_BY_ID = Object.fromEntries(WARDROBE_OUTFITS.map((o) => [o.id, o]));
const WARDROBE_SEASON_NAMES = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
// 套组里可能出现的头饰 / 足底光阵：换装时只替换这几样的画面，软垫等其它装扮照旧
const WARDROBE_LOOK_KEYS = ['bow', 'crown', 'aura', 'shell_clip', 'star_wreath'];
const WARDROBE_ITEM_ART = {
  bow: { name: '蝴蝶结', img: './assets/item_bow.webp?v=hd60' },
  crown: { name: '小皇冠', img: './assets/item_crown.webp?v=hd60' },
  aura: { name: '星光光环', img: './assets/item_aura.webp?v=hd6' },
  shell_clip: { name: '贝壳发卡', img: './assets/item_shell_clip.webp?v=hd60' },
  star_wreath: { name: '星梦花环', img: './assets/item_star_wreath.webp?v=hd60' }
};
const WARDROBE_SEASON_ART = {
  spring: './assets/vfx_season_spring.webp?v=hd60',
  summer: './assets/vfx_season_summer.webp?v=hd60',
  autumn: './assets/vfx_season_autumn.webp?v=hd60',
  winter: './assets/vfx_season_winter.webp?v=hd60'
};
const WARDROBE_RULES = {
  dailyRewards: 2,
  coinReward: 6,
  xpReward: 5,
  newOutfitCoins: 10,
  totalOutfits: WARDROBE_OUTFITS.length
};

// 运行时状态：衣橱里正在看的套组（预览，不入存档）
const wardrobeRun = {
  previewId: '',
  helperSeq: 0,
  lastAction: '',
  lastResult: null
};

function getWardrobeSeasonOutfits(seasonId = getAromaSeasonId(ar17Clock.date())) {
  return WARDROBE_OUTFITS.filter((o) => o.season === seasonId);
}

function getWardrobeStats(refDate = ar17Clock.date()) {
  const wd = player.seasonWardrobe || {};
  const todayKey = formatLocalDateKey(refDate);
  const outfits = wd.outfits || {};
  const seasonId = getAromaSeasonId(refDate);
  const collectedIds = WARDROBE_OUTFITS.filter((o) => Number(outfits[o.id] && outfits[o.id].count) > 0).map((o) => o.id);
  return {
    todayKey,
    seasonId,
    seasonOutfits: getWardrobeSeasonOutfits(seasonId).map((o) => o.id),
    collected: collectedIds.length,
    collectedIds,
    totalOutfits: WARDROBE_RULES.totalOutfits,
    wearing: WARDROBE_OUTFIT_BY_ID[wd.wearing] ? wd.wearing : '',
    totalChanges: Math.max(0, Number(wd.totalChanges) || 0),
    rewardsToday: wd.rewardDate === todayKey ? Math.max(0, Number(wd.rewardCount) || 0) : 0,
    dailyRewards: WARDROBE_RULES.dailyRewards
  };
}

// 换装画面：穿着套组时，头饰 / 足底光阵只画套组里的那几样（软垫等其它装扮由 sprites 照旧按已穿戴画）；没在换装就照常画已穿戴的饰品（加成永远只看 player.equipped）
function getWardrobeLook(wearingId = player.seasonWardrobe && player.seasonWardrobe.wearing) {
  const of = WARDROBE_OUTFIT_BY_ID[wearingId];
  if (!of) return null;
  const look = {};
  for (const k of WARDROBE_LOOK_KEYS) look[k] = of.items.includes(k);
  return look;
}

// 6 篇睡前小故事：每篇 3 页（你翻一页、她读一页），读完夹上这篇的书签；rgb 只用浅奶油色
const BEDTIME_STORIES = [
  {
    id: 'whale_lullaby',
    name: '小蓝鲸的摇篮曲',
    short: '蓝鲸',
    rgb: '228, 238, 250',
    pages: ['海底最深的地方，住着一只睡不着的小蓝鲸。', '月亮把光放进海里，替它轻轻哼起摇篮曲。', '小蓝鲸吐了一串泡泡，泡泡里全是好梦。']
  },
  {
    id: 'moon_bakery',
    name: '月亮面包店',
    short: '面包',
    rgb: '255, 240, 214',
    pages: ['夜里十点，月亮面包店的烤箱亮起来了。', '店长把星星屑撒在奶油面包上，香香甜甜。', '天亮前，每家窗台都多了一个暖乎乎的面包。']
  },
  {
    id: 'star_postman',
    name: '星星邮差',
    short: '邮差',
    rgb: '250, 244, 222',
    pages: ['星星邮差背着小邮包，挨家挨户送晚安信。', '有一封信写着：今天辛苦啦，早点睡哦。', '收到信的人，梦里都会看见一颗流星。']
  },
  {
    id: 'cloud_pillow',
    name: '云朵枕头',
    short: '云朵',
    rgb: '240, 244, 252',
    pages: ['一朵小云飘累了，落在窗边变成了枕头。', '枕上去软软的，还带着太阳晒过的味道。', '睡醒的时候，小云又飘回天上去玩啦。']
  },
  {
    id: 'snow_lantern',
    name: '雪夜小灯笼',
    short: '灯笼',
    rgb: '255, 236, 226',
    pages: ['下雪的晚上，小狐狸提着一盏小灯笼回家。', '灯笼照亮了雪地上一串小小的脚印。', '原来是好朋友一路送它，到家门口才回去。']
  },
  {
    id: 'teacup_kitten',
    name: '茶杯里的小猫',
    short: '小猫',
    rgb: '252, 236, 240',
    pages: ['一只小猫钻进了暖暖的茶杯里打盹。', '它梦见自己泡进牛奶海，喝了一大口。', '醒来时，主人正笑着摸它的小脑袋。']
  }
];
const BEDTIME_STORY_BY_ID = Object.fromEntries(BEDTIME_STORIES.map((s) => [s.id, s]));

// 睡前（本地 20:00 ~ 次日 05:00）读完故事会留下 90 分钟晚安余温：这期间完成晚安八音盒伴眠，另外 +12 金币 +8 亲密，每天最多 1 次
// （独立加成，不改好梦章 / 星空投影原有的结算数值）
const STORY_RULES = {
  dailyRewards: 2,
  coinReward: 6,
  xpReward: 6,
  newBookmarkCoins: 10,
  bedStartHour: 20,
  bedEndHour: 5,
  glowMin: 90,
  goodnightCoins: 12,
  goodnightXp: 8,
  goodnightDaily: 1,
  totalStories: BEDTIME_STORIES.length
};

// 运行时状态：当前挑的故事 / 翻到第几页（pick → read → done），不入存档
const storyRun = {
  storyId: '',
  page: 0,
  phase: 'pick',
  flip: 0,
  helperSeq: 0,
  tickAcc: 0,
  dayKey: '',
  wasGlow: false,
  lastAction: '',
  lastResult: null
};

function isStoryBedtime(d = ar17Clock.date()) {
  const h = d.getHours();
  return h >= STORY_RULES.bedStartHour || h < STORY_RULES.bedEndHour;
}

// 今晚推荐的故事：按本地日期轮换（不联网，同一天同一篇）
function getTonightStory(d = ar17Clock.date()) {
  const dayIdx = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
  return BEDTIME_STORIES[((dayIdx % BEDTIME_STORIES.length) + BEDTIME_STORIES.length) % BEDTIME_STORIES.length];
}

function getStoryGlow(nowMs = ar17Clock.now()) {
  const g = player.bedtimeStorybook && player.bedtimeStorybook.glow;
  if (!g || !(Number(g.endMs) > nowMs) || !(Number(g.startMs) <= nowMs)) return null;
  const so = BEDTIME_STORY_BY_ID[g.storyId];
  if (!so) return null;
  const leftMs = Math.min(STORY_RULES.glowMin * 60000, Number(g.endMs) - nowMs);
  return { storyId: so.id, name: so.name, short: so.short, rgb: so.rgb, startMs: g.startMs, endMs: g.endMs, leftMs, minsLeft: Math.max(1, Math.ceil(leftMs / 60000)) };
}

function getStorybookStats(refDate = ar17Clock.date()) {
  const sb = player.bedtimeStorybook || {};
  const todayKey = formatLocalDateKey(refDate);
  const bookmarks = sb.bookmarks || {};
  const collectedIds = BEDTIME_STORIES.filter((s) => Number(bookmarks[s.id] && bookmarks[s.id].count) > 0).map((s) => s.id);
  const so = BEDTIME_STORY_BY_ID[storyRun.storyId];
  return {
    todayKey,
    bedtime: isStoryBedtime(refDate),
    tonightId: getTonightStory(refDate).id,
    collected: collectedIds.length,
    collectedIds,
    totalStories: STORY_RULES.totalStories,
    starlit: BEDTIME_STORIES.filter((s) => bookmarks[s.id] && bookmarks[s.id].starlit).length,
    totalRead: Math.max(0, Number(sb.totalStories) || 0),
    totalGoodnights: Math.max(0, Number(sb.totalGoodnights) || 0),
    rewardsToday: sb.rewardDate === todayKey ? Math.max(0, Number(sb.rewardCount) || 0) : 0,
    dailyRewards: STORY_RULES.dailyRewards,
    goodnightToday: sb.goodnightDate === todayKey ? 1 : 0,
    glow: getStoryGlow(refDate.getTime()),
    reading: Boolean(so && storyRun.phase === 'read' && storyRun.page > 0),
    page: storyRun.page,
    pages: so ? so.pages.length : 0
  };
}
// [[split end]]
export {
  TERRARIUM_XP_THRESHOLDS,
  TERRARIUM_SPECS,
  getTerrariumStageLabel,
  getBotanicalBlessings,
  COLLAGE_FRAME_STYLES,
  COLLAGE_STICKER_SPECS,
  COLLAGE_LAYOUT_PRESETS,
  getCollageLuckBlessing,
  CROCHET_YARN_COSTS,
  CROCHET_KNIT_SPECS,
  getCrochetStageLabel,
  getCrochetWarmGuard,
  HOT_COCOA_BASES,
  HOT_COCOA_TOPPINGS,
  HOT_COCOA_BLENDS,
  getHotCocoaBlend,
  getActiveHotCocoaBuff,
  grantInteractiveCareYarnDrop,
  PRESSED_PETAL_COSTS,
  PRESSED_BOOKMARK_IDS,
  PRESSED_BOOKMARK_SPECS,
  getPressedStageLabel,
  getPressedFlowerBlessing,
  grantPressedFlowerDrop,
  CONSTELLATION_SPECS,
  CONSTELLATION_BY_ID,
  getStargazeDecoys,
  getStarGuidanceBonus,
  WATERCOLOR_SUBJECTS,
  WATERCOLOR_PALETTES,
  WATERCOLOR_SUBJECT_BY_ID,
  WATERCOLOR_PALETTE_BY_ID,
  getWatercolorComboId,
  getWatercolorOverlayBox,
  getWatercolorOverlayStyle,
  getWatercolorFocusWard,
  MAILBOX_STAMP_SPECS,
  getMailboxHeartfeltBonus,
  getMailboxShiftXpMult,
  BENTO_FILLINGS,
  BENTO_SIDES,
  BENTO_SIDE_PAIRS,
  BENTO_FILLING_BY_ID,
  BENTO_SIDE_BY_ID,
  BENTO_BAG_MAX,
  BENTO_RESCUE_THRESHOLD,
  getBentoPairId,
  getBentoKitchenStats,
  getBentoLunchWard,
  MEMORY_WALL_MAX,
  MEMORY_PUZZLE_GRID,
  MEMORY_PUZZLE_PIECES,
  getMemoryPuzzleBonus,
  getMemoryPuzzleCoinMult,
  ar12Clock,
  ar12Random,
  makeAr12SeededRandom,
  KITTEN_SPECS,
  KITTEN_BY_ID,
  KITTEN_AFFECTION_MAX,
  KITTEN_TIERS,
  KITTEN_VISIT_RULES,
  getKittenTier,
  getKittenCornerStats,
  getKittenLuckWard,
  CARD_BASES,
  CARD_BASE_BY_ID,
  CARD_STICKERS,
  CARD_UNIVERSAL_STICKERS,
  CARD_OCCASIONS,
  CARD_OCCASION_BY_ID,
  CARD_ALBUM_MAX,
  CARD_DAILY_REWARDS,
  resolveCardOccasion,
  getGreetingCardBlessing,
  getGreetingCardShiftXpMult,
  ar13Clock,
  AR13_WEEKDAY_NAMES,
  PICNIC_FOODS,
  PICNIC_FOOD_BY_ID,
  PICNIC_SPOTS,
  PICNIC_SPOT_BY_ID,
  PICNIC_RULES,
  isPicnicWeekend,
  getPicnicWeekendKey,
  getDaysUntilPicnicWeekend,
  getPicnicAnticipation,
  getPicnicWardValues,
  describePicnicWard,
  describePicnicWardShort,
  getPicnicStats,
  getPicnicShiftWard,
  getPicnicCoinMult,
  DIARY_STICKERS,
  DIARY_BASE_STICKERS,
  DIARY_MEMORY_STICKERS,
  DIARY_RULES,
  DIARY_LINE_SPECS,
  DIARY_COUNTER_KEYS,
  getJournalDayActivityTotal,
  getDiaryPageKeys,
  getDiaryStats,
  ar14Clock,
  POTTERY_SHAPES,
  POTTERY_SHAPE_BY_ID,
  POTTERY_GLAZES,
  POTTERY_GLAZE_BY_ID,
  POTTERY_RULES,
  getPotteryComboCount,
  getPotteryWardValues,
  describePotteryWard,
  describePotteryWardShort,
  getPotteryStats,
  getPotteryShiftWard,
  getPotteryCoinMult,
  getPotteryMagnetMult,
  getPotteryDamageMult,
  AROMA_SEASONS,
  AROMA_MOODS,
  AROMA_MOOD_BY_ID,
  AROMA_RULES,
  getAromaSeasonId,
  getAromaRecipe,
  getActiveAroma,
  getAromaAffectionMult,
  getAromaStats,
  ar15Clock,
  STAR_CARDS,
  STAR_CARD_BY_ID,
  STAR_SEASON_NAMES,
  STAR_RULES,
  isStarBedtime,
  getStarSeasonCards,
  getActiveProjection,
  getStarStats,
  getStarGoodnightMult,
  RAIN_SEGMENTS,
  RAIN_WEATHERS,
  RAIN_WEATHER_BY_ID,
  RAIN_VOLUMES,
  RAIN_VOLUME_BY_ID,
  RAIN_RULES,
  getRainSegment,
  getRainWeather,
  rainRun,
  starRun,
  getRainStats,
  getRainCalmMult,
  ar16Clock,
  EMBROIDERY_PATTERNS,
  EMBROIDERY_PATTERN_BY_ID,
  EMBROIDERY_SEASON_NAMES,
  EMBROIDERY_THREADS,
  EMBROIDERY_THREAD_BY_ID,
  EMBROIDERY_RULES,
  getEmbroiderySeasonPatterns,
  embroideryRun,
  getEmbroideryStats,
  HEARTH_SEGMENTS,
  HEARTH_COLDNESS,
  HEARTH_MONTH_COLD,
  HEARTH_MONTH_TAGS,
  HEARTH_LEVELS,
  HEARTH_LEVEL_BY_ID,
  HEARTH_SNACKS,
  HEARTH_SNACK_BY_ID,
  HEARTH_RULES,
  getHearthSegment,
  getHearthAutoLevel,
  getHearthKindle,
  getHearthCuddle,
  getHearthState,
  snackRun,
  getHearthStats,
  getHearthCuddleMult,
  ar17Clock,
  WARDROBE_OUTFITS,
  WARDROBE_OUTFIT_BY_ID,
  WARDROBE_SEASON_NAMES,
  WARDROBE_ITEM_ART,
  WARDROBE_SEASON_ART,
  WARDROBE_RULES,
  wardrobeRun,
  getWardrobeSeasonOutfits,
  getWardrobeStats,
  getWardrobeLook,
  BEDTIME_STORIES,
  BEDTIME_STORY_BY_ID,
  STORY_RULES,
  storyRun,
  isStoryBedtime,
  getTonightStory,
  getStoryGlow,
  getStorybookStats
};
