# Vertical Slice Baseline Review

> Date: 2026-09-02  
> Branch: `feat/vertical-slice-t1` (cut from RC `feat/progress-hardening` @ `270c5b1`, **not** from `main`)  
> Why not `main`: `origin/main` is still `cf52b9c` (import only). Issue #1 PR #3 is open and unmerged. Branching from `main` would drop RC hardening. Product-stable baseline is the RC branch.  
> Evidence: `docs/vertical-slice/baseline/{desktop-1440,tablet-1024,mobile-390}/*.png`  
> Capture: `VS_CAPTURE=1 npx playwright test e2e/vertical-slice-baseline.spec.ts`

## Issue #1 gate (re-verified before this task)

| Check | Result |
|-------|--------|
| `npm run verify` | PASS (backend 38/0, frontend build, E2E 6/6) |
| `npm run test:integration` | 7/7 PASS |
| Working tree at RC | clean |
| Docker CLI | missing on this host (environment) |

Issue #1 remains OPEN on GitHub; engineering gate is **RC READY** with fresh commands. Human merge of PR #3 is not a code blocker for starting the slice on a dedicated branch.

---

## Current first-hour flow (as implemented)

```
Login (开始打工)
→ default tab is 冒险, not 伐木
→ 11 maps visible including 万界终焉
→ banner: 还没装备武器 → 去做武器
→ 木工: many recipes including T12 boards
→ 伐木: trees
→ 3 lumber (6 wood, 5s chop) → 木头短剑 (10s)
→ expand 角色 → 装备 → 主手
→ 冒险 → 果冻史莱姆 → 开始战斗
→ combat is a 12s life-action timer, not HP combat
```

There is **no Next Goal**, no chapter, no build choice, no boss phase. Forest Boss is a higher-HP card using the same start-battle modal.

### Visible first-screen entry count (desktop idle)

Primary: **7** action tabs (伐木 / 木工 / 冒险 / 强化 / 技能 / 交易 / 组队)  
Header: gold + **生涯** (10-item flat menu: 每日/成就/签到/商店/增益/统计/声望/赏金/转生/设置)  
Chrome: chat toggle + character rail  
Adventure: **11 maps** + 7 forest monsters including Boss  

A new player sees systems for the entire game before the first chop.

---

## Actual steps to first equipment

1. Leave 冒险 (the default).
2. 伐木 → 砍伐小白杨 (`act_chop_wood_t1`, 5000ms, `wood_1` ×1).
3. Repeat until ≥ 6 原木 (sword needs 3×`lumber_1`, each lumber costs 2 wood).
4. 木工 → 材料 → 制作标准木板 (`act_craft_lumber_t1`, 4000ms) ×3.
5. 木工 → 武器 → 制作木头短剑 (`act_craft_weapon_wooden_sword`, 10000ms, ATK 5).
6. Expand right panel → 装备 → 主手 → 穿上.

Chest armor (`act_craft_wood_chest`) is behind skill node `woodcutter_armor_crafting` (not first-hour unless we change unlocks).

UI does **not** preview ATK 0 → 5 before craft. Equip toast exists; combat does not clearly show the ATK delta.

---

## Actual steps to first battle

1. Optionally craft/equip sword (adventure nag copy).
2. 冒险 → 呼呼大睡森林 (already selected).
3. Click 果冻史莱姆 (frontend-hardcoded HP 100 / ATK 8 / DEF 5).
4. Modal: XP / gold / rare — **Start 开始战斗**.
5. Backend starts `act_combat_slime` duration **12000ms**, gold 10, not the React HP numbers.

Unequipped vs equipped does **not** change that duration action. Equipment is a display/stats panel, not the combat simulator.

---

## Top 10 UX frictions

1. Default landing is 冒险 + 11 endgame maps, not “chop this tree”.
2. Seven equal-weight action tabs; career adds ten more.
3. No persistent Next Goal; player must infer the loop from a one-line banner.
4. Craft cards show name + Lv, not “why” or ATK preview.
5. Character/equip is a collapsed rail; on 390px it is a FAB over chat — still a desktop sidebar metaphor.
6. `.header-center` hidden at 480px so live action status disappears.
7. Chat is a full-width bottom drawer competing with content.
8. 强化 / 技能 / 交易 / 组队 / 声望 / 转生 visible before first chop.
9. Combat modal is a stat sheet + one button; no HP bar, timer, or skill.
10. Empty/error for content-pack 429 is only on woodworking; other tabs stay silent.

---

## Top 10 visual inconsistencies

1. Logo is the character **工**, not a game mark.
2. Nav icons are the first Chinese character of the label, not a T1 icon set.
3. Monsters: CardArt SVG plates + emoji fallbacks; Boss uses a slime-like plate with gold rim.
4. Materials/recipes mix CardArt and emoji (`getItemIcon`).
5. Career menu is a flat system list, not a game menu.
6. Map chips are ungrouped endgame names next to T1 forest.
7. Glow/gradient still on cards, boss, brand header text-fill.
8. Tablet 1024 keeps a 56px icon rail (names hidden) — neither desktop labels nor mobile tabs.
9. Equipment panel is a spreadsheet of empty slots + 战斗属性 table.
10. No shared stroke/silhouette language between trees, monsters, and gear.

---

## Gameplay dead-ends / unclear states

- Frontend `monsters` object in `NewGameInterface.tsx` is a **second combat database** (HP/ATK/DEF per map). Backend combat is duration + yields in `shared/enhanced_content_pack_chinese.json`.
- Forest “archetypes” are flavour text; crab has higher DEF in React only.
- Boss has no Guard/Enrage; same `startLifeAction` as slime.
- No Woodcutter Heavy Chop, no Sharpened Edge / Thick Bark.
- Armor recipes hidden until a skill node; UI still lists high-level boards.
- `startCombatFarm` exists in storage but the live T1 path uses life actions.
- Default 冒险 + “去做武器” is the only tutorial; it does not track progress.
- High-tier maps are clickable with no first-hour lock.

---

## Screenshot index

| File | What |
|------|------|
| `01-login` | Guest login |
| `02-idle` | Default 冒险 after guest+seed |
| `03-logging` | 伐木 |
| `04-crafting` | 木工 |
| `05-equipment` | Right panel 装备 |
| `06-forest` | Forest monster grid |
| `07-combat-modal` | Slime start modal |
| `08-career-menu` | 生涯 flat list |

Viewports: 1440×900, 1024×768, 390×844.

---

## Phase 0 gate

Baseline captured. **No UI rewrite in this commit.** Next: Phase 1 `FIRST_HOUR_DESIGN.md`.
