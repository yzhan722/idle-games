import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../services/api";
import { useGame } from "../contexts/GameContext";
import { useAuth } from "../hooks/useAuth";
import { chatWs } from "../services/websocket";
import { T1Art, T1ItemIcon, characterArtId } from "./T1Art";
import { CombatPotionBar } from "./CombatPotionBar";
import { AbilityBar } from "./AbilityBar";
import { abilitySlotCount, combatSheetFromPack } from "../gameplay/combatSheet";
import { previewAbilities } from "../gameplay/fightPreview";
import { playGameSound } from "../gameplay/sound";
import { useToast } from "./Toast";
import type { AbilityDef, PartyState } from "../types/game";

type PartyActivity = {
  type: "combat" | "group_craft" | "raid";
  stageId?: string;
  startedAt: string;
  endsAt?: string;
  durationMinutes?: number;
  raidBossId?: string;
  raidBossName?: string;
  bossKillsNeeded?: number;
};

type PartyMemberItem = {
  userId: string;
  role: string;
  isOnline?: boolean;
  isReady?: boolean;
  isBot?: boolean;
  title?: string;
  classId?: string;
  gender?: "male" | "female" | "animal";
  combatLevel?: number;
  joinedAt?: string;
  displayName?: string;
};

type PartyPayload = {
  id: string;
  name?: string;
  leaderId: string;
  members: PartyMemberItem[];
  allReady?: boolean;
  currentActivity?: PartyActivity | null;
  createdAt?: string;
};

type PartyListItem = {
  id: string;
  name?: string;
  leaderId: string;
  leaderName?: string;
  memberCount: number;
  hasActivity: boolean;
  isBotParty?: boolean;
  allBotsReady?: boolean;
  recommendedStageId?: string;
  createdAt: string;
};

type PartyInvite = { partyId: string; fromUserId: string; invitedAt: string };

type StageBossDungeon = {
  id: string;
  name: string;
  recommendedLevel: number;
  boss: {
    id: string;
    name: string;
    level: number;
    hp: number;
    atk: number;
    def: number;
    xp: number;
    gold: number;
    icon?: string;
  };
  minions: Array<{
    id: string;
    name: string;
    level: number;
    hp: number;
    atk: number;
    def: number;
    xp: number;
    gold: number;
    icon?: string;
  }>;
};

type AllyCombatUnit = {
  userId: string;
  name: string;
  title?: string;
  isSelf: boolean;
  isBot: boolean;
  role: string;
  classId: string;
  gender: "male" | "female" | "animal";
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  castMs: number;
  intervalMs: number;
  reviveRemainingMs: number;
  reviveTotalMs: number;
  hitShakeUntil: number;
  attackAnimUntil: number;
};

const ALLY_REVIVE_MS = 60000;

type EnemyCombatUnit = {
  slotKey: string;
  id: string;
  name: string;
  level: number;
  isBoss: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
  castMs: number;
  intervalMs: number;
  hitShakeUntil: number;
  attackAnimUntil: number;
};

type DamageFloatItem = {
  id: number;
  unitKey: string;
  value: number;
  isCrit?: boolean;
  isHeal?: boolean;
  tag?: string;
};

const STAGE_ID_ALIASES: Record<string, string> = {
  stage_1: "forest",
  stage_2: "mine",
  stage_3: "swamp",
  stage_4: "snow",
  stage_forest: "forest",
  stage_mine: "mine",
  stage_swamp: "swamp",
  stage_snow: "snow",
  stage_volcano: "volcano",
};

function normalizeStageId(raw?: string): string {
  if (!raw) return "forest";
  return STAGE_ID_ALIASES[raw] || raw;
}

const ITEM_ICON_FALLBACK: Record<string, string> = {
  potion_hp_t1: "❤️",
  potion_hp_t2: "❤️‍🔥",
  potion_hp_t3: "💖",
  potion_hp_t4: "👑",
  potion_mp_t1: "💧",
  potion_mp_t2: "🔷",
  potion_mp_t3: "💠",
  potion_mp_t4: "🌌",
  potion_battle_fury: "🔥",
  potion_iron_skin: "🛡️",
  potion_arcane_surge: "✨",
  potion_guardian_elixir: "⚔️",
  potion_berserk: "⚡",
  food_simple: "🍖",
  drink_basic: "🍹",
};

function getItemIconFallback(itemId: string): string {
  return ITEM_ICON_FALLBACK[itemId] || "📦";
}

export interface PartyCombatHeaderInfo {
  active: boolean;
  partyId?: string;
  stageId?: string;
  title?: string;
  subtitle?: string;
}

export interface PartyPanelProps {
  initialStageId?: string | null;
  onConsumeInitialStage?: () => void;
  onCombatStatusChange?: (info: PartyCombatHeaderInfo | null) => void;
}

