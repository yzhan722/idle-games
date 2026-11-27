/**
 * 组队副本演出的无界面复刻，只给测试用：一拍 60 毫秒，规则与 frontend/src/components/PartyPanel.tsx 的战斗循环一致，
 * 伤害公式直接用同源模块。随机数可定种子。
 * secondary=false 时抹掉命中 / 闪避 / 抗性（倍率恒为 1），就是改动前的算法。
 */
import {
  PARTY_RULES,
  allySkillHit,
  allySwing,
  enemySwing,
  partyWave,
  skillMult,
  swingMult,
  type PartyDungeon,
  type PartyFighter,
} from "../backend/src/party_combat";
import { abilityCooldownMsForLevel, abilityLevelMult, type AbilityDef } from "../backend/src/abilities";
import { ALLY_REVIVE_MS, getBossSignatureSkills } from "../frontend/src/gameplay/partyRaidData";

export type SimSkill = { def: AbilityDef; level: number; trigger: { type: string; pct?: number } };
export type SimOptions = { squad: PartyFighter[]; skills: SimSkill[]; maxMp: number; dungeon: PartyDungeon; seed: number; secondary: boolean };
export type WaveResult = { wave: number; ms: number; cleared: boolean; damageTaken: number; casts: Record<string, number> };

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TICK = PARTY_RULES.tickMs;

