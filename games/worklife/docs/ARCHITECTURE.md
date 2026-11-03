# Worklife (星辉物语) — AI-First Architecture & Module Index

> **Purpose**: Single-read architectural map for AI agents and developers. Every subsystem in `backend/src`, `frontend/src`, `shared/`, and `scripts/` is indexed below by responsibility and line budget.

---

## 1. Repository Layout

```text
worklife/
├── shared/
│   └── enhanced_content_pack_chinese.json   # Single source of truth for items, recipes, monsters, zones, sets, abilities, quests, houses
├── backend/src/                             # Fastify + TypeScript authoritative game server (port 26149 in prod)
├── frontend/src/                            # React 18 + Vite + TypeScript client (deployed to Cloudflare Workers)
├── scripts/                                 # Verification & asset audit CLI scripts
└── deploy/wrangler.toml                     # Cloudflare Workers static asset deployment config
```

---

## 2. Backend Architecture (`backend/src/`)

### 2.1 Entry, Routing & Auth
| File | Responsibility |
|---|---|
| `index.ts` | Fastify server bootstrap, CORS, static hosting, WebSocket/polling ticks, and all REST routes (`/api/auth/*`, `/api/game/*`, `/api/market/*`, `/api/party/*`, `/api/tasks/*`, `/api/houses/*`). |
| `auth.ts` | Password hashing, session token generation, and Bearer auth middleware. |
| `content_loader.ts` | Loads and validates `shared/enhanced_content_pack_chinese.json` at startup (`loadEnhancedContent()`). |
| `idempotency.ts` | Request idempotency key store preventing duplicate paid mutations on retry. |
| `number_safety.ts` | Safe integer validation (`assertSafePositiveInt`, overflow guards). |

### 2.2 Unified Storage Layer (`StorageAdapter`)
All persistence goes through `StorageAdapter` (`storage.ts`). Both adapters share **one pure domain layer** (`storage_domain.ts`) so business rules are never duplicated:

| File | Responsibility |
|---|---|
| `storage.ts` | `StorageAdapter` interface and TypeScript domain types (`PlayerState`, `MarketOrder`, `PartyState`, `RandomTask`, `HouseRoom`, etc.). |
| `storage_domain.ts` | **Single source of truth** for pure state mutations: starter state, inventory normalization, offline settlement, profession switching, gathering/crafting execution, enhancement math, alchemy coinify, equipment/set bonuses, houses, tasks, and party raid state transitions. |
| `storage_memory.ts` | In-memory `StorageAdapter` delegating domain logic to `storage_domain.ts` (used by unit tests & local dev). |
| `storage_pg.ts` | PostgreSQL `StorageAdapter` with transactional row locks (`FOR UPDATE`) delegating domain logic to `storage_domain.ts`. |

### 2.3 Combat & Progression Engines
| File | Responsibility |
|---|---|
| `hp_combat.ts` | Authoritative tick-based solo combat engine (`stepCombat`): player/monster attack intervals, accuracy/evasion/crit rolls, MP regen, ability triggers, food/drink auto-triggers, and Boss mechanics (`shield_wall`, `enrage`, `summon_adds`, `regenerate`, `aoe_blast`, `Thorns`, `mana_burn`, `execute_strike`). |
| `combat_skills.ts` | MWI-style 7-dimension combat skills (`stamina`, `intelligence`, `attack`, `defense`, `melee`, `ranged`, `magic`), derived combat level formula, ability slot count, and weapon main-skill routing. |
| `mwi_enhancement.ts` | MWI `+1..+20` gear enhancement probabilities, stat multiplier table, blessed scroll protection, and speed tool bonuses. |
| `offline_engine.ts` | Offline gathering, crafting, and combat simulation when a player reconnects (`computeOfflineProgress`). |
| `zone_chains_fixture.ts` | Canonical zone monster chains and Boss mechanic definitions used by progression & Boss mechanic test suites. |

---

## 3. Frontend Architecture (`frontend/src/`)