export function PartyPanel({ initialStageId, onConsumeInitialStage, onCombatStatusChange }: PartyPanelProps = {}) {
  const { playerState, refreshPlayerState, stopAction } = useGame();
  const { user } = useAuth();
  const toast = useToast();

  const [party, setParty] = useState<PartyPayload | null>(null);
  const [partyLoaded, setPartyLoaded] = useState(false);
  const [publicParties, setPublicParties] = useState<PartyListItem[]>([]);
  const [joinId, setJoinId] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [actStage, setActStage] = useState<string>(initialStageId ? normalizeStageId(initialStageId) : "forest");
  const [contentPack, setContentPack] = useState<any>(null);
  const [showLobbyDetails, setShowLobbyDetails] = useState(false);

  // Multi-vs-Multi Wave Battle State
  const [currentWave, setCurrentWave] = useState(1);
  const [allies, setAllies] = useState<AllyCombatUnit[]>([]);
  const [enemies, setEnemies] = useState<EnemyCombatUnit[]>([]);
  const [damageFloats, setDamageFloats] = useState<DamageFloatItem[]>([]);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [waveBanner, setWaveBanner] = useState<string | null>(null);
  const [playerMp, setPlayerMp] = useState<number>(50);
  const [abilityCooldowns, setAbilityCooldowns] = useState<Record<string, number>>({});
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [runStats, setRunStats] = useState<{
    startedAt: number;
    wavesCleared: number;
    bossKills: number;
    totalKills: number;
    deaths: number;
    xp: number;
    gold: number;
    loot: Record<string, { name: string; qty: number }>;
  }>({
    startedAt: Date.now(),
    wavesCleared: 0,
    bossKills: 0,
    totalKills: 0,
    deaths: 0,
    xp: 0,
    gold: 0,
    loot: {},
  });

  const floatIdRef = useRef(1);
  const waveTransitionRef = useRef(false);
  const transitionTimersRef = useRef<number[]>([]);
  const activeStageKeyRef = useRef<string>("");
  const abilityCooldownsRef = useRef<Record<string, number>>({});
  const playerMpRef = useRef<number>(50);
  const selfGuardRef = useRef<{ until: number; mult: number }>({ until: 0, mult: 1 });

  const clearTransitionTimers = useCallback(() => {
    for (const tid of transitionTimersRef.current) {
      window.clearTimeout(tid);
    }
    transitionTimersRef.current = [];
  }, []);

  const scheduleTransitionTimeout = useCallback((fn: () => void, ms: number) => {
    const tid = window.setTimeout(() => {
      transitionTimersRef.current = transitionTimersRef.current.filter((id) => id !== tid);
      fn();
    }, ms);
    transitionTimersRef.current.push(tid);
    return tid;
  }, []);

  useEffect(() => {
    return () => clearTransitionTimers();
  }, [clearTransitionTimers]);

  useEffect(() => {
    abilityCooldownsRef.current = abilityCooldowns;
  }, [abilityCooldowns]);

  useEffect(() => {
    playerMpRef.current = playerMp;
  }, [playerMp]);

  const userId = user?.id as string | undefined;
  const partyState = playerState?.partyState as PartyState | undefined;
  const invites = ((playerState as any)?.partyInvites ?? []) as PartyInvite[];
  const isLeader = !!party && party.leaderId === userId;
  const selfMember = party?.members.find((m) => m.userId === userId);
  const selfReady = Boolean(selfMember?.isReady);

  const combatSheet = useMemo(
    () => (playerState ? combatSheetFromPack(playerState, contentPack?.items, contentPack?.equipmentSets) : { hp: 100, mp: 50, atk: 12, def: 4, intervalMs: 2200 }),
    [playerState, contentPack]
  );

  const abilityCatalog: AbilityDef[] | undefined = contentPack?.abilities;
  const equippedAbilities = useMemo(
    () => (playerState ? previewAbilities(playerState.abilityLoadout, playerState.abilities, abilityCatalog, abilitySlotCount(playerState)) : []),
    [playerState, abilityCatalog]
  );

  // Build Boss Dungeon list from contentPack.stages (only Boss stages can be fought in Party mode)
  const bossDungeons = useMemo<StageBossDungeon[]>(() => {
    if (!contentPack?.stages || !contentPack?.monsters) return [];
    const monstersById = new Map<string, any>();
    for (const m of contentPack.monsters) {
      monstersById.set(m.id, m);
    }
    const list: StageBossDungeon[] = [];
    for (const stg of contentPack.stages as any[]) {
      const mList = ((stg.monsters || []) as string[])
        .map((id) => monstersById.get(id))
        .filter(Boolean);
      if (mList.length === 0) continue;
      const boss = mList.find((m) => m.isBoss || String(m.id).endsWith("_boss")) || mList[mList.length - 1];
      const minions = mList.filter((m) => m.id !== boss.id);
      if (!boss) continue;
      list.push({
        id: stg.id,
        name: stg.name || stg.id,
        recommendedLevel: Number(stg.recommendedPower || boss.level || 1),
        boss: {
          id: boss.id,
          name: boss.name || boss.id,
          level: Number(boss.level || 10),
          hp: Number(boss.hp || 300),
          atk: Number(boss.atk || 20),
          def: Number(boss.def || 8),
          xp: Number(boss.xp || 80),
          gold: Number(boss.gold || 50),
          icon: boss.icon,
        },
        minions: minions.map((m) => ({
          id: m.id,
          name: m.name || m.id,
          level: Number(m.level || 1),
          hp: Number(m.hp || 60),
          atk: Number(m.atk || 8),
          def: Number(m.def || 2),
          xp: Number(m.xp || 14),
          gold: Number(m.gold || 8),
          icon: m.icon,
        })),
      });
    }
    return list;
  }, [contentPack]);

  const reload = useCallback(async () => {
    apiClient.clearCache();
    const res: any = await apiClient.getMyParty().catch(() => ({ party: null }));
    setParty(res?.party ?? null);
    setPartyLoaded(true);
  }, []);

  const reloadList = useCallback(async () => {
    const res: any = await apiClient.listParties(50).catch(() => ({ parties: [] }));
    setPublicParties(res?.parties ?? []);
  }, []);

  const activePartyStartedAt = playerState?.activePartyActivity?.startedAt || "";

  useEffect(() => {
    void reload();
    void reloadList();
  }, [partyState?.partyId, activePartyStartedAt, reload, reloadList]);

  useEffect(() => {
    void apiClient
      .getContentPack()
      .then((cp: any) => {
        setContentPack(cp);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialStageId) {
      const norm = normalizeStageId(initialStageId);
      setActStage(norm);
      onConsumeInitialStage?.();
    }
  }, [initialStageId, onConsumeInitialStage]);

  useEffect(
    () =>
      chatWs.onNotify((n) => {
        if (!n.kind.startsWith("party:")) return;
        void refreshPlayerState();
        void reload();
        void reloadList();
      }),
    [reload, reloadList, refreshPlayerState]
  );

  const pushFloat = useCallback((unitKey: string, value: number, opts?: { isCrit?: boolean; isHeal?: boolean; tag?: string }) => {
    const id = floatIdRef.current++;
    setDamageFloats((prev) => [...prev.slice(-18), { id, unitKey, value, ...opts }]);
    window.setTimeout(() => {
      setDamageFloats((prev) => prev.filter((f) => f.id !== id));
    }, 950);
  }, []);

  const appendBattleLog = useCallback((line: string) => {
    setBattleLog((prev) => [...prev.slice(-35), line]);
  }, []);

  const activeDungeon = useMemo<StageBossDungeon | null>(() => {
    if (bossDungeons.length === 0) return null;
    const rawStageId = party?.currentActivity?.stageId || actStage || "forest";
    const norm = normalizeStageId(rawStageId);
    return bossDungeons.find((d) => d.id === norm) || bossDungeons[0];
  }, [bossDungeons, party?.currentActivity?.stageId, actStage]);

  useEffect(() => {
    if (!partyLoaded) return;
    if (party?.currentActivity && activeDungeon) {
      const isBossWave = currentWave % 10 === 0;
      onCombatStatusChange?.({
        active: true,
        partyId: party.id,
        stageId: activeDungeon.id,
        title: `${activeDungeon.name} · 讨伐【${activeDungeon.boss.name}】`,
        subtitle: `组队自动战斗 · 第 ${currentWave} 波${isBossWave ? " (BOSS)" : ""}`,
      });
    } else if (!party?.currentActivity) {
      onCombatStatusChange?.(null);
    }
  }, [partyLoaded, party?.id, party?.currentActivity, activeDungeon, currentWave, onCombatStatusChange]);

  // Build wave enemies: Waves 1-9 spawn 3 simultaneous normal monsters; every 10th Wave spawns the Zone Boss!
  const buildWaveEnemies = useCallback((dungeon: StageBossDungeon, wave: number, partySize: number): EnemyCombatUnit[] => {
    const isBossWave = wave % 10 === 0;
    const cycleIndex = Math.floor((wave - 1) / 10);
    const waveScale = 1 + cycleIndex * 0.35 + ((wave - 1) % 10) * 0.04;
    const teamScale = 1 + Math.max(0, partySize - 1) * 0.22;

    if (isBossWave) {
      const b = dungeon.boss;
      const bossHp = Math.max(120, Math.round(b.hp * waveScale * teamScale * 1.35));
      return [
        {
          slotKey: `enemy-boss-${wave}`,
          id: b.id,
          name: `${b.name}${cycleIndex > 0 ? ` · 觉醒${cycleIndex + 1}阶` : ""}`,
          level: b.level + cycleIndex * 3,
          isBoss: true,
          hp: bossHp,
          maxHp: bossHp,
          atk: Math.max(8, Math.round(b.atk * (1 + cycleIndex * 0.2))),
          def: Math.max(2, Math.round(b.def * (1 + cycleIndex * 0.15))),
          xp: Math.max(15, Math.round((b.xp || 36) * (1 + cycleIndex * 0.25))),
          gold: Math.max(8, Math.round((b.gold || 20) * (1 + cycleIndex * 0.25))),
          castMs: 400,
          intervalMs: 2600,
          hitShakeUntil: 0,
          attackAnimUntil: 0,
        },
      ];
    }

    const pool = dungeon.minions.length > 0 ? dungeon.minions : [dungeon.boss];
    const waveOffset = (wave - 1) % 10;
    // Waves 1-9: simultaneously spawn 3 monsters per wave!
    const count = 3;
    const units: EnemyCombatUnit[] = [];
    for (let i = 0; i < count; i++) {
      const m = pool[(waveOffset + i) % pool.length];
      const hp = Math.max(30, Math.round(m.hp * waveScale * (0.75 + partySize * 0.12)));
      units.push({
        slotKey: `enemy-${wave}-${i}`,
        id: m.id,
        name: `${m.name} #${i + 1}`,
        level: m.level + cycleIndex * 2,
        isBoss: false,
        hp,
        maxHp: hp,
        atk: Math.max(4, Math.round(m.atk * (0.85 + cycleIndex * 0.15))),
        def: Math.max(1, Math.round(m.def * (1 + cycleIndex * 0.1))),
        xp: Math.max(5, Math.round((m.xp || 12) * (1 + cycleIndex * 0.2))),
        gold: Math.max(2, Math.round((m.gold || 6) * (1 + cycleIndex * 0.2))),
        castMs: (i * 650) % 2400,
        intervalMs: 2500 + i * 280,
        hitShakeUntil: 0,
        attackAnimUntil: 0,
      });
    }
    return units;
  }, []);

  // Build allied party formation (player + up to 5 bot/human teammates)
  const buildAlliesFormation = useCallback(
    (pty: PartyPayload): AllyCombatUnit[] => {
      const playerLv = playerState?.combatLevel || 1;
      const playerMaxHp = Math.max(60, combatSheet.hp || 100);
      const playerAtk = Math.max(10, combatSheet.atk || 14);
      const playerDef = Math.max(2, combatSheet.def || 4);
      const playerInterval = Math.max(1200, Math.min(2600, combatSheet.intervalMs || 2000));
      const selfGender = ((playerState?.settings?.gender === "female" || playerState?.settings?.gender === "animal")
        ? playerState.settings.gender
        : "male") as "male" | "female" | "animal";
      const selfClassId = playerState?.activeClassId || "woodcutter";
      const selfName = playerState?.settings?.playerName || "冒险者";

      const sortedMembers = [...pty.members].sort((a, b) => {
        if (a.userId === userId) return -1;
        if (b.userId === userId) return 1;
        return 0;
      });

      return sortedMembers.map((m, idx) => {
        const isSelf = m.userId === userId;
        const lv = isSelf ? playerLv : Math.max(playerLv, Number(m.combatLevel || 12));
        const maxHp = isSelf ? playerMaxHp : Math.max(90, Math.round(playerMaxHp * (0.88 + (idx % 3) * 0.12)));
        const atk = isSelf ? playerAtk : Math.max(9, Math.round(playerAtk * (0.78 + (idx % 3) * 0.1)));
        const def = isSelf ? playerDef : Math.max(3, Math.round(playerDef * 0.85));
        const intervalMs = isSelf ? playerInterval : 1950 + (idx % 3) * 260;
        return {
          userId: m.userId,
          name: isSelf ? selfName : m.displayName || "冒险队友",
          title: isSelf ? "小队指挥" : m.title || (m.isBot ? "协战游侠" : "小队成员"),
          isSelf,
          isBot: Boolean(m.isBot),
          role: m.role,
          classId: isSelf ? selfClassId : m.classId || "woodcutter",
          gender: isSelf ? selfGender : m.gender || (idx % 2 === 0 ? "female" : "male"),
          level: lv,
          hp: maxHp,
          maxHp,
          atk,
          def,
          castMs: (idx * 480) % intervalMs,
          intervalMs,
          reviveRemainingMs: 0,
          reviveTotalMs: ALLY_REVIVE_MS,
          hitShakeUntil: 0,
          attackAnimUntil: 0,
        };
      });
    },
    [playerState, combatSheet, userId]
  );

  // Initialize / reset multi-vs-multi battle arena when party activity starts or changes stage
  useEffect(() => {
    if (!party?.currentActivity || !activeDungeon) {
      activeStageKeyRef.current = "";
      waveTransitionRef.current = false;
      clearTransitionTimers();
      return;
    }
    const key = `${party.id}:${activeDungeon.id}:${party.currentActivity.startedAt}`;
    if (activeStageKeyRef.current === key) return;
    activeStageKeyRef.current = key;
    waveTransitionRef.current = false;
    clearTransitionTimers();

    const parsedStart = Date.parse(party.currentActivity.startedAt);
    const trueStartedAt = Number.isFinite(parsedStart) && parsedStart > 0 ? parsedStart : Date.now();
    const storageKey = `worklife_party_run_${key}`;
    let restoredWave = 1;
    let restoredStats: typeof runStats | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const startWave = Math.max(1, Number(parsed.currentWave || 1));
          const savedLastAt = Number(parsed.lastUpdatedAt || trueStartedAt);
          const gapSec = Math.max(0, Math.floor((Date.now() - savedLastAt) / 1000));
          const extraKills = Math.floor(gapSec / 6);
          const extraWaves = Math.floor(extraKills / 3);
          restoredWave = startWave + extraWaves;
          const extraBossKills = Math.max(0, Math.floor((restoredWave - 1) / 10) - Math.floor((startWave - 1) / 10));
          const avgMinion = activeDungeon.minions[0] || activeDungeon.boss;
          restoredStats = {
            startedAt: trueStartedAt,
            wavesCleared: Number(parsed.wavesCleared || 0) + extraWaves,
            bossKills: Number(parsed.bossKills || 0) + extraBossKills,
            totalKills: Number(parsed.totalKills || 0) + extraKills,
            deaths: Number(parsed.deaths || 0),
            xp: Number(parsed.xp || 0) + extraKills * Math.max(5, Number(avgMinion.xp || 12)),
            gold: Number(parsed.gold || 0) + extraKills * Math.max(2, Number(avgMinion.gold || 6)),
            loot: parsed.loot && typeof parsed.loot === "object" ? parsed.loot : {},
          };
        }
      }
    } catch {
      // ignore storage errors
    }

    if (!restoredStats) {
      const elapsedSecFromStart = Math.max(0, Math.floor((Date.now() - trueStartedAt) / 1000));
      const initialKills = Math.floor(elapsedSecFromStart / 6);
      const initialWaves = Math.floor(initialKills / 3);
      restoredWave = 1 + initialWaves;
      const avgMinion = activeDungeon.minions[0] || activeDungeon.boss;
      restoredStats = {
        startedAt: trueStartedAt,
        wavesCleared: initialWaves,
        bossKills: Math.floor(initialWaves / 10),
        totalKills: initialKills,
        deaths: 0,
        xp: initialKills * Math.max(5, Number(avgMinion.xp || 12)),
        gold: initialKills * Math.max(2, Number(avgMinion.gold || 6)),
        loot: {},
      };
    }

    const initialAllies = buildAlliesFormation(party);
    const initialEnemies = buildWaveEnemies(activeDungeon, restoredWave, initialAllies.length);
    abilityCooldownsRef.current = {};
    setAbilityCooldowns({});
    selfGuardRef.current = { until: 0, mult: 1 };
    const startMp = combatSheet.mp || 50;
    playerMpRef.current = startMp;
    setCurrentWave(restoredWave);
    setAllies(initialAllies);
    setEnemies(initialEnemies);
    setPlayerMp(startMp);
    setRunStats(restoredStats);
    setBattleLog([
      `🚩 组队首领副本【${activeDungeon.name}】开启！我方 ${initialAllies.length} 人小队全员集结！`,
      `⚔️ 规则：第 1~9 波每波同时迎战 3 只区域小怪，第 10 波迎战区域首领【${activeDungeon.boss.name}】！`,
      `🌊 第 ${restoredWave} 波群怪来袭：${initialEnemies.map((e) => e.name).join("、")} 同时出战！`,
    ]);
    setWaveBanner(`第 ${restoredWave} 波`);
    const t = window.setTimeout(() => setWaveBanner(null), 1600);
    return () => window.clearTimeout(t);
  }, [party, activeDungeon, buildAlliesFormation, buildWaveEnemies, combatSheet.mp, clearTransitionTimers]);

  useEffect(() => {
    if (!party?.currentActivity || !activeDungeon) return;
    const key = `${party.id}:${activeDungeon.id}:${party.currentActivity.startedAt}`;
    try {
      localStorage.setItem(
        `worklife_party_run_${key}`,
        JSON.stringify({
          ...runStats,
          currentWave,
          lastUpdatedAt: Date.now(),
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [party?.id, party?.currentActivity?.startedAt, activeDungeon?.id, runStats, currentWave]);

  // Keep allies roster synced if player recruits a bot mid-run, and sync local party activity with authoritative playerState
  useEffect(() => {
    if (!party?.currentActivity) return;
    // If server already cleared activePartyActivity (e.g. player started solo combat or stopped from top bar),
    // immediately clear stale local party.currentActivity instead of cancelling newly started solo combat!
    if (playerState && !playerState.activePartyActivity) {
      setParty((prev) => (prev ? { ...prev, currentActivity: null } : prev));
      onCombatStatusChange?.(null);
      return;
    }
    if (playerState?.mode === "life_action") {
      void stopAction().catch(() => undefined);
    }
    setAllies((prev) => {
      const fresh = buildAlliesFormation(party);
      if (prev.length === 0) return fresh;
      return fresh.map((f) => {
        const existing = prev.find((p) => p.userId === f.userId);
        if (!existing) return f;
        const maxHpDelta = Math.max(0, f.maxHp - existing.maxHp);
        return {
          ...f,
          hp: existing.hp <= 0 ? 0 : Math.min(f.maxHp, existing.hp + maxHpDelta),
          castMs: existing.castMs,
          reviveRemainingMs: existing.reviveRemainingMs,
          reviveTotalMs: existing.reviveTotalMs || ALLY_REVIVE_MS,
          hitShakeUntil: existing.hitShakeUntil,
          attackAnimUntil: existing.attackAnimUntil,
        };
      });
    });
  }, [party, buildAlliesFormation, playerState, stopAction, onCombatStatusChange]);

  // Advance to next wave when all enemies in current wave are defeated
  const handleWaveCleared = useCallback(
    async (clearedWave: number) => {
      if (!party || !activeDungeon || waveTransitionRef.current) return;
      waveTransitionRef.current = true;
      const isBossWave = clearedWave % 10 === 0;
      playGameSound("victory");

      try {
        const res: any = await apiClient.partyWaveClear(party.id, activeDungeon.id, clearedWave);
        const xpGained = Number(res?.xpGained || (isBossWave ? activeDungeon.boss.xp * 2 : 36));
        const goldGained = Number(res?.goldGained || (isBossWave ? activeDungeon.boss.gold * 2 : 20));
        const drops: Array<{ itemId: string; name: string; qty: number }> = Array.isArray(res?.drops) ? res.drops : [];

        setRunStats((prev) => {
          const nextLoot = { ...prev.loot };
          for (const d of drops) {
            const cur = nextLoot[d.itemId];
            nextLoot[d.itemId] = { name: d.name, qty: (cur?.qty || 0) + d.qty };
          }
          return {
            ...prev,
            wavesCleared: prev.wavesCleared + 1,
            loot: nextLoot,
          };
        });

        const dropText = drops.length > 0 ? ` · 掉落：${drops.map((d) => `${d.name}×${d.qty}`).join("、")}` : "";
        appendBattleLog(
          isBossWave
            ? `🏆 【第 ${clearedWave} 波 · 首领击破】全队合力斩杀 ${activeDungeon.boss.name}！获得 +${xpGained} 经验、+${goldGained} 金币${dropText}！`
            : `✨ 【第 ${clearedWave} 波清剿完成】击溃 3 只群怪！获得 +${xpGained} 经验、+${goldGained} 金币${dropText}`
        );
        void refreshPlayerState();
      } catch {
        // Fallback local log if network hiccups
        appendBattleLog(`✨ 第 ${clearedWave} 波清剿完成！准备迎接下一波敌人！`);
      }

      const nextWave = clearedWave + 1;
      const nextIsBoss = nextWave % 10 === 0;
      setWaveBanner(
        nextIsBoss
          ? `🔥 第 ${nextWave} 波 · BOSS`
          : `第 ${nextWave} 波`
      );

      scheduleTransitionTimeout(() => {
        const nextEnemies = buildWaveEnemies(activeDungeon, nextWave, Math.max(1, party.members.length));
        setCurrentWave(nextWave);
        setEnemies(nextEnemies);
        // Heal surviving allies slightly between waves (+22% Max HP); downed allies keep their revive countdown ticking
        setAllies((prev) =>
          prev.map((a) => ({
            ...a,
            hp: a.hp <= 0 ? 0 : Math.min(a.maxHp, Math.round(a.hp + a.maxHp * 0.22)),
          }))
        );
        setPlayerMp((mp) => {
          const nextMp = Math.min(combatSheet.mp || 50, mp + 10);
          playerMpRef.current = nextMp;
          return nextMp;
        });
        appendBattleLog(
          nextIsBoss
            ? `👹 警报！第 ${nextWave} 波区域首领【${activeDungeon.boss.name}】登场！`
            : `🌊 第 ${nextWave} 波出现 ${nextEnemies.length} 只敌人：${nextEnemies.map((e) => e.name).join("、")}！`
        );
        waveTransitionRef.current = false;
        scheduleTransitionTimeout(() => setWaveBanner(null), 1400);
      }, 650);
    },
    [party, activeDungeon, appendBattleLog, buildWaveEnemies, refreshPlayerState, combatSheet.mp, scheduleTransitionTimeout]
  );

  // Full Party Wipe Handler: when all allies drop to 0 HP, fail the current wave and reset back to Wave 1 after respawn delay
  const handlePartyWipe = useCallback(
    (failedWave: number) => {
      if (!party || !activeDungeon || waveTransitionRef.current) return;
      waveTransitionRef.current = true;
      setWaveBanner(`💀 第 ${failedWave} 波团灭！重整旗鼓退回第 1 波...`);
      appendBattleLog(`💀 【全队覆没】第 ${failedWave} 波小队全员力竭阵亡，讨伐失败！正在休整并退回第 1 波重新挑战...`);

      scheduleTransitionTimeout(() => {
        const resetAllies = buildAlliesFormation(party);
        const wave1Enemies = buildWaveEnemies(activeDungeon, 1, Math.max(1, resetAllies.length));
        const fullMp = combatSheet.mp || 50;
        playerMpRef.current = fullMp;
        setCurrentWave(1);
        setAllies(resetAllies);
        setEnemies(wave1Enemies);
        setPlayerMp(fullMp);
        appendBattleLog(`🔄 小队已在营地重整完毕，重新从第 1 波发起讨伐！`);
        waveTransitionRef.current = false;
        scheduleTransitionTimeout(() => setWaveBanner(null), 1200);
      }, 2200);
    },
    [party, activeDungeon, appendBattleLog, buildAlliesFormation, buildWaveEnemies, combatSheet.mp, scheduleTransitionTimeout]
  );

  // 60ms Multi-vs-Multi Real-Time Combat Loop
  useEffect(() => {
    if (!party?.currentActivity || !activeDungeon) return;

    const TICK_MS = 60;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setNowTs(now);
      if (waveTransitionRef.current) return;

      setEnemies((prevEnemies) => {
        const aliveEnemies = prevEnemies.filter((e) => e.hp > 0);
        if (aliveEnemies.length === 0) {
          if (prevEnemies.length > 0 && !waveTransitionRef.current) {
            void handleWaveCleared(currentWave);
          }
          return prevEnemies;
        }

        let nextEnemies = prevEnemies.map((e) => ({ ...e }));

        setAllies((prevAllies) => {
          let nextAllies = prevAllies.map((a) => ({ ...a }));

          // If all allies are already dead, trigger party wipe
          if (nextAllies.length > 0 && nextAllies.every((a) => a.hp <= 0)) {
            if (!waveTransitionRef.current) {
              handlePartyWipe(currentWave);
            }
            return nextAllies;
          }

          const hasSurvivingTeammate = nextAllies.some((a) => a.hp > 0);

          // 1. Advance each Ally's cast bar (or revive countdown if downed while teammates survive)
          for (let i = 0; i < nextAllies.length; i++) {
            const ally = nextAllies[i];
            if (ally.hp <= 0) {
              ally.castMs = 0;
              if (hasSurvivingTeammate) {
                const totalRevive = ally.reviveTotalMs || ALLY_REVIVE_MS;
                const currentRem = ally.reviveRemainingMs > 0 ? ally.reviveRemainingMs : totalRevive;
                const nextRem = Math.max(0, currentRem - TICK_MS);
                ally.reviveRemainingMs = nextRem;
                if (nextRem <= 0) {
                  // Countdown finished: full-status resurrection!
                  ally.hp = ally.maxHp;
                  ally.castMs = 0;
                  ally.reviveRemainingMs = 0;
                  if (ally.isSelf) {
                    const revMp = combatSheet.mp || 50;
                    playerMpRef.current = revMp;
                    setPlayerMp(revMp);
                  }
                  pushFloat(`ally-${ally.userId}`, ally.maxHp, {
                    isHeal: true,
                    tag: "满状态复活",
                  });
                  appendBattleLog(`✨ 【${ally.name}】复活倒计时结束，已满状态复活重返战场！`);
                }
              }
              continue;
            }
            ally.castMs += TICK_MS;
            // Auto-cast equipped player active abilities when off cooldown
            if (ally.isSelf && equippedAbilities.length > 0) {
              const livingEnemiesNow = nextEnemies.filter((e) => e.hp > 0);
              if (livingEnemiesNow.length > 0) {
                for (const slot of equippedAbilities) {
                  const def = slot.def;
                  const readyAt = abilityCooldownsRef.current[def.id] || 0;
                  const mpCost = Number(def.mpCost || 0);
                  if (now < readyAt || playerMpRef.current < mpCost) continue;
                  // Respect trigger condition configured by the player
                  const trig = slot.trigger || { type: "always" };
                  if (trig.type === "self_hp_below" && (ally.hp / Math.max(1, ally.maxHp)) * 100 > trig.pct) continue;
                  if (
                    trig.type === "enemy_hp_below" &&
                    !livingEnemiesNow.some((e) => (e.hp / Math.max(1, e.maxHp)) * 100 <= trig.pct)
                  ) {
                    continue;
                  }
                  if (trig.type === "enemy_guard" && !livingEnemiesNow.some((e) => e.isBoss)) {
                    continue;
                  }
                  const levelMult = 1 + Math.max(0, (slot.level || 1) - 1) * (def.levelStep ?? 0.05);
                  const cdMs = Math.max(2000, Number(def.cooldownMs || 8000));
                  if (def.healPct && def.healPct > 0) {
                    const wounded = nextAllies.some((a) => a.hp > 0 && a.hp <= a.maxHp * 0.75);
                    if (!wounded) continue;
                    playerMpRef.current = Math.max(0, playerMpRef.current - mpCost);
                    setPlayerMp(playerMpRef.current);
                    abilityCooldownsRef.current = { ...abilityCooldownsRef.current, [def.id]: now + cdMs };
                    setAbilityCooldowns(abilityCooldownsRef.current);
                    for (const a of nextAllies) {
                      if (a.hp <= 0) continue;
                      const healAmt = Math.max(12, Math.round(a.maxHp * def.healPct * levelMult));
                      a.hp = Math.min(a.maxHp, a.hp + healAmt);
                      pushFloat(`ally-${a.userId}`, healAmt, { isHeal: true, tag: def.name });
                    }
                    appendBattleLog(`💚 自动释放【${def.name}】，为全体存活队友恢复生命值！`);
                    break;
                  } else if (def.damageMult && def.damageMult > 0) {
                    playerMpRef.current = Math.max(0, playerMpRef.current - mpCost);
                    setPlayerMp(playerMpRef.current);
                    abilityCooldownsRef.current = { ...abilityCooldownsRef.current, [def.id]: now + cdMs };
                    setAbilityCooldowns(abilityCooldownsRef.current);
                    const target = livingEnemiesNow[Math.floor(Math.random() * livingEnemiesNow.length)];
                    const skillDmg = Math.max(6, Math.round(ally.atk * def.damageMult * levelMult - target.def * 0.2));
                    target.hp = Math.max(0, target.hp - skillDmg);
                    target.hitShakeUntil = now + 300;
                    pushFloat(target.slotKey, skillDmg, { isCrit: true, tag: def.name });
                    if (target.hp === 0) {
                      setRunStats((prev) => ({
                        ...prev,
                        totalKills: prev.totalKills + 1,
                        bossKills: prev.bossKills + (target.isBoss ? 1 : 0),
                        xp: prev.xp + target.xp,
                        gold: prev.gold + target.gold,
                      }));
                      appendBattleLog(`🪓 自动释放【${def.name}】击倒了 ${target.name}（-${skillDmg}）！`);
                    } else {
                      appendBattleLog(`🪓 自动释放【${def.name}】命中 ${target.name}，造成 ${skillDmg} 点伤害！`);
                    }
                    break;
                  } else if (def.guardMult) {
                    playerMpRef.current = Math.max(0, playerMpRef.current - mpCost);
                    setPlayerMp(playerMpRef.current);
                    abilityCooldownsRef.current = { ...abilityCooldownsRef.current, [def.id]: now + cdMs };
                    setAbilityCooldowns(abilityCooldownsRef.current);
                    const reduce = Math.min(0.8, (1 - def.guardMult) * levelMult);
                    selfGuardRef.current = {
                      until: now + Number(def.durationMs || 6000),
                      mult: Math.max(0.2, 1 - reduce),
                    };
                    appendBattleLog(`🛡️ 自动释放【${def.name}】，提升自身防护！`);
                    break;
                  }
                }
              }
            }
            if (nextEnemies.every((e) => e.hp <= 0)) break;
            if (ally.castMs >= ally.intervalMs) {
              ally.castMs = ally.castMs % ally.intervalMs;
              ally.attackAnimUntil = now + 260;

              // Pick target: random living enemy (unless a future ability designates a target)
              const livingTargets = nextEnemies.filter((e) => e.hp > 0);
              if (livingTargets.length > 0) {
                const preferred = livingTargets[Math.floor(Math.random() * livingTargets.length)];
                const isCrit = Math.random() < (ally.isSelf ? 0.22 : 0.15);
                const rawDmg = Math.max(4, Math.round((ally.atk * (0.92 + Math.random() * 0.22) - preferred.def * 0.25) * (isCrit ? 1.65 : 1)));
                preferred.hp = Math.max(0, preferred.hp - rawDmg);
                preferred.hitShakeUntil = now + 260;

                pushFloat(preferred.slotKey, rawDmg, {
                  isCrit,
                  tag: ally.name,
                });

                if (ally.isSelf) {
                  setPlayerMp((mp) => {
                    const nextMp = Math.min(combatSheet.mp || 50, mp + 3);
                    playerMpRef.current = nextMp;
                    return nextMp;
                  });
                }

                if (preferred.hp === 0) {
                  setRunStats((prev) => ({
                    ...prev,
                    totalKills: prev.totalKills + 1,
                    bossKills: prev.bossKills + (preferred.isBoss ? 1 : 0),
                    xp: prev.xp + preferred.xp,
                    gold: prev.gold + preferred.gold,
                  }));
                  appendBattleLog(`💥 【${ally.name}】击倒了 ${preferred.name}（-${rawDmg}${isCrit ? " 暴击" : ""}）！`);
                } else if (ally.isSelf || Math.random() < 0.35) {
                  appendBattleLog(`⚔️ 【${ally.name}】攻击 ${preferred.name}，造成 ${rawDmg} 点伤害${isCrit ? "（暴击！）" : ""}`);
                }
              }
            }
          }

          // 2. Advance each living Enemy's cast bar & attack a random living Ally
          for (let j = 0; j < nextEnemies.length; j++) {
            const enemy = nextEnemies[j];
            if (enemy.hp <= 0) {
              enemy.castMs = 0;
              continue;
            }
            enemy.castMs += TICK_MS;
            if (enemy.castMs >= enemy.intervalMs) {
              enemy.castMs = enemy.castMs % enemy.intervalMs;
              enemy.attackAnimUntil = now + 260;

              const livingAllies = nextAllies.filter((a) => a.hp > 0);
              if (livingAllies.length > 0) {
                const targetAlly = livingAllies[Math.floor(Math.random() * livingAllies.length)];
                const baseEnemyDmg = Math.max(2, Math.round(enemy.atk * (0.85 + Math.random() * 0.25) - targetAlly.def * 0.45));
                const guardMult = targetAlly.isSelf && now < selfGuardRef.current.until ? selfGuardRef.current.mult : 1;
                const rawEnemyDmg = Math.max(1, Math.round(baseEnemyDmg * guardMult));
                targetAlly.hp = Math.max(0, targetAlly.hp - rawEnemyDmg);
                targetAlly.hitShakeUntil = now + 240;

                pushFloat(`ally-${targetAlly.userId}`, rawEnemyDmg, {
                  isCrit: enemy.isBoss && Math.random() < 0.25,
                });

                if (targetAlly.hp <= 0) {
                  targetAlly.castMs = 0;
                  const totalRevive = targetAlly.reviveTotalMs || ALLY_REVIVE_MS;
                  targetAlly.reviveRemainingMs = totalRevive;
                  setRunStats((prev) => ({
                    ...prev,
                    deaths: prev.deaths + 1,
                  }));
                  const survivorsLeft = nextAllies.some((a) => a.hp > 0);
                  appendBattleLog(
                    survivorsLeft
                      ? `💀 ${enemy.name} 重创【${targetAlly.name}】（-${rawEnemyDmg}）！尚有存活队友，【${targetAlly.name}】进入 ${(totalRevive / 1000).toFixed(0)} 秒复活倒计时...`
                      : `💀 ${enemy.name} 击倒了最后一名队员【${targetAlly.name}】（-${rawEnemyDmg}）！`
                  );
                } else if (enemy.isBoss || targetAlly.isSelf) {
                  appendBattleLog(
                    `${enemy.isBoss ? "👹" : "👾"} ${enemy.name} 攻击【${targetAlly.name}】，造成 ${rawEnemyDmg} 点伤害`
                  );
                }
              }
            }
          }

          // Check if all allies in the party just died (full party wipe)
          if (nextAllies.length > 0 && nextAllies.every((a) => a.hp <= 0) && !waveTransitionRef.current) {
            handlePartyWipe(currentWave);
          }

          return nextAllies;
        });

        // Check if all enemies in this wave just died
        if (nextEnemies.length > 0 && nextEnemies.every((e) => e.hp <= 0) && !waveTransitionRef.current) {
          void handleWaveCleared(currentWave);
        }

        return nextEnemies;
      });
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [party?.currentActivity, activeDungeon, currentWave, equippedAbilities, handleWaveCleared, handlePartyWipe, pushFloat, appendBattleLog, combatSheet.mp]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refreshPlayerState();
      await reload();
      await reloadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  // One-click start Boss Dungeon (auto-joins/creates squad with bot teammates if needed)
  const quickStartBossDungeon = async (stageId: string) => {
    const targetStageId = normalizeStageId(stageId);
    setActStage(targetStageId);
    waveTransitionRef.current = false;
    clearTransitionTimers();
    await run(async () => {
      let currentPartyId = party?.id;
      if (!currentPartyId) {
        // Find matching preset bot party or join first available bot party, else create + recruit bots
        const matchingBotParty =
          publicParties.find((p) => p.isBotParty && normalizeStageId(p.recommendedStageId) === targetStageId) ||
          publicParties.find((p) => p.isBotParty && p.memberCount < 6);
        if (matchingBotParty) {
          const joined: any = await apiClient.joinParty(matchingBotParty.id);
          currentPartyId = joined?.id || matchingBotParty.id;
        } else {
          const created: any = await apiClient.createParty();
          currentPartyId = created?.id;
          if (currentPartyId) {
            await apiClient.recruitPartyBot(currentPartyId).catch(() => undefined);
            await apiClient.recruitPartyBot(currentPartyId).catch(() => undefined);
            await apiClient.recruitPartyBot(currentPartyId).catch(() => undefined);
          }
        }
      }
      if (!currentPartyId) throw new Error("无法组建冒险小队");
      if (playerState?.mode === "life_action") {
        await stopAction().catch(() => undefined);
      }
      if (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.combatLoadout?.autoRepeat)) {
        await apiClient.fleeHpCombat().catch(() => undefined);
      }
      await apiClient.setPartyReady(currentPartyId, true).catch(() => undefined);
      await apiClient.startPartyActivity(currentPartyId, "raid", targetStageId, 30);
    });
  };

  const isBossWaveNow = currentWave % 10 === 0;
  const selfAlly = allies.find((a) => a.isSelf) || allies[0];

  return (
    <div className="trading-layout party-boss-layout">
      {error && (
        <div className="login-error" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* =====================================================================
          ACTIVE MULTI-VS-MULTI BOSS DUNGEON BATTLE SCREEN
         ===================================================================== */}
      {party?.currentActivity && activeDungeon ? (
        <div className="battle-full-screen party-multi-battle-screen">
          <div className="battle-status-panel-center party-status-panel-center">
            {/* Top Header: Dungeon Title + 10-Wave Progress Bar + Team Controls */}
            <div className="battle-header-bar party-battle-header">
            <div className="party-battle-title-block">
              <span className="party-dungeon-badge">👥 组队首领副本</span>
              <h3 className="battle-title">
                {activeDungeon.name} · 讨伐【{activeDungeon.boss.name}】
              </h3>
              <span className={`party-wave-pill ${isBossWaveNow ? "is-boss-wave" : ""}`}>
                {isBossWaveNow ? `🔥 第 ${currentWave} 波 · BOSS` : `第 ${currentWave} 波`}
              </span>
            </div>

            <div className="party-battle-header-actions">
              {party.members.length < 6 && (
                <button
                  type="button"
                  className="header-menu-btn"
                  disabled={busy}
                  onClick={() => run(() => apiClient.recruitPartyBot(party.id))}
                >
                  🤖 增援队友 ({party.members.length}/6)
                </button>
              )}
              <button
                type="button"
                className="header-menu-btn"
                onClick={() => setShowLobbyDetails((v) => !v)}
              >
                {showLobbyDetails ? "收起小队编成" : `👥 小队编成 (${party.members.length}/6)`}
              </button>
              <button
                type="button"
                className="btn-stop-battle"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await apiClient.cancelPartyActivity(party.id);
                  })
                }
              >
                🛑 结束副本
              </button>
            </div>
          </div>

          {/* Optional Collapsible Squad Management Drawer */}
          {showLobbyDetails && (
            <div className="category-section" style={{ marginBottom: 12, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <strong>{party.name || "冒险小队"}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.75 }}>
                    队伍码：<code>{party.id.slice(0, 8)}</code>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    className="chat-input"
                    style={{ width: "auto", minWidth: 180 }}
                    value={activeDungeon.id}
                    onChange={(e) => void quickStartBossDungeon(e.target.value)}
                  >
                    {bossDungeons.map((d) => (
                      <option key={d.id} value={d.id}>
                        切换副本：{d.name} · {d.boss.name} (Lv.{d.boss.level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* MULTI-VS-MULTI BATTLEFIELD ARENA */}
          <div className="battle-display-center party-multi-arena">
            {waveBanner && <div className="party-wave-banner">{waveBanner}</div>}

            {/* LEFT SIDE: ALLIED PARTY FORMATION (2-6 Characters Fighting Together) */}
            <div className="party-side-column party-allies-column">
              <div className={`party-units-grid allies-grid count-${Math.min(6, allies.length)}`}>
                {allies.map((ally) => {
                  const isDead = ally.hp <= 0;
                  const shaking = nowTs < ally.hitShakeUntil;
                  const attacking = !isDead && nowTs < ally.attackAnimUntil;
                  const hpPct = Math.max(0, Math.min(100, Math.round((ally.hp / Math.max(1, ally.maxHp)) * 100)));
                  const totalRevive = ally.reviveTotalMs || ALLY_REVIVE_MS;
                  const remRevive = isDead ? (ally.reviveRemainingMs > 0 ? ally.reviveRemainingMs : totalRevive) : 0;
                  const revivePct = isDead
                    ? Math.max(0, Math.min(100, Math.round(((totalRevive - remRevive) / Math.max(1, totalRevive)) * 100)))
                    : 0;
                  const castPct = isDead
                    ? revivePct
                    : Math.max(0, Math.min(100, Math.floor((ally.castMs / Math.max(1, ally.intervalMs)) * 100)));
                  const unitFloats = damageFloats.filter((f) => f.unitKey === `ally-${ally.userId}`);

                  return (
                    <div
                      key={ally.userId}
                      className={`battle-entity party-unit-card ally-unit-card${ally.isSelf ? " is-self-unit" : ""}${isDead ? " is-defeated-unit is-reviving-unit" : ""}${shaking ? " entity-hit" : ""}${attacking ? " unit-attacking-right" : ""}`}
                    >
                      <div className="party-unit-top">
                        <span className="entity-name">
                          {ally.isSelf ? "👑 " : ally.isBot ? "🤖 " : "🧑 "}
                          {ally.name}
                        </span>
                        <span className="entity-level">Lv.{ally.level}</span>
                      </div>
                      <div className="party-unit-role-tag">
                        {isDead ? `${Math.ceil(remRevive / 1000)}秒后复活` : ally.title}
                      </div>

                      <div className={`entity-avatar party-unit-avatar${shaking ? " avatar-shake" : ""}`}>
                        <T1Art kind="character" id={characterArtId(ally.classId, ally.gender)} alt={ally.name} />
                      </div>

                      <div className="damage-float-container">
                        {unitFloats.map((f) => (
                          <span
                            key={f.id}
                            className={`damage-float ${f.isHeal ? "damage-heal" : "damage-taken"}${f.isCrit ? " crit" : ""}`}
                          >
                            {f.tag ? `${f.tag} ` : ""}
                            {f.isHeal ? `+${f.value}` : `-${f.value}`}
                          </span>
                        ))}
                      </div>

                      <div className="hp-bar">
                        <div className="hp-label-enhanced">
                          <span>HP</span>
                          <span
                            className="hp-percentage"
                            style={{ color: hpPct > 50 ? "#4CAF50" : hpPct > 20 ? "#FFC107" : "#f44336" }}
                          >
                            {hpPct}%
                          </span>
                        </div>
                        <div className="hp-container">
                          <div
                            className="hp-fill player-hp"
                            style={{
                              width: `${hpPct}%`,
                              background:
                                hpPct > 50
                                  ? "linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)"
                                  : hpPct > 20
                                  ? "linear-gradient(90deg, #FFC107 0%, #FFD54F 100%)"
                                  : "linear-gradient(90deg, #f44336 0%, #EF5350 100%)",
                            }}
                          />
                        </div>
                        <div className="hp-numbers">
                          {ally.hp}/{ally.maxHp}
                        </div>
                      </div>

                      {ally.isSelf && (
                        <div className="mp-bar" aria-label="魔力">
                          <div className="mp-container">
                            <div
                              className="mp-fill"
                              style={{
                                width: `${Math.max(0, Math.min(100, (playerMp / Math.max(1, combatSheet.mp || 50)) * 100))}%`,
                              }}
                            />
                          </div>
                          <div className="mp-numbers">
                            MP {playerMp}/{combatSheet.mp || 50}
                          </div>
                        </div>
                      )}

                      <div className={`cast-bar${castPct > 80 ? " cast-nearly-ready" : ""}`}>
                        <div className="cast-container">
                          <div
                            className="cast-fill player-cast"
                            style={{
                              width: `${castPct}%`,
                              ...(isDead
                                ? {
                                    background: "linear-gradient(90deg, #f59e0b 0%, #34d399 100%)",
                                  }
                                : {}),
                            }}
                          />
                        </div>
                        <div className="cast-time" style={isDead ? { color: "#fcd34d", fontWeight: 700 } : undefined}>
                          {isDead
                            ? `${Math.ceil(remRevive / 1000)}秒后复活`
                            : `${(ally.castMs / 1000).toFixed(1)}s / ${(ally.intervalMs / 1000).toFixed(1)}s`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CENTER VS EMBLEM */}
            <div className="battle-vs-center party-vs-column">
              <div className="vs-text">VS</div>
              <div className="turn-indicator">
                {isBossWaveNow ? `🔥 第 ${currentWave} 波` : `第 ${currentWave} 波`}
              </div>
              <div className="party-vs-sub">
                {allies.filter((a) => a.hp > 0).length} 对 {enemies.filter((e) => e.hp > 0).length}
              </div>
            </div>

            {/* RIGHT SIDE: ENEMY FORMATION (Waves 1-9: 3 Simultaneous Monsters; Wave 10: BOSS) */}
            <div className="party-side-column party-enemies-column">
              <div className={`party-units-grid enemies-grid ${isBossWaveNow ? "boss-single-grid" : "multi-minion-grid"}`}>
                {enemies.map((enemy) => {
                  const isDead = enemy.hp <= 0;
                  const shaking = nowTs < enemy.hitShakeUntil;
                  const attacking = nowTs < enemy.attackAnimUntil;
                  const hpPct = Math.max(0, Math.min(100, Math.round((enemy.hp / Math.max(1, enemy.maxHp)) * 100)));
                  const castPct = isDead ? 0 : Math.max(0, Math.min(100, Math.floor((enemy.castMs / Math.max(1, enemy.intervalMs)) * 100)));
                  const unitFloats = damageFloats.filter((f) => f.unitKey === enemy.slotKey);

                  return (
                    <div
                      key={enemy.slotKey}
                      className={`battle-entity party-unit-card enemy-unit-card${enemy.isBoss ? " is-boss-unit" : ""}${isDead ? " is-defeated-unit" : ""}${shaking ? " entity-hit" : ""}${attacking ? " unit-attacking-left" : ""}`}
                    >
                      <div className="party-unit-top">
                        <span className="entity-name">
                          {enemy.isBoss ? "👑 " : ""}
                          {enemy.name}
                        </span>
                        <span className="entity-level">Lv.{enemy.level}</span>
                      </div>

                      <div className="party-unit-role-tag">
                        {isDead ? "💀 已击倒" : enemy.isBoss ? "首领" : "魔物"}
                      </div>

                      <div className={`entity-avatar party-unit-avatar${shaking ? " avatar-shake" : ""}${enemy.isBoss ? " is-boss-art" : ""}`}>
                        <T1Art kind="monster" id={enemy.id} alt={enemy.name} />
                      </div>

                      <div className="damage-float-container">
                        {unitFloats.map((f) => (
                          <span key={f.id} className={`damage-float damage-dealt${f.isCrit ? " crit" : ""}`}>
                            {f.tag ? `${f.tag} ` : ""}-{f.value}
                          </span>
                        ))}
                      </div>

                      <div className="hp-bar">
                        <div className="hp-label-enhanced">
                          <span>HP</span>
                          <span
                            className="hp-percentage"
                            style={{ color: hpPct > 50 ? "#f44336" : hpPct > 20 ? "#FF9800" : "#4CAF50" }}
                          >
                            {hpPct}%
                          </span>
                        </div>
                        <div className="hp-container">
                          <div
                            className="hp-fill enemy-hp"
                            style={{
                              width: `${hpPct}%`,
                              background:
                                hpPct > 50
                                  ? "linear-gradient(90deg, #f44336 0%, #EF5350 100%)"
                                  : hpPct > 20
                                  ? "linear-gradient(90deg, #FF9800 0%, #FFB74D 100%)"
                                  : "linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)",
                            }}
                          />
                        </div>
                        <div className="hp-numbers">
                          {enemy.hp}/{enemy.maxHp}
                        </div>
                      </div>

                      <div className={`cast-bar${castPct > 80 ? " cast-nearly-ready" : ""}`}>
                        <div className="cast-container">
                          <div className="cast-fill enemy-cast" style={{ width: `${castPct}%` }} />
                        </div>
                        <div className="cast-time">
                          {isDead
                            ? "已击倒"
                            : `${(enemy.castMs / 1000).toFixed(1)}s / ${(enemy.intervalMs / 1000).toFixed(1)}s`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Run Statistics Bar (MWI style) */}
          {(() => {
            const parsedActivityStart = party?.currentActivity?.startedAt ? Date.parse(party.currentActivity.startedAt) : NaN;
            const trueStartMs = Number.isFinite(parsedActivityStart) && parsedActivityStart > 0 ? parsedActivityStart : runStats.startedAt;
            const elapsedMs = Math.max(0, nowTs - trueStartMs);
            const totalSecs = Math.max(0, Math.floor(elapsedMs / 1000));
            const hrs = Math.floor(totalSecs / 3600);
            const mins = Math.floor((totalSecs % 3600) / 60);
            const secs = totalSecs % 60;
            const durationText =
              hrs > 0
                ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
                : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
            const lootEntries = Object.entries(runStats.loot);
            return (
              <div className="battle-run-stats" aria-label="组队副本累计统计">
                <span className="run-stat">
                  <small>战斗时长</small>
                  <strong>{durationText}</strong>
                  <em>第 {currentWave} 波</em>
                </span>
                <span className="run-stat">
                  <small>累计击杀</small>
                  <strong>{runStats.totalKills.toLocaleString()}</strong>
                </span>
                <span className="run-stat">
                  <small>死亡次数</small>
                  <strong className={runStats.deaths > 0 ? "stat-danger-val" : ""}>{runStats.deaths}</strong>
                </span>
                <span className="run-stat">
                  <small>累计经验</small>
                  <strong>+{Math.round(runStats.xp).toLocaleString()}</strong>
                </span>
                <span className="run-stat">
                  <small>累计金币</small>
                  <strong>+{Math.round(runStats.gold).toLocaleString()}</strong>
                </span>
                <span className="run-stat run-loot">
                  <small>累计掉落</small>
                  {lootEntries.length === 0 ? (
                    <strong>暂无</strong>
                  ) : (
                    <span className="run-loot-list">
                      {lootEntries.map(([itemId, info]) => (
                        <span className="run-loot-chip" key={itemId} title={`${info.name} ×${info.qty}`}>
                          <T1ItemIcon itemId={itemId} fallback={getItemIconFallback(itemId)} alt="" />
                          <span className="run-loot-name">{info.name}</span>
                          <b>×{info.qty}</b>
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </div>
            );
          })()}

          {/* Player Ability Controls (Auto-cast Icon CD Bar) */}
          <div className="battle-controls-center">
            <div className="battle-progress">
              <AbilityBar
                abilities={equippedAbilities}
                readyAt={(id) => abilityCooldowns[id] || 0}
                now={nowTs}
                mp={playerMp}
                maxMp={combatSheet.mp || 50}
                guardActive={nowTs < selfGuardRef.current.until}
                disabled={false}
              />
            </div>
          </div>

          {/* Player Combat Potion Bar */}
          {playerState && (
            <CombatPotionBar
              inCombat
              loadout={playerState.combatLoadout}
              items={contentPack?.items as any}
              inventory={playerState.inventory}
              equipment={playerState.equipment as any}
              activeBuffs={playerState.activeBuffs}
              playerHp={selfAlly?.hp ?? combatSheet.hp}
              playerMaxHp={selfAlly?.maxHp ?? combatSheet.hp}
              playerMp={playerMp}
              playerMaxMp={combatSheet.mp || 50}
              now={nowTs}
              iconOf={getItemIconFallback}
              onChangeLoadout={async (next) => {
                try {
                  apiClient.clearCache();
                  await apiClient.setCombatLoadout(next);
                  await refreshPlayerState();
                } catch (e: any) {
                  toast.error(e?.message || "保存药剂槽失败");
                }
              }}
              onManualConsume={async (itemId) => {
                try {
                  if (selfAlly && selfAlly.hp <= 0) {
                    toast.info("角色正在复活倒计时中，暂时无法饮用药剂");
                    return;
                  }
                  apiClient.clearCache();
                  const res = await apiClient.consumeItem(itemId);
                  await refreshPlayerState();
                  if (res?.healed?.hp) {
                    setAllies((prev) =>
                      prev.map((a) =>
                        a.isSelf && a.hp > 0 ? { ...a, hp: Math.min(a.maxHp, a.hp + Number(res.healed.hp)) } : a
                      )
                    );
                  }
                  if (res?.healed?.mp) {
                    setPlayerMp((mp) => {
                      const nextMp = Math.min(combatSheet.mp || 50, mp + Number(res.healed.mp));
                      playerMpRef.current = nextMp;
                      return nextMp;
                    });
                  }
                  toast.success(`已饮用 ${res?.itemName || itemId}`);
                } catch (e: any) {
                  toast.error(e?.message || "饮用药剂失败");
                }
              }}
              onQuickBuyPotion={async (itemId, qty) => {
                try {
                  apiClient.clearCache();
                  await apiClient.shopBuy(itemId, qty);
                  await refreshPlayerState();
                  toast.success(`购买成功 ×${qty}`);
                  return true;
                } catch (e: any) {
                  toast.error(e?.message || "金币不足或购买失败");
                  return false;
                }
              }}
            />
          )}

          {/* Live Multi-vs-Multi Battle Log */}
          <div className="battle-log-center">
            <h4>战斗记录</h4>
            <div className="log-content">
              {battleLog.map((log, index) => {
                const isWaveClear = log.includes("清剿完成") || log.includes("首领击破");
                const isBossLine = log.includes("首领") || log.includes("👹");
                return (
                  <div
                    key={`${currentWave}-${index}`}
                    className={`log-entry${isWaveClear ? " log-drop" : isBossLine ? " log-phase" : ""}`}
                  >
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
            BOSS DUNGEON SELECTION & PARTY LOBBY (Before Battle Starts)
           ===================================================================== */
        <>
          <div className="page-header">
            <h2 className="section-title">组队首领副本</h2>
            <div className="page-info">
              <p>
                🔥 <b>仅首领关（Boss 副本）开放组队挑战</b>：前 9 波每一波同时迎战 3 只区域小怪，每第 10 波迎战区域首领 BOSS！最多 6 人小队同屏多对多激战。
              </p>
            </div>
          </div>

          {/* BOSS DUNGEON SELECTOR CARDS */}
          <div className="category-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>👑 选择首领副本（前 9 波群怪围猎 · 每 10 波 BOSS 决战）</h3>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                {party ? `当前小队：${party.name || "冒险小队"} (${party.members.length}/6 人)` : "点击任意首领副本可自动组队并开战"}
              </span>
            </div>

            <div className="party-boss-dungeon-grid">
              {bossDungeons.slice(0, 6).map((dungeon) => {
                const isSelected = normalizeStageId(actStage) === dungeon.id;
                return (
                  <div
                    key={dungeon.id}
                    className={`party-boss-dungeon-card${isSelected ? " selected" : ""}`}
                    onClick={() => setActStage(dungeon.id)}
                  >
                    <div className="party-boss-card-top">
                      <div className="party-boss-avatar">
                        <T1Art kind="monster" id={dungeon.boss.id} fallback={dungeon.boss.icon || "👹"} alt={dungeon.boss.name} />
                      </div>
                      <div className="party-boss-meta">
                        <div className="party-boss-stage-name">{dungeon.name}</div>
                        <div className="party-boss-name">
                          👑 {dungeon.boss.name} <small>Lv.{dungeon.boss.level}</small>
                        </div>
                        <div className="party-boss-rule-badges">
                          <span className="rule-badge">第1~9波：3只小怪同屏</span>
                          <span className="rule-badge boss">第10波：首领BOSS</span>
                        </div>
                      </div>
                    </div>

                    <div className="party-boss-minion-strip">
                      <small>前9波群怪阵容：</small>
                      <div className="minion-tags">
                        {dungeon.minions.slice(0, 4).map((m) => (
                          <span key={m.id} className="minion-tag">
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="party-boss-card-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void quickStartBossDungeon(dungeon.id);
                        }}
                      >
                        {party ? `⚔️ 开启【${dungeon.boss.name}】多对多副本` : `⚡ 立即组队挑战【${dungeon.boss.name}】`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CURRENT PARTY ROSTER OR PUBLIC BOT PARTIES */}
          {!party ? (
            <>
              {invites.length > 0 && (
                <div className="category-section">
                  <h3>队伍邀请</h3>
                  <ul>
                    {invites.map((inv) => (
                      <li key={inv.partyId} className="party-id-row">
                        收到冒险小队邀请（队伍码 <code>{inv.partyId.slice(0, 8)}</code>）
                        <button
                          className="btn btn-primary"
                          style={{ marginLeft: 8 }}
                          disabled={busy}
                          onClick={() => run(() => apiClient.acceptPartyInvite(inv.partyId))}
                        >
                          接受
                        </button>
                        <button
                          className="btn"
                          style={{ marginLeft: 4 }}
                          disabled={busy}
                          onClick={() => run(() => apiClient.declinePartyInvite(inv.partyId))}
                        >
                          拒绝
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="category-section">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <h3 style={{ margin: 0 }}>常驻讨伐小队（加入即享满编协战队友）</h3>
                  <button className="btn btn-primary" disabled={busy} onClick={() => run(() => apiClient.createParty())}>
                    + 创建我的讨伐小队
                  </button>
                </div>

                {publicParties.length === 0 ? (
                  <p>暂无公开队伍，可直接点击上方首领卡片一键组建小队开战！</p>
                ) : (
                  <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {publicParties.map((p) => {
                      const stageNorm = normalizeStageId(p.recommendedStageId);
                      const targetDungeon = bossDungeons.find((d) => d.id === stageNorm) || bossDungeons[0];
                      return (
                        <li
                          key={p.id}
                          className="party-id-row"
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}
                        >
                          <span>
                            <strong>{p.name || "冒险小队"}</strong>
                            {p.leaderName && <span style={{ opacity: 0.85 }}> · 驻守：{p.leaderName}</span>}
                            <span> · {p.memberCount}/6 人</span>
                            {targetDungeon && (
                              <span style={{ marginLeft: 8, fontSize: 12, color: "#fbbf24" }}>
                                🎯 目标：{targetDungeon.name} · {targetDungeon.boss.name}
                              </span>
                            )}
                            {p.isBotParty && (
                              <span style={{ marginLeft: 6, fontSize: 12, color: "var(--accent, #6ee7b7)" }}>
                                🤖 队员已准备
                              </span>
                            )}
                          </span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn"
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  if (p.recommendedStageId) setActStage(normalizeStageId(p.recommendedStageId));
                                  await apiClient.joinParty(p.id);
                                })
                              }
                            >
                              加入小队
                            </button>
                            <button
                              className="btn btn-primary"
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  const stg = normalizeStageId(p.recommendedStageId || actStage);
                                  setActStage(stg);
                                  waveTransitionRef.current = false;
                                  clearTransitionTimers();
                                  if (playerState?.mode === "life_action") {
                                    await stopAction().catch(() => undefined);
                                  }
                                  if (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.combatLoadout?.autoRepeat)) {
                                    await apiClient.fleeHpCombat().catch(() => undefined);
                                  }
                                  await apiClient.joinParty(p.id);
                                  await apiClient.setPartyReady(p.id, true).catch(() => undefined);
                                  await apiClient.startPartyActivity(p.id, "raid", stg, 30).catch(() => undefined);
                                })
                              }
                            >
                              ⚔️ 加入并直接开战
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="chat-input-area" style={{ marginTop: 12 }}>
                  <input
                    className="chat-input"
                    placeholder="输入好友队伍 ID 加入"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.trim())}
                  />
                  <button className="chat-send-btn" disabled={busy || !joinId} onClick={() => run(() => apiClient.joinParty(joinId))}>
                    加入
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="category-section">
              <div
                className="party-id-row"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}
              >
                <div>
                  <strong style={{ fontSize: 15 }}>{party.name || "冒险小队"}</strong>
                  <span style={{ marginLeft: 10, opacity: 0.75, fontSize: 12 }}>
                    队伍码：<code>{party.id.slice(0, 8)}</code>
                  </span>
                </div>
                <button
                  type="button"
                  className="header-menu-btn"
                  onClick={() => {
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard
                        .writeText(party.id)
                        .then(() => toast.success("已复制队伍 ID"))
                        .catch(() => toast.info(`队伍 ID：${party.id}`));
                    } else {
                      toast.info(`队伍 ID：${party.id}`);
                    }
                  }}
                >
                  复制完整 ID
                </button>
              </div>

              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {party.members.map((m) => {
                  const memberReady = Boolean(m.isReady || m.isBot);
                  return (
                    <li
                      key={m.userId}
                      className="party-id-row"
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
                    >
                      <span>
                        {m.isBot ? "🤖" : m.isOnline ? "🟢" : "⚫"} <b>{m.role === "leader" ? "队长" : "队员"}</b> ·{" "}
                        <span>{m.displayName || "神秘冒险者"}</span>
                        {m.title && <small style={{ marginLeft: 6, opacity: 0.75 }}>[{m.title}]</small>}
                        {m.combatLevel && <small style={{ marginLeft: 6, opacity: 0.8 }}>Lv.{m.combatLevel}</small>}
                        {m.userId === userId ? "（你）" : ""}
                        <span
                          style={{
                            marginLeft: 8,
                            padding: "1px 7px",
                            borderRadius: 999,
                            fontSize: 12,
                            background: memberReady ? "rgba(16, 185, 129, 0.18)" : "rgba(245, 158, 11, 0.18)",
                            color: memberReady ? "#34d399" : "#fbbf24",
                            border: `1px solid ${memberReady ? "rgba(52, 211, 153, 0.35)" : "rgba(251, 191, 36, 0.35)"}`,
                          }}
                        >
                          {memberReady ? "✅ 已准备" : "⏳ 待准备"}
                        </span>
                      </span>
                      {isLeader && m.userId !== userId && (
                        <span style={{ marginLeft: 8 }}>
                          {!m.isBot && (
                            <button className="btn" disabled={busy} onClick={() => run(() => apiClient.transferPartyLeadership(party.id, m.userId))}>
                              移交队长
                            </button>
                          )}
                          <button
                            className="btn"
                            style={{ marginLeft: 4 }}
                            disabled={busy}
                            onClick={() => run(() => apiClient.kickPartyMember(party.id, m.userId))}
                          >
                            移出
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void quickStartBossDungeon(actStage)}
                >
                  ⚔️ 开始首领副本（{activeDungeon?.name || "呼呼大睡森林"} · {activeDungeon?.boss.name || "树精首领"}）
                </button>
                <button
                  type="button"
                  className={selfReady ? "btn" : "btn"}
                  disabled={busy}
                  onClick={() => run(() => apiClient.setPartyReady(party.id, !selfReady))}
                >
                  {selfReady ? "✅ 已准备" : "✋ 点击准备"}
                </button>
                {party.members.length < 6 && (
                  <button type="button" className="btn" disabled={busy} onClick={() => run(() => apiClient.recruitPartyBot(party.id))}>
                    🤖 招募机器人队友 ({party.members.length}/6)
                  </button>
                )}
                <button className="btn" disabled={busy} onClick={() => run(() => apiClient.leaveParty(party.id))}>
                  {isLeader && party.members.length === 1 ? "解散队伍" : "离开队伍"}
                </button>
              </div>

              {party.members.length < 6 && (
                <div className="chat-input-area" style={{ marginTop: 10 }}>
                  <input
                    className="chat-input"
                    placeholder="输入真人玩家 ID 邀请入队"
                    value={inviteId}
                    onChange={(e) => setInviteId(e.target.value.trim())}
                  />
                  <button
                    className="chat-send-btn"
                    disabled={busy || !inviteId}
                    onClick={() =>
                      run(async () => {
                        await apiClient.inviteToParty(party.id, inviteId);
                        setInviteId("");
                      })
                    }
                  >
                    邀请玩家
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