/** 从 fromWave 打起，直到打完 waves 波、团灭或某一波超过 maxMs。 */
export function simulateRun(opts: SimOptions, waves: number, maxMs = 15 * 60_000, fromWave = 1): WaveResult[] {
  const rng = seeded(opts.seed);
  const swing = opts.secondary ? swingMult : () => 1;
  const skillM = opts.secondary ? skillMult : () => 1;
  const allies = opts.squad.map((f, i) => ({ f, hp: f.hp, castMs: (i * 480) % f.intervalMs, revive: 0 }));
  type Ally = (typeof allies)[number];
  const self = allies[0];
  let mp = opts.maxMp;
  let now = 0;
  const readyAt: Record<string, number> = {};
  let guard = { until: 0, mult: 1 };
  let tauntUntil = 0;
  let aura = { until: 0, atkPct: 0, critPct: 0 };
  const out: WaveResult[] = [];

  for (let wave = fromWave; wave < fromWave + waves; wave++) {
    const enemies = partyWave(opts.dungeon, wave, opts.squad.length).map((e) => ({
      role: e.role, monster: e.monster, hp: e.hp, maxHp: e.hp, atk: e.atk, def: e.def, castMs: e.castMs, intervalMs: e.intervalMs,
      count: 0, nextSkill: 0, shieldUntil: 0, enraged: false, elite: e.role === "guard",
    }));
    const start = now;
    let taken = 0;
    const casts: Record<string, number> = {};
    let wiped = false;
    const living = () => enemies.filter((x) => x.hp > 0);
    while (living().length && now - start < maxMs) {
      now += TICK;
      if (!allies.some((a) => a.hp > 0)) {
        wiped = true;
        break;
      }
      for (const a of allies) {
        if (a.hp <= 0) {
          a.castMs = 0;
          a.revive = Math.max(0, (a.revive > 0 ? a.revive : ALLY_REVIVE_MS) - TICK);
          if (a.revive <= 0) {
            a.hp = a.f.hp;
            if (a === self) mp = opts.maxMp;
          }
          continue;
        }
        a.castMs += TICK;
        const aliveNow = living();
        if (a === self && aliveNow.length) {
          for (const slot of opts.skills) {
            const def = slot.def;
            if (now < (readyAt[def.id] || 0) || mp < def.mpCost) continue;
            const t = slot.trigger;
            if (t.type === "self_hp_below" && (a.hp / a.f.hp) * 100 > (t.pct ?? 0)) continue;
            if (t.type === "ally_hp_below" && !allies.some((x) => x.hp > 0 && (x.hp / x.f.hp) * 100 <= (t.pct ?? 0))) continue;
            if (t.type === "enemies_at_least" && aliveNow.length < Math.max(1, t.pct || 1)) continue;
            if (t.type === "enemy_hp_below" && !aliveNow.some((x) => (x.hp / x.maxHp) * 100 <= (t.pct ?? 0))) continue;
            if (t.type === "enemy_guard" && !aliveNow.some((x) => x.role === "boss" || now < x.shieldUntil)) continue;
            const mult = abilityLevelMult(def, slot.level);
            const heals = Boolean(def.healPct && !def.damageMult);
            if (heals && !allies.some((x) => x.hp > 0 && x.hp <= x.f.hp * 0.85) && !def.guardMult && !def.auraAtkPct) continue;
            if (!heals && !def.damageMult && !def.guardMult) continue;
            mp = Math.max(0, mp - def.mpCost);
            if (def.mpRestore) mp = Math.min(opts.maxMp, mp + Math.round(def.mpRestore * mult));
            readyAt[def.id] = now + Math.max(PARTY_RULES.minCooldownMs, abilityCooldownMsForLevel(def, slot.level));
            casts[def.id] = (casts[def.id] || 0) + 1;
            if (def.auraAtkPct) {
              aura = { until: now + Number(def.auraDurationMs || 10000), atkPct: Math.round(def.auraAtkPct * mult), critPct: Math.round((def.auraCritPct || 15) * mult) };
            }
            if (def.guardMult) {
              guard = { until: now + Number(def.durationMs || 6000), mult: Math.max(0.2, 1 - Math.min(0.8, (1 - def.guardMult) * mult)) };
              if (def.tauntDurationMs) tauntUntil = now + def.tauntDurationMs;
            }
            if (def.healPct) {
              for (const x of allies) {
                if (x.hp > 0 && (heals || def.isPartyHeal || x === self)) x.hp = Math.min(x.f.hp, x.hp + Math.max(heals ? 12 : 10, Math.round(x.f.hp * def.healPct * mult)));
              }
            }
            if (def.damageMult) {
              const n = Math.max(1, Number(def.targetCount || 1));
              const targets = n >= aliveNow.length ? aliveNow : [...aliveNow].sort(() => rng() - 0.5).slice(0, n);
              const auraMult = now < aura.until ? 1 + aura.atkPct / 100 : 1;
              for (const x of targets) {
                const shieldMult = now < x.shieldUntil && !def.breaksGuard ? PARTY_RULES.shieldMult : 1;
                if (now < x.shieldUntil && def.breaksGuard) x.shieldUntil = 0;
                x.hp = Math.max(0, x.hp - allySkillHit({ atk: a.f.atk, auraMult, damageMult: def.damageMult, levelMult: mult, targetDef: x.def, shieldMult, mult: skillM(a.f, x.monster) }));
              }
            }
            break;
          }
        }
        const live = living();
        if (!live.length) break;
        if (a.castMs >= a.f.intervalMs) {
          a.castMs %= a.f.intervalMs;
          const x = live[Math.floor(rng() * live.length)];
          const on = now < aura.until;
          const crit = rng() < Math.min(PARTY_RULES.critCap, a.f.critRatePct / 100 + (on ? aura.critPct / 100 : 0));
          x.hp = Math.max(
            0,
            x.hp -
              allySwing({
                atk: a.f.atk,
                auraMult: on ? 1 + aura.atkPct / 100 : 1,
                roll: PARTY_RULES.rollMin + rng() * PARTY_RULES.rollSpan,
                targetDef: x.def,
                critMult: crit ? a.f.critDmgPct / 100 : 1,
                shieldMult: now < x.shieldUntil ? PARTY_RULES.shieldMult : 1,
                mult: swing(a.f, x.monster),
              })
          );
          if (a === self) mp = Math.min(opts.maxMp, mp + 3);
        }
      }
      for (const x of [...enemies]) {
        if (x.hp <= 0) continue;
        if (x.role === "boss" && !x.enraged && x.hp <= x.maxHp * 0.45) {
          x.enraged = true;
          x.intervalMs = Math.max(1350, Math.round(x.intervalMs * 0.72));
        }
        x.castMs += TICK;
        if (x.castMs < x.intervalMs) continue;
        x.castMs %= x.intervalMs;
        x.count += 1;
        const live = allies.filter((a) => a.hp > 0);
        if (!live.length) break;
        const hit = (a: Ally, dmg: number, dodge = false) => {
          if (dodge && rng() * 100 < a.f.evasionPct) return 0;
          const d = Math.max(2, Math.round(dmg * (a === self && now < guard.until ? guard.mult : 1)));
          a.hp = Math.max(0, a.hp - d);
          taken += d;
          if (a.hp <= 0) {
            a.castMs = 0;
            a.revive = ALLY_REVIVE_MS;
          }
          return d;
        };
        const pushback = (a: Ally, pct: number | undefined) => {
          if (pct && a.hp > 0) a.castMs = Math.max(0, Math.round(a.castMs - a.f.intervalMs * pct));
        };
        const shuffled = () => [...live].sort(() => rng() - 0.5);
        if (x.role === "boss" && x.count % 2 === 1) {
          const list = getBossSignatureSkills(x.monster.id);
          const sk = list[x.nextSkill % list.length];
          x.nextSkill = (x.nextSkill + 1) % list.length;
          const raw = (a: Ally, enrage: number, defMult: number) =>
            (x.atk * sk.dmgMult * (x.enraged ? enrage : 1) + a.f.hp * sk.maxHpPct - a.f.def * defMult) * skillM(x.monster, a.f);
          if (sk.kind === "aoe") {
            for (const a of live) {
              hit(a, raw(a, 1.18, 0.25));
              pushback(a, sk.castPushbackPct);
            }
            if (sk.mpDrainPct) mp = Math.max(0, Math.round(mp * (1 - sk.mpDrainPct)));
          } else if (sk.kind === "cleave") {
            let sum = 0;
            for (const a of shuffled().slice(0, Math.min(live.length, sk.targetCount || 3))) sum += hit(a, raw(a, 1.15, 0.3));
            if (sk.lifestealPct && x.hp > 0) x.hp = Math.min(x.maxHp, x.hp + Math.max(25, Math.round(sum * sk.lifestealPct)));
          } else {
            for (const a of live) {
              hit(a, raw(a, 1, 0.3));
              pushback(a, sk.castPushbackPct);
            }
            if (sk.shieldMs) x.shieldUntil = now + sk.shieldMs;
            if (sk.enrage && !x.enraged) {
              x.enraged = true;
              x.intervalMs = Math.max(1400, Math.round(x.intervalMs * 0.78));
            }
            if (sk.summonGuard && living().length < Math.min(4, Math.max(2, Math.ceil(allies.length / 2) + 1))) {
              const pool = opts.dungeon.minions.length ? opts.dungeon.minions : [opts.dungeon.boss];
              const hp = Math.max(120, Math.round(x.maxHp * 0.24));
              enemies.push({
                role: "guard", monster: pool[x.count % pool.length], hp, maxHp: hp, atk: Math.max(8, Math.round(x.atk * 0.58)), def: Math.max(2, Math.round(x.def * 0.65)),
                castMs: 400, intervalMs: 2300, count: 0, nextSkill: 0, shieldUntil: 0, enraged: false, elite: true,
              });
            }
          }
        } else if (x.role !== "boss" && (x.elite || allies.length >= 4) && x.count % 3 === 0 && live.length >= 2) {
          for (const a of shuffled().slice(0, 2)) hit(a, Math.max(2, Math.round((x.atk * 1.15 - a.f.def * 0.4) * skillM(x.monster, a.f))));
        } else {
          const weight = (a: Ally) => 100 + (a === self && now < tauntUntil ? 480 : a === self && now < guard.until ? 220 : 0);
          let r = rng() * live.reduce((s, a) => s + weight(a), 0);
          let target = live[live.length - 1];
          for (const a of live) {
            r -= weight(a);
            if (r <= 0) {
              target = a;
              break;
            }
          }
          hit(target, enemySwing({ atk: x.atk, roll: 0.9 + rng() * 0.25, targetDef: target.f.def, mult: swing(x.monster, target.f) }), true);
        }
      }
    }
    const cleared = !wiped && living().length === 0;
    out.push({ wave, ms: now - start, cleared, damageTaken: taken, casts });
    if (!cleared) return out;
    now += PARTY_RULES.waveGapMs;
    for (const a of allies) if (a.hp > 0) a.hp = Math.min(a.f.hp, Math.round(a.hp + a.f.hp * 0.22));
    mp = Math.min(opts.maxMp, mp + 10);
  }
  return out;
}
