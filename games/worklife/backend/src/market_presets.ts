import type { Storage } from "./storage";
import type { EnhancedContentPack } from "./types";

/**
 * 商会补给站（NPC 预设市场挂单账号）：
 * 1. 预留购买单（出售单 type="sell"）：
 *    仅针对 T1–T2 基础采集物、基础半成品、初级料理/药水、入门技能书与 T1 新手工具挂出溢价卖单（约 1.65x–2.0x 店价），
 *    保障新手开荒跨职业买材料顺畅起步；
 *    **高级装备（T2+ 武器防具饰品）、高阶材料（T3+）、珍稀/首领掉落材料、强化保护镜等绝不预留购买单**，必须由玩家自己生产、打怪掉落或玩家间交易。
 * 2. 预留收购单（收购单 type="buy"）：
 *    以较低价格（约正常基础价 value 的 60%，高于商店 35% 回收价，远低于卖单价）预留常驻收购单，
 *    方便玩家将富余产出或打怪战利品直接卖给市场收购单换取金币。
 */
export const MARKET_NPC_DEVICE_ID = "商会补给站";

export interface PresetMarketSpec {
  itemId: string;
  category: "raw" | "refined" | "consumable" | "tool";
  targetQty?: number;
  priceMultiplier?: number;
}

/**
 * 仅包含基础（T1–T2）常规物资的预留购买单（出售单 type="sell"）清单。
 * 不包含任何高级装备、T3+ 高阶材料、珍稀怪物掉落或强化保护道具。
 */
