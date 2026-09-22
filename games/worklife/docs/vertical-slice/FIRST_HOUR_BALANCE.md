# First-hour balance — Phase 3

> Command: `npx tsx scripts/simulate-first-hour.ts`  
> Simulator uses real `startLifeAction` / `simulateToNow` for gather/craft, and **deterministic HP combat** (no RNG) for fight outcomes. Phase 4 must keep this formula server-side.

## Canonical sequence

Empty inventory → 6×`act_chop_wood_t1` → 3×`act_craft_lumber_t1` → `act_craft_weapon_wooden_sword` → equip → chop to woodcutter 3 + 12 wood → 6 boards → `act_craft_wood_chest` → equip → slime / crab / monkey → Forest Boss with 厚树皮.

## Busy-idle timestamps (latest run)

| Beat | Busy time | Target (Issue #2) | Verdict |
|------|-----------|--------------------|---------|
| First chop | 0.15 min | < 3 min | **PASS** |
| First boards | 0.91 min | ~5–8 min idle-friendly | Busy-idle is faster; wall-clock with UI still the 5–8 min intent. Did **not** slow chop past 5s (that would break first-action < 30s). |
| First sword | 1.22 min | ~15 min meaningful gear | **Documented miss.** Inflating wood cost to pad 15 minutes of chopping is worse product than a 1-minute first sword plus real combat. |
| First chest | 3.48 min | after sword | PASS |
| First slime | 3.90 min | 15–30 min first battle | Busy-idle ~4 min; real players slower. |
| Boss-ready | 6.10 min | 40–60 min | Mechanical spine is ~6 min. Remaining time is onboarding, deaths, boss phases, and not min-maxing. **Not** padded with 40 identical slimes. |

## Combat preview (deterministic)

| Fight | Result | Duration | Player HP left |
|-------|--------|----------|----------------|
| Unarmed slime | LOSS | 41s | 0 |
| Sword slime | WIN | 30s | 14 |
| Sword crab (tank) | WIN | 66s | 30 |
| Sword monkey (fast) | WIN | 21s | 11 |
| Boss + 开刃 | WIN | 57s | 2 |
| Boss + 厚树皮 + chest | WIN | 75s | 49 |

Equip changes the slime outcome. Build choice changes boss leftover HP. Crab is not a slime reskin (2× duration, high DEF). Monkey is shorter and punchier.

## Numbers changed (from simulation, not gut)

| Change | Before | After | Why |
|--------|--------|--------|-----|
| New player inventory | gold 50, wood 4, lumber 3 | gold 0 | Starter lumber skipped the entire 伐木 loop. |
| Slime | HP 100 / ATK 8 | HP 80 / ATK 3 / DEF 4 | ATK 8 killed a sword user in 17s; first fight must be winnable with the sword and unwinnable unarmed. |
| Crab | HP 250 / ATK 18 / incoming 0.65 | HP 110 / ATK 2 / DEF 10 / 3.2s | Double-tank (DEF + incoming) + ATK 18 was a 12s wipe. Tank = slow kill, low damage. |
| Monkey | HP 150 / ATK 12 / 1.6s | HP 60 / ATK 3 / incoming 1.1 | Fast glass: shorter fight, more hits taken. |
| Forest Boss | HP 500 / ATK 80 | HP 220 / ATK 8 / DEF 8 / 3.5s | ATK 80 one-shot the player. Boss needs two phases in Phase 4, not a 2s wipe. |
| `act_craft_wood_chest` skillLevel | 7 | 3 | Chest is the chapter’s second gear beat, not a skill-tree scavenger hunt. |
| `woodcutter_armor_crafting` | level 6 | level 3 + granted on new player | Recipe visible; craft still requires woodcutter 3. |

## Gold

Starter gold removed. Preview fights do not yet grant gold (Phase 4). Sim gold stays 0 through the sequence — no explosion.

## Gate for later phases

Phase 4 must reproduce: unarmed slime LOSS, sword slime WIN, crab slower than slime, monkey faster, 厚树皮 safer on boss than 开刃.