### 3.1 Application Shell & Top-Level Views (`frontend/src/components/`)
| File | Responsibility |
|---|---|
| `NewGameInterface.tsx` | Main game orchestrator: state synchronization with backend, action loop timers, header/sidebar/mobile nav routing, and tab switching across Gathering, Crafting, Adventure, Inventory, Tasks, Houses, Market, and Party. |
| `AdventurePanel.tsx` | Solo combat & monster selection view: zone progress bar, tactical loadout dock (potions/abilities/auto-heal), full-screen solo combat arena with floating damage numbers & Boss telegraph banners, and zone monster cards. |
| `PartyPanel.tsx` | Co-op Boss Raid battle controller: wave progression, tank/healer/dps threat & targeting, Boss signature skill telegraphs, party member HP/MP frames, and raid victory/loot settlement. |
| `PartyLobbyView.tsx` | Co-op Raid lobby: Boss dungeon selector cards, difficulty tiers, party invites, public AI/player squad browser, and active party roster management. |
| `TradingMarketView.tsx` | P2P Orderbook Market UI: item catalog grid, real-time ask/bid orderbook detail, limit order creation modal, and instant fill modal. |
| `GameModals.tsx` | Shared modal suite: `<EquipSelectorModal />`, `<GameEntityDetailModal />` (Monster/Gather/Craft/Item detail + Full Item Codex), `<ProfessionSwitchModal />`, and `<FirstBladeBuildModal />`. |
| `ProductionExtras.tsx` | `<ProductionTeaBar />` (gathering/crafting tea buff bar), `<AlchemyCoinifyPanel />` (item-to-gold transmutation), and `<CombatHpChip />`. |
| `CharacterSheet.tsx` | Paper-doll 10-slot equipment panel, 7-dimension combat skill bars, secondary combat stats (Accuracy/Evasion/Crit/CritDmg), and active set bonus display. |
| `AbilityLoadoutPanel.tsx` | Combat ability & consumable slot configuration with trigger rules (`always`, `hp_below`, `mp_above`, `on_boss_guard`, etc.) and Skill Book learning. |
| `EnhancementPanel.tsx` | `+1..+20` equipment enhancement workshop with success rate breakdown and protection item slots. |
| `TasksPage.tsx` & `HousesPage.tsx` | NPC commission task board (`TasksPage.tsx`) and passive buff/yield room construction (`HousesPage.tsx`). |
| `SkillSidebar.tsx` & `MobileNavBar.tsx` | Desktop collapsible MWI-style skill navigation sidebar and mobile 5-tab bottom navigation bar + drawer. |
| `NewGameInterface.css` | Consolidated, deduplicated stylesheet for all game panels, cards, animations, and responsive breakpoints. |

### 3.2 Pure Gameplay Logic & Content Mirrors (`frontend/src/gameplay/`)
| File | Responsibility |
|---|---|
| `gameConstants.ts` | Gathering/Crafting page definitions, resource node tables (`trees`, `ores`, `crops`, `fishingSpots`, `fiberSpots`, `crystalSpots`), equipment slot metadata, tea buff descriptors, and item icon helpers. |
| `partyRaidData.ts` | Co-op Boss Raid types, Boss signature skills (`BOSS_SIGNATURE_SKILLS`), wave/guard scaling helpers, and stage ID normalization. |
| `combatSheet.ts` | Client-side mirror of server combat stat calculation (`combatSheetFromPack`, `activeSetBonuses`, `derivedCombatLevel`, `abilitySlotCount`). |
| `fightPreview.ts` | Deterministic client-side combat simulator mirroring `backend/src/hp_combat.ts` to preview win rate / TTK before starting a fight. |
| `skillRows.ts` & `skillNav.ts` | Content-pack-driven gathering/crafting row builders and sidebar skill badge state. |
| `chapter1.ts` & `zones.ts` | Chapter 1 onboarding goal tracker and zone unlock progression helpers. |
| `mwiEnhancement.ts` | Client-side mirror of `+1..+20` enhancement multipliers and success rates. |
| `soundCues.ts` | WebAudio procedural sound synthesis for hits, crits, level-ups, drops, and UI clicks. |

### 3.3 Asset Pipeline (`frontend/src/assets/t1/`)
| File | Responsibility |
|---|---|
| `contract.ts` | Compact tuple-driven commercial art contract (`T1_ASSET_CONTRACT`) defining every monster, character, tree, gather scene, equipment, material, skill, and UI icon key. |
| `keys.ts` & `resolve.ts` | Canonical asset key lookup (`t1KeyFor`) and `webp > png > svg` priority URL resolver. |
| `T1Art.tsx` | Unified `<T1Art />` image component with automatic profile sizing (`illustration`, `item`, `icon`) and fallback handling. |

---

## 4. Verification & Deployment Commands

```powershell
# 1. Backend build & unit tests (64 suites / 349 tests)
Set-Location D:\project\worklife\backend
npm.cmd run build
npm.cmd test

# 2. Frontend unit tests (21 suites / 247 tests) & production bundle
Set-Location D:\project\worklife
npm.cmd run test:frontend
npm.cmd run verify:art
Set-Location D:\project\worklife\frontend
npx.cmd vite build

# 3. Deploy frontend to Cloudflare Workers (https://worklife.yinosites.com)
Set-Location D:\project\worklife
npx.cmd wrangler deploy -c deploy/wrangler.toml
```
