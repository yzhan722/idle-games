// drawer.js — 食堂 / 小铺 / 相册抽屉：商品表与列表渲染
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
  playSfx,
  savePetState,
  player,
  ROOM_THEMES,
  WINDOW_PERIOD_SPECS,
  WINDOW_SEASON_SPECS,
  INTIMACY_MILESTONES,
  setRoomTheme,
  setPlayerEmote,
  addAffectionXp,
  syncPlacedFurniture,
  drawerItemsEl,
  activeDrawerTab,
  closeDrawer,
  bindCardTap,
  spawnFoodDrop,
  renderAlbumWallInDrawer,
  updateToyBtnLabel
} from './game.js?v=hd60';
import {
  petAudio
} from './audio.js?v=hd31';
import {
  getBotanicalBlessings,
  getCrochetWarmGuard,
  getActiveHotCocoaBuff,
  getStarGuidanceBonus,
  getWatercolorFocusWard,
  getMailboxHeartfeltBonus,
  getBentoKitchenStats,
  getMemoryPuzzleBonus,
  ar12Clock,
  KITTEN_BY_ID,
  getKittenCornerStats,
  resolveCardOccasion,
  getGreetingCardBlessing,
  PICNIC_RULES,
  getPicnicStats,
  describePotteryWardShort,
  getPotteryStats,
  AROMA_SEASONS,
  getAromaStats,
  STAR_SEASON_NAMES,
  getStarStats,
  getRainStats,
  EMBROIDERY_SEASON_NAMES,
  getEmbroideryStats,
  getHearthStats,
  WARDROBE_OUTFIT_BY_ID,
  WARDROBE_SEASON_NAMES,
  getWardrobeStats
} from './data-room.js?v=hd60';
import {
  getShiftBadgeTitle
} from './mode-survivor.js?v=hd60';
import {
  setWindowAmbienceState,
  openTeatimeCard,
  openTerrariumCard,
  openGoodnightCard
} from './room-ar04-06.js?v=hd60';
import {
  openCozyRadioCard,
  openCrochetCard,
  openHotCocoaCard,
  openTelescopeCard
} from './room-ar07-09.js?v=hd60';
import {
  openWatercolorCard,
  openMailboxCard,
  openBentoKitchenCard,
  openMemoryPuzzleCard
} from './room-ar10-11.js?v=hd60';
import {
  openKittenCornerCard,
  openGreetingCraftCard,
  openPicnicBasketCard
} from './room-ar12-13.js?v=hd60';
import {
  openPotteryWheelCard,
  openAromaTableCard,
  openStarProjectorCard,
  openRainCornerCard
} from './room-ar14-15.js?v=hd60';
import {
  openEmbroideryCard,
  openHearthCard,
  openWardrobeCard
} from './room-ar16-17.js?v=hd60';

// [[split 9]]

// ================= 喂食食堂 & 鲸鱼小铺（商店模块） =================
const FOOD_CATALOG = [
  {
    id: 'rice',
    ico: '',
    img: './assets/food_rice.webp?v=hd60',
    name: '大碗白米饭',
    desc: '亲密+18 · 体力+15 免费管饱',
    price: 0,
    hunger: 25,
    xp: 18,
    hp: 15,
    buffMult: 1,
    buffSec: 0,
    emote: '白米饭最香啦 ^w^!'
  },
  {
    id: 'tea',
    ico: '',
    img: './assets/food_tea.webp?v=hd60',
    name: '冰镇乌龙茶',
    desc: '体力+40 · 打工×1.2 (45s)',
    price: 15,
    hunger: 20,
    xp: 28,
    hp: 40,
    buffMult: 1.2,
    buffSec: 45,
    emote: '吨吨吨~ 清爽回神!'
  },
  {
    id: 'bento',
    ico: '',
    img: './assets/food_bento.webp?v=hd60',
    name: '黄金炸虾便当',
    desc: '亲密+52 · 打工×1.5 (60s)',
    price: 35,
    hunger: 50,
    xp: 52,
    hp: 50,
    buffMult: 1.5,
    buffSec: 60,
    emote: '哇！豪华炸虾便当!!'
  },
  {
    id: 'cake',
    ico: '',
    img: './assets/food_cake.webp?v=hd60',
    name: '海盐芝士蛋糕',
    desc: '全满恢复 · 打工×2.0 (90s)',
    price: 60,
    hunger: 75,
    xp: 95,
    hp: 100,
    buffMult: 2.0,
    buffSec: 90,
    emote: '幸福感爆棚 >w< '
  }
];