export const PRESET_MARKET_SPECS: PresetMarketSpec[] = [
  // 1. 伐木 / 木工（仅 T1–T2 原木、木板、木炭）
  { itemId: "wood_1", category: "raw", targetQty: 300 },
  { itemId: "wood_2", category: "raw", targetQty: 220 },
  { itemId: "lumber_1", category: "refined", targetQty: 250 },
  { itemId: "lumber_2", category: "refined", targetQty: 180 },
  { itemId: "charcoal", category: "refined", targetQty: 220 },

  // 2. 采矿 / 锻造（仅 T1–T2 矿石、金属锭）
  { itemId: "ore_1", category: "raw", targetQty: 300 },
  { itemId: "ore_2", category: "raw", targetQty: 220 },
  { itemId: "ingot_1", category: "refined", targetQty: 250 },
  { itemId: "ingot_2", category: "refined", targetQty: 180 },

  // 3. 种植 / 畜牧（仅 T1–T2 基础作物、牧草、饲料、常见畜产品）
  { itemId: "grain", category: "raw", targetQty: 350 },
  { itemId: "hay", category: "raw", targetQty: 350 },
  { itemId: "dung", category: "raw", targetQty: 300 },
  { itemId: "corn", category: "raw", targetQty: 240 },
  { itemId: "vegetable", category: "raw", targetQty: 240 },
  { itemId: "feed_animal", category: "refined", targetQty: 200 },
  { itemId: "egg", category: "raw", targetQty: 200 },
  { itemId: "milk", category: "raw", targetQty: 200 },
  { itemId: "wool", category: "raw", targetQty: 220 },
  { itemId: "leather_hide", category: "raw", targetQty: 200 },
  { itemId: "rabbit_fur", category: "raw", targetQty: 160 },
  { itemId: "pork", category: "raw", targetQty: 140 },
  { itemId: "honey", category: "raw", targetQty: 140 },

  // 4. 钓鱼 / 烹饪（仅 T1–T2 基础水产、烹饪辅料、初级料理与饮品）
  { itemId: "fish_river", category: "raw", targetQty: 250 },
  { itemId: "shrimp", category: "raw", targetQty: 250 },
  { itemId: "fish_sea", category: "raw", targetQty: 180 },
  { itemId: "flour", category: "refined", targetQty: 200 },
  { itemId: "oil", category: "refined", targetQty: 200 },
  { itemId: "butter", category: "refined", targetQty: 160 },
  { itemId: "bread", category: "consumable", targetQty: 150 },
  { itemId: "cheese_wheel", category: "refined", targetQty: 120 },
  { itemId: "food_grain_meal", category: "consumable", targetQty: 150 },
  { itemId: "food_simple", category: "consumable", targetQty: 150 },
  { itemId: "drink_basic", category: "consumable", targetQty: 150 },
  { itemId: "food_vegetable_stew", category: "consumable", targetQty: 100 },
  { itemId: "drink_fine", category: "consumable", targetQty: 100 },
  { itemId: "drink_herbal_tonic", category: "consumable", targetQty: 100 },
  { itemId: "food_fine", category: "consumable", targetQty: 100 },
  { itemId: "food_hearty_stew", category: "consumable", targetQty: 100 },

  // 5. 采集 / 裁缝（仅 T1–T2 基础纤维、丝线）
  { itemId: "fiber_1", category: "raw", targetQty: 300 },
  { itemId: "fiber_2", category: "raw", targetQty: 220 },
  { itemId: "yarn_1", category: "refined", targetQty: 250 },
  { itemId: "yarn_2", category: "refined", targetQty: 180 },

  // 6. 晶矿 / 炼金 + 入门技能书与 T1 新手工具（不含高阶药剂、珍稀掉落与高级装备）
  { itemId: "crystal_1", category: "raw", targetQty: 180 },
  { itemId: "potion_hp_t1", category: "consumable", targetQty: 140 },
  { itemId: "potion_hp_t2", category: "consumable", targetQty: 100 },
  { itemId: "potion_mp_t1", category: "consumable", targetQty: 140 },
  { itemId: "potion_mp_t2", category: "consumable", targetQty: 100 },
  { itemId: "potion_craft_focus", category: "consumable", targetQty: 90 },
  { itemId: "potion_iron_skin", category: "consumable", targetQty: 80 },
  { itemId: "potion_arcane_surge", category: "consumable", targetQty: 80 },
  { itemId: "book_smash", category: "tool", targetQty: 25 },
  { itemId: "book_minor_heal", category: "tool", targetQty: 25 },
  { itemId: "book_brace", category: "tool", targetQty: 25 },
  { itemId: "weapon_logging_axe_t1", category: "tool", targetQty: 20 },
  { itemId: "weapon_forge_hammer_t1", category: "tool", targetQty: 20 },
  { itemId: "weapon_hoe_t1", category: "tool", targetQty: 20 },
  { itemId: "weapon_sickle_t1", category: "tool", targetQty: 20 },
  { itemId: "weapon_frying_pan_t1", category: "tool", targetQty: 20 },
  { itemId: "weapon_spatula_t1", category: "tool", targetQty: 20 },
  { itemId: "weapon_scissors_t1", category: "tool", targetQty: 20 },
  { itemId: "weapon_alchemy_bottle_t1", category: "tool", targetQty: 20 },
  { itemId: "accessory_pouch_small", category: "tool", targetQty: 20 },
];

/**
 * 计算预设资源在市场上的溢价卖单单价（明显高于正常店价 value）。
 */
export function computePresetOrderPrice(
  item: { id: string; value?: number; tier?: number },
  spec: PresetMarketSpec
): number {
  const baseValue = Math.max(1, Math.round(Number(item.value || 10)));
  const defaultMult =
    spec.category === "raw"
      ? 1.65
      : spec.category === "refined"
      ? 2.0
      : spec.category === "consumable"
      ? 1.75
      : 1.8;
  const mult = spec.priceMultiplier ?? defaultMult;
  const minMarkup = spec.category === "raw" ? 3 : 4;
  return Math.max(baseValue + minMarkup, Math.ceil(baseValue * mult));
}

/**
 * 计算预设收购单（type="buy"）的低价收购单价：
 * 约为物品基础价 value 的 60%（高于商店 35% 回收价，但显著低于基础价与预设卖单价）。
 */
export function computePresetBidPrice(item: { id: string; value?: number; tier?: number }): number {
  const baseValue = Math.max(1, Math.round(Number(item.value || 10)));
  const shopSell = Math.max(1, Math.floor(baseValue * 0.35));
  const bid = Math.max(shopSell + 1, Math.round(baseValue * 0.6));
  return Math.max(1, Math.min(baseValue, bid));
}

