import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { monsterCombatant, playerCombatant, simulateFight, type FightResult } from "./first_hour_combat";

const contentPack = enhancedContentPack as EnhancedContentPack;

export type Checkpoint = {
  id: string;
  atMs: number;
  label: string;
  wood: number;
  lumber: number;
  gold: number;
  sword: number;
  chest: number;
  woodcutterLevel: number;
  combatLevel: number;
  equippedSword: boolean;
  equippedChest: boolean;
};

export type FirstHourReport = {
  checkpoints: Checkpoint[];
  fights: Array<{ id: string; result: FightResult; atMs: number }>;
  elapsedMs: number;
  unarmedSlime: FightResult;
  swordSlime: FightResult;
  swordCrab: FightResult;
  swordMonkey: FightResult;
  bossEdge: FightResult;
  bossBark: FightResult;
};

const UI_GAP_MS = 4000;
const BUILD_EDGE = { atk: 4, hp: 0, def: 0 };
const BUILD_BARK = { atk: 0, hp: 20, def: 4 };

function monster(id: string) {
  const m = (contentPack.monsters as Array<Record<string, unknown>>).find((x) => x.id === id);
  if (!m) throw new Error(`missing monster ${id}`);
  return m;
}

function actionDuration(actionId: string): number {
  const action = (contentPack.actions as Array<Record<string, unknown>>).find((a) => a.id === actionId) as
    | { duration?: number }
    | undefined;
  if (!action?.duration) throw new Error(`missing action ${actionId}`);
  return Number(action.duration);
}

function snap(id: string, label: string, atMs: number, state: EnhancedPlayerState): Checkpoint {
  const eq = state.equipment as { main_hand?: string; chest?: string };
  return {
    id,
    atMs,
    label,
    wood: state.inventory.wood_1 || 0,
    lumber: state.inventory.lumber_1 || 0,
    gold: state.inventory.gold || 0,
    sword: state.inventory.weapon_wooden_sword || 0,
    chest: state.inventory.armor_wood_chest || 0,
    woodcutterLevel: state.skills.skill_woodcutter?.level || 1,
    combatLevel: state.combatLevel || 1,
    equippedSword: eq?.main_hand === "weapon_wooden_sword",
    equippedChest: eq?.chest === "armor_wood_chest",
  };
}