const DRESS_CATALOG = [
  {
    id: 'furn_lamp',
    isFurniture: true,
    furnKey: 'lamp',
    ico: '',
    img: './assets/furn_lamp.webp?v=hd60',
    name: '星海感应小夜灯',
    desc: '暗光自亮 · 亲密获取+25%',
    price: 45
  },
  {
    id: 'furn_pc',
    isFurniture: true,
    furnKey: 'pc',
    ico: '',
    img: './assets/furn_pc.webp?v=hd60',
    name: '深海码农工位',
    desc: '摆在桌面 · 自动敲代码持续产金币',
    price: 55
  },
  {
    id: 'furn_tree',
    isFurniture: true,
    furnKey: 'tree',
    ico: '',
    img: './assets/furn_tree.webp?v=hd4',
    name: '蓝鲸云端猫爬架',
    desc: '摆在桌面 · 真实可攀爬双层跳台',
    price: 65
  },
  {
    id: 'furn_musicbox',
    isFurniture: true,
    furnKey: 'musicbox',
    milestoneLv: 5,
    ico: '',
    img: './assets/furn_musicbox.webp?v=hd31',
    name: '星梦八音盒唱片机',
    desc: 'LV.5 解锁 · 轻点切换3首治愈八音盒曲目',
    price: 0
  },
  {
    id: 'toy_yarn',
    isToy: true,
    toyKey: 'yarn',
    ico: '',
    img: './assets/toy_yarn.webp?v=hd60',
    name: '猫薄荷毛线球',
    desc: '彩虹尾迹 · 追球移速+35%',
    price: 65
  },
  {
    id: 'toy_duck',
    isToy: true,
    toyKey: 'duck',
    ico: '',
    img: './assets/toy_duck.webp?v=hd60',
    name: '水手小黄鸭',
    desc: '嘎嘎音波 · 弹跳震飞小怪',
    price: 95
  },
  {
    id: 'cushion',
    ico: '',
    img: './assets/prop_cushion.webp?v=hd60',
    name: '蓝鲸软垫窝',
    desc: '休息时铺垫 · 回血加速',
    price: 80
  },
  {
    id: 'bow',
    ico: '',
    img: './assets/item_bow.webp?v=hd60',
    name: '樱粉蝴蝶结',
    desc: '头顶发饰 · 摸头亲密翻倍',
    price: 100
  },
  {
    id: 'crown',
    ico: '',
    img: './assets/item_crown.webp?v=hd60',
    name: '迷你小皇冠',
    desc: '头顶皇冠 · 打工金币+25%',
    price: 140
  },
  {
    id: 'aura',
    ico: '',
    img: './assets/item_aura.webp?v=hd6',
    name: '星光光环',
    desc: '足底光阵 · 全屏吸金币',
    price: 220
  },
  {
    id: 'shell_clip',
    milestoneLv: 3,
    ico: '',
    img: './assets/item_shell_clip.webp?v=hd60',
    name: '星海贝壳发卡',
    desc: 'LV.3 解锁 · 互动亲密经验+20%',
    price: 0
  },
  {
    id: 'star_wreath',
    milestoneLv: 8,
    ico: '',
    img: './assets/item_star_wreath.webp?v=hd60',
    name: '深海星梦花环',
    desc: 'LV.8 解锁 · 打工金币与亲密+15%',
    price: 0
  }
];

const UPGRADE_CATALOG = [
  {
    id: 'blaster',
    ico: '',
    img: './assets/upg_blaster.webp?v=hd60',
    name: '水弹连发',
    desc: '提升幸存者水弹威力与弹道',
    basePrice: 40
  },
  {
    id: 'teaBlade',
    ico: '',
    img: './assets/upg_blade.webp?v=hd60',
    name: '茶刃护体',
    desc: '增加环绕飞叶数量与伤害',
    basePrice: 45
  },
  {
    id: 'magnet',
    ico: '',
    img: './assets/upg_magnet.webp?v=hd60',
    name: '招财磁铁',
    desc: '幸存者爆金币收益+15%/级',
    basePrice: 50
  },
  {
    id: 'boots',
    ico: '',
    img: './assets/upg_boots.webp?v=hd60',
    name: '轻巧跑鞋',
    desc: '提升移动速度与连跳次数',
    basePrice: 55
  }
];
// [[split 10]]

function renderThumbHtml(item) {
  if (item.img) {
    return `<div class="shop-thumb-wrap"><img src="${item.img}" alt="" class="shop-thumb" /></div>`;
  }
  return `<div class="shop-thumb-wrap"><span class="shop-ico">${item.ico}</span></div>`;
}

