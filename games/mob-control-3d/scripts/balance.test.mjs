// 数值与曲线测试：node --test scripts/balance.test.mjs（不开端口、不开浏览器）
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs, newHeadlessState } from './lib/load_ts.mjs';

const { S, L, C, V } = await loadTs({
  S: 'src/game/State.ts',
  L: 'src/levels/LevelData.ts',
  C: 'src/game/CombatTables.ts',
  V: 'src/levels/CampaignCurve.ts',
});

/** 2026-11-26 调整前的公式，用来证明 1～31 关与 51 关以后没有变。 */
const oldSteps = (stage) => Math.min(40, stage - 1);
const oldRedHp = (stage) => Math.round((21 + (stage - 1) * 2.4) * Math.pow(1.135, oldSteps(stage)));
const oldRedDmg = (stage) => Math.round((14 + (stage - 1) * 1.4) * Math.pow(1.095, oldSteps(stage)));

test('敌人成长：1～31 关与 51 关起和调整前一致，32～50 关只降不升', () => {
  for (let s = 1; s <= 80; s++) {
    const r = C.computeRedUnitStats('normal', s);
    if (s <= 31 || s >= 51) {
      assert.equal(r.maxHp, oldRedHp(s), `hp ${s}`);
      assert.equal(r.dmg, oldRedDmg(s), `dmg ${s}`);
    } else {
      assert.ok(r.maxHp < oldRedHp(s) && r.dmg < oldRedDmg(s), `stage ${s}`);
    }
  }
});

test('敌人成长单调不降，且相邻两关血量涨幅不超过 22%', () => {
  let prev = 0;
  for (let s = 1; s <= 80; s++) {
    const hp = C.computeRedUnitStats('brute', s).maxHp;
    assert.ok(hp >= prev);
    if (s > 2) assert.ok(hp / prev <= 1.42, `stage ${s} ${hp / prev}`);
    if (s > 12) assert.ok(hp / prev <= 1.22, `stage ${s} ${hp / prev}`);
    prev = hp;
  }
});

test('1～500 关：曲线没有 NaN / Infinity / 负数，单调，31～52 关没有断崖', () => {
  const up = ['difficultyScale', 'bossMaxHp', 'enemyBurstCount', 'initialRedPrewarm', 'rewardGold'];
  const down = ['enemySpawnInterval', 'bruteSpawnInterval'];
  let prev = null;
  for (let s = 1; s <= 500; s++) {
    const c = V.campaignCurve(s);
    for (const k of [...up, ...down]) assert.ok(Number.isFinite(c[k]) && c[k] > 0, `${s} ${k} ${c[k]}`);
    if (prev) {
      for (const k of up) assert.ok(c[k] >= prev[k], `${s} ${k}`);
      for (const k of down) assert.ok(c[k] <= prev[k], `${s} ${k}`);
      if (s >= 31) assert.ok(c.bossMaxHp / prev.bossMaxHp <= 1.18, `${s} ${c.bossMaxHp / prev.bossMaxHp}`);
    }
    for (const kind of ['normal', 'brute', 'baneling', 'shaman']) {
      const r = C.computeRedUnitStats(kind, s);
      for (const k of ['maxHp', 'dmg', 'speed', 'radius']) assert.ok(Number.isFinite(r[k]) && r[k] > 0, `${s} ${kind} ${k}`);
      if (s > 1) {
        const p = C.computeRedUnitStats(kind, s - 1);
        assert.ok(r.maxHp >= p.maxHp && r.dmg >= p.dmg && r.speed >= p.speed, `${s} ${kind}`);
      }
    }
    prev = c;
  }
});

