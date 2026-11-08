import { apiClient } from '../services/api'
import { T1Art, T1ItemIcon, characterArtId } from './T1Art'
import { MonsterSceneBackdrop } from './MonsterSceneBackdrop'
import { CombatPotionBar } from './CombatPotionBar'
import { AbilityLoadoutPanel } from './AbilityLoadoutPanel'
import { AbilityBar } from './AbilityBar'
import { CombatHpChip } from './ProductionExtras'
import { zoneDoors } from '../gameplay/encounters'
import { abilitySlotCount, mainCombatSkill } from '../gameplay/combatSheet'
import { encounterRewardLine } from '../gameplay/encounterLabels'
import { mechanicLogMatcher } from '../gameplay/bossMechanics'
import { COMBAT_SKILL_LABEL, getItemIcon, type ActiveTab, type ProfessionId } from '../gameplay/gameConstants'
import { useToast } from './Toast'
import type { AbilityDef, PlayerState } from '../types/game'

export interface AdventurePanelProps {
  playerState: PlayerState
  contentPack: any
  adventureStages: any[]
  selectedMap: string
  setSelectedMap: (m: string) => void
  selectedEncounters: any[]
  chapterDone: boolean
  chapterGoalId: string
  combatSheet: any
  combatNow: number
  equippedAbilities: any[]
  abilityCatalog?: AbilityDef[]
  showCombatConfig: boolean
  setShowCombatConfig: React.Dispatch<React.SetStateAction<boolean>>
  battleState: any
  showVictoryFx: boolean
  hitShake: { player: boolean; enemy: boolean }
  damageFloats: Array<{ id: number; target: 'player' | 'enemy'; damage: number; isCrit: boolean }>
  playerName: string
  playerGender: 'male' | 'female' | 'animal'
  currentProfession: ProfessionId
  setCurrentProfession: (p: ProfessionId) => void
  setActiveTab: (t: ActiveTab) => void
  setCraftCategory: (c: string) => void
  setIsRightPanelExpanded: (b: boolean) => void
  getItemNameById: (id: string) => string
  isCurrentlyFighting: (monsterId: string) => boolean
  onSelectMonster: (monster: any) => void
  startBattle: (monster: any) => Promise<void>
  stopBattle: () => Promise<void>
  refreshPlayerState: () => Promise<void>
}