function renderDrawerItems() {
  drawerItemsEl.innerHTML = '';
  drawerItemsEl.classList.toggle('is-album-tab', activeDrawerTab === 'album');
  if (activeDrawerTab === 'food') {
    const teaBanner = document.createElement('button');
    teaBanner.type = 'button';
    teaBanner.className = 'shop-card';
    teaBanner.innerHTML = `
      <div class="shop-thumb-wrap"><img src="./assets/ui_btn_teatime.webp?v=hd60" alt="" class="shop-thumb" /></div>
      <div class="shop-info">
        <span class="shop-name">治愈下午茶甜点手作台 <em class="shop-tag-pill">特调 ${Object.keys(player.afternoonTea?.discoveredRecipes || {}).length}/9</em></span>
        <span class="shop-desc">自由组合鲜萃茶底与现烤甜点，解锁全图鉴并激活幸存者打工增益!</span>
      </div>
      <span class="shop-price">前往调配</span>
    `;
    bindCardTap(teaBanner, () => {
      openTeatimeCard();
    });
    drawerItemsEl.appendChild(teaBanner);
    for (const item of FOOD_CATALOG) {
      const canAffordFood = item.price <= 0 || player.coins >= item.price;
      const card = document.createElement('button');
      card.className = `shop-card ${canAffordFood ? '' : 'unaffordable'}`.trim();
      const priceLabel =
        item.price === 0
          ? '免费投喂'
          : `${item.price} <img src="./assets/ui_coin.webp?v=hd60" alt="" class="inline-coin-ico" />`;
      card.innerHTML = `
        ${renderThumbHtml(item)}
        <div class="shop-info">
          <span class="shop-name">${item.name} <em class="shop-tag-pill">饱食+${item.hunger}</em></span>
          <span class="shop-desc">${item.desc}</span>
        </div>
        <span class="shop-price">${priceLabel}</span>
      `;
      bindCardTap(card, () => {
        if (player.coins < item.price) {
          setPlayerEmote('金币不够啦，去『幸存者打工』赚金币吧!', 2.2);
          return;
        }
        if (item.price > 0) {
          player.coins -= item.price;
          savePetState();
        }
        spawnFoodDrop(item);
        closeDrawer();
      });
      drawerItemsEl.appendChild(card);
    }
    const cocoaBanner = document.createElement('button');
    cocoaBanner.type = 'button';
    cocoaBanner.className = 'shop-card';
    cocoaBanner.dataset.ar8FoodShortcut = 'cocoa';
    cocoaBanner.innerHTML = `
      <div class="shop-thumb-wrap"><img src="./assets/ui_btn_cocoa_bar.webp?v=hd60" alt="" class="shop-thumb" /></div>
      <div class="shop-info">
        <span class="shop-name">暖冬棉花糖热可可吧台 <em class="shop-tag-pill">特调 ${Object.keys(player.hotCocoa?.discoveredBlends || {}).length}/6</em></span>
        <span class="shop-desc">自由调配可可基底与烤星芒棉花糖/肉桂棒，激活幸存者攻速与财运暖意!</span>
      </div>
      <span class="shop-price">前往冲泡</span>
    `;
    bindCardTap(cocoaBanner, () => {
      openHotCocoaCard();
    });
    drawerItemsEl.appendChild(cocoaBanner);
  } else if (activeDrawerTab === 'dress') {
    const themeBlock = document.createElement('div');
    themeBlock.className = 'drawer-section-block';
    themeBlock.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">治愈房间主题 DIY</span>
        <span class="drawer-section-hint">点击切换手绘背景 · 桌面家具可左右拖拽摆位</span>
      </div>
      <div class="room-theme-grid"></div>
    `;
    const themeGrid = themeBlock.querySelector('.room-theme-grid');
    for (const th of ROOM_THEMES) {
      const isCurrent = player.roomTheme === th.id;
      const tBtn = document.createElement('button');
      tBtn.type = 'button';
      tBtn.className = `room-theme-card ${isCurrent ? 'active' : ''}`.trim();
      tBtn.dataset.themeId = th.id;
      tBtn.innerHTML = `
        <img src="${th.thumb}" alt="${th.name}" class="room-theme-thumb" />
        <div class="room-theme-meta">
          <span class="room-theme-name">${th.name}</span>
          <span class="room-theme-sub">${th.subtitle}</span>
        </div>
        <span class="room-theme-state">${isCurrent ? '使用中' : '切换'}</span>
      `;
      bindCardTap(tBtn, () => {
        setRoomTheme(th.id, true);
      });
      themeGrid.appendChild(tBtn);
    }
    drawerItemsEl.appendChild(themeBlock);

    // AR-14 船坞已满 25 键：窗畔陶艺转盘 / 香氛调配台不再加键，并入「家具与装扮」抽屉（紧跟房间主题，陶艺架与房间色温都属于房间装扮）
    const ar14CozyBanner = document.createElement('div');
    ar14CozyBanner.className = 'drawer-section-block ar14-drawer-block';
    const curPottery = getPotteryStats();
    const curAroma = getAromaStats();
    const curAromaSeason = AROMA_SEASONS[curAroma.seasonId];
    ar14CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">窗畔陶艺与香氛调配台</span>
        <span class="drawer-section-hint">拉坯上釉烧成小陶器摆上陶艺架 · 按心情与季节调一瓶房间香氛</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar14-shortcut="pottery">
          <img src="./assets/ui_btn_pottery_wheel.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗畔手作陶艺转盘</span>
            <span class="room-theme-sub">${curPottery.wardCharges > 0 && curPottery.wardGlazeId ? `陶艺佑护 ${curPottery.wardCharges} 班次 · ${describePotteryWardShort(curPottery.wardGlazeId, curPottery.wardShapeId)}` : `陶艺架 ${curPottery.shelfCount} 件 · 图鉴 ${curPottery.combos}/${curPottery.totalCombos}`}</span>
          </div>
          <span class="room-theme-state">拉坯</span>
        </button>
        <button type="button" class="room-theme-card" data-ar14-shortcut="aroma">
          <img src="./assets/ui_btn_aroma_table.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">她的小小香氛调配台</span>
            <span class="room-theme-sub">${curAroma.active ? `${curAroma.active.name} · 还剩 ${curAroma.active.minsLeft} 分` : `当季「${curAromaSeason.note}」 · 图鉴 ${curAroma.discovered}/${curAroma.totalRecipes}`}</span>
          </div>
          <span class="room-theme-state">调香</span>
        </button>
      </div>
    `;
    bindCardTap(ar14CozyBanner.querySelector('[data-ar14-shortcut="pottery"]'), () => {
      openPotteryWheelCard();
      petAudio.playPotteryWheel(0);
    });
    bindCardTap(ar14CozyBanner.querySelector('[data-ar14-shortcut="aroma"]'), () => {
      openAromaTableCard();
      petAudio.playAromaDrop(0);
    });
    drawerItemsEl.appendChild(ar14CozyBanner);

    // AR-15 船坞仍是 25 键、书桌已满：卧室星空投影灯 / 窗边听雨角同样并入「家具与装扮」抽屉（紧跟陶艺香氛块，物件摆在窗边飘台上）
    const ar15CozyBanner = document.createElement('div');
    ar15CozyBanner.className = 'drawer-section-block ar15-drawer-block';
    const curStar = getStarStats();
    const curRain = getRainStats();
    ar15CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">卧室星空灯与窗边听雨角</span>
        <span class="drawer-section-hint">睡前一起点亮星座投影收集星座卡 · 按本地天气时段听白噪音</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar15-shortcut="star">
          <img src="./assets/ui_btn_star_projector.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">卧室星空投影灯</span>
            <span class="room-theme-sub">${curStar.active ? `「${curStar.active.name}」星光 · 还剩 ${curStar.active.minsLeft} 分` : `星座卡 ${curStar.collected}/${curStar.totalCards} · 今晚${STAR_SEASON_NAMES[curStar.seasonId]}夜星空`}</span>
          </div>
          <span class="room-theme-state">点亮</span>
        </button>
        <button type="button" class="room-theme-card" data-ar15-shortcut="rain">
          <img src="./assets/ui_btn_rain_corner.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗边听雨角</span>
            <span class="room-theme-sub">${curRain.listening ? `听雨中 · ${curRain.weather.name}` : `${curRain.weather.segName} · ${curRain.weather.name} · 手帐 ${curRain.entries}/${curRain.totalEntries}`}</span>
          </div>
          <span class="room-theme-state">听雨</span>
        </button>
      </div>
    `;
    bindCardTap(ar15CozyBanner.querySelector('[data-ar15-shortcut="star"]'), () => {
      openStarProjectorCard();
      petAudio.playStarDial(0);
    });
    bindCardTap(ar15CozyBanner.querySelector('[data-ar15-shortcut="rain"]'), () => {
      openRainCornerCard();
      petAudio.playRainChime(0);
    });
    drawerItemsEl.appendChild(ar15CozyBanner);

    // AR-16 船坞仍是 25 键、书桌与窗台都已满：墙面刺绣绷架 / 地板小暖炉冬日角同样并入「家具与装扮」抽屉（紧跟星空听雨块，物件只放墙面与地板）
    const ar16CozyBanner = document.createElement('div');
    ar16CozyBanner.className = 'drawer-section-block ar16-drawer-block';
    const curEmb = getEmbroideryStats();
    const curHearth = getHearthStats();
    ar16CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">墙面刺绣绷架与地板小暖炉</span>
        <span class="drawer-section-hint">和她一起绣季节小图案挂上墙 · 按本地日期与时段亮起的暖炉边烤松饼依偎</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar16-shortcut="embroidery">
          <img src="./assets/ui_btn_embroidery.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">墙面刺绣绷架</span>
            <span class="room-theme-sub">${curEmb.stitching ? `绣到 ${curEmb.taps * 2}/${curEmb.need * 2} 针` : `绣样 ${curEmb.collected}/${curEmb.totalPatterns} · 墙上 ${curEmb.wallCount} 幅 · ${EMBROIDERY_SEASON_NAMES[curEmb.seasonId]}日绣样`}</span>
          </div>
          <span class="room-theme-state">刺绣</span>
        </button>
        <button type="button" class="room-theme-card" data-ar16-shortcut="hearth">
          <img src="./assets/ui_btn_hearth_corner.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">地板小暖炉冬日角</span>
            <span class="room-theme-sub">${curHearth.cuddle ? `围炉依偎 · 还剩 ${curHearth.cuddle.minsLeft} 分` : `${curHearth.state.monthTag} · ${curHearth.state.seg.name} · ${curHearth.state.levelName} · 手帐 ${curHearth.entries}/${curHearth.totalEntries}`}</span>
          </div>
          <span class="room-theme-state">烤点心</span>
        </button>
      </div>
    `;
    bindCardTap(ar16CozyBanner.querySelector('[data-ar16-shortcut="embroidery"]'), () => {
      openEmbroideryCard();
      petAudio.playEmbroideryStitch(0);
    });
    bindCardTap(ar16CozyBanner.querySelector('[data-ar16-shortcut="hearth"]'), () => {
      openHearthCard();
    });
    drawerItemsEl.appendChild(ar16CozyBanner);

    // AR-17 场景已满：季节换装衣橱并入「家具与装扮」抽屉，睡前故事书从手账进（紧跟刺绣暖炉块，不新增场景物件）
    const ar17CozyBanner = document.createElement('div');
    ar17CozyBanner.className = 'drawer-section-block ar17-drawer-block';
    const curWd = getWardrobeStats();
    const curOutfit = WARDROBE_OUTFIT_BY_ID[curWd.wearing];
    ar17CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">季节衣橱</span>
        <span class="drawer-section-hint">按本地季节换套组</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar17-shortcut="wardrobe">
          <img src="./assets/ui_btn_wardrobe.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">季节换装衣橱</span>
            <span class="room-theme-sub">${curOutfit ? `穿着「${curOutfit.name}」 · 衣橱 ${curWd.collected}/${curWd.totalOutfits}` : `衣橱 ${curWd.collected}/${curWd.totalOutfits} · ${WARDROBE_SEASON_NAMES[curWd.seasonId]}季套组`}</span>
          </div>
          <span class="room-theme-state">换装</span>
        </button>
      </div>
    `;
    bindCardTap(ar17CozyBanner.querySelector('[data-ar17-shortcut="wardrobe"]'), () => {
      openWardrobeCard();
    });
    drawerItemsEl.appendChild(ar17CozyBanner);

    const ar6CozyBanner = document.createElement('div');
    ar6CozyBanner.className = 'drawer-section-block';
    const curBot = getBotanicalBlessings();
    ar6CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">花房盆栽架与晚安八音盒</span>
        <span class="drawer-section-hint">绿植摆设加成幸存者打工 · 暖光钢片琴伴眠</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar6-shortcut="terrarium">
          <img src="./assets/ui_btn_terrarium.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">微缩绿植花房</span>
            <span class="room-theme-sub">花架 Lv.${curBot.totalLevel}/15 · 桌面摆设 ${curBot.displayedCount} 盆</span>
          </div>
          <span class="room-theme-state">照料</span>
        </button>
        <button type="button" class="room-theme-card" data-ar6-shortcut="musicbox">
          <img src="./assets/ui_btn_musicbox.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">晚安星空八音盒</span>
            <span class="room-theme-sub">好梦火漆章 ${player.goodnightMusicbox?.totalStamps || 0} 枚 · 柔光摇篮曲</span>
          </div>
          <span class="room-theme-state">开启</span>
        </button>
      </div>
    `;
    bindCardTap(ar6CozyBanner.querySelector('[data-ar6-shortcut="terrarium"]'), () => {
      openTerrariumCard();
    });
    bindCardTap(ar6CozyBanner.querySelector('[data-ar6-shortcut="musicbox"]'), () => {
      openGoodnightCard();
    });
    drawerItemsEl.appendChild(ar6CozyBanner);

    const ar7CozyBanner = document.createElement('div');
    ar7CozyBanner.className = 'drawer-section-block';
    const curRadio = petAudio.getCozyRadioInfo();
    ar7CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">窗畔轻电台</span>
        <span class="drawer-section-hint">3波段原声电台伴听</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card" data-ar7-shortcut="radio">
          <img src="./assets/ui_btn_cozy_radio.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗畔温暖轻电台</span>
            <span class="room-theme-sub">${curRadio.active ? `${curRadio.shortName} · 播音中` : `已收听 ${player.cozyRadio?.totalListenMinutes || 0} 分钟 · 3波段轻音`}</span>
          </div>
          <span class="room-theme-state">调频</span>
        </button>
      </div>
    `;
    bindCardTap(ar7CozyBanner.querySelector('[data-ar7-shortcut="radio"]'), () => {
      openCozyRadioCard();
    });
    drawerItemsEl.appendChild(ar7CozyBanner);

    const ar8CozyBanner = document.createElement('div');
    ar8CozyBanner.className = 'drawer-section-block';
    const curCrochet = getCrochetWarmGuard();
    const curCocoaBuff = getActiveHotCocoaBuff();
    ar8CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">毛线钩针手作篮与棉花糖热可可吧台</span>
        <span class="drawer-section-hint">手作织物木桌展示与减伤护盾 · 热可可攻速财运暖意</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar8-shortcut="crochet">
          <img src="./assets/ui_btn_crochet_basket.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">毛线钩针温暖手作篮</span>
            <span class="room-theme-sub">${curCrochet.active ? `暖绒 Lv.${curCrochet.totalLevel}/9 · 减伤+${Math.round(curCrochet.damageReductionPct * 100)}%` : `毛线 ${player.crochetBasket?.yarnSkeins || 0} 团 · 编织3款暖心织物`}</span>
          </div>
          <span class="room-theme-state">编织</span>
        </button>
        <button type="button" class="room-theme-card" data-ar8-shortcut="cocoa">
          <img src="./assets/ui_btn_cocoa_bar.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">暖冬棉花糖热可可吧台</span>
            <span class="room-theme-sub">${curCocoaBuff ? `${curCocoaBuff.name} · 暖意生效中` : `已解锁 ${Object.keys(player.hotCocoa?.discoveredBlends || {}).length}/6 款冬日可可`}</span>
          </div>
          <span class="room-theme-state">冲泡</span>
        </button>
      </div>
    `;
    bindCardTap(ar8CozyBanner.querySelector('[data-ar8-shortcut="crochet"]'), () => {
      openCrochetCard();
    });
    bindCardTap(ar8CozyBanner.querySelector('[data-ar8-shortcut="cocoa"]'), () => {
      openHotCocoaCard();
    });
    drawerItemsEl.appendChild(ar8CozyBanner);

    const ar9CozyBanner = document.createElement('div');
    ar9CozyBanner.className = 'drawer-section-block';
    const curStarGuide = getStarGuidanceBonus();
    ar9CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">窗畔星夜望远镜</span>
        <span class="drawer-section-hint">观星连座收录星图</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card" data-ar9-shortcut="telescope">
          <img src="./assets/ui_btn_telescope.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗畔星夜天文望远镜</span>
            <span class="room-theme-sub">${curStarGuide.active ? `星图 ${curStarGuide.count}/${curStarGuide.total} 座 · 暴击+${(curStarGuide.critChanceBonus * 100).toFixed(1)}%` : '按序连星辨认6座星座'}</span>
          </div>
          <span class="room-theme-state">观星</span>
        </button>
      </div>
    `;
    bindCardTap(ar9CozyBanner.querySelector('[data-ar9-shortcut="telescope"]'), () => {
      openTelescopeCard();
    });
    drawerItemsEl.appendChild(ar9CozyBanner);

    const ar10CozyBanner = document.createElement('div');
    ar10CozyBanner.className = 'drawer-section-block';
    const curWard = getWatercolorFocusWard();
    const curHeartfelt = getMailboxHeartfeltBonus();
    const curInbox = (player.mailbox?.letters || []).length;
    ar10CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">窗畔水彩画架与小邮差信箱</span>
        <span class="drawer-section-hint">雨天写生挂上墙面画廊 · 手写信笺回信贴邮票</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar10-shortcut="easel">
          <img src="./assets/ui_btn_watercolor_easel.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗畔雨天水彩写生画架</span>
            <span class="room-theme-sub">${curWard.active ? `画廊 ${curWard.gallerySize}/${curWard.total} 幅 · 暴击+${(curWard.critChanceBonus * 100).toFixed(1)}%` : '3 题材 × 3 调色盘雨天写生'}</span>
          </div>
          <span class="room-theme-state">写生</span>
        </button>
        <button type="button" class="room-theme-card" data-ar10-shortcut="mailbox">
          <img src="./assets/ui_btn_mailbox.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">奶油手账小邮差信箱</span>
            <span class="room-theme-sub">${curInbox > 0 ? `待回信 ${curInbox} 封` : curHeartfelt.active ? `已回信 ${curHeartfelt.replies} 封 · 经验+${(curHeartfelt.shiftXpBonusPct * 100).toFixed(1)}%` : '她会定期写来手写信笺'}</span>
          </div>
          <span class="room-theme-state">读信</span>
        </button>
      </div>
    `;
    bindCardTap(ar10CozyBanner.querySelector('[data-ar10-shortcut="easel"]'), () => {
      openWatercolorCard();
    });
    bindCardTap(ar10CozyBanner.querySelector('[data-ar10-shortcut="mailbox"]'), () => {
      openMailboxCard();
    });
    drawerItemsEl.appendChild(ar10CozyBanner);

    const ar11CozyBanner = document.createElement('div');
    ar11CozyBanner.className = 'drawer-section-block';
    const curBento = getBentoKitchenStats();
    const curMemory = getMemoryPuzzleBonus();
    ar11CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">暖灯厨房与回忆拼图</span>
        <span class="drawer-section-hint">一起捏饭团摆便当 · 把合影与画作拼回回忆墙</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar11-shortcut="bento">
          <img src="./assets/ui_btn_bento_kitchen.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">暖灯厨房一起做饭团便当</span>
            <span class="room-theme-sub">${curBento.bagCount > 0 ? `便当袋 ${curBento.bagCount}/${curBento.bagMax} · 下个班次续航回血` : `便当图鉴 ${curBento.discovered}/${curBento.totalRecipes} 款`}</span>
          </div>
          <span class="room-theme-state">下厨</span>
        </button>
        <button type="button" class="room-theme-card" data-ar11-shortcut="puzzle">
          <img src="./assets/ui_btn_memory_puzzle.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">奶油手账回忆拼图时光</span>
            <span class="room-theme-sub">${curMemory.active ? `回忆墙 ${curMemory.wallCount}/${curMemory.total} · 金币+${Math.round(curMemory.coinLuckPct * 100)}%` : '拍立得 / 水彩 / 周报拼成小拼图'}</span>
          </div>
          <span class="room-theme-state">拼图</span>
        </button>
      </div>
    `;
    bindCardTap(ar11CozyBanner.querySelector('[data-ar11-shortcut="bento"]'), () => {
      openBentoKitchenCard();
    });
    bindCardTap(ar11CozyBanner.querySelector('[data-ar11-shortcut="puzzle"]'), () => {
      openMemoryPuzzleCard();
    });
    drawerItemsEl.appendChild(ar11CozyBanner);

    const ar12CozyBanner = document.createElement('div');
    ar12CozyBanner.className = 'drawer-section-block';
    const curKitten = getKittenCornerStats();
    const curCardBless = getGreetingCardBlessing();
    const curOcc = resolveCardOccasion(ar12Clock.date()).occasion;
    ar12CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">窗台小猫与节日贺卡</span>
        <span class="drawer-section-hint">给来串门的小猫添猫粮 · 和她一起剪贴节日手作贺卡</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar12-shortcut="kitten">
          <img src="./assets/ui_btn_kitten_corner.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗台小猫访客喂食角</span>
            <span class="room-theme-sub">${curKitten.visiting ? `${KITTEN_BY_ID[curKitten.visitorId].name} 正在窗台串门` : `图鉴 ${curKitten.met}/${curKitten.totalKittens} · 好感 ${curKitten.totalAffection}/${curKitten.maxAffection}`}</span>
          </div>
          <span class="room-theme-state">喂猫</span>
        </button>
        <button type="button" class="room-theme-card" data-ar12-shortcut="card">
          <img src="./assets/ui_btn_greeting_card.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">奶油手账节日手作贺卡</span>
            <span class="room-theme-sub">${curCardBless.albumCount > 0 ? `收藏 ${curCardBless.albumCount} 张 · 节日 ${curCardBless.occasions}/${curCardBless.totalOccasions}` : `今天是「${curOcc.name}」，一起剪贴贺卡`}</span>
          </div>
          <span class="room-theme-state">剪贴</span>
        </button>
      </div>
    `;
    bindCardTap(ar12CozyBanner.querySelector('[data-ar12-shortcut="kitten"]'), () => {
      openKittenCornerCard();
    });
    bindCardTap(ar12CozyBanner.querySelector('[data-ar12-shortcut="card"]'), () => {
      openGreetingCraftCard();
    });
    drawerItemsEl.appendChild(ar12CozyBanner);

    const ar13CozyBanner = document.createElement('div');
    ar13CozyBanner.className = 'drawer-section-block';
    const curPicnic = getPicnicStats();
    ar13CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">周末野餐</span>
        <span class="drawer-section-hint">周末一起去野餐</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar13-shortcut="picnic">
          <img src="./assets/ui_btn_picnic_basket.webp?v=hd60" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">奶油手账周末野餐篮</span>
            <span class="room-theme-sub">${curPicnic.isWeekend ? (curPicnic.doneToday ? `今天已野餐 · 共 ${curPicnic.totalPicnics} 次` : '今天是周末，一起去野餐吧') : `离周末 ${curPicnic.daysUntil} 天 · 期待章 ${curPicnic.prepDays}/${PICNIC_RULES.prepMax}`}</span>
          </div>
          <span class="room-theme-state">野餐</span>
        </button>
      </div>
    `;
    bindCardTap(ar13CozyBanner.querySelector('[data-ar13-shortcut="picnic"]'), () => {
      openPicnicBasketCard();
    });
    drawerItemsEl.appendChild(ar13CozyBanner);

    // AR-4 四季窗景与昼夜流转 DIY 区块（与左上角窗景手账卡实时同步）
    const ambienceBlock = document.createElement('div');
    ambienceBlock.className = 'drawer-section-block';
    const curAmb = player.windowAmbience;
    ambienceBlock.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">四季窗景与昼夜流转</span>
        <button type="button" class="ambience-auto-btn drawer-amb-auto ${curAmb.autoSync ? 'active' : ''}">
          ${curAmb.autoSync ? '随钟流转中' : '切换为随钟'}
        </button>
      </div>
      <div class="drawer-ambience-period-grid"></div>
      <div class="drawer-ambience-season-grid"></div>
    `;
    const drawerAutoBtn = ambienceBlock.querySelector('.drawer-amb-auto');
    bindCardTap(drawerAutoBtn, () => {
      setWindowAmbienceState({ autoSync: !player.windowAmbience.autoSync }, true);
    });
    const drawerPeriodGrid = ambienceBlock.querySelector('.drawer-ambience-period-grid');
    for (const pSpec of WINDOW_PERIOD_SPECS) {
      const pBtn = document.createElement('button');
      pBtn.type = 'button';
      pBtn.className = `ambience-period-btn ${curAmb.period === pSpec.id ? 'active' : ''}`.trim();
      pBtn.dataset.drawerPeriod = pSpec.id;
      pBtn.innerHTML = `
        <img src="${pSpec.thumb}" alt="${pSpec.label}" class="ambience-win-thumb" />
        <span>${pSpec.label}</span>
      `;
      bindCardTap(pBtn, () => {
        setWindowAmbienceState({ autoSync: false, period: pSpec.id }, true);
      });
      drawerPeriodGrid.appendChild(pBtn);
    }
    const drawerSeasonGrid = ambienceBlock.querySelector('.drawer-ambience-season-grid');
    for (const sSpec of WINDOW_SEASON_SPECS) {
      const sBtn = document.createElement('button');
      sBtn.type = 'button';
      sBtn.className = `ambience-season-btn ${curAmb.season === sSpec.id ? 'active' : ''}`.trim();
      sBtn.dataset.drawerSeason = sSpec.id;
      sBtn.innerHTML = `
        <img src="${sSpec.ico}" alt="${sSpec.name}" class="ambience-season-ico" />
        <span>${sSpec.name}</span>
      `;
      bindCardTap(sBtn, () => {
        setWindowAmbienceState({ autoSync: false, season: sSpec.id }, true);
      });
      drawerSeasonGrid.appendChild(sBtn);
    }
    drawerItemsEl.appendChild(ambienceBlock);

    const milestoneBlock = document.createElement('div');
    milestoneBlock.className = 'drawer-section-block';
    milestoneBlock.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">亲密等级里程碑（当前 LV.${player.level}）</span>
        <span class="drawer-section-hint">达标自动解锁专属互动家具与限定头饰</span>
      </div>
      <div class="milestone-strip"></div>
    `;
    const milestoneStrip = milestoneBlock.querySelector('.milestone-strip');
    for (const ms of INTIMACY_MILESTONES) {
      const unlocked = Boolean(player.ownedDress[ms.itemId] || player.level >= ms.level);
      const pill = document.createElement('div');
      pill.className = `milestone-pill ${unlocked ? 'unlocked' : ''}`.trim();
      pill.dataset.milestoneLv = String(ms.level);
      pill.innerHTML = `
        <img src="${ms.img}" alt="${ms.name}" class="milestone-pill-ico" />
        <div class="milestone-pill-text">
          <span class="milestone-pill-lv">LV.${ms.level} · ${unlocked ? '已解锁' : '待达成'}</span>
          <span class="milestone-pill-name">${ms.name}</span>
        </div>
      `;
      milestoneStrip.appendChild(pill);
    }
    drawerItemsEl.appendChild(milestoneBlock);

    for (const item of DRESS_CATALOG) {
      const owned = !!player.ownedDress[item.id];
      const isMilestoneLocked = Boolean(item.milestoneLv && !owned && player.level < item.milestoneLv);
      const equipped = item.isFurniture
        ? !!(player.placedFurniture && player.placedFurniture[item.furnKey])
        : item.isToy
          ? player.activeToy === item.toyKey
          : !!player.equipped[item.id];
      const canAffordDress = owned || (!isMilestoneLocked && player.coins >= item.price);
      const card = document.createElement('button');
      card.className = `shop-card ${owned ? (equipped ? 'owned' : 'owned-idle') : isMilestoneLocked ? 'is-milestone-locked' : canAffordDress ? '' : 'unaffordable'}`.trim();
      const activeVerb = item.isFurniture ? '已摆放' : item.isToy ? '使用中' : '穿戴中';
      const standbyVerb = item.isFurniture ? '摆放桌面' : item.isToy ? '切换玩具' : '穿戴装扮';
      const statusText = owned
        ? equipped
          ? activeVerb
          : standbyVerb
        : isMilestoneLocked
          ? `LV.${item.milestoneLv} 解锁`
          : `${item.price} <img src="./assets/ui_coin.webp?v=hd60" alt="" class="inline-coin-ico" />`;
      const tagHtml = item.milestoneLv
        ? `<em class="shop-tag-pill shop-tag-milestone">LV.${item.milestoneLv}限定</em>`
        : '';
      card.innerHTML = `
        ${renderThumbHtml(item)}
        <div class="shop-info">
          <span class="shop-name">${item.name} ${tagHtml}</span>
          <span class="shop-desc">${item.desc}</span>
        </div>
        <span class="shop-price">${statusText}</span>
      `;
      bindCardTap(card, () => {
        if (!owned) {
          if (isMilestoneLocked) {
            setPlayerEmote(`亲密度升到 LV.${item.milestoneLv} 就会自动解锁「${item.name}」啦~`, 2.2, 'happy');
            return;
          }
          if (player.coins < item.price) {
            setPlayerEmote('金币不足，快去『幸存者』或『接美食』赚金币~', 2.2);
            return;
          }
          player.coins -= item.price;
          player.ownedDress[item.id] = true;
          if (item.isFurniture) {
            player.placedFurniture[item.furnKey] = {
              xRatio: item.furnKey === 'pc' ? 0.76 : item.furnKey === 'tree' ? 0.36 : item.furnKey === 'musicbox' ? 0.62 : 0.20,
              manualOn: true
            };
            syncPlacedFurniture();
          } else if (item.isToy) {
            player.activeToy = item.toyKey;
            updateToyBtnLabel();
          } else {
            player.equipped[item.id] = true;
          }
          playSfx('star');
          player.happyTimer = 1.8;
          addAffectionXp(35, '新礼物 +35 亲密');
          setPlayerEmote(`收到${item.name}啦，可以拖到桌面任意位置摆放哦 ^w^`, 2.4, 'happy', true);
        } else {
          if (item.isFurniture) {
            if (player.placedFurniture[item.furnKey]) {
              delete player.placedFurniture[item.furnKey];
              setPlayerEmote(`已将 ${item.name} 收回背包`, 1.5);
            } else {
              player.placedFurniture[item.furnKey] = {
                xRatio: item.furnKey === 'pc' ? 0.76 : item.furnKey === 'tree' ? 0.36 : item.furnKey === 'musicbox' ? 0.62 : 0.20,
                manualOn: true
              };
              setPlayerEmote(`已在桌面摆放 ${item.name}（可按住横向拖拽摆位）!`, 1.8, 'happy');
            }
            syncPlacedFurniture();
            playSfx('pat');
          } else if (item.isToy) {
            player.activeToy = player.activeToy === item.toyKey ? 'whale' : item.toyKey;
            updateToyBtnLabel();
            playSfx('pat');
            setPlayerEmote(`已切换玩具：${player.activeToy === 'whale' ? '蓝鲸沙滩球' : item.name}`, 1.5);
          } else {
            player.equipped[item.id] = !player.equipped[item.id];
            playSfx('pat');
            setPlayerEmote(
              player.equipped[item.id] ? `已穿戴 ${item.name}!` : `已收起 ${item.name}`,
              1.5
            );
          }
        }
        savePetState();
        renderDrawerItems();
      });
      drawerItemsEl.appendChild(card);
    }
  } else if (activeDrawerTab === 'upgrade') {
    const rec = player.bestShiftRecord;
    const badgeCard = document.createElement('div');
    badgeCard.className = 'shift-record-banner';
    badgeCard.innerHTML = `
      <img src="./assets/ui_badge_shift.webp?v=hd60" alt="最高班次纪录徽章" />
      <div class="shift-record-meta">
        <span class="shift-record-title">班次荣誉徽章 · ${getShiftBadgeTitle(rec.bestKills)}</span>
        <span>最高击退 ${rec.bestKills} · 单班最高 +${rec.bestCoins} 金币 · 班次 Lv.${rec.bestShiftLv} · 讨伐首领 ${rec.bossesDefeated}</span>
      </div>
    `;
    drawerItemsEl.appendChild(badgeCard);

    for (const item of UPGRADE_CATALOG) {
      const lv = player.weapons[item.id] || 0;
      const cost = Math.round(item.basePrice * Math.pow(1.45, lv));
      const canAffordUpg = player.coins >= cost;
      const card = document.createElement('button');
      card.className = `shop-card ${canAffordUpg ? '' : 'unaffordable'}`.trim();
      card.innerHTML = `
        ${renderThumbHtml(item)}
        <div class="shop-info">
          <span class="shop-name">${item.name} <em class="shop-tag-pill shop-tag-lv">Lv.${lv}</em></span>
          <span class="shop-desc">${item.desc}</span>
        </div>
        <span class="shop-price">${cost} <img src="./assets/ui_coin.webp?v=hd60" alt="" class="inline-coin-ico" /></span>
      `;
      bindCardTap(card, () => {
        if (player.coins < cost) {
          setPlayerEmote('金币不够升级，先去『幸存者』赚一波吧!', 2.2);
          return;
        }
        player.coins -= cost;
        player.weapons[item.id] = lv + 1;
        player.maxJumps = 3 + (player.weapons.boots > 0 ? 1 : 0);
        playSfx('star');
        player.proudTimer = 1.4;
        setPlayerEmote(`${item.name}升到 Lv.${lv + 1}！打工更猛了!`, 2.0);
        savePetState();
        renderDrawerItems();
      });
      drawerItemsEl.appendChild(card);
    }
  } else if (activeDrawerTab === 'album') {
    renderAlbumWallInDrawer();
  }
}
// [[split end]]
export {
  FOOD_CATALOG,
  renderDrawerItems
};