export async function runFirstHourSimulation(): Promise<FirstHourReport> {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser("first-hour-sim");
  let state = await storage.getOrCreatePlayerState(user.id, contentPack.version || "1.0.0");
  let now = new Date("2026-09-02T00:00:00.000Z");
  let elapsedMs = 0;
  const checkpoints: Checkpoint[] = [];
  const fights: FirstHourReport["fights"] = [];

  const runAction = async (actionId: string, quantity: number) => {
    if (quantity <= 0) return state;
    const duration = actionDuration(actionId);
    state = await storage.startLifeAction({
      userId: user.id,
      actionId,
      quantity,
      now,
      contentPack,
    });
    const wait = duration * quantity + 250;
    now = new Date(now.getTime() + wait);
    elapsedMs += wait + UI_GAP_MS;
    state = await storage.simulateToNow({ userId: user.id, state, now, contentPack });
    return state;
  };

  checkpoints.push(snap("start", "login", elapsedMs, state));

  await runAction("act_chop_wood_t1", 1);
  checkpoints.push(snap("first_action", "first chop", elapsedMs, state));

  const woodForSword = Math.max(0, 6 - (state.inventory.wood_1 || 0));
  if (woodForSword > 0) await runAction("act_chop_wood_t1", woodForSword);
  const boardsNeeded = Math.max(0, 3 - (state.inventory.lumber_1 || 0));
  await runAction("act_craft_lumber_t1", boardsNeeded);
  checkpoints.push(snap("first_upgrade", "first boards", elapsedMs, state));

  await runAction("act_craft_weapon_wooden_sword", 1);
  checkpoints.push(snap("first_craft", "craft sword", elapsedMs, state));

  (state.equipment as { main_hand?: string }).main_hand = "weapon_wooden_sword";
  state = await storage.savePlayerState(user.id, state);
  elapsedMs += UI_GAP_MS;
  checkpoints.push(snap("first_equipment", "equip sword", elapsedMs, state));

  const unarmed = {
    ...state,
    equipment: { ...state.equipment, main_hand: undefined, chest: undefined },
  } as EnhancedPlayerState;
  const unarmedSlime = simulateFight(playerCombatant(unarmed, contentPack), monsterCombatant(monster("slime")));
  const swordOnly = {
    ...state,
    equipment: { ...state.equipment, chest: undefined },
  } as EnhancedPlayerState;
  const swordSlime = simulateFight(playerCombatant(swordOnly, contentPack), monsterCombatant(monster("slime")));
  const swordCrab = simulateFight(playerCombatant(swordOnly, contentPack), monsterCombatant(monster("crab")));
  const swordMonkey = simulateFight(playerCombatant(swordOnly, contentPack), monsterCombatant(monster("monkey")));

  // 采集/生产技能拆分后，胸甲要求木工 Lv.3——靠锯木板练木工（独立经验）
  while ((state.skills.skill_woodworking?.level || 1) < 3) {
    const woodForBoards = Math.max(0, 8 - (state.inventory.wood_1 || 0));
    if (woodForBoards > 0) await runAction("act_chop_wood_t1", woodForBoards);
    await runAction("act_craft_lumber_t1", 4);
  }
  const woodForChest = Math.max(0, 12 - (state.inventory.wood_1 || 0));
  if (woodForChest > 0) await runAction("act_chop_wood_t1", woodForChest);
  const boardsForChest = Math.max(0, 6 - (state.inventory.lumber_1 || 0));
  await runAction("act_craft_lumber_t1", boardsForChest);
  await runAction("act_craft_wood_chest", 1);
  (state.equipment as { chest?: string }).chest = "armor_wood_chest";
  state = await storage.savePlayerState(user.id, state);
  elapsedMs += UI_GAP_MS;
  checkpoints.push(snap("first_armor", "equip wooden chest", elapsedMs, state));

  const runFight = (
    id: string,
    monsterId: string,
    extras?: { atk?: number; hp?: number; def?: number }
  ) => {
    const result = simulateFight(
      playerCombatant(state, contentPack, extras),
      monsterCombatant(monster(monsterId))
    );
    elapsedMs += result.durationMs + UI_GAP_MS;
    fights.push({ id, result, atMs: elapsedMs });
    return result;
  };

  runFight("first_battle", "slime");
  checkpoints.push(snap("first_battle", "first slime", elapsedMs, state));
  runFight("crab", "crab");
  runFight("monkey", "monkey");

  const bossEdge = simulateFight(
    playerCombatant(state, contentPack, BUILD_EDGE),
    monsterCombatant(monster("forest_boss"))
  );
  const bossBark = runFight("boss", "forest_boss", BUILD_BARK);
  checkpoints.push(snap("boss_ready", "boss after 厚树皮", elapsedMs, state));
  checkpoints.push(snap("end", "sequence complete", elapsedMs, state));
  await storage.close();

  return {
    checkpoints,
    fights,
    elapsedMs,
    unarmedSlime,
    swordSlime,
    swordCrab,
    swordMonkey,
    bossEdge,
    bossBark,
  };
}

export function formatReport(report: FirstHourReport): string {
  const lines = [
    "WorkLife first-hour simulation (busy-idle + deterministic HP combat preview)",
    `elapsed: ${(report.elapsedMs / 60000).toFixed(2)} min`,
    "",
    "checkpoints:",
  ];
  for (const c of report.checkpoints) {
    lines.push(
      `  ${(c.atMs / 60000).toFixed(2).padStart(6)}m  ${c.id.padEnd(16)} wood=${c.wood} lumber=${c.lumber} sword=${c.sword} chest=${c.chest} gold=${c.gold} wcLv=${c.woodcutterLevel} eq=${c.equippedSword}/${c.equippedChest}`
    );
  }
  lines.push("", "combat preview:");
  const fmt = (name: string, r: FightResult) =>
    `  ${name.padEnd(16)} ${r.won ? "WIN" : "LOSS"} ${Math.round(r.durationMs / 1000)}s hpLeft=${r.playerHpLeft} hits=${r.playerHits}/${r.enemyHits}`;
  lines.push(fmt("unarmed slime", report.unarmedSlime));
  lines.push(fmt("sword slime", report.swordSlime));
  lines.push(fmt("sword crab", report.swordCrab));
  lines.push(fmt("sword monkey", report.swordMonkey));
  lines.push(fmt("boss 开刃", report.bossEdge));
  lines.push(fmt("boss 厚树皮", report.bossBark));
  return lines.join("\n");
}