export function AdventurePanel({
  playerState,
  contentPack,
  adventureStages,
  selectedMap,
  setSelectedMap,
  selectedEncounters,
  chapterDone,
  chapterGoalId,
  combatSheet,
  combatNow,
  equippedAbilities,
  abilityCatalog,
  showCombatConfig,
  setShowCombatConfig,
  battleState,
  showVictoryFx,
  hitShake,
  damageFloats,
  playerName,
  playerGender,
  currentProfession,
  setCurrentProfession,
  setActiveTab,
  setCraftCategory,
  setIsRightPanelExpanded,
  getItemNameById,
  isCurrentlyFighting,
  onSelectMonster,
  startBattle,
  stopBattle,
  refreshPlayerState,
}: AdventurePanelProps) {
  const toast = useToast()

  return (
    <div className={`adventure-layout${battleState ? ' combat-open' : ''}`}>
      {!battleState && (
        <div className="adventure-command-bar">
          <div className="adventure-command-top">
            <div className="adventure-zone-bar">
              <h2 className="section-title adventure-title">冒险</h2>
              <div className="adventure-zone-tabs" role="tablist" aria-label="区域选择">
                {zoneDoors(adventureStages, chapterDone).open.map((map) => (
                  <button
                    key={map.id}
                    type="button"
                    onClick={() => setSelectedMap(map.id)}
                    className={`map-btn ${selectedMap === map.id ? 'active' : ''}`}
                  >
                    {map.name}
                  </button>
                ))}
                {zoneDoors(adventureStages, chapterDone).locked && (
                  <button
                    type="button"
                    className="map-btn locked"
                    disabled
                    title={chapterDone ? '更远的路。先在前面的区域站稳。' : '第一章结束后才会开放'}
                  >
                    {`${zoneDoors(adventureStages, chapterDone).locked!.name}（未开放）`}
                  </button>
                )}
              </div>
            </div>
            <div className="adventure-status-right">
              <CombatHpChip
                maxHp={combatSheet.hp}
                combatHp={playerState.combatHp}
                combatHpAt={playerState.combatHpAt}
                activeClassId={playerState.activeClassId}
              />
            </div>
          </div>

          {!playerState.equipment?.main_hand && (
            <div className="page-info adventure-hint-banner">
              <p>
                还没装备武器。先去木工打造一把木头短剑，再点角色穿上。
                <button
                  type="button"
                  className="header-menu-btn"
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    setCurrentProfession('woodcutter')
                    setActiveTab('woodworking')
                    setCraftCategory('weapons')
                    setIsRightPanelExpanded(true)
                    void apiClient.setActiveClass('woodcutter').catch(() => undefined)
                  }}
                >
                  去做武器
                </button>
              </p>
            </div>
          )}
          {chapterGoalId === 'chest' && !!playerState.equipment?.main_hand && !playerState.equipment?.chest && (
            <div className="page-info adventure-hint-banner">
              <p>
                武器有了，但林子里的小猴和寄居蟹可不好惹。先去木工做出木制胸甲，再到角色穿上。
                <button
                  type="button"
                  className="header-menu-btn"
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    setCurrentProfession('woodcutter')
                    setActiveTab('woodworking')
                    setCraftCategory('equipment')
                    setIsRightPanelExpanded(true)
                    void apiClient.setActiveClass('woodcutter').catch(() => undefined)
                  }}
                >
                  去做护甲
                </button>
              </p>
            </div>
          )}

          <div className="adventure-tactical-dock">
            <div className="tactical-dock-group tactical-potions-group">
              <span className="tactical-dock-label">🧪 战斗补给</span>
              <CombatPotionBar
                loadout={playerState.combatLoadout}
                items={contentPack?.items as any}
                inventory={playerState.inventory}
                equipment={playerState.equipment as any}
                activeBuffs={playerState.activeBuffs}
                playerHp={playerState.combatHp ?? combatSheet.hp}
                playerMaxHp={combatSheet.hp}
                playerMp={combatSheet.mp ?? 50}
                playerMaxMp={combatSheet.mp ?? 50}
                now={combatNow}
                iconOf={getItemIcon}
                onChangeLoadout={async (next) => {
                  try {
                    apiClient.clearCache()
                    await apiClient.setCombatLoadout(next)
                    await refreshPlayerState()
                  } catch (e: any) {
                    toast.error(e?.message || '保存药剂槽失败')
                  }
                }}
                onManualConsume={async (itemId) => {
                  try {
                    apiClient.clearCache()
                    const res = await apiClient.consumeItem(itemId)
                    await refreshPlayerState()
                    const parts: string[] = []
                    if (res?.healed?.hp) parts.push(`+${res.healed.hp} 生命`)
                    if (res?.healed?.mp) parts.push(`+${res.healed.mp} 魔力`)
                    if (res?.buff?.name) parts.push(`激活「${res.buff.name}」`)
                    toast.success(`已饮用 ${res?.itemName || getItemNameById(itemId)}${parts.length ? `（${parts.join(' · ')}）` : ''}`)
                  } catch (e: any) {
                    toast.error(e?.message || '饮用药剂失败')
                  }
                }}
                onQuickBuyPotion={async (itemId, qty) => {
                  try {
                    apiClient.clearCache()
                    await apiClient.shopBuy(itemId, qty)
                    await refreshPlayerState()
                    toast.success(`购买成功：${getItemNameById(itemId)} ×${qty}`)
                    return true
                  } catch (e: any) {
                    toast.error(e?.message || '金币不足或购买失败')
                    return false
                  }
                }}
              />
            </div>

            <div className="tactical-dock-divider" aria-hidden="true" />

            <div className="tactical-dock-group tactical-skills-group">
              <span className="tactical-dock-label">✨ 自动技能</span>
              <div className="tactical-skill-chain">
                {equippedAbilities.length > 0 ? (
                  equippedAbilities.map((a, idx) => (
                    <span
                      key={a.def.id}
                      className="tactical-skill-pill"
                      title={`${a.def.name} Lv.${a.level}（${a.masteryTitle || '初窥门径'}）· 经验 ${a.xp ?? 0}/${a.nextXp ?? 40}`}
                    >
                      {idx > 0 && <em className="tactical-skill-arrow">→</em>}
                      <b>{a.def.name}</b>
                      <small>Lv.{a.level}</small>
                    </span>
                  ))
                ) : (
                  <span className="tactical-skill-empty">未装备技能</span>
                )}
              </div>
              <button
                type="button"
                className="header-menu-btn combat-config-toggle"
                aria-expanded={showCombatConfig}
                onClick={() => setShowCombatConfig((v) => !v)}
              >
                {showCombatConfig ? '收起技能' : '⚙️ 配置技能'}
              </button>
            </div>
          </div>

          {showCombatConfig && (
            <div className="combat-config-body">
              <AbilityLoadoutPanel
                catalog={abilityCatalog}
                known={playerState.abilities}
                loadout={playerState.abilityLoadout}
                slotCount={abilitySlotCount(playerState)}
                intelligenceLevel={playerState.combatSkills?.intelligence?.level || 1}
                compact
                onChange={async (slots) => {
                  try {
                    apiClient.clearCache()
                    await apiClient.setAbilityLoadout(slots)
                    await refreshPlayerState()
                  } catch (e: any) {
                    toast.error(e?.message || '保存技能配置失败')
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {battleState ? (
        <div className="battle-full-screen">
          <div className="battle-status-panel-center">
            <div className="battle-header">
              <div className="battle-title-section">
                <h3>战斗</h3>
                <div className="battle-stats-compact">
                  {(playerState.hpCombat?.streak || 0) > 0 && (
                    <>
                      <span className="battle-count">连胜 {playerState.hpCombat?.streak}</span>
                      <span className="battle-separator">|</span>
                    </>
                  )}
                  <span className="battle-earnings">
                    胜利奖励 {battleState.monster.xp || 0} XP · {battleState.monster.gold || 0} 金
                  </span>
                  <span className="battle-separator">|</span>
                  <span className="battle-auto">连续战斗中</span>
                </div>
              </div>
              <button className="btn-back" onClick={stopBattle}>
                ← 返回
              </button>
            </div>

            <div className="battle-display-center">
              {showVictoryFx && <div className="victory-fx-overlay" aria-hidden="true" />}
              <div className={`battle-entity player-entity${hitShake.player ? ' entity-hit' : ''}`}>
                <div className="entity-name">{playerName}</div>
                <div className="entity-level">Lv.{playerState.combatLevel || 1}</div>
                <div className={`entity-avatar${hitShake.player ? ' avatar-shake' : ''}`}>
                  <MonsterSceneBackdrop
                    monsterId="slime"
                    mapId={battleState.monster.map || selectedMap}
                    variant="avatar"
                  />
                  <T1Art kind="character" id={characterArtId(currentProfession || 'woodcutter', playerGender)} alt="" />
                </div>
                <div className="damage-float-container">
                  {damageFloats
                    .filter((d) => d.target === 'player')
                    .map((d) => (
                      <span key={d.id} className={`damage-float damage-taken${d.isCrit ? ' crit' : ''}`}>
                        -{d.damage}
                      </span>
                    ))}
                </div>
                <div className="hp-bar">
                  <div className="hp-label-enhanced">
                    <span>HP</span>
                    <span
                      className="hp-percentage"
                      style={{
                        color:
                          battleState.playerHp / battleState.playerMaxHp > 0.5
                            ? '#4CAF50'
                            : battleState.playerHp / battleState.playerMaxHp > 0.2
                            ? '#FFC107'
                            : '#f44336',
                      }}
                    >
                      {Math.round((battleState.playerHp / battleState.playerMaxHp) * 100)}%
                    </span>
                  </div>
                  <div className="hp-container">
                    <div
                      className="hp-fill player-hp"
                      style={{
                        width: `${Math.max(0, (battleState.playerHp / battleState.playerMaxHp) * 100)}%`,
                        background:
                          battleState.playerHp / battleState.playerMaxHp > 0.5
                            ? 'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)'
                            : battleState.playerHp / battleState.playerMaxHp > 0.2
                            ? 'linear-gradient(90deg, #FFC107 0%, #FFD54F 100%)'
                            : 'linear-gradient(90deg, #f44336 0%, #EF5350 100%)',
                      }}
                    />
                  </div>
                  <div className="hp-numbers">
                    {battleState.playerHp}/{battleState.playerMaxHp}
                  </div>
                </div>
                {(playerState.hpCombat?.playerMaxMp || 0) > 0 && (
                  <div className="mp-bar" aria-label="魔力">
                    <div className="mp-container">
                      <div
                        className="mp-fill"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, ((playerState.hpCombat!.playerMp || 0) / (playerState.hpCombat!.playerMaxMp || 1)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="mp-numbers">
                      MP {playerState.hpCombat!.playerMp ?? 0}/{playerState.hpCombat!.playerMaxMp} (
                      {Math.round(((playerState.hpCombat!.playerMp || 0) / Math.max(1, playerState.hpCombat!.playerMaxMp || 1)) * 100)}
                      %)
                    </div>
                  </div>
                )}
                <div className={`cast-bar${battleState.isActive && battleState.playerCastTime / battleState.playerCastDuration > 0.8 ? ' cast-nearly-ready' : ''}`}>
                  <div className="cast-container">
                    <div
                      className="cast-fill player-cast"
                      style={{
                        width: `${
                          battleState.isActive
                            ? Math.max(0, Math.min(100, (battleState.playerCastTime / battleState.playerCastDuration) * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="cast-time">
                    {battleState.isActive
                      ? `${(battleState.playerCastTime / 1000).toFixed(1)}s / ${(battleState.playerCastDuration / 1000).toFixed(1)}s (${Math.min(
                          100,
                          Math.floor((battleState.playerCastTime / Math.max(1, battleState.playerCastDuration)) * 100)
                        )}%)`
                      : `${(battleState.playerCastDuration / 1000).toFixed(1)}s`}
                  </div>
                </div>
              </div>

              <div className="battle-vs-center">
                <div className={`vs-text${showVictoryFx ? ' vs-victory' : ''}`}>VS</div>
                <div className="turn-indicator">
                  {!battleState.isActive && battleState.enemyHp <= 0
                    ? '胜利'
                    : !battleState.isActive && battleState.playerHp <= 0
                    ? '失败'
                    : '战斗中'}
                </div>
              </div>

              <div className={`battle-entity enemy-entity${hitShake.enemy ? ' entity-hit' : ''}`}>
                <div className="entity-name">{battleState.monster.name}</div>
                <div className="entity-level">Lv.{battleState.monster.level}</div>
                <div className={`entity-avatar${hitShake.enemy ? ' avatar-shake' : ''}${battleState.monster.isBoss ? ' is-boss-art' : ''}`}>
                  <MonsterSceneBackdrop
                    monsterId={battleState.monster.id}
                    mapId={battleState.monster.map || selectedMap}
                    isBoss={battleState.monster.isBoss}
                    variant="avatar"
                  />
                  <T1Art kind="monster" id={battleState.monster.id} fallback={battleState.monster.icon || ''} alt="" />
                </div>
                <div className="damage-float-container">
                  {damageFloats
                    .filter((d) => d.target === 'enemy')
                    .map((d) => (
                      <span key={d.id} className={`damage-float damage-dealt${d.isCrit ? ' crit' : ''}`}>
                        -{d.damage}
                      </span>
                    ))}
                </div>
                <div className="hp-bar">
                  <div className="hp-label-enhanced">
                    <span>HP</span>
                    <span
                      className="hp-percentage"
                      style={{
                        color:
                          battleState.enemyHp / battleState.enemyMaxHp > 0.5
                            ? '#f44336'
                            : battleState.enemyHp / battleState.enemyMaxHp > 0.2
                            ? '#FF9800'
                            : '#4CAF50',
                      }}
                    >
                      {Math.round((battleState.enemyHp / battleState.enemyMaxHp) * 100)}%
                    </span>
                  </div>
                  <div className="hp-container">
                    <div
                      className="hp-fill enemy-hp"
                      style={{
                        width: `${Math.max(0, (battleState.enemyHp / battleState.enemyMaxHp) * 100)}%`,
                        background:
                          battleState.enemyHp / battleState.enemyMaxHp > 0.5
                            ? 'linear-gradient(90deg, #f44336 0%, #EF5350 100%)'
                            : battleState.enemyHp / battleState.enemyMaxHp > 0.2
                            ? 'linear-gradient(90deg, #FF9800 0%, #FFB74D 100%)'
                            : 'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)',
                      }}
                    />
                  </div>
                  <div className="hp-numbers">
                    {battleState.enemyHp}/{battleState.enemyMaxHp}
                  </div>
                </div>
                <div className={`cast-bar${battleState.isActive && battleState.enemyCastTime / battleState.enemyCastDuration > 0.8 ? ' cast-nearly-ready' : ''}`}>
                  <div className="cast-container">
                    <div
                      className="cast-fill enemy-cast"
                      style={{
                        width: `${
                          battleState.isActive
                            ? Math.max(0, Math.min(100, (battleState.enemyCastTime / battleState.enemyCastDuration) * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="cast-time">
                    {battleState.isActive
                      ? `${(battleState.enemyCastTime / 1000).toFixed(1)}s / ${(battleState.enemyCastDuration / 1000).toFixed(1)}s (${Math.min(
                          100,
                          Math.floor((battleState.enemyCastTime / Math.max(1, battleState.enemyCastDuration)) * 100)
                        )}%)`
                      : `${(battleState.enemyCastDuration / 1000).toFixed(1)}s`}
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              const rs = playerState?.hpCombat?.runStats ?? {
                startedAt: playerState?.hpCombat?.startedAt || combatNow,
                kills: 0,
                xp: 0,
                gold: 0,
                loot: {} as Record<string, number>,
              }
              const deaths = playerState?.hpCombat?.deaths ?? 0
              const startMs = rs.startedAt || playerState?.hpCombat?.startedAt || combatNow
              const elapsedMs = Math.max(0, combatNow - startMs)
              const totalSecs = Math.max(0, Math.floor(elapsedMs / 1000))
              const hrs = Math.floor(totalSecs / 3600)
              const mins = Math.floor((totalSecs % 3600) / 60)
              const secs = totalSecs % 60
              const durationText =
                hrs > 0
                  ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                  : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
              const lootEntries = Object.entries(rs.loot || {})
              return (
                <div className="battle-run-stats" aria-label="战斗累计统计">
                  <span className="run-stat">
                    <small>战斗时长</small>
                    <strong>{durationText}</strong>
                  </span>
                  <span className="run-stat">
                    <small>累计击杀</small>
                    <strong>{rs.kills.toLocaleString()}</strong>
                  </span>
                  <span className="run-stat">
                    <small>死亡次数</small>
                    <strong className={deaths > 0 ? 'stat-danger-val' : ''}>{deaths}</strong>
                  </span>
                  <span className="run-stat">
                    <small>累计经验</small>
                    <strong>+{Math.round(rs.xp).toLocaleString()}</strong>
                  </span>
                  <span className="run-stat">
                    <small>累计金币</small>
                    <strong>+{Math.round(rs.gold).toLocaleString()}</strong>
                  </span>
                  <span className="run-stat run-loot">
                    <small>累计掉落</small>
                    {lootEntries.length === 0 ? (
                      <strong>暂无</strong>
                    ) : (
                      <span className="run-loot-list">
                        {lootEntries.map(([id, qty]) => (
                          <span className="run-loot-chip" key={id} title={`${getItemNameById(id)} ×${qty}`}>
                            <T1ItemIcon itemId={id} fallback={getItemIcon(id)} alt="" />
                            <span className="run-loot-name">{getItemNameById(id)}</span>
                            <b>×{qty}</b>
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </div>
              )
            })()}

            <div className="battle-controls-center">
              {!battleState.isActive && battleState.enemyHp <= 0 && battleState.playerHp > 0 && !battleState.isPlayerDead && (
                <div className="auto-continue-info">
                  <div className="victory-text">战斗胜利</div>
                  <div className="victory-rewards">
                    <span className="reward-item">+{battleState.monster.xp} 经验</span>
                    <span className="reward-item">+{battleState.monster.gold} 金币</span>
                    {battleState.drops.map((d: any) => (
                      <span className="reward-item reward-drop" key={d.itemId}>
                        <T1ItemIcon itemId={d.itemId} fallback={getItemIcon(d.itemId)} alt="" />
                        +{d.qty} {d.name}
                      </span>
                    ))}
                  </div>
                  {playerState.hpCombat?.xpGained &&
                    (() => {
                      const main = mainCombatSkill(playerState)
                      const paid = Object.keys(playerState.hpCombat!.xpGained!).filter(
                        (k) => (playerState.hpCombat!.xpGained![k] || 0) > 0
                      )
                      const order = [main, 'stamina', 'intelligence', 'attack', 'defense', 'melee', 'ranged', 'magic'].filter(
                        (k, i, arr) => arr.indexOf(k) === i && paid.includes(k)
                      )
                      const abilityPaid = Object.entries(playerState.hpCombat?.abilityXpGained || {}).filter(
                        ([, v]) => (v || 0) > 0
                      )
                      return (
                        <div className="victory-xp-split" aria-label="经验分配">
                          {order.map((k) => (
                            <span className={`xp-chip${k === main ? ' main' : ''}`} key={k}>
                              {COMBAT_SKILL_LABEL[k]} +{playerState.hpCombat!.xpGained![k] ?? 0}
                            </span>
                          ))}
                          {abilityPaid.map(([abId, abXp]) => {
                            const def = abilityCatalog?.find((a) => a.id === abId)
                            return (
                              <span className="xp-chip ability-xp" key={`ab-${abId}`}>
                                ✨ {def?.name || abId} +{abXp} 技能经验
                              </span>
                            )
                          })}
                        </div>
                      )
                    })()}
                  {(playerState.hpCombat?.consumed?.length || 0) > 0 && (
                    <div className="victory-consumed">
                      本场用掉：{playerState.hpCombat!.consumed!.map((c) => `${c.name} ×${c.qty}`).join('、')}
                    </div>
                  )}
                  {playerState.hpCombat?.nextFightAt ? (
                    <>
                      <div className="auto-text">
                        {Math.max(0, Math.ceil((playerState.hpCombat.nextFightAt - Date.now()) / 1000))} 秒后自动开始下一场（连胜{' '}
                        {playerState.hpCombat.streak || 0}）
                      </div>
                      <button className="btn-stop-large" onClick={stopBattle}>
                        停止战斗
                      </button>
                    </>
                  ) : (
                    <div className="victory-actions">
                      <button className="btn-continue-large" onClick={() => startBattle(battleState.monster)}>
                        继续战斗
                      </button>
                      <button className="btn-stop-large" onClick={stopBattle}>
                        返回
                      </button>
                    </div>
                  )}
                </div>
              )}
              {battleState.isPlayerDead && (
                <div className="revive-info">
                  <div className="death-text">战斗失败</div>
                  {playerState.hpCombat?.nextFightAt ? (
                    <>
                      <div className="revive-countdown">
                        <div className="countdown-text">
                          {Math.max(0, Math.ceil((playerState.hpCombat.nextFightAt - Date.now()) / 1000))} 秒后重生，继续挑战{' '}
                          {battleState.monster.name}
                          {(playerState.hpCombat.deaths || 0) > 0 ? `（本轮已阵亡 ${playerState.hpCombat.deaths} 次）` : ''}
                        </div>
                        <div className="countdown-hint">
                          连续输说明配置不够：
                          {playerState.equipment?.chest
                            ? '试试换构筑、配食物槽，或先打更软的怪。'
                            : '先做一件木制胸甲，再配一格食物。'}
                        </div>
                      </div>
                      <button className="btn-stop-large" onClick={stopBattle}>
                        停止战斗
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="revive-countdown">
                        <div className="countdown-hint">
                          连续阵亡已达上限，自动停止战斗以保护装备耐久。调整装备或补给后再战。
                        </div>
                      </div>
                      <div className="victory-actions">
                        <button className="btn-continue-large" onClick={() => startBattle(battleState.monster)}>
                          重新挑战
                        </button>
                        <button className="btn-stop-large" onClick={stopBattle}>
                          返回
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {battleState.isActive && !battleState.isPlayerDead && (
                <div className="battle-progress">
                  {playerState?.hpCombat?.guardActive && <div className="progress-text">格挡中 — 用重劈破防</div>}
                  {playerState?.hpCombat?.wrathActive && <div className="progress-text">自然之怒</div>}
                  {(playerState?.hpCombat?.enrageStacks || 0) > 0 && (
                    <div className="progress-text enrage">
                      狂暴 ×{playerState!.hpCombat!.enrageStacks}（怪物伤害 +{(playerState!.hpCombat!.enrageStacks || 0) * 10}%）
                    </div>
                  )}
                  <AbilityBar
                    abilities={equippedAbilities}
                    readyAt={(id) =>
                      id === 'heavy_chop' ? playerState.hpCombat?.heavyChopReadyAt || 0 : playerState.hpCombat?.abilityReadyAt?.[id] || 0
                    }
                    now={combatNow}
                    mp={playerState.hpCombat?.playerMp ?? combatSheet.mp ?? 0}
                    maxMp={playerState.hpCombat?.playerMaxMp ?? combatSheet.mp ?? 0}
                    guardActive={!!playerState.hpCombat?.guardActive}
                    disabled={!playerState.hpCombat || !!playerState.hpCombat.outcome}
                  />
                  <button className="btn-stop-small" onClick={stopBattle}>
                    停止战斗
                  </button>
                </div>
              )}
            </div>

            <CombatPotionBar
              inCombat
              loadout={playerState.combatLoadout}
              items={contentPack?.items as any}
              inventory={playerState.inventory}
              equipment={playerState.equipment as any}
              activeBuffs={playerState.activeBuffs}
              playerHp={battleState.playerHp}
              playerMaxHp={battleState.playerMaxHp}
              playerMp={playerState.hpCombat?.playerMp ?? combatSheet.mp ?? 0}
              playerMaxMp={playerState.hpCombat?.playerMaxMp ?? combatSheet.mp ?? 0}
              foodReadyAt={playerState.hpCombat?.foodReadyAt}
              mpReadyAt={playerState.hpCombat?.mpReadyAt}
              now={combatNow}
              iconOf={getItemIcon}
              onChangeLoadout={async (next) => {
                try {
                  apiClient.clearCache()
                  await apiClient.setCombatLoadout(next)
                  await refreshPlayerState()
                } catch (e: any) {
                  toast.error(e?.message || '保存药剂槽失败')
                }
              }}
              onManualConsume={async (itemId) => {
                try {
                  apiClient.clearCache()
                  const res = await apiClient.consumeItem(itemId)
                  await refreshPlayerState()
                  const parts: string[] = []
                  if (res?.healed?.hp) parts.push(`+${res.healed.hp} 生命`)
                  if (res?.healed?.mp) parts.push(`+${res.healed.mp} 魔力`)
                  if (res?.buff?.name) parts.push(`激活「${res.buff.name}」`)
                  toast.success(`已饮用 ${res?.itemName || getItemNameById(itemId)}${parts.length ? `（${parts.join(' · ')}）` : ''}`)
                } catch (e: any) {
                  toast.error(e?.message || '饮用药剂失败')
                }
              }}
              onQuickBuyPotion={async (itemId, qty) => {
                try {
                  apiClient.clearCache()
                  await apiClient.shopBuy(itemId, qty)
                  await refreshPlayerState()
                  toast.success(`购买成功：${getItemNameById(itemId)} ×${qty}`)
                  return true
                } catch (e: any) {
                  toast.error(e?.message || '金币不足或购买失败')
                  return false
                }
              }}
            />

            <div className="battle-log-center">
              <h4>📜 战斗记录</h4>
              <div className="log-content">
                {battleState.battleLog.map((log: string, index: number) => {
                  const mechanic = mechanicLogMatcher(
                    adventureStages.flatMap((s) => s.encounters).find((e) => e.id === battleState.monster.id)?.mechanicDefs
                  )(log)
                  const phase = mechanic === 'warn' || /举起树皮盾|自然之怒|蓄力举盾|震碎|破防/.test(log)
                  const hazard = !phase && mechanic === 'hazard'
                  const heavy = !phase && !hazard && log.includes('重劈')
                  const potion = !phase && !hazard && /🧪|吃了|喝下了/.test(log)
                  const drop = log.startsWith('掉落')
                  const end = /被击败了|你被击败/.test(log)
                  const cls = phase
                    ? ' log-phase'
                    : hazard
                    ? ' log-hazard'
                    : potion
                    ? ' log-potion'
                    : heavy
                    ? ' log-heavy'
                    : drop
                    ? ' log-drop'
                    : end
                    ? ' log-end'
                    : ''
                  return (
                    <div key={`${battleState.battleCount}-${index}`} className={`log-entry${cls}`}>
                      {log}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="adventure-content">
          <div className="monster-grid">
            {selectedEncounters.map((monster) => (
              <div
                key={monster.id}
                className={`monster-card ${isCurrentlyFighting(monster.id) ? 'active' : ''} ${monster.isBoss ? 'boss' : ''}`}
                onClick={() => onSelectMonster(monster)}
              >
                <div className="card-image">
                  <MonsterSceneBackdrop
                    monsterId={monster.id}
                    mapId={monster.map || selectedMap}
                    isBoss={monster.isBoss}
                    variant="card"
                  />
                  <div className="placeholder-img monster-placeholder">
                    <T1Art kind="monster" id={monster.id} fallback={monster.icon || ''} alt="" />
                  </div>
                </div>
                <div className="card-title">{monster.name}</div>
                <div className="card-identity">Lv.{monster.level}</div>
                <div className="card-reward">{encounterRewardLine(monster)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