export interface ResolvedPresetListing {
  itemId: string;
  price: number;
  targetQty: number;
  category: PresetMarketSpec["category"];
}

export interface ResolvedPresetBidListing {
  itemId: string;
  price: number;
  targetQty: number;
}

export function resolvePresetMarketListings(contentPack: EnhancedContentPack): ResolvedPresetListing[] {
  const itemMap = new Map<string, any>(
    ((contentPack.items as any[]) || []).map((it) => [String(it.id), it])
  );
  const out: ResolvedPresetListing[] = [];
  for (const spec of PRESET_MARKET_SPECS) {
    const item = itemMap.get(spec.itemId);
    if (!item) continue;
    const price = computePresetOrderPrice(item, spec);
    const targetQty = Math.max(10, Math.floor(spec.targetQty ?? 150));
    out.push({
      itemId: spec.itemId,
      price,
      targetQty,
      category: spec.category,
    });
  }
  return out;
}

/**
 * 解析市场预设收购单（type="buy"）：
 * 为各类材料、消耗品、装备提供价格较低的常驻收购单，方便玩家直接向市场收购单出售物品。
 */
export function resolvePresetMarketBidListings(contentPack: EnhancedContentPack): ResolvedPresetBidListing[] {
  const items = ((contentPack.items as any[]) || []).filter(
    (it) => it && it.id && it.id !== "gold" && it.type !== "currency" && Number(it.value || 0) > 0
  );
  const sellSpecMap = new Map<string, PresetMarketSpec>(
    PRESET_MARKET_SPECS.map((s) => [s.itemId, s])
  );

  const out: ResolvedPresetBidListing[] = [];
  for (const item of items) {
    const tier = Number(item.tier || 1);
    // 预设收购单覆盖 T1–T6 的材料、消耗品、技能书与装备
    if (tier > 6) continue;
    const price = computePresetBidPrice(item);
    const sellSpec = sellSpecMap.get(item.id);
    let targetQty = 40;
    if (sellSpec) {
      targetQty = Math.max(15, Math.round((sellSpec.targetQty ?? 120) * 0.6));
    } else if (item.type === "material") {
      targetQty = tier <= 2 ? 120 : tier <= 4 ? 60 : 30;
    } else if (item.type === "consumable" || item.type === "food") {
      targetQty = tier <= 2 ? 80 : 40;
    } else {
      // 武器、防具、副手、饰品、技能书等低价收购单数量适中
      targetQty = tier <= 2 ? 12 : 6;
    }
    out.push({
      itemId: String(item.id),
      price,
      targetQty,
    });
  }
  return out;
}

let seedQueue: Promise<void> = Promise.resolve();

/**
 * 确保商会补给站在交易行中：
 * 1) 仅对基础物资挂出预设购买单（type="sell"），并自动清理已不在列表中的高阶/珍稀物资旧卖单；
 * 2) 同时挂出低价预设收购单（type="buy"），支持库存/收购额度消耗后自动补单。
 */
