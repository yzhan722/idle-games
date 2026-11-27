import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { EQUIP_SLOT_KEYS, canEquipItem, type EquipItemDef } from "./equipment_equip";
import { MAX_SKILL_LEVEL } from "./growth_curves";
import { migratePlayerCurves } from "./curve_migration";
import { ensurePlayerExtensions } from "./storage";

/**
 * 存档导入的总开关与校验。
 *
 * 存档码的密钥在前端代码里，任何人都能造一份「合法密文」，所以密文只能防误改，不能当信任依据。
 * - 默认关闭：SAVE_IMPORT_ENABLED=1 才接受导入；导出不受影响。
 * - 打开时也只当作「把自己的号退回到更早的样子」：等级只能等于或低于服务器现值，可交易物（含金币）
 *   只能减不能加。一个周目内等级只升不降，服务器现值就是本周目的历史最高；转生前更高的等级不算，
 *   否则可以反复导回再转生刷点。
 * - 白名单之外的字段（转生、任务、声望、各建筑、统计、强化等级、耐久、增益、冷却……）一律用服务器现值。
 */
export function saveImportEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.SAVE_IMPORT_ENABLED === "1";
}

type Progress = { level: number; xp: number };
export type SaveImportCheck = { ok: true; state: EnhancedPlayerState } | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

function readProgress(value: unknown): Progress | null {
  if (!isRecord(value)) return null;
  const { level, xp } = value as { level: unknown; xp: unknown };
  if (!Number.isInteger(level) || (level as number) < 1 || (level as number) > MAX_SKILL_LEVEL) return null;
  if (typeof xp !== "number" || !Number.isFinite(xp) || xp < 0) return null;
  return { level: level as number, xp };
}

/** a 的进度是否高于 b（先比等级，再比本级经验）。 */
function exceeds(a: Progress, b: Progress): boolean {
  return a.level > b.level || (a.level === b.level && a.xp > b.xp + 0.001);
}

/** 校验一份导入的存档；通过时返回「服务器现值 + 白名单字段」拼成的新状态，不改传入的对象。 */
export function checkSaveImport(current: EnhancedPlayerState, incoming: unknown, pack: EnhancedContentPack): SaveImportCheck {
  if (!isRecord(incoming) || !isRecord(incoming.inventory) || !isRecord(incoming.skills)) {
    return { ok: false, errors: ["存档数据结构不完整"] };
  }
  const errors: string[] = [];
  const next = structuredClone(current);

  // 旧版本导出的存档码没有曲线版本号：先按旧曲线换算，再和现值比
  const draft = structuredClone({
    curveVersion: incoming.curveVersion,
    skills: incoming.skills,
    combatSkills: isRecord(incoming.combatSkills) ? incoming.combatSkills : undefined,
  }) as unknown as EnhancedPlayerState;
  migratePlayerCurves(draft);

  const known = new Set((pack.items as Array<{ id: string }>).map((i) => i.id));
  const inventory: Record<string, number> = {};
  for (const [id, raw] of Object.entries(incoming.inventory)) {
    const have = current.inventory[id] || 0;
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > Number.MAX_SAFE_INTEGER) {
      errors.push(`物品数量不合法：${id}`);
    } else if (raw > 0 && !known.has(id) && id !== "gold") {
      errors.push(`没有这种物品：${id}`);
    } else if (raw > have) {
      errors.push(`${id} 比服务器多：${raw} > ${have}`);
    } else if (raw > 0) {
      inventory[id] = raw;
    }
  }
  next.inventory = inventory;

  const takeProgress = (label: string, mine: Record<string, Progress> | undefined, theirs: unknown, target: Record<string, Progress> | undefined) => {
    if (!isRecord(theirs)) return;
    for (const [id, raw] of Object.entries(theirs)) {
      const have = mine?.[id];
      const progress = readProgress(raw);
      if (!progress) {
        errors.push(`${label}数值不合法：${id}`);
      } else if (!have) {
        errors.push(`${label}服务器上没有：${id}`);
      } else if (exceeds(progress, have)) {
        errors.push(`${label}高于服务器：${id} Lv.${progress.level}`);
      } else if (target?.[id]) {
        // 只取等级与经验，解锁列表等其余字段保持服务器现值
        target[id] = { ...target[id], level: progress.level, xp: progress.xp };
      }
    }
  };
  takeProgress("技能", current.skills, draft.skills, next.skills);
  takeProgress("战斗技能", current.combatSkills, draft.combatSkills, next.combatSkills);
  takeProgress("战技", current.abilities, incoming.abilities, next.abilities);

  if (isRecord(incoming.equipment)) {
    const slots = next.equipment as unknown as Record<string, unknown>;
    for (const slot of EQUIP_SLOT_KEYS) delete slots[slot];
    for (const slot of EQUIP_SLOT_KEYS) {
      const itemId = incoming.equipment[slot];
      if (itemId === undefined || itemId === null || itemId === "") continue;
      // 与穿装备接口同一套规则：部位要对，一件不能占两个槽
      if (typeof itemId !== "string" || !canEquipItem(inventory, slot, itemId, pack.items as unknown as EquipItemDef[], slots).ok) {
        errors.push(`装备不能放在这个部位：${slot}`);
      } else {
        slots[slot] = itemId;
      }
    }
  }

  if (isRecord(incoming.settings) && next.settings) {
    for (const key of ["soundEnabled", "animationsEnabled", "compactMode", "notificationsEnabled"] as const) {
      const value = incoming.settings[key];
      if (typeof value === "boolean") next.settings[key] = value;
    }
  }

  if (errors.length) return { ok: false, errors };

  // 正在进行的事按旧状态算的，停下来
  next.mode = "idle";
  next.lifeActionState = undefined;
  next.hpCombat = undefined;
  next.enhanceRun = undefined;
  if (next.combatLoadout?.autoRepeat) next.combatLoadout = { ...next.combatLoadout, autoRepeat: false };
  return { ok: true, state: ensurePlayerExtensions(next) };
}