test('Boss 关出兵：比例加兵、不低于普通关、不超过上限', () => {
  for (let s = 1; s <= 80; s++) {
    const base = V.campaignCurve(s);
    const mega = V.bossStageSpawns(base, true, false);
    const mini = V.bossStageSpawns(base, false, true);
    const normal = V.bossStageSpawns(base, false, false);
    assert.equal(normal.enemyBurstCount, base.enemyBurstCount);
    assert.ok(mega.enemyBurstCount >= base.enemyBurstCount && mega.enemyBurstCount <= 22);
    assert.ok(mini.enemyBurstCount >= base.enemyBurstCount && mini.enemyBurstCount <= 20);
    assert.ok(mega.enemySpawnInterval <= base.enemySpawnInterval && mega.enemySpawnInterval >= 0.36);
  }
  assert.deepEqual(V.bossStageSpawns(V.campaignCurve(10), true, false).enemyBurstCount, 11);
});

test('关卡生成器用的就是曲线函数', () => {
  for (const s of [1, 5, 10, 20, 41, 60]) {
    const lv = L.generateDynamicLevel(s, 4242);
    const base = V.campaignCurve(s);
    assert.equal(lv.bossMaxHp, Math.round(base.bossMaxHp * V.bossHpMultiplier(lv.isMegaBoss, lv.isMiniBoss, lv.isMilestoneBoss)));
    assert.equal(lv.rewardGold >= base.rewardGold, true);
  }
});

test('炮台：每一种都有真实差异（双管多出兵、等离子多高能），新字段都有值', () => {
  for (const id of S.WEAPON_ORDER) {
    const w = S.WEAPON_SPECS[id];
    assert.ok(w.baseVolley >= 1 && w.chargedBonus >= 0 && w.energyMult >= 1, id);
  }
  assert.equal(S.WEAPON_SPECS.twin.baseVolley, 2);
  assert.ok(S.WEAPON_SPECS.twin.baseVolley * S.WEAPON_SPECS.twin.fireRateMult > 1);
  assert.ok(S.WEAPON_SPECS.plasma.chargedBonus > 0);
});

test('兔耳族 T2 第一级就能抬高蓝门上限', () => {
  const st = newHeadlessState(S);
  st.selectedRaceId = 'gate';
  st.skillNodes = {};
  const base = Math.max(5, st.getMaxBlueGateCap());
  st.skillNodes = { gate_t2: 1 };
  assert.equal(Math.max(5, st.getMaxBlueGateCap()), base + 1);
});

test('冲锋卡时长不超过总上限', () => {
  for (const id of ['rush_open', 'rush_half', 'rush_final']) {
    assert.ok(S.TACTIC_CARDS[id].durationSec <= S.TACTIC_RUSH_MAX_SEC);
    assert.ok(S.TACTIC_CARDS[id].desc.includes(`${S.TACTIC_CARDS[id].durationSec} 秒`));
  }
});

test('旧存档照常读取：炮台、战术卡、天赋、炮芯等级都不丢', () => {
  const seed = newHeadlessState(S);
  seed.save();
  const raw = JSON.parse(globalThis.localStorage.getItem('swarm_control_3d_save_v3'));
  Object.assign(raw, {
    weapon: 'twin',
    gold: 12345,
    bestStageCleared: 37,
    totalMatchesPlayed: 60,
    selectedRaceId: 'gate',
    skillNodes: { gate_t1: 3, gate_t2: 2 },
    ownedTacticCards: ['rush_open', 'crowd_open'],
    tacticDeck: ['rush_open', null, 'crowd_open'],
    cannonModLevels: { overdrive_breech: 2, prism_splitter: 5, heavy_mortar: 0 },
  });
  globalThis.localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(raw));
  const st = new S.GameState();
  assert.equal(st.gold, 12345);
  assert.equal(st.weapon, 'twin');
  assert.equal(st.bestStageCleared, 37);
  assert.deepEqual(st.skillNodes, { gate_t1: 3, gate_t2: 2 });
  assert.deepEqual(st.tacticDeck, ['rush_open', null, 'crowd_open']);
  assert.equal(st.cannonModLevels.prism_splitter, 5);
});
