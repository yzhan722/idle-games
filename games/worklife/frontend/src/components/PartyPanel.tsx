import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../services/api";
import { useGame } from "../contexts/GameContext";
import { useAuth } from "../hooks/useAuth";
import { chatWs } from "../services/websocket";
import { T1Art, T1ItemIcon, characterArtId } from "./T1Art";
import { MonsterSceneBackdrop } from "./MonsterSceneBackdrop";
import { CombatPotionBar } from "./CombatPotionBar";
import { AbilityBar } from "./AbilityBar";
import { abilitySlotCount, combatSheetFromPack } from "../gameplay/combatSheet";
import { abilityCastXp, abilityEffectiveCooldownMs, previewAbilities } from "../gameplay/fightPreview";
import { playGameSound } from "../gameplay/sound";
import { useToast } from "./Toast";
import type { AbilityDef, PartyState } from "../types/game";
import {
  ALLY_REVIVE_MS,
  getBossGuardCount,
  getBossSignatureSkills,
  getItemIconFallback,
  getWaveMinionCount,
  normalizeStageId,
  type AllyCombatUnit,
  type DamageFloatItem,
  type EnemyCombatUnit,
  type PartyInvite,
  type PartyListItem,
  type PartyPayload,
  type StageBossDungeon,
} from "../gameplay/partyRaidData";
import { PartyLobbyView } from "./PartyLobbyView";

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
  const selfTauntUntilRef = useRef<number>(0);
  const teamAuraRef = useRef<{ until: number; atkPct: number; critPct: number }>({ until: 0, atkPct: 0, critPct: 0 });

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

  const abilityCastsRef = useRef<Record<string, number>>({});

  const userId = user?.id as string | undefined;
  const partyState = playerState?.partyState as PartyState | undefined;
  const invites = ((playerState as any)?.partyInvites ?? []) as PartyInvite[];
  const isLeader = !!party && party.leaderId === userId;

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
          name: String(boss.name || boss.id).replace(/\s*[(（]BOSS[)）]\s*$/i, ""),
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
        title: `${activeDungeon.name} · ${activeDungeon.boss.name}`,
        subtitle: `第 ${currentWave} 波${isBossWave ? " · 首领战" : ""}`,
      });
    } else if (!party?.currentActivity) {
      onCombatStatusChange?.(null);
    }
  }, [partyLoaded, party?.id, party?.currentActivity, activeDungeon, currentWave, onCombatStatusChange]);

  // Build wave enemies: Waves 1-9 scale monster count dynamically with partySize (2-6 monsters);
  // Every 10th Wave spawns the strengthened Zone Boss + dynamic Elite Guards when partySize >= 3!
  const buildWaveEnemies = useCallback((dungeon: StageBossDungeon, wave: number, partySize: number): EnemyCombatUnit[] => {
    const isBossWave = wave % 10 === 0;
    const cycleIndex = Math.floor((wave - 1) / 10);
    const waveScale = 1 + cycleIndex * 0.38 + ((wave - 1) % 10) * 0.045;
    const teamScale = 1 + Math.max(0, partySize - 1) * 0.42;
    const pool = dungeon.minions.length > 0 ? dungeon.minions : [dungeon.boss];

    if (isBossWave) {
      const b = dungeon.boss;
      const bossHp = Math.max(420, Math.round(b.hp * waveScale * teamScale * 2.15));
      const bossAtk = Math.max(18, Math.round(b.atk * (1.35 + cycleIndex * 0.28 + Math.max(0, partySize - 1) * 0.12)));
      const bossDef = Math.max(5, Math.round(b.def * (1.2 + cycleIndex * 0.18)));
      const units: EnemyCombatUnit[] = [
        {
          slotKey: `enemy-boss-${wave}`,
          id: b.id,
          name: `${b.name}${cycleIndex > 0 ? ` · 觉醒${cycleIndex + 1}阶` : ""}`,
          level: b.level + cycleIndex * 3,
          isBoss: true,
          hp: bossHp,
          maxHp: bossHp,
          atk: bossAtk,
          def: bossDef,
          xp: Math.max(25, Math.round((b.xp || 80) * (1 + cycleIndex * 0.3))),
          gold: Math.max(15, Math.round((b.gold || 50) * (1 + cycleIndex * 0.3))),
          castMs: 900,
          intervalMs: 2300,
          hitShakeUntil: 0,
          attackAnimUntil: 0,
          attackCount: 0,
          nextSkillIdx: 0,
          shieldUntil: 0,
          enraged: false,
        },
      ];
      const guardCount = getBossGuardCount(partySize);
      for (let g = 0; g < guardCount; g++) {
        const gm = pool[(pool.length - 1 - g + pool.length) % pool.length];
        const guardHp = Math.max(120, Math.round(gm.hp * waveScale * (1.1 + partySize * 0.18)));
        units.push({
          slotKey: `enemy-guard-${wave}-${g}`,
          id: gm.id,
          name: `首领亲卫·${gm.name}`,
          level: gm.level + cycleIndex * 2 + 1,
          isBoss: false,
          isEliteGuard: true,
          hp: guardHp,
          maxHp: guardHp,
          atk: Math.max(8, Math.round(gm.atk * (1.1 + cycleIndex * 0.2))),
          def: Math.max(3, Math.round(gm.def * (1.1 + cycleIndex * 0.15))),
          xp: Math.max(10, Math.round((gm.xp || 16) * (1.2 + cycleIndex * 0.2))),
          gold: Math.max(5, Math.round((gm.gold || 10) * (1.2 + cycleIndex * 0.2))),
          castMs: 500 + g * 550,
          intervalMs: 2400 + g * 220,
          hitShakeUntil: 0,
          attackAnimUntil: 0,
          attackCount: 0,
          nextSkillIdx: 0,
          shieldUntil: 0,
          enraged: false,
        });
      }
      return units;
    }

    const waveOffset = (wave - 1) % 10;
    // Waves 1-9: dynamically scale monster count with partySize (2 to 6 monsters)!
    const count = getWaveMinionCount(partySize);
    const units: EnemyCombatUnit[] = [];
    for (let i = 0; i < count; i++) {
      const m = pool[(waveOffset + i) % pool.length];
      const hp = Math.max(40, Math.round(m.hp * waveScale * (0.85 + partySize * 0.16)));
      units.push({
        slotKey: `enemy-${wave}-${i}`,
        id: m.id,
        name: `${m.name} #${i + 1}`,
        level: m.level + cycleIndex * 2,
        isBoss: false,
        hp,
        maxHp: hp,
        atk: Math.max(5, Math.round(m.atk * (0.95 + cycleIndex * 0.18 + Math.max(0, partySize - 2) * 0.05))),
        def: Math.max(1, Math.round(m.def * (1 + cycleIndex * 0.12))),
        xp: Math.max(5, Math.round((m.xp || 12) * (1 + cycleIndex * 0.2))),
        gold: Math.max(2, Math.round((m.gold || 6) * (1 + cycleIndex * 0.2))),
        castMs: (i * 480) % 2200,
        intervalMs: 2400 + (i % 3) * 240,
        hitShakeUntil: 0,
        attackAnimUntil: 0,
        attackCount: 0,
        nextSkillIdx: 0,
        shieldUntil: 0,
        enraged: false,
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
        const baseLvHp = 70 + lv * 14;
        const baseLvAtk = 8 + Math.round(lv * 2.4);
        const baseLvDef = 2 + Math.round(lv * 0.85);
        const maxHp = isSelf ? playerMaxHp : Math.max(90, baseLvHp, Math.round(playerMaxHp * (0.88 + (idx % 3) * 0.12)));
        const atk = isSelf ? playerAtk : Math.max(9, baseLvAtk, Math.round(playerAtk * (0.78 + (idx % 3) * 0.1)));
        const def = isSelf ? playerDef : Math.max(3, baseLvDef, Math.round(playerDef * 0.85));
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
          const rawWave = startWave + extraWaves;
          restoredWave = ((rawWave - 1) % 10) + 1;
          const extraBossKills = Math.max(0, Math.floor((rawWave - 1) / 10) - Math.floor((startWave - 1) / 10));
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
      restoredWave = (initialWaves % 10) + 1;
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

    if (
      restoredStats.bossKills > 0 &&
      (playerState?.stats?.killsByMonster?.[activeDungeon.boss.id] || 0) === 0
    ) {
      void apiClient
        .partyWaveClear(party.id, activeDungeon.id, 10, {})
        .then(() => refreshPlayerState())
        .catch(() => undefined);
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
    const bossSkills = getBossSignatureSkills(activeDungeon.boss.id);
    setBattleLog([
      `【出征】组队首领副本【${activeDungeon.name}】开启！我方 ${initialAllies.length} 人小队集结，敌方随小队规模出动 ${initialEnemies.length} 只魔物！`,
      `【首领】${activeDungeon.boss.name} 独门秘技：${bossSkills.map((s) => `《${s.name}》(${s.tag})`).join("、")}！`,
      `【敌袭】第 ${restoredWave} 波来袭：${initialEnemies.map((e) => e.name).join("、")} 同时出战！`,
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
      if (fresh.length > prev.length && activeDungeon) {
        // Dynamically scale live wave enemies when player recruits more teammates mid-battle!
        setEnemies((prevEnemies) => {
          const isBossW = currentWave % 10 === 0;
          const desiredTotal = isBossW ? 1 + getBossGuardCount(fresh.length) : getWaveMinionCount(fresh.length);
          if (prevEnemies.length >= desiredTotal) return prevEnemies;
          const templateWave = buildWaveEnemies(activeDungeon, currentWave, fresh.length);
          const extra = templateWave.slice(prevEnemies.length).map((u, idx) => ({
            ...u,
            slotKey: `${u.slotKey}-reinforce-${Date.now()}-${idx}`,
          }));
          if (extra.length > 0) {
            appendBattleLog(`【敌援】小队人数扩编至 ${fresh.length} 人，敌方增援【${extra.map((e) => e.name).join("、")}】加入战场！`);
          }
          return [...prevEnemies, ...extra];
        });
      }
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
  }, [party, buildAlliesFormation, buildWaveEnemies, activeDungeon, currentWave, appendBattleLog, playerState, stopAction, onCombatStatusChange]);

  // Advance to next wave when all enemies in current wave are defeated
  const handleWaveCleared = useCallback(
    async (clearedWave: number) => {
      if (!party || !activeDungeon || waveTransitionRef.current) return;
      waveTransitionRef.current = true;
      const isBossWave = clearedWave % 10 === 0;
      playGameSound("victory");

      try {
        const waveCasts = { ...abilityCastsRef.current };
        abilityCastsRef.current = {};
        const res: any = await apiClient.partyWaveClear(party.id, activeDungeon.id, clearedWave, waveCasts);
        const xpGained = Number(res?.xpGained || (isBossWave ? activeDungeon.boss.xp * 2 : 36));
        const goldGained = Number(res?.goldGained || (isBossWave ? activeDungeon.boss.gold * 2 : 20));
        const drops: Array<{ itemId: string; name: string; qty: number }> = Array.isArray(res?.drops) ? res.drops : [];
        const abilityLevelUps: Array<{ id: string; name: string; level: number }> = Array.isArray(res?.abilityLevelUps) ? res.abilityLevelUps : [];

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
            ? `【第 ${clearedWave} 波 · 首领击破】全队合力斩杀 ${activeDungeon.boss.name}！获得 +${xpGained} 经验、+${goldGained} 金币${dropText}！`
            : `【第 ${clearedWave} 波清剿完成】击溃全部魔物！获得 +${xpGained} 经验、+${goldGained} 金币${dropText}`
        );
        for (const lu of abilityLevelUps) {
          appendBattleLog(`【技能升级】「${lu.name}」熟练度突破，升至 Lv.${lu.level}！`);
        }
        void refreshPlayerState();
      } catch {
        // Fallback local log if network hiccups
        appendBattleLog(`第 ${clearedWave} 波清剿完成！准备迎接下一波敌人！`);
      }

      const nextWave = clearedWave + 1;
      const nextIsBoss = nextWave % 10 === 0;
      setWaveBanner(
        nextIsBoss
          ? `第 ${nextWave} 波 · BOSS`
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
            ? `【首领登场】警报！第 ${nextWave} 波区域首领【${activeDungeon.boss.name}】登场！`
            : `【敌袭】第 ${nextWave} 波出现 ${nextEnemies.length} 只敌人：${nextEnemies.map((e) => e.name).join("、")}！`
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
      setWaveBanner(`第 ${failedWave} 波团灭！重整旗鼓退回第 1 波...`);
      appendBattleLog(`【全队覆没】第 ${failedWave} 波小队全员力竭阵亡，讨伐失败！正在休整并退回第 1 波重新挑战...`);

      scheduleTransitionTimeout(() => {
        const resetAllies = buildAlliesFormation(party);
        const wave1Enemies = buildWaveEnemies(activeDungeon, 1, Math.max(1, resetAllies.length));
        const fullMp = combatSheet.mp || 50;
        playerMpRef.current = fullMp;
        setCurrentWave(1);
        setAllies(resetAllies);
        setEnemies(wave1Enemies);
        setPlayerMp(fullMp);
        appendBattleLog(`【重整】小队已在营地重整完毕，重新从第 1 波发起讨伐！`);
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
                  appendBattleLog(`【复活】【${ally.name}】复活倒计时结束，已满状态复活重返战场！`);
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
                    trig.type === "ally_hp_below" &&
                    !nextAllies.some((a) => a.hp > 0 && (a.hp / Math.max(1, a.maxHp)) * 100 <= trig.pct)
                  ) {
                    continue;
                  }
                  if (trig.type === "enemies_at_least" && livingEnemiesNow.length < Math.max(1, trig.pct || 1)) {
                    continue;
                  }
                  if (
                    trig.type === "enemy_hp_below" &&
                    !livingEnemiesNow.some((e) => (e.hp / Math.max(1, e.maxHp)) * 100 <= trig.pct)
                  ) {
                    continue;
                  }
                  if (trig.type === "enemy_guard" && !livingEnemiesNow.some((e) => e.isBoss || now < e.shieldUntil)) {
                    continue;
                  }
                  const levelMult = 1 + Math.max(0, (slot.level || 1) - 1) * (def.levelStep ?? 0.05);
                  const cdMs = Math.max(1500, abilityEffectiveCooldownMs(def, slot.level || 1));
                  const castXp = abilityCastXp(def, activeDungeon?.boss.level || 1);
                  if (def.healPct && def.healPct > 0 && !def.damageMult) {
                    const wounded = nextAllies.some((a) => a.hp > 0 && a.hp <= a.maxHp * 0.85);
                    if (!wounded && !def.guardMult && !def.auraAtkPct) continue;
                    playerMpRef.current = Math.max(0, playerMpRef.current - mpCost);
                    if (def.mpRestore) {
                      playerMpRef.current = Math.min(combatSheet.mp || 50, playerMpRef.current + Math.round(def.mpRestore * levelMult));
                    }
                    setPlayerMp(playerMpRef.current);
                    abilityCooldownsRef.current = { ...abilityCooldownsRef.current, [def.id]: now + cdMs };
                    setAbilityCooldowns(abilityCooldownsRef.current);
                    abilityCastsRef.current[def.id] = (abilityCastsRef.current[def.id] || 0) + 1;
                    if (def.auraAtkPct || def.auraCritPct) {
                      teamAuraRef.current = {
                        until: now + Number(def.auraDurationMs || 10000),
                        atkPct: Math.round((def.auraAtkPct || 20) * levelMult),
                        critPct: Math.round((def.auraCritPct || 15) * levelMult),
                      };
                    }
                    if (def.guardMult) {
                      const reduce = Math.min(0.8, (1 - def.guardMult) * levelMult);
                      selfGuardRef.current = {
                        until: now + Number(def.durationMs || 6000),
                        mult: Math.max(0.2, 1 - reduce),
                      };
                      if (def.tauntDurationMs) {
                        selfTauntUntilRef.current = now + Number(def.tauntDurationMs);
                      }
                    }
                    for (const a of nextAllies) {
                      if (a.hp <= 0) continue;
                      const healAmt = Math.max(12, Math.round(a.maxHp * def.healPct * levelMult));
                      a.hp = Math.min(a.maxHp, a.hp + healAmt);
                      pushFloat(`ally-${a.userId}`, healAmt, { isHeal: true, tag: def.name });
                    }
                    appendBattleLog(`【治疗】自动释放【${def.name} Lv.${slot.level || 1}】，为全体存活队友恢复生命值（+${castXp} 技能经验）！`);
                    break;
                  } else if (def.damageMult && def.damageMult > 0) {
                    playerMpRef.current = Math.max(0, playerMpRef.current - mpCost);
                    if (def.mpRestore) {
                      playerMpRef.current = Math.min(combatSheet.mp || 50, playerMpRef.current + Math.round(def.mpRestore * levelMult));
                    }
                    setPlayerMp(playerMpRef.current);
                    abilityCooldownsRef.current = { ...abilityCooldownsRef.current, [def.id]: now + cdMs };
                    setAbilityCooldowns(abilityCooldownsRef.current);
                    abilityCastsRef.current[def.id] = (abilityCastsRef.current[def.id] || 0) + 1;
                    if (def.auraAtkPct || def.auraCritPct) {
                      teamAuraRef.current = {
                        until: now + Number(def.auraDurationMs || 10000),
                        atkPct: Math.round((def.auraAtkPct || 20) * levelMult),
                        critPct: Math.round((def.auraCritPct || 15) * levelMult),
                      };
                    }
                    if (def.guardMult) {
                      const reduce = Math.min(0.8, (1 - def.guardMult) * levelMult);
                      selfGuardRef.current = {
                        until: now + Number(def.durationMs || 6000),
                        mult: Math.max(0.2, 1 - reduce),
                      };
                    }
                    if (def.healPct && def.healPct > 0) {
                      for (const a of nextAllies) {
                        if (a.hp <= 0 || (!def.isPartyHeal && !a.isSelf)) continue;
                        const healAmt = Math.max(10, Math.round(a.maxHp * def.healPct * levelMult));
                        a.hp = Math.min(a.maxHp, a.hp + healAmt);
                        pushFloat(`ally-${a.userId}`, healAmt, { isHeal: true, tag: def.name });
                      }
                    }
                    const maxTargets = Math.max(1, Number(def.targetCount || 1));
                    const hitTargets =
                      maxTargets >= livingEnemiesNow.length
                        ? [...livingEnemiesNow]
                        : [...livingEnemiesNow].sort(() => Math.random() - 0.5).slice(0, maxTargets);
                    const auraAtkMult = now < teamAuraRef.current.until ? 1 + teamAuraRef.current.atkPct / 100 : 1;
                    let totalSkillDmg = 0;
                    const killedNames: string[] = [];
                    for (const target of hitTargets) {
                      const shieldMult = now < target.shieldUntil && !def.breaksGuard ? 0.55 : 1;
                      if (now < target.shieldUntil && def.breaksGuard) {
                        target.shieldUntil = 0;
                        appendBattleLog(`【破盾】【${ally.name}】施展【${def.name} Lv.${slot.level || 1}】直接震碎了 ${target.name} 的护盾壁障！`);
                      }
                      const skillDmg = Math.max(
                        6,
                        Math.round((ally.atk * auraAtkMult * def.damageMult * levelMult - target.def * 0.2) * shieldMult)
                      );
                      target.hp = Math.max(0, target.hp - skillDmg);
                      target.hitShakeUntil = now + 300;
                      totalSkillDmg += skillDmg;
                      pushFloat(target.slotKey, skillDmg, { isCrit: true, tag: def.name });
                      if (target.hp === 0) {
                        killedNames.push(target.name);
                        setRunStats((prev) => ({
                          ...prev,
                          totalKills: prev.totalKills + 1,
                          bossKills: prev.bossKills + (target.isBoss ? 1 : 0),
                          xp: prev.xp + target.xp,
                          gold: prev.gold + target.gold,
                        }));
                      }
                    }
                    const auraNote =
                      def.auraAtkPct || def.auraCritPct
                        ? `，并激活全队光环（攻击+${teamAuraRef.current.atkPct}%·暴击+${teamAuraRef.current.critPct}%）`
                        : "";
                    if (hitTargets.length > 1) {
                      appendBattleLog(
                        `【群攻】自动释放群攻【${def.name} Lv.${slot.level || 1}】横扫 ${hitTargets.length} 名敌人，合计造成 ${totalSkillDmg} 点伤害${auraNote}${killedNames.length ? `（击倒 ${killedNames.join("、")}）` : ""}（+${castXp} 技能经验）！`
                      );
                    } else if (killedNames.length > 0) {
                      appendBattleLog(`【战技】自动释放【${def.name} Lv.${slot.level || 1}】击倒了 ${killedNames[0]}（-${totalSkillDmg}${auraNote} · +${castXp} 技能经验）！`);
                    } else {
                      appendBattleLog(`【战技】自动释放【${def.name} Lv.${slot.level || 1}】命中 ${hitTargets[0].name}，造成 ${totalSkillDmg} 点伤害${auraNote}（+${castXp} 技能经验）！`);
                    }
                    break;
                  } else if (def.guardMult) {
                    playerMpRef.current = Math.max(0, playerMpRef.current - mpCost);
                    setPlayerMp(playerMpRef.current);
                    abilityCooldownsRef.current = { ...abilityCooldownsRef.current, [def.id]: now + cdMs };
                    setAbilityCooldowns(abilityCooldownsRef.current);
                    abilityCastsRef.current[def.id] = (abilityCastsRef.current[def.id] || 0) + 1;
                    const reduce = Math.min(0.8, (1 - def.guardMult) * levelMult);
                    selfGuardRef.current = {
                      until: now + Number(def.durationMs || 6000),
                      mult: Math.max(0.2, 1 - reduce),
                    };
                    if (def.tauntDurationMs) {
                      selfTauntUntilRef.current = now + Number(def.tauntDurationMs);
                      appendBattleLog(
                        `【嘲讽】自动释放【${def.name} Lv.${slot.level || 1}】，减伤 ${Math.round(reduce * 100)}% 并强制吸引敌方绝大部分仇恨保护队友（+${castXp} 技能经验）！`
                      );
                    } else {
                      appendBattleLog(`【防护】自动释放【${def.name} Lv.${slot.level || 1}】，提升自身防护与前排仇恨（+${castXp} 技能经验）！`);
                    }
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
                const auraActive = now < teamAuraRef.current.until;
                const auraAtkMult = auraActive ? 1 + teamAuraRef.current.atkPct / 100 : 1;
                const auraCritBonus = auraActive ? teamAuraRef.current.critPct / 100 : 0;
                const baseCritChance = ally.isSelf ? (combatSheet.critRatePct ?? 18) / 100 : 0.16;
                const critMult = ally.isSelf ? (combatSheet.critDmgPct ?? 165) / 100 : 1.65;
                const isCrit = Math.random() < Math.min(0.85, baseCritChance + auraCritBonus);
                const shieldMult = now < preferred.shieldUntil ? 0.55 : 1;
                const rawDmg = Math.max(
                  4,
                  Math.round((ally.atk * auraAtkMult * (0.92 + Math.random() * 0.22) - preferred.def * 0.25) * (isCrit ? critMult : 1) * shieldMult)
                );
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
                  appendBattleLog(`【击倒】【${ally.name}】击倒了 ${preferred.name}（-${rawDmg}${isCrit ? " 暴击" : ""}）！`);
                } else if (ally.isSelf || Math.random() < 0.35) {
                  appendBattleLog(`【普攻】【${ally.name}】攻击 ${preferred.name}，造成 ${rawDmg} 点伤害${isCrit ? "（暴击！）" : ""}`);
                }
              }
            }
          }

          // 2. Advance each living Enemy's cast bar & execute Boss Signature Skills / AOE / Attacks
          for (let j = 0; j < nextEnemies.length; j++) {
            const enemy = nextEnemies[j];
            if (enemy.hp <= 0) {
              enemy.castMs = 0;
              continue;
            }
            // Auto-enrage Boss below 45% HP
            if (enemy.isBoss && !enemy.enraged && enemy.hp <= enemy.maxHp * 0.45) {
              enemy.enraged = true;
              enemy.intervalMs = Math.max(1350, Math.round(enemy.intervalMs * 0.72));
              appendBattleLog(`【狂暴觉醒】${enemy.name} 生命降至 45% 以下，进入狂暴状态，攻速与秘技频率大幅飙升！`);
            }
            enemy.castMs += TICK_MS;
            if (enemy.castMs >= enemy.intervalMs) {
              enemy.castMs = enemy.castMs % enemy.intervalMs;
              enemy.attackAnimUntil = now + 320;
              enemy.attackCount = (enemy.attackCount || 0) + 1;

              const livingAllies = nextAllies.filter((a) => a.hp > 0);
              if (livingAllies.length > 0) {
                // MWI Threat / Aggro weighting: Tanks & players with active Taunt/Brace draw the majority of enemy attacks!
                const getAllyThreatWeight = (a: AllyCombatUnit): number => {
                  let w = 100;
                  if (a.classId === "blacksmith" || a.role === "tank" || String(a.title || "").includes("铁卫") || String(a.title || "").includes("盾")) {
                    w += 160;
                  }
                  if (a.isSelf && now < selfTauntUntilRef.current) {
                    w += 480;
                  } else if (a.isSelf && now < selfGuardRef.current.until) {
                    w += 220;
                  }
                  return w;
                };
                const pickThreatWeightedAlly = (pool: AllyCombatUnit[]): AllyCombatUnit => {
                  const totalW = pool.reduce((sum, a) => sum + getAllyThreatWeight(a), 0);
                  let r = Math.random() * Math.max(1, totalW);
                  for (const a of pool) {
                    r -= getAllyThreatWeight(a);
                    if (r <= 0) return a;
                  }
                  return pool[pool.length - 1];
                };

                const applyHitToAlly = (
                  targetAlly: AllyCombatUnit,
                  dmg: number,
                  opts?: { skillName?: string; isCrit?: boolean; castPushbackPct?: number; canDodge?: boolean }
                ): number => {
                  if (opts?.canDodge) {
                    const evaPct = targetAlly.isSelf ? (combatSheet.evasionPct ?? 8) : 9;
                    if (Math.random() * 100 < evaPct) {
                      pushFloat(`ally-${targetAlly.userId}`, 0, {
                        isHeal: true,
                        tag: "闪避",
                      });
                      if (targetAlly.isSelf || enemy.isBoss) {
                        appendBattleLog(`【闪避】【${targetAlly.name}】灵巧闪避了 ${enemy.name} 的攻击！`);
                      }
                      return 0;
                    }
                  }
                  const guardMult = targetAlly.isSelf && now < selfGuardRef.current.until ? selfGuardRef.current.mult : 1;
                  const finalDmg = Math.max(2, Math.round(dmg * guardMult));
                  targetAlly.hp = Math.max(0, targetAlly.hp - finalDmg);
                  targetAlly.hitShakeUntil = now + 280;
                  if (opts?.castPushbackPct && targetAlly.hp > 0) {
                    targetAlly.castMs = Math.max(0, Math.round(targetAlly.castMs - targetAlly.intervalMs * opts.castPushbackPct));
                  }
                  pushFloat(`ally-${targetAlly.userId}`, finalDmg, {
                    isCrit: opts?.isCrit,
                    tag: opts?.skillName,
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
                        ? `【重创】${enemy.name}${opts?.skillName ? `【${opts.skillName}】` : ""}重创【${targetAlly.name}】（-${finalDmg}）！【${targetAlly.name}】进入 ${(totalRevive / 1000).toFixed(0)} 秒复活倒计时...`
                        : `【阵亡】${enemy.name}${opts?.skillName ? `【${opts.skillName}】` : ""}击倒了最后一名队员【${targetAlly.name}】（-${finalDmg}）！`
                    );
                  }
                  return finalDmg;
                };

                // BOSS SIGNATURE SKILL ROTATION: Unleashes a unique signature skill on 1st attack and every 2nd attack!
                if (enemy.isBoss && enemy.attackCount % 2 === 1) {
                  const skills = getBossSignatureSkills(enemy.id);
                  const skill = skills[enemy.nextSkillIdx % skills.length];
                  enemy.nextSkillIdx = (enemy.nextSkillIdx + 1) % skills.length;

                  if (skill.kind === "aoe") {
                    // Full-Party AOE Ultimate: hits EVERY living party member simultaneously!
                    let totalAoeDmg = 0;
                    for (const allyUnit of livingAllies) {
                      const rawSkillDmg =
                        enemy.atk * skill.dmgMult * (enemy.enraged ? 1.18 : 1) +
                        allyUnit.maxHp * skill.maxHpPct -
                        allyUnit.def * 0.25;
                      totalAoeDmg += applyHitToAlly(allyUnit, rawSkillDmg, {
                        skillName: skill.name,
                        isCrit: true,
                        castPushbackPct: skill.castPushbackPct,
                      });
                    }
                    if (skill.mpDrainPct && skill.mpDrainPct > 0) {
                      setPlayerMp((mp) => {
                        const drained = Math.max(0, Math.round(mp * (1 - skill.mpDrainPct!)));
                        playerMpRef.current = drained;
                        return drained;
                      });
                    }
                    setWaveBanner(`${enemy.name} 施展全屏秘技：《${skill.name}》！`);
                    scheduleTransitionTimeout(() => setWaveBanner(null), 1600);
                    appendBattleLog(
                      `【首领全屏秘技】${enemy.name} 释放《${skill.name}》（${skill.tag}），横扫我方全体 ${livingAllies.length} 名队员，合计造成 ${totalAoeDmg} 点毁灭伤害！`
                    );
                  } else if (skill.kind === "cleave") {
                    // Multi-Target Cleave + Lifesteal Signature Skill
                    const shuffled = [...livingAllies].sort(() => Math.random() - 0.5);
                    const targets = shuffled.slice(0, Math.min(livingAllies.length, skill.targetCount || 3));
                    let totalCleaveDmg = 0;
                    for (const allyUnit of targets) {
                      const rawSkillDmg =
                        enemy.atk * skill.dmgMult * (enemy.enraged ? 1.15 : 1) +
                        allyUnit.maxHp * skill.maxHpPct -
                        allyUnit.def * 0.3;
                      totalCleaveDmg += applyHitToAlly(allyUnit, rawSkillDmg, {
                        skillName: skill.name,
                        isCrit: true,
                      });
                    }
                    let healLog = "";
                    if (skill.lifestealPct && skill.lifestealPct > 0 && enemy.hp > 0) {
                      const healVal = Math.max(25, Math.round(totalCleaveDmg * skill.lifestealPct));
                      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healVal);
                      pushFloat(enemy.slotKey, healVal, { isHeal: true, tag: skill.name });
                      healLog = `，并汲取 ${healVal} 点生命值`;
                    }
                    appendBattleLog(
                      `【首领独门秘技】${enemy.name} 施展《${skill.name}》，同时重创 ${targets.map((t) => t.name).join("、")}（合计 -${totalCleaveDmg}${healLog}）！`
                    );
                  } else {
                    // Tactical Shockwave AOE + Boss Shield + Enrage + Elite Guard Summon
                    for (const allyUnit of livingAllies) {
                      const rawSkillDmg =
                        enemy.atk * skill.dmgMult + allyUnit.maxHp * skill.maxHpPct - allyUnit.def * 0.3;
                      applyHitToAlly(allyUnit, rawSkillDmg, {
                        skillName: skill.name,
                        isCrit: false,
                        castPushbackPct: skill.castPushbackPct,
                      });
                    }
                    if (skill.shieldMs) {
                      enemy.shieldUntil = now + skill.shieldMs;
                    }
                    if (skill.enrage && !enemy.enraged) {
                      enemy.enraged = true;
                      enemy.intervalMs = Math.max(1400, Math.round(enemy.intervalMs * 0.78));
                    }
                    const aliveEnemyCount = nextEnemies.filter((e) => e.hp > 0).length;
                    let summonedName = "";
                    if (skill.summonGuard && aliveEnemyCount < Math.min(4, Math.max(2, Math.ceil(nextAllies.length / 2) + 1)) && activeDungeon) {
                      const pool = activeDungeon.minions.length > 0 ? activeDungeon.minions : [activeDungeon.boss];
                      const gm = pool[enemy.attackCount % pool.length];
                      const guardHp = Math.max(120, Math.round(enemy.maxHp * 0.24));
                      summonedName = `首领亲卫·${gm.name}`;
                      nextEnemies.push({
                        slotKey: `enemy-summon-${currentWave}-${now}-${enemy.attackCount}`,
                        id: gm.id,
                        name: summonedName,
                        level: Math.max(1, enemy.level - 1),
                        isBoss: false,
                        isEliteGuard: true,
                        hp: guardHp,
                        maxHp: guardHp,
                        atk: Math.max(8, Math.round(enemy.atk * 0.58)),
                        def: Math.max(2, Math.round(enemy.def * 0.65)),
                        xp: Math.max(10, Math.round(gm.xp || 15)),
                        gold: Math.max(6, Math.round(gm.gold || 10)),
                        castMs: 400,
                        intervalMs: 2300,
                        hitShakeUntil: 0,
                        attackAnimUntil: 0,
                        attackCount: 0,
                        nextSkillIdx: 0,
                        shieldUntil: 0,
                        enraged: false,
                      });
                    }
                    appendBattleLog(
                      `【首领秘技·${skill.tag}】${enemy.name} 施展《${skill.name}》震击全队${skill.shieldMs ? "，展开护盾减免 45% 伤害" : ""}${summonedName ? `，并召唤【${summonedName}】助战` : ""}！`
                    );
                  }
                } else if (!enemy.isBoss && (enemy.isEliteGuard || nextAllies.length >= 4) && enemy.attackCount % 3 === 0 && livingAllies.length >= 2) {
                  // Elite guard or pack monster cleave in larger parties
                  const shuffled = [...livingAllies].sort(() => Math.random() - 0.5);
                  const cleaveTargets = shuffled.slice(0, 2);
                  for (const allyUnit of cleaveTargets) {
                    const dmg = Math.max(2, Math.round(enemy.atk * 1.15 - allyUnit.def * 0.4));
                    applyHitToAlly(allyUnit, dmg, { skillName: "狂暴顺劈", isCrit: true });
                  }
                  appendBattleLog(
                    `【顺劈】${enemy.name} 发动【狂暴顺劈】，同时斩击 ${cleaveTargets.map((t) => t.name).join("、")}！`
                  );
                } else {
                  const targetAlly = pickThreatWeightedAlly(livingAllies);
                  const baseEnemyDmg = Math.max(2, Math.round(enemy.atk * (0.9 + Math.random() * 0.25) - targetAlly.def * 0.42));
                  const dealt = applyHitToAlly(targetAlly, baseEnemyDmg, {
                    isCrit: enemy.isBoss && Math.random() < 0.3,
                    canDodge: true,
                  });
                  if (dealt > 0 && targetAlly.hp > 0 && (enemy.isBoss || targetAlly.isSelf)) {
                    appendBattleLog(
                      `${enemy.isBoss ? "【首领】" : "【敌击】"}${enemy.name} 攻击【${targetAlly.name}】，造成 ${dealt} 点伤害`
                    );
                  }
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
            {/* Top Header: Dungeon Title + Wave Pill + Team Controls */}
            <div className="battle-header-bar party-battle-header">
            <div className="party-battle-title-block">
              <h3 className="battle-title">
                {activeDungeon.name} · {activeDungeon.boss.name}
              </h3>
              <span className={`party-wave-pill ${isBossWaveNow ? "is-boss-wave" : ""}`}>
                {isBossWaveNow ? `第 ${currentWave} 波 · 首领` : `第 ${currentWave} 波`}
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
                  <T1Art kind="ui" id="nav-party" className="gold-inline" alt="" /> 增援队友 ({party.members.length}/6)
                </button>
              )}
              <button
                type="button"
                className="header-menu-btn"
                onClick={() => setShowLobbyDetails((v) => !v)}
              >
                {showLobbyDetails ? "收起小队编成" : <><T1Art kind="ui" id="nav-character" className="gold-inline" alt="" /> 小队编成 ({party.members.length}/6)</>}
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
                结束副本
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
                        <span className="entity-name" title={ally.name}>
                          {ally.name}
                        </span>
                        <span className="entity-level">Lv.{ally.level}</span>
                      </div>
                      <div className="party-unit-role-tag">
                        {ally.title}
                        {ally.isSelf && nowTs < selfTauntUntilRef.current
                          ? " · 嘲讽主坦"
                          : ally.isSelf && nowTs < selfGuardRef.current.until
                          ? " · 坚守减伤"
                          : ally.classId === "blacksmith" || ally.role === "tank"
                          ? " · 前排高仇恨"
                          : ""}
                        {nowTs < teamAuraRef.current.until ? " · 战神光环" : ""}
                      </div>

                      <div className={`entity-avatar party-unit-avatar${shaking ? " avatar-shake" : ""}`}>
                        <MonsterSceneBackdrop monsterId={ally.classId} mapId={activeDungeon.id} variant="card" />
                        <T1Art kind="character" id={characterArtId(ally.classId, ally.gender)} alt={ally.name} />
                      </div>

                      <div className="damage-float-container">
                        {unitFloats.map((f) => (
                          <span
                            key={f.id}
                            className={`damage-float ${f.isHeal ? "damage-heal" : "damage-taken"}${f.isCrit ? " crit" : ""}`}
                          >
                            {f.tag ? `${f.tag} ` : ""}
                            {f.value === 0 ? "" : f.isHeal ? `+${f.value}` : `-${f.value}`}
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
              <div className="party-vs-sub">
                {allies.filter((a) => a.hp > 0).length} 对 {enemies.filter((e) => e.hp > 0).length}
              </div>
            </div>

            {/* RIGHT SIDE: ENEMY FORMATION (Dynamic 2-6 Monsters by Party Size; Wave 10: BOSS + Elite Guards) */}
            <div className="party-side-column party-enemies-column">
              <div className={`party-units-grid enemies-grid ${isBossWaveNow && enemies.length === 1 ? "boss-single-grid" : "multi-minion-grid"}`}>
                {enemies.map((enemy) => {
                  const isDead = enemy.hp <= 0;
                  const shaking = nowTs < enemy.hitShakeUntil;
                  const attacking = nowTs < enemy.attackAnimUntil;
                  const hpPct = Math.max(0, Math.min(100, Math.round((enemy.hp / Math.max(1, enemy.maxHp)) * 100)));
                  const castPct = isDead ? 0 : Math.max(0, Math.min(100, Math.floor((enemy.castMs / Math.max(1, enemy.intervalMs)) * 100)));
                  const unitFloats = damageFloats.filter((f) => f.unitKey === enemy.slotKey);
                  const bossSkills = enemy.isBoss ? getBossSignatureSkills(enemy.id) : [];
                  const nextBossSkill = enemy.isBoss ? bossSkills[enemy.nextSkillIdx % bossSkills.length] : null;
                  const isSkillTurnNext = enemy.isBoss && (enemy.attackCount || 0) % 2 === 0;
                  const shieldActive = nowTs < enemy.shieldUntil;

                  return (
                    <div
                      key={enemy.slotKey}
                      className={`battle-entity party-unit-card enemy-unit-card${enemy.isBoss ? " is-boss-unit" : ""}${isDead ? " is-defeated-unit" : ""}${shaking ? " entity-hit" : ""}${attacking ? " unit-attacking-left" : ""}`}
                    >
                      <div className="party-unit-top">
                        <span className="entity-name" title={enemy.name}>
                          {enemy.name}
                        </span>
                        <span className="entity-level">Lv.{enemy.level}</span>
                      </div>

                      <div className="party-unit-role-tag">
                        {enemy.isBoss ? (
                          <span>
                            首领
                            {shieldActive ? " · 护盾减伤" : ""}
                            {enemy.enraged ? " · 狂暴" : ""}
                          </span>
                        ) : enemy.isEliteGuard ? (
                          "首领亲卫"
                        ) : (
                          "魔物"
                        )}
                      </div>

                      <div className={`entity-avatar party-unit-avatar${shaking ? " avatar-shake" : ""}${enemy.isBoss ? " is-boss-art" : ""}`}>
                        <MonsterSceneBackdrop monsterId={enemy.id} mapId={activeDungeon.id} isBoss={enemy.isBoss} variant="card" />
                        <T1Art kind="monster" id={enemy.id} alt={enemy.name} />
                      </div>

                      {enemy.isBoss && !isDead && (
                        <div className="boss-skill-strip">
                          {bossSkills.map((sk, idx) => {
                            const isNext = isSkillTurnNext && idx === enemy.nextSkillIdx % bossSkills.length;
                            return (
                              <span
                                key={sk.id}
                                className={`boss-skill-chip${sk.kind === "aoe" ? " is-aoe" : ""}${isNext ? " is-charging" : ""}`}
                                title={`${sk.name}（${sk.tag}）：${sk.desc}`}
                              >
                                {isNext ? "▸" : sk.kind === "aoe" ? "◈" : "✦"} {sk.name}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="damage-float-container">
                        {unitFloats.map((f) => (
                          <span key={f.id} className={`damage-float ${f.isHeal ? "damage-heal" : "damage-dealt"}${f.isCrit ? " crit" : ""}`}>
                            {f.tag ? `${f.tag} ` : ""}
                            {f.value === 0 ? "" : f.isHeal ? `+${f.value}` : `-${f.value}`}
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
                            : isSkillTurnNext && nextBossSkill && castPct >= 45
                            ? `蓄力秘技：《${nextBossSkill.name}》(${nextBossSkill.tag})`
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
        <PartyLobbyView
          bossDungeons={bossDungeons}
          actStage={actStage}
          setActStage={setActStage}
          busy={busy}
          party={party}
          invites={invites}
          publicParties={publicParties}
          joinId={joinId}
          setJoinId={setJoinId}
          inviteId={inviteId}
          setInviteId={setInviteId}
          isLeader={isLeader}
          userId={userId}
          run={run}
          quickStartBossDungeon={quickStartBossDungeon}
          onQuickJoinAndStart={(p) =>
            void run(async () => {
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
          onCopyPartyId={(partyId) => {
            if (navigator.clipboard?.writeText) {
              navigator.clipboard
                .writeText(partyId)
                .then(() => toast.success("已复制队伍 ID"))
                .catch(() => toast.info(`队伍 ID：${partyId}`));
            } else {
              toast.info(`队伍 ID：${partyId}`);
            }
          }}
        />
      )}
    </div>
  );
}