export function ensurePresetMarketOrders(
  storage: Storage,
  contentPack: EnhancedContentPack,
  onlyItemId?: string
): Promise<void> {
  const next = seedQueue.then(async () => {
    const allSellListings = resolvePresetMarketListings(contentPack);
    const allowedSellIds = new Set(allSellListings.map((l) => l.itemId));
    const sellListings = allSellListings.filter((l) => !onlyItemId || l.itemId === onlyItemId);

    const allBidListings = resolvePresetMarketBidListings(contentPack);
    const allowedBidIds = new Set(allBidListings.map((l) => l.itemId));
    const bidListings = allBidListings.filter((l) => !onlyItemId || l.itemId === onlyItemId);

    const npc = await storage.findOrCreateGuestUser(MARKET_NPC_DEVICE_ID);
    const existingOrders = await storage.getMyTradingOrders({ userId: npc.id });

    const sellOrdersByItem = new Map<string, typeof existingOrders>();
    const buyOrdersByItem = new Map<string, typeof existingOrders>();

    for (const order of existingOrders) {
      if (order.type === "sell") {
        // 如果该物品已不再允许预设购买单（如高级装备、T3+高阶材料、珍稀材料），立即撤单清理！
        if (!allowedSellIds.has(order.itemId)) {
          try {
            await storage.cancelTradingOrder({ userId: npc.id, orderId: order.id });
          } catch {
            // ignore
          }
          continue;
        }
        const list = sellOrdersByItem.get(order.itemId) || [];
        list.push(order);
        sellOrdersByItem.set(order.itemId, list);
      } else if (order.type === "buy") {
        if (!allowedBidIds.has(order.itemId)) {
          try {
            await storage.cancelTradingOrder({ userId: npc.id, orderId: order.id });
          } catch {
            // ignore
          }
          continue;
        }
        const list = buyOrdersByItem.get(order.itemId) || [];
        list.push(order);
        buyOrdersByItem.set(order.itemId, list);
      }
    }

    const toReplenishSell: Array<{ itemId: string; addQty: number; price: number }> = [];
    for (const listing of sellListings) {
      const orders = sellOrdersByItem.get(listing.itemId) || [];
      let validOpenQty = 0;
      for (const ord of orders) {
        if (ord.price !== listing.price) {
          try {
            await storage.cancelTradingOrder({ userId: npc.id, orderId: ord.id });
          } catch {
            // ignore
          }
        } else {
          validOpenQty += ord.quantity;
        }
      }

      const replenishThreshold = Math.max(5, Math.ceil(listing.targetQty * 0.4));
      if (validOpenQty < replenishThreshold) {
        const addQty = listing.targetQty - validOpenQty;
        if (addQty > 0) {
          toReplenishSell.push({
            itemId: listing.itemId,
            addQty,
            price: listing.price,
          });
        }
      }
    }

    const toReplenishBuy: Array<{ itemId: string; addQty: number; price: number }> = [];
    for (const bidListing of bidListings) {
      const orders = buyOrdersByItem.get(bidListing.itemId) || [];
      let validOpenQty = 0;
      for (const ord of orders) {
        if (ord.price !== bidListing.price) {
          try {
            await storage.cancelTradingOrder({ userId: npc.id, orderId: ord.id });
          } catch {
            // ignore
          }
        } else {
          validOpenQty += ord.quantity;
        }
      }

      const replenishThreshold = Math.max(3, Math.ceil(bidListing.targetQty * 0.4));
      if (validOpenQty < replenishThreshold) {
        const addQty = bidListing.targetQty - validOpenQty;
        if (addQty > 0) {
          toReplenishBuy.push({
            itemId: bidListing.itemId,
            addQty,
            price: bidListing.price,
          });
        }
      }
    }

    if (toReplenishSell.length === 0 && toReplenishBuy.length === 0) return;

    const state = await storage.getOrCreatePlayerState(npc.id, contentPack.version || "1.0.0");
    if (!state.settings) {
      state.settings = {
        soundEnabled: true,
        animationsEnabled: true,
        compactMode: false,
        notificationsEnabled: true,
      };
    }
    state.settings.playerName = MARKET_NPC_DEVICE_ID;

    for (const item of toReplenishSell) {
      state.inventory[item.itemId] = (state.inventory[item.itemId] || 0) + item.addQty;
    }

    let neededGold = 0;
    for (const item of toReplenishBuy) {
      neededGold += item.addQty * item.price;
    }
    if (neededGold > 0) {
      state.inventory.gold = (state.inventory.gold || 0) + neededGold + 100000;
    }

    await storage.savePlayerState(npc.id, state);

    for (const item of toReplenishSell) {
      await storage.createTradingOrder({
        userId: npc.id,
        itemId: item.itemId,
        quantity: item.addQty,
        price: item.price,
        type: "sell",
        contentPack,
      });
    }

    for (const item of toReplenishBuy) {
      await storage.createTradingOrder({
        userId: npc.id,
        itemId: item.itemId,
        quantity: item.addQty,
        price: item.price,
        type: "buy",
        contentPack,
      });
    }
  });

  seedQueue = next.catch(() => {});
  return next;
}
