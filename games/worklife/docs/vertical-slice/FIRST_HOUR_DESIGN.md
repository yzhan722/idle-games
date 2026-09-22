# First Hour Design — Vertical Slice 1

> Issue #2 Phase 1. Authoritative product spec for beats, unlocks, and T1 combat identity.  
> Branch: `feat/vertical-slice-t1`  
> Numbers below are **targets**, not live values. Phase 3 simulation must confirm ±30%.

---

## Player fantasy

You woke up in another world and took the only job posted: **伐木工**. Chop wood, mill boards, make a wooden weapon, fight the forest that pays your rent, then knock on the Forest Steward’s door.

If the player understands trading, party, prestige, or six professions in the first 10 minutes, the slice has failed.

---

## Six experience beats

### Beat 1 — First Action (0–3 min)

**Player understands in 30 seconds:** I am a woodcutter; I click 伐木 / the highlighted tree; I get wood and XP.

| Rule | Spec |
|------|------|
| Default land | Work / Logging, **not** 冒险 |
| Visible primary nav | Work, Craft (locked or dim until first gather), Adventure (locked until first gear), Character |
| Hidden | 交易 组队 强化 声望 赏金 转生 商店 签到 as primary |
| First CTA | 砍伐小白杨 — one tree highlighted “当前目标” |
| Time | `act_chop_wood_t1` 5s → first wood in < 30s of play |

Do **not** require Party, marketplace, or prestige to start.

### Beat 2 — First Upgrade (3–10 min)

Loop: chop → 2 wood → 标准木板 (4s) → profession XP.

Target: first board by ~5–8 minutes of idle-friendly play (about 2–4 chop cycles).

Craft UI must show: 原木 2 → 木板 1, and “用于短剑”.

### Beat 3 — First Equipment (10–20 min)

Item: **木头短剑** (`weapon_wooden_sword`, ATK 5). Cost: 3×`lumber_1` = 6 wood.

Must show before craft:

```
木头短剑
ATK 5 → 10  (example after we retune; live content is ATK 5 vs bare 5)
```

Bare-handed combat ATK must be a real number from backend (Phase 4). Equip must change Character ATK **and** combat outcome (Phase 4 tests).

Chest armor is a **second** gear beat after sword, not a skill-tree scavenger hunt. Phase 3 may lower `woodcutter_armor_crafting` to chapter objective 5 or grant the node with “制作第一件防具” goal.

### Beat 4 — First Combat (15–30 min)

First monster: **果冻史莱姆** — cannot one-shot the player, cannot be one-shot.

Combat is **not** a 12s progress bar pretending to be a fight. Phase 4 replaces duration-farm with:

- player HP / enemy HP
- auto basic attack
- one cooldown skill **重劈**
- damage numbers

Slime identity: **ordinary** (balanced HP/ATK).

### Beat 5 — Build Choice (25–40 min)

Exactly one binary, after first kill or first 3 kills:

| Id | Name | Effect |
|----|------|--------|
| `sharpened_edge` | 开刃 | +ATK (Berserker) |
| `thick_bark` | 厚树皮 | +HP / +DEF |

Stored on player state, server authoritative. UI: two cards, not a skill tree dump.

### Beat 6 — Forest Boss (40–60 min)

**森林管家** — chapter end.

Mechanics (backend state, Phase 4):

1. **Guard Phase** — at 60% HP, damage taken reduced until 重劈 (or a “破防” window after N hits). UI warning 格挡.
2. **Nature Wrath** — at 30% HP, attack interval shortens; UI 狂怒.

Victory: unique reward summary, **Chapter 1 complete**, unlock **next profession/map entry only** (Blacksmith / 矿山 as a locked door, not a second chapter).

Death: not a wipe of the account; repair/time sink, Next Goal “再备一件木甲 / 升级重劈”.

---

## Resource chain (chapter 1 only)

```
wood_1 原木
  → lumber_1 木板
    → weapon_wooden_sword 短剑
    → armor_wood_chest 木甲 (after sword)
    → repair / enhance T1 (single sink, not all systems)
```

No T2 woods, no 10 material types, no 11 maps.

## Gold

Sources: slime gold, first quests. Sinks: repair after boss wipes, optional T1 enhance. Phase 3 sim must show gold not exploding past first sword.

---

## Unlock cadence (progressive disclosure)

| Trigger | Unlocks |
|--------|---------|
| Login | Work (伐木) + Character |
| First chop complete | Craft (木工) |
| First board | Weapon recipe highlighted |
| Equip sword | Adventure (Forest only) |
| First kill | Build choice + 重劈 |
| 3 forest archetypes killed (slime, one tank, one fast) | Boss preparation goal |
| Forest Boss dead | Next-chapter door (矿山 / 铁匠) — **entry only** |

Maps beyond 呼呼大睡森林 stay locked in the first hour.

Career / More: Settings only until chapter complete; 成就/每日 can exist as secondary after Beat 2.

---

## Combat identity (Woodcutter / Berserker only)

> High damage, ramp into rage, trade defense for output.

| Piece | Spec |
|-------|------|
| Basic attack | Stable DPS, server tick |
| Active | `heavy_chop` — higher damage, cooldown (e.g. 8s), cannot be forged from client |
| Passive | Build choice above |
| Monsters | Ordinary (slime), tank (铁壳寄居蟹), fast (捣蛋小猴) — **not HP reskins** |
| Boss | Guard + Enrage |

Other five class kits are **out of scope**.

---

## IA (consumed in Phases 6–7, specified here)

Desktop primary: **工作 / 制作 / 冒险 / 角色** (≤ 4).  
Mobile 390: same four as **bottom tabs**. Chat collapsed. Activity bar always visible. Character is a sheet, not a 300px sidebar.

---

## Visual (Phase 8, specified here)

Replace emoji-as-icon on those four tabs, woodcutter, T1 trees, forest monsters, wooden gear. `CardArt` = fallback only.

---

## Explicit non-goals

Guild, PVP, pets, new classes, new maps, payments, six-class skill kits, marketplace as first-hour, party as first-hour.

---

## Phase 3 simulation checkpoints (names)

`scripts/simulate-first-hour.ts` must print resources / levels / gear / gold at 5, 10, 20, 30, 45, 60 minutes for a **canonical sequence**:

chop until 6 wood → 3 boards → sword → equip → slime ×N → crab ×N → monkey ×N → build choice → chest if time → boss.

Acceptance (adjust ±30% with written reason):

- 3 min: first positive feedback (wood+XP)
- ~15 min: first meaningful gear
- ~30 min: several real fights
- 40–60 min: boss-ready (sword + build + not naked HP)

---

## Gate

This document is the product contract. Later phases may retune numbers; they may not skip a beat or re-flatten 11 maps onto the first screen.
