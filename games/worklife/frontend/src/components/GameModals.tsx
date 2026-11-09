import { apiClient, type ActionPreview } from '../services/api'
import { T1Art, T1ItemIcon, characterArtId } from './T1Art'
import { MonsterSceneBackdrop } from './MonsterSceneBackdrop'
import { ActionRatesPanel } from './ActionRatesPanel'
import { enhancementStatMultiplier, toolEffectLine } from '../gameplay/enhancement'
import { BOOK_REREAD_XP, getAbilityXpForLevel } from '../gameplay/fightPreview'
import { craftWhy, missingMaterials } from '../gameplay/craftPreview'
import { archetypeLabel, mechanicEntries } from '../gameplay/encounterLabels'
import { getProfessionPerk } from '../gameplay/professionPerks'
import { playGameSound } from '../gameplay/sound'
import { xpToNextLevel } from '../gameplay/xp'
import {
  EQUIP_SLOTS,
  PROFESSIONS,
  activityMarkFromAction,
  getItemIcon,
  getTierName,
  resolveItemInfo,
  resolveRequiredItemId,
  type ActiveTab,
  type CurrentActivity,
  type ProfessionConfig,
  type ProfessionId,
} from '../gameplay/gameConstants'
import { useToast } from './Toast'
import type { AbilityDef, PlayerState } from '../types/game'

export function EquipSelectorModal({
  showEquipSelector,
  selectedEquipSlot,
  onClose,
  playerState,
  contentPack,
  getEquippableItems,
  getEquippedItemId,
  equipItem,
  unequipSlot,
  professionLabel,
}: {
  showEquipSelector: boolean
  selectedEquipSlot: string | null
  onClose: () => void
  playerState: PlayerState
  contentPack: any
  getEquippableItems: (slotId: string) => any[]
  getEquippedItemId: (slotId: string) => string | undefined
  equipItem: (itemId: string) => Promise<void>
  unequipSlot: (slotId: string) => Promise<void>
  professionLabel: (skillId?: string) => string | undefined
}) {
  if (!showEquipSelector || !selectedEquipSlot) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content equip-selector-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" aria-label="关闭" onClick={onClose}>
          ✕
        </button>
        <h3 className="modal-title">
          选择装备 - {[...EQUIP_SLOTS.left, ...EQUIP_SLOTS.right].find((s) => s.id === selectedEquipSlot)?.name ?? ''}
        </h3>

        <div className="equip-selector-content">
          {getEquippableItems(selectedEquipSlot).length === 0 ? (
            <div className="no-equipment">
              <div className="no-equipment-icon">📦</div>
              <p>背包中没有可装备的物品</p>
              <p className="hint-text">通过制作或战斗获取装备</p>
            </div>
          ) : (
            <>
              <p className="modal-desc equip-hint">点一件即可装备</p>
              <div className="equippable-items-grid">
                {getEquippableItems(selectedEquipSlot).map((item: any) => {
                  const currentEqId = getEquippedItemId(selectedEquipSlot)
                  const equipped = currentEqId === item.id
                  const curDef: any = currentEqId
                    ? contentPack?.items?.find((it: any) => it.id === currentEqId)
                    : undefined
                  const itemEnh = Number(playerState.equipment?.enhancementLevels?.[item.id] || 0)
                  const curEnh = currentEqId
                    ? Number(playerState.equipment?.enhancementLevels?.[currentEqId] || 0)
                    : 0
                  const itemMult = enhancementStatMultiplier(itemEnh, item)
                  const curMult = enhancementStatMultiplier(curEnh, curDef)
                  const eff = (v: number | undefined, m: number) => Math.round((v || 0) * m * 10) / 10
                  const atkDiff = Math.round((eff(item.atk, itemMult) - eff(curDef?.atk, curMult)) * 10) / 10
                  const magDiff = Math.round((eff(item.mag, itemMult) - eff(curDef?.mag, curMult)) * 10) / 10
                  const defDiff = Math.round((eff(item.def, itemMult) - eff(curDef?.def, curMult)) * 10) / 10
                  const hpDiff = Math.round((eff(item.hp, itemMult) - eff(curDef?.hp, curMult)) * 10) / 10
                  return (
                    <div
                      key={item.id}
                      className={`equippable-item${equipped ? ' equipped' : ''}`}
                      role="button"
                      onClick={() => {
                        if (!equipped) void equipItem(item.id)
                      }}
                    >
                      <div className="item-icon-large">
                        <T1ItemIcon itemId={item.id} fallback={getItemIcon(item.id)} alt="" />
                      </div>
                      <div className="item-name">
                        {item.name}
                        {itemEnh > 0 ? ` +${itemEnh}` : ''}
                      </div>
                      <div className="item-stats">
                        {selectedEquipSlot === 'tool' && item.toolFor ? (
                          <span>{toolEffectLine(item, professionLabel(item.toolFor), itemEnh)}</span>
                        ) : (
                          <>
                            {item.atk && <span>攻击 +{eff(item.atk, itemMult)}</span>}
                            {item.mag && <span>魔法 +{eff(item.mag, itemMult)}</span>}
                            {item.def && <span>防御 +{eff(item.def, itemMult)}</span>}
                            {item.hp && <span>生命 +{eff(item.hp, itemMult)}</span>}
                          </>
                        )}
                      </div>
                      {!equipped &&
                        Boolean(currentEqId) &&
                        selectedEquipSlot !== 'tool' &&
                        (atkDiff !== 0 || magDiff !== 0 || defDiff !== 0 || hpDiff !== 0) && (
                          <div className="equip-delta-row">
                            {atkDiff !== 0 && (
                              <span className={`equip-delta ${atkDiff > 0 ? 'up' : 'down'}`}>
                                攻{atkDiff > 0 ? `+${atkDiff}` : atkDiff}
                              </span>
                            )}
                            {magDiff !== 0 && (
                              <span className={`equip-delta ${magDiff > 0 ? 'up' : 'down'}`}>
                                魔{magDiff > 0 ? `+${magDiff}` : magDiff}
                              </span>
                            )}
                            {defDiff !== 0 && (
                              <span className={`equip-delta ${defDiff > 0 ? 'up' : 'down'}`}>
                                防{defDiff > 0 ? `+${defDiff}` : defDiff}
                              </span>
                            )}
                            {hpDiff !== 0 && (
                              <span className={`equip-delta ${hpDiff > 0 ? 'up' : 'down'}`}>
                                血{hpDiff > 0 ? `+${hpDiff}` : hpDiff}
                              </span>
                            )}
                          </div>
                        )}
                      <div className="item-cta">{equipped ? '已装备' : '装备'}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          {getEquippedItemId(selectedEquipSlot) && (
            <button
              className="btn-secondary"
              onClick={() => {
                void unequipSlot(selectedEquipSlot)
                onClose()
              }}
            >
              卸下
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

export function GameEntityDetailModal({
  selectedItem,
  modalType,
  setSelectedItem,
  setModalType,
  playerState,
  contentPack,
  selectedMap,
  setSelectedMap,
  setPartyTargetStageId,
  setActiveTab,
  currentProfession,
  setCurrentProfession,
  getCurrentProfession,
  professionLabel,
  actionLoading,
  startBattle,
  startAction,
  queueAction,
  actionPreview,
  actionPreviewLoading,
  progress,
  gatherQuantity,
  setGatherQuantity,
  craftQuantity,
  setCraftQuantity,
  getMaxCraftableQuantity,
  favoriteRecipes,
  toggleFavoriteRecipe,
  combatSheet,
  weaponAtk,
  abilityCatalog,
  goalMaterialHint,
  rareItemOf,
  getItemNameById,
  isCombatLockoutActive,
  refreshPlayerState,
  actionQueueMax,
}: {
  selectedItem: any
  modalType: 'monster' | 'tree' | 'craft' | 'item' | null
  setSelectedItem: (item: any) => void
  setModalType: (t: 'monster' | 'tree' | 'craft' | 'item' | null) => void
  playerState: PlayerState
  contentPack: any
  selectedMap: string
  setSelectedMap: (m: string) => void
  setPartyTargetStageId: (s: string | null) => void
  setActiveTab: (t: ActiveTab) => void
  currentProfession: ProfessionId
  setCurrentProfession: (p: ProfessionId) => void
  getCurrentProfession: () => ProfessionConfig
  professionLabel: (skillId?: string) => string | undefined
  actionLoading: boolean
  startBattle: (monster: any) => Promise<void>
  startAction: (actionId: string, info: CurrentActivity, qty?: number) => Promise<void>
  queueAction: (actionId: string, qty?: number) => Promise<void>
  actionPreview: ActionPreview | null
  actionPreviewLoading: boolean
  progress: number
  gatherQuantity: number | null
  setGatherQuantity: (q: number | null) => void
  craftQuantity: number
  setCraftQuantity: (q: number) => void
  getMaxCraftableQuantity: (recipe: any) => number
  favoriteRecipes: Set<string>
  toggleFavoriteRecipe: (id: string) => void
  combatSheet: any
  weaponAtk: number
  abilityCatalog?: AbilityDef[]
  goalMaterialHint: () => string | null
  rareItemOf: (m: any) => { id: string; name: string } | null
  getItemNameById: (id: string) => string
  isCombatLockoutActive: () => boolean
  refreshPlayerState: () => Promise<void>
  actionQueueMax: number
}) {
  const toast = useToast()
  if (!selectedItem || !modalType) return null
  const close = () => {
    setSelectedItem(null)
    setModalType(null)
  }
  const getItemInfo = (id: string) => resolveItemInfo(id, contentPack)
  const getRequiredItemId = (name: string) => resolveRequiredItemId(name, contentPack)

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" aria-label="关闭" onClick={close}>
          ✕
        </button>

        {modalType === 'monster' && (
          <>
            <h3 className="modal-title">{selectedItem.name}</h3>
            <div className="modal-image monster-modal-scene">
              <MonsterSceneBackdrop
                monsterId={selectedItem.id}
                mapId={selectedItem.map || selectedMap}
                isBoss={selectedItem.isBoss}
                variant="modal"
              />
              <div className="placeholder-img monster-placeholder large">
                <T1Art kind="monster" id={selectedItem.id} fallback={selectedItem.icon || ''} alt="" />
              </div>
            </div>
            <p className="modal-desc">{selectedItem.desc}</p>

            <div className="modal-stats">
              <div className="stat-line">
                <span>身份</span>
                <span>
                  Lv.{selectedItem.level} · {archetypeLabel(selectedItem.archetype)}
                </span>
              </div>
              <div className="stat-line">
                <span>生命</span>
                <span>{selectedItem.hp}</span>
              </div>
              <div className="stat-line">
                <span>攻击</span>
                <span>{selectedItem.atk}</span>
              </div>
              <div className="stat-line">
                <span>防御</span>
                <span>{selectedItem.def}</span>
              </div>
              <div className="stat-line">
                <span>经验奖励</span>
                <span>{selectedItem.xp} XP</span>
              </div>
              <div className="stat-line">
                <span>金币奖励</span>
                <span>{selectedItem.gold} 金币</span>
              </div>
              {mechanicEntries(selectedItem.mechanics, selectedItem.mechanicDefs).map(({ id, label, desc }) => (
                <div className="stat-line stat-mechanic" key={id}>
                  <span>机制</span>
                  <span>
                    {label}
                    {desc && <small className="mechanic-desc">{desc}</small>}
                  </span>
                </div>
              ))}
              {(() => {
                const rare = rareItemOf(selectedItem)
                return rare ? (
                  <div className="stat-line">
                    <span>稀有掉落</span>
                    <span
                      className="stat-drop clickable-codex-chip"
                      role="button"
                      tabIndex={0}
                      title="点击查看物品来源与制作用途"
                      onClick={() => {
                        const info = getItemInfo(rare.id)
                        setSelectedItem({
                          ...info,
                          id: rare.id,
                          itemId: rare.id,
                          count: playerState.inventory?.[rare.id] || 0,
                        })
                        setModalType('item')
                      }}
                    >
                      <T1ItemIcon itemId={rare.id} fallback={getItemIcon(rare.id)} alt="" />
                      {rare.name} ({Math.round(selectedItem.rareChance * 1000) / 10}%) 🔍
                    </span>
                  </div>
                ) : null
              })()}
              {(selectedItem.drops || []).map((d: { itemId: string; chance: number }) => (
                <div className="stat-line" key={d.itemId}>
                  <span>掉落</span>
                  <span
                    className="stat-drop clickable-codex-chip"
                    role="button"
                    tabIndex={0}
                    title="点击查看物品来源与制作用途"
                    onClick={() => {
                      const info = getItemInfo(d.itemId)
                      setSelectedItem({
                        ...info,
                        id: d.itemId,
                        itemId: d.itemId,
                        count: playerState.inventory?.[d.itemId] || 0,
                      })
                      setModalType('item')
                    }}
                  >
                    <T1ItemIcon itemId={d.itemId} fallback={getItemIcon(d.itemId)} alt="" />
                    {getItemNameById(d.itemId)} ({Math.round(d.chance * 1000) / 10}%) 🔍
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              {(() => {
                const reqLv = Number(selectedItem.level || 1)
                const curCombatLv = Number(playerState?.combatLevel || 1)
                const canSolo = curCombatLv >= reqLv
                if (selectedItem.isBoss) {
                  return (
                    <>
                      <button
                        className="btn-action"
                        onClick={() => {
                          setPartyTargetStageId(selectedMap)
                          close()
                          setActiveTab('party')
                        }}
                      >
                        👥 组队讨伐
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => void startBattle(selectedItem)}
                        disabled={actionLoading || !canSolo}
                        title={!canSolo ? `单人挑战需要战斗等级 Lv.${reqLv}（当前 Lv.${curCombatLv}）` : "单人直接挑战首领"}
                      >
                        {actionLoading ? '准备中...' : canSolo ? '⚔️ 单人挑战' : `🔒 单人需 Lv.${reqLv}`}
                      </button>
                    </>
                  )
                }
                return (
                  <button
                    className="btn-action"
                    onClick={() => void startBattle(selectedItem)}
                    disabled={actionLoading || !canSolo}
                  >
                    {actionLoading ? '准备中...' : canSolo ? '开始战斗' : `🔒 需战斗 Lv.${reqLv}`}
                  </button>
                )
              })()}
            </div>
          </>
        )}

        {modalType === 'tree' && (
          <>
            <h3 className="modal-title">{selectedItem.name}</h3>
            <div className="modal-image">
              <div className="placeholder-img tree-placeholder large">
                <T1Art kind="tree" id={selectedItem.id} fallback={selectedItem.icon || ''} alt="" />
              </div>
            </div>
            <p className="modal-desc">{selectedItem.desc}</p>
            {selectedItem.id === 'poplar' && goalMaterialHint() && (
              <p className="craft-need-line">本步目标：{goalMaterialHint()}</p>
            )}
            <div className="modal-stats">
              <div className="stat-line">
                <span>等级需求</span>
                <span>
                  Lv.{selectedItem.level} {getCurrentProfession().gatherName}
                </span>
              </div>
              <div className="stat-line">
                <span>经验奖励</span>
                <span>
                  {selectedItem.xp} <span className="tag">XP</span>
                </span>
              </div>
              <div className="stat-line">
                <span>采集产出</span>
                <span>
                  {selectedItem.outputRange}{' '}
                  <span className="tag">
                    {selectedItem.outputItemId ? getItemNameById(selectedItem.outputItemId) : getItemNameById(selectedItem.output)}
                  </span>
                </span>
              </div>
              {(() => {
                const packAction = contentPack?.actions?.find((a: any) => a.id === selectedItem.actionId)
                const rareYield = packAction?.yields?.find(
                  (y: any) => typeof y.chance === 'number' && y.chance > 0 && y.chance < 1
                )
                if (!rareYield) return null
                return (
                  <div className="stat-line">
                    <span>稀有掉落</span>
                    <span>
                      {rareYield.qty || 1} <span className="tag">{getItemNameById(rareYield.itemId)}</span>{' '}
                      {(rareYield.chance * 100).toFixed(rareYield.chance * 100 < 1 ? 1 : 0)}%
                    </span>
                  </div>
                )
              })()}
              <div className="stat-line">
                <span>单次耗时</span>
                <span>{actionPreview ? (actionPreview.effectiveDurationMs / 1000).toFixed(2) : selectedItem.time} 秒</span>
              </div>
            </div>
            {playerState.mode === 'life_action' && playerState.lifeActionState?.actionId === selectedItem.actionId && (
              <div className="modal-live-progress" aria-label="当前生产进度">
                <div className="modal-live-progress-head">
                  <span>当前采集进度</span>
                  <strong>{Math.floor(progress)}%</strong>
                </div>
                <div className="skill-xp-bar">
                  <div className="skill-xp-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%`, transition: 'none' }} />
                </div>
              </div>
            )}
            <ActionRatesPanel preview={actionPreview} loading={actionPreviewLoading} />
            {(() => {
              const packAction = contentPack?.actions?.find((a: any) => a.id === selectedItem.actionId)
              const reqSkillId = packAction?.skillId || `skill_${currentProfession}`
              const currentSkillLevel = playerState.skills?.[reqSkillId]?.level || 1
              const hasLevel = currentSkillLevel >= selectedItem.level
              const queueFull = (playerState.activityQueue?.length || 0) >= actionQueueMax
              const presets: Array<number | null> = [null, 10, 50, 100]

              return (
                <div className="modal-actions gather-actions">
                  <div className="gather-quantity" role="group" aria-label="采集次数">
                    <span className="gather-quantity-label">次数</span>
                    {presets.map((p) => (
                      <button
                        key={p === null ? 'inf' : p}
                        type="button"
                        className={`qty-chip${gatherQuantity === p ? ' active' : ''}`}
                        onClick={() => setGatherQuantity(p)}
                      >
                        {p === null ? '∞' : p}
                      </button>
                    ))}
                    <input
                      type="number"
                      className="quantity-input qty-custom"
                      min={1}
                      max={5000}
                      placeholder="自定"
                      value={gatherQuantity !== null && !presets.includes(gatherQuantity) ? gatherQuantity : ''}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        setGatherQuantity(Number.isFinite(v) && v > 0 ? Math.min(5000, v) : null)
                      }}
                    />
                  </div>
                  <div className="gather-buttons">
                    <button
                      className={`btn-action ${hasLevel ? '' : 'disabled'}`}
                      onClick={() => {
                        if (hasLevel) {
                          void startAction(
                            selectedItem.actionId,
                            {
                              name: selectedItem.name || '采集',
                              output: selectedItem.output,
                              duration: selectedItem.time,
                              mark: activityMarkFromAction(selectedItem.actionId || 'chop'),
                            },
                            gatherQuantity ?? undefined
                          )
                        }
                      }}
                      disabled={actionLoading || !hasLevel}
                    >
                      {actionLoading
                        ? '开始中...'
                        : !hasLevel
                        ? `需要等级${selectedItem.level}`
                        : gatherQuantity
                        ? `开始采集 ×${gatherQuantity}`
                        : '开始采集'}
                    </button>
                    <button
                      className="btn-secondary btn-queue"
                      disabled={actionLoading || !hasLevel || queueFull}
                      title={queueFull ? `队列最多 ${actionQueueMax} 项` : '当前动作结束后自动开始'}
                      onClick={() => void queueAction(selectedItem.actionId, gatherQuantity ?? undefined)}
                    >
                      {queueFull ? '队列已满' : '加入队列'}
                    </button>
                  </div>
                </div>
              )
            })()}
          </>
        )}

        {modalType === 'craft' && (
          <>
            <div className="modal-header-with-favorite">
              <h3 className="modal-title">{selectedItem.name}</h3>
              <button
                className={`btn-favorite ${favoriteRecipes.has(selectedItem.id) ? 'active' : ''}`}
                onClick={() => toggleFavoriteRecipe(selectedItem.id)}
                title={favoriteRecipes.has(selectedItem.id) ? '取消收藏' : '收藏配方'}
              >
                {favoriteRecipes.has(selectedItem.id) ? '★' : '☆'}
              </button>
            </div>

            <div className="modal-image">
              <div className="placeholder-img craft-placeholder large">
                <T1Art kind="craft" id={selectedItem.output || selectedItem.id} fallback="" alt="" />
              </div>
            </div>
            {selectedItem.desc ? <p className="modal-desc">{selectedItem.desc}</p> : null}
            {(() => {
              const whyText = craftWhy(
                { id: selectedItem.output, atk: selectedItem.atk, def: selectedItem.def, hp: selectedItem.hp },
                combatSheet,
                {
                  equippedMainAtk: weaponAtk,
                  outputEquipped: Object.values(playerState.equipment || {}).includes(selectedItem.output),
                }
              )
              return whyText && whyText !== selectedItem.desc ? <p className="craft-why-line">{whyText}</p> : null
            })()}
            <p className="craft-need-line">
              {missingMaterials(selectedItem.requires || [], playerState.inventory, getItemNameById)}
            </p>
            {playerState.mode === 'life_action' && playerState.lifeActionState?.actionId === selectedItem.id && (
              <div className="modal-live-progress" aria-label="当前制作进度">
                <div className="modal-live-progress-head">
                  <span>当前制作进度</span>
                  <strong>{Math.floor(progress)}%</strong>
                </div>
                <div className="skill-xp-bar">
                  <div className="skill-xp-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%`, transition: 'none' }} />
                </div>
              </div>
            )}
            <ActionRatesPanel preview={actionPreview} loading={actionPreviewLoading} />

            <div className="modal-stats">
              <div className="stat-line">
                <span>技能需求</span>
                <span
                  className={`skill-requirement ${
                    (playerState.skills[getCurrentProfession().craftSkill]?.level || 1) >= selectedItem.level
                      ? 'satisfied'
                      : 'missing'
                  }`}
                >
                  Lv.{selectedItem.level} {getCurrentProfession().craftName}
                  {(playerState.skills[getCurrentProfession().craftSkill]?.level || 1) >= selectedItem.level
                    ? ' ✓'
                    : ' ✗'}
                </span>
              </div>

              <div className="materials-section">
                <div className="section-title">材料需求 (×{craftQuantity})</div>
                {selectedItem.requires.map((req: any, i: number) => {
                  const requiredItemId = getRequiredItemId(req.item)
                  const available = playerState.inventory[requiredItemId] || 0
                  const needed = req.count * craftQuantity
                  const hasEnough = available >= needed
                  return (
                    <div
                      key={i}
                      className={`stat-line material-req clickable-codex-row ${hasEnough ? 'satisfied' : 'missing'}`}
                      title="点击查看该材料的获取来源与制作用途"
                      onClick={() => {
                        const info = getItemInfo(requiredItemId)
                        setSelectedItem({ ...info, id: requiredItemId, itemId: requiredItemId, count: available })
                        setModalType('item')
                      }}
                    >
                      <span className="material-info">
                        <span className="material-icon item-icon-compact">
                          <T1ItemIcon itemId={requiredItemId} fallback={getItemIcon(requiredItemId)} alt="" />
                        </span>
                        {getItemNameById(requiredItemId)} 🔍
                      </span>
                      <span className="material-count">
                        {available}/{needed} {hasEnough ? '✓' : '✗'}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="rewards-section">
                <div className="section-title">制作奖励 (×{craftQuantity})</div>
                <div className="stat-line">
                  <span>经验奖励</span>
                  <span>
                    {selectedItem.xp * craftQuantity} <span className="tag">XP</span>
                  </span>
                </div>
                <div className="stat-line">
                  <span>制作产出</span>
                  <span>
                    {craftQuantity * (selectedItem.outputCount || 1)}{' '}
                    <span className="tag">{getItemNameById(selectedItem.output)}</span>
                  </span>
                </div>
                {(selectedItem.atk || selectedItem.mag || selectedItem.def || selectedItem.hp || selectedItem.stats) && (
                  <div className="stat-line">
                    <span>装备属性</span>
                    <span>
                      {(selectedItem.atk ?? selectedItem.stats?.atk)
                        ? `攻击+${selectedItem.atk ?? selectedItem.stats?.atk} `
                        : ''}
                      {(selectedItem.mag ?? selectedItem.stats?.mag)
                        ? `魔力+${selectedItem.mag ?? selectedItem.stats?.mag} `
                        : ''}
                      {(selectedItem.def ?? selectedItem.stats?.def)
                        ? `防御+${selectedItem.def ?? selectedItem.stats?.def} `
                        : ''}
                      {(selectedItem.hp ?? selectedItem.stats?.hp)
                        ? `生命+${selectedItem.hp ?? selectedItem.stats?.hp} `
                        : ''}
                      {selectedItem.stats?.spd ? `速度+${selectedItem.stats.spd}%` : ''}
                    </span>
                  </div>
                )}
                {selectedItem.rare && (
                  <div className="stat-line">
                    <span>稀有奖励</span>
                    <span>
                      随机 <span className="tag">{getItemNameById(selectedItem.rare)}</span>
                    </span>
                  </div>
                )}
                <div className="stat-line">
                  <span>预计耗时</span>
                  <span>
                    {actionPreview
                      ? Math.round((actionPreview.effectiveDurationMs / 1000) * craftQuantity * 10) / 10
                      : Math.round(selectedItem.time * craftQuantity * 10) / 10}{' '}
                    秒
                  </span>
                </div>
              </div>
            </div>

            {(() => {
              const hasLevel =
                (playerState.skills?.[getCurrentProfession().craftSkill]?.level || 1) >= selectedItem.level
              const hasMaterials = selectedItem.requires.every((req: any) => {
                const requiredItemId = getRequiredItemId(req.item)
                return (playerState.inventory[requiredItemId] || 0) >= req.count * craftQuantity
              })
              const canCraft = hasLevel && hasMaterials && craftQuantity > 0
              const maxCraftable = getMaxCraftableQuantity(selectedItem)
              const queueFull = (playerState.activityQueue?.length || 0) >= actionQueueMax

              return (
                <div className="craft-actions">
                  <div className="craft-quantity-section">
                    <div className="quantity-header">
                      <span className="quantity-label">制作数量</span>
                      <span className="quantity-max">按现有材料最多 {maxCraftable} 个</span>
                    </div>
                    <div className="quantity-controls">
                      <button
                        className="btn-quantity"
                        onClick={() => setCraftQuantity(Math.max(1, craftQuantity - 1))}
                        disabled={craftQuantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="quantity-input"
                        value={craftQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1
                          setCraftQuantity(Math.max(1, Math.min(5000, val)))
                        }}
                        min="1"
                        max={5000}
                      />
                      <button
                        className="btn-quantity"
                        onClick={() => setCraftQuantity(Math.min(5000, craftQuantity + 1))}
                        disabled={craftQuantity >= 5000}
                      >
                        +
                      </button>
                      <button
                        className="btn-quantity-max"
                        onClick={() => setCraftQuantity(Math.max(1, maxCraftable))}
                        disabled={maxCraftable <= 1 || craftQuantity >= maxCraftable}
                      >
                        最大
                      </button>
                    </div>
                  </div>
                  <div className="gather-buttons craft-buttons">
                    <button
                      className={`btn-action ${canCraft ? 'craftable' : 'disabled'}`}
                      onClick={() => {
                        if (canCraft) {
                          void startAction(
                            selectedItem.id,
                            {
                              name: selectedItem.name || `制作 ×${craftQuantity}`,
                              output: selectedItem.output,
                              duration: selectedItem.time,
                              mark: '制',
                            },
                            craftQuantity
                          )
                          setCraftQuantity(1)
                        }
                      }}
                      disabled={actionLoading || !canCraft}
                    >
                      {actionLoading
                        ? '制作中...'
                        : !hasLevel
                        ? `需要等级${selectedItem.level}`
                        : !hasMaterials
                        ? '材料不足'
                        : `开始制作 ×${craftQuantity}`}
                    </button>
                    <button
                      className="btn-secondary btn-queue"
                      disabled={actionLoading || !hasLevel || queueFull || craftQuantity < 1}
                      title={
                        queueFull ? `队列最多 ${actionQueueMax} 项` : '当前动作结束后自动开始；材料可以由前面的动作产出'
                      }
                      onClick={() => void queueAction(selectedItem.id, craftQuantity)}
                    >
                      {queueFull ? '队列已满' : `加入队列 ×${craftQuantity}`}
                    </button>
                  </div>

                  {!canCraft && (
                    <div className="craft-hint">
                      {!hasLevel && (
                        <p>
                          🎯 提升{getCurrentProfession().craftName}等级到{selectedItem.level} 级
                        </p>
                      )}
                      {hasLevel && !hasMaterials && (
                        <p>📦 材料不够时可以先加入队列，等前面的采集/制作把材料做出来</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}

        {modalType === 'item' &&
          (() => {
            const packItem: any = contentPack?.items?.find((i: any) => i.id === selectedItem.id) || {}
            const type: string = packItem.type || selectedItem.type
            const typeLabel =
              type === 'material'
                ? '材料'
                : type === 'weapon'
                ? '武器'
                : type === 'armor'
                ? '防具'
                : type === 'offhand' || type === 'shield'
                ? '副手'
                : type === 'accessory'
                ? '饰品'
                : type === 'consumable' || type === 'food'
                ? '消耗品'
                : type === 'book'
                ? '技能书'
                : '其他'
            const bookAbility: AbilityDef | undefined =
              type === 'book' ? abilityCatalog?.find((a) => a.id === packItem.abilityId) : undefined
            const bookKnown = bookAbility ? playerState.abilities?.[bookAbility.id] : undefined
            const learnFromDetail = async () => {
              try {
                apiClient.clearCache()
                const res: any = await apiClient.learnBook(selectedItem.id)
                playGameSound('unlock')
                const lr = res?.learnResult
                toast.success(
                  lr?.learned
                    ? `学会了「${bookAbility?.name || ''}」！已放进技能槽（如有空位）`
                    : lr?.leveledTo
                    ? `「${bookAbility?.name}」升到 ${lr.leveledTo} 级`
                    : `重读《${bookAbility?.name}》，技能经验 +${BOOK_REREAD_XP}`
                )
                await refreshPlayerState()
                close()
              } catch (e: any) {
                toast.error(e?.message || '阅读失败')
              }
            }
            const eq = (playerState.equipment || {}) as Record<string, any>
            const eqKey:
              | 'main_hand'
              | 'chest'
              | 'head'
              | 'legs'
              | 'feet'
              | 'hands'
              | 'off_hand'
              | 'accessory1'
              | 'accessory2'
              | undefined =
              type === 'weapon'
                ? 'main_hand'
                : type === 'offhand' || type === 'shield' || packItem.slot === 'off_hand'
                ? 'off_hand'
                : type === 'accessory'
                ? eq.accessory1 === selectedItem.id
                  ? 'accessory1'
                  : eq.accessory2 === selectedItem.id
                  ? 'accessory2'
                  : !eq.accessory1
                  ? 'accessory1'
                  : !eq.accessory2
                  ? 'accessory2'
                  : 'accessory1'
                : type === 'armor'
                ? (packItem.slot as any) || 'chest'
                : undefined
            const equippedHere = !!eqKey && eq[eqKey] === selectedItem.id
            const curEqId = eqKey ? (eq[eqKey] as string | undefined) : undefined
            const curEqDef: any = curEqId ? contentPack?.items?.find((i: any) => i.id === curEqId) : undefined
            const itemEnh = Number(playerState.equipment?.enhancementLevels?.[selectedItem.id] || 0)
            const curEnh = curEqId ? Number(playerState.equipment?.enhancementLevels?.[curEqId] || 0) : 0
            const itemMult = enhancementStatMultiplier(itemEnh, packItem)
            const curMult = enhancementStatMultiplier(curEnh, curEqDef)
            const eff = (v: number | undefined, m: number) => Math.round((v || 0) * m * 10) / 10
            const atkDiff =
              eqKey && !equippedHere ? Math.round((eff(packItem.atk, itemMult) - eff(curEqDef?.atk, curMult)) * 10) / 10 : 0
            const magDiff =
              eqKey && !equippedHere ? Math.round((eff(packItem.mag, itemMult) - eff(curEqDef?.mag, curMult)) * 10) / 10 : 0
            const defDiff =
              eqKey && !equippedHere ? Math.round((eff(packItem.def, itemMult) - eff(curEqDef?.def, curMult)) * 10) / 10 : 0
            const hpDiff =
              eqKey && !equippedHere ? Math.round((eff(packItem.hp, itemMult) - eff(curEqDef?.hp, curMult)) * 10) / 10 : 0
            const effect = packItem.effect || {}
            const effectParts: string[] = []
            if (effect.hp) effectParts.push(`恢复 ${effect.hp} 生命`)
            if (effect.mp) effectParts.push(`恢复 ${effect.mp} 魔力`)
            if (effect.buff?.name)
              effectParts.push(
                `增益「${effect.buff.name}」${effect.buff.durationSec ? ` ${Math.round(effect.buff.durationSec / 60)} 分钟` : ''}`
              )

            const equipFromDetail = async () => {
              if (!eqKey) return
              if (isCombatLockoutActive()) {
                toast.info('当前正在战斗中，无法更换或卸下战斗装备（请先停止战斗）')
                return
              }
              try {
                apiClient.clearCache()
                if (equippedHere) {
                  await apiClient.unequipItem(eqKey)
                  toast.info('已卸下')
                } else {
                  await apiClient.equipItem(eqKey, selectedItem.id)
                  playGameSound('equip')
                  toast.success('已装备')
                }
                await refreshPlayerState()
                close()
              } catch (e: any) {
                toast.error(e?.message || (equippedHere ? '卸下失败' : '装备失败'))
              }
            }
            const useFromDetail = async () => {
              try {
                apiClient.clearCache()
                const res: any = await apiClient.consumeItem(selectedItem.id)
                toast.success(res?.buff ? `使用 ${selectedItem.name}，获得增益「${res.buff.name}」` : `使用了 ${selectedItem.name}`)
                await refreshPlayerState()
                close()
              } catch (e: any) {
                toast.error(e?.message || '使用失败')
              }
            }
            return (
              <>
                <h3 className="modal-title">
                  {selectedItem.name}
                  {itemEnh > 0 ? <span className="modal-enh-badge"> +{itemEnh}</span> : null}
                </h3>
                <div className="modal-image">
                  <div className="item-icon-large">
                    <T1ItemIcon itemId={selectedItem.id} fallback={getItemIcon(selectedItem.id)} alt="" />
                  </div>
                </div>
                <p className="modal-desc">{packItem.description || selectedItem.description || '暂无描述'}</p>
                <div className="modal-stats">
                  <div className="stat-line">
                    <span>类型</span>
                    <span>{typeLabel}</span>
                  </div>
                  <div className="stat-line">
                    <span>品质</span>
                    <span>{getTierName(packItem.tier ?? selectedItem.tier)}</span>
                  </div>
                  <div className="stat-line">
                    <span>数量</span>
                    <span>{selectedItem.count}</span>
                  </div>
                  {typeof packItem.atk === 'number' && (
                    <div className="stat-line">
                      <span>攻击</span>
                      <span>
                        +{eff(packItem.atk, itemMult)}
                        {atkDiff !== 0 && (
                          <em className={`equip-delta ${atkDiff > 0 ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>
                            ({atkDiff > 0 ? `+${atkDiff}` : atkDiff})
                          </em>
                        )}
                      </span>
                    </div>
                  )}
                  {typeof packItem.mag === 'number' && (
                    <div className="stat-line">
                      <span>魔法</span>
                      <span>
                        +{eff(packItem.mag, itemMult)}
                        {magDiff !== 0 && (
                          <em className={`equip-delta ${magDiff > 0 ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>
                            ({magDiff > 0 ? `+${magDiff}` : magDiff})
                          </em>
                        )}
                      </span>
                    </div>
                  )}
                  {typeof packItem.def === 'number' && (
                    <div className="stat-line">
                      <span>防御</span>
                      <span>
                        +{eff(packItem.def, itemMult)}
                        {defDiff !== 0 && (
                          <em className={`equip-delta ${defDiff > 0 ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>
                            ({defDiff > 0 ? `+${defDiff}` : defDiff})
                          </em>
                        )}
                      </span>
                    </div>
                  )}
                  {typeof packItem.hp === 'number' && (
                    <div className="stat-line">
                      <span>生命</span>
                      <span>
                        +{eff(packItem.hp, itemMult)}
                        {hpDiff !== 0 && (
                          <em className={`equip-delta ${hpDiff > 0 ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>
                            ({hpDiff > 0 ? `+${hpDiff}` : hpDiff})
                          </em>
                        )}
                      </span>
                    </div>
                  )}
                  {effectParts.length > 0 && (
                    <div className="stat-line">
                      <span>效果</span>
                      <span>{effectParts.join(' · ')}</span>
                    </div>
                  )}
                  {typeof packItem.value === 'number' && (
                    <div className="stat-line">
                      <span>商店售价</span>
                      <span>{packItem.value} 金币</span>
                    </div>
                  )}
                  {equippedHere && (
                    <div className="stat-line">
                      <span>状态</span>
                      <span>已装备</span>
                    </div>
                  )}
                  {bookAbility && (
                    <div className="stat-line">
                      <span>技能</span>
                      <span>
                        {bookAbility.name}
                        {bookKnown
                          ? `（已学会 Lv.${bookKnown.level} · 经验 ${Math.round(bookKnown.xp || 0)}/${getAbilityXpForLevel(
                              bookKnown.level
                            )}）`
                          : '（未学会）'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 银河奶牛式物品图鉴反查（Item Codex）：获取来源 & 制作用途 + 一键跳转 */}
                {(() => {
                  const targetId = selectedItem.id
                  const targetName = packItem.name || selectedItem.name
                  const monsterSources: Array<{
                    monsterId: string
                    monsterName: string
                    level: number
                    isBoss: boolean
                    stageId: string
                    stageName: string
                    chancePct: number
                  }> = []
                  for (const stg of (contentPack?.stages || []) as any[]) {
                    for (const mId of (stg.monsters || []) as string[]) {
                      const m: any = (contentPack?.monsters || []).find((x: any) => x.id === mId)
                      if (!m) continue
                      let chance = 0
                      if (m.rare && (m.rare === targetId || m.rare === targetName)) {
                        chance = Number(m.rareChance || 0)
                      }
                      for (const d of (m.drops || []) as Array<{ itemId: string; chance: number }>) {
                        if (d.itemId === targetId) chance = Math.max(chance, Number(d.chance || 0))
                      }
                      if (chance > 0) {
                        monsterSources.push({
                          monsterId: m.id,
                          monsterName: m.name || m.id,
                          level: Number(m.level || 1),
                          isBoss: Boolean(m.isBoss || String(m.id).endsWith('_boss')),
                          stageId: stg.id,
                          stageName: stg.name || stg.id,
                          chancePct: Math.round(chance * 1000) / 10,
                        })
                      }
                    }
                  }

                  const gatherTabBySkill: Record<string, { tab: ActiveTab; label: string }> = {
                    skill_woodcutter: { tab: 'logging', label: '伐木' },
                    skill_mining: { tab: 'mining', label: '挖矿' },
                    skill_farming: { tab: 'farming', label: '种植' },
                    skill_fishing: { tab: 'fishing', label: '钓鱼' },
                    skill_gathering: { tab: 'gathering', label: '采集' },
                    skill_crystal_mining: { tab: 'crystal_mining', label: '采晶' },
                  }
                  const craftTabBySkill: Record<string, { tab: ActiveTab; label: string; prof: ProfessionId }> = {
                    skill_woodworking: { tab: 'woodworking', label: '木工', prof: 'woodcutter' },
                    skill_smithing: { tab: 'smithing', label: '锻造', prof: 'blacksmith' },
                    skill_husbandry: { tab: 'husbandry', label: '畜牧', prof: 'farmer' },
                    skill_cooking: { tab: 'cooking', label: '烹饪', prof: 'chef' },
                    skill_tailoring: { tab: 'tailoring', label: '缝纫', prof: 'tailor' },
                    skill_alchemy: { tab: 'alchemy', label: '炼金', prof: 'alchemist' },
                  }

                  const gatherSources: Array<{
                    actionId: string
                    actionName: string
                    skillLabel: string
                    reqLevel: number
                    tab: ActiveTab
                  }> = []
                  const recipeUses: Array<{
                    actionId: string
                    recipeName: string
                    outputId: string
                    qtyNeeded: number
                    reqLevel: number
                    skillLabel: string
                    tab: ActiveTab
                    prof: ProfessionId
                  }> = []

                  for (const act of (contentPack?.actions || []) as any[]) {
                    const yieldsMatch = (act.yields || []).some((y: any) => y.itemId === targetId)
                    if (yieldsMatch && gatherTabBySkill[act.skillId]) {
                      const gInfo = gatherTabBySkill[act.skillId]
                      gatherSources.push({
                        actionId: act.id,
                        actionName: act.name || act.id,
                        skillLabel: gInfo.label,
                        reqLevel: Number(act.requirements?.skillLevel || 1),
                        tab: gInfo.tab,
                      })
                    }
                    const consumeEntry = (act.consumes || []).find((c: any) => c.itemId === targetId)
                    if (consumeEntry && craftTabBySkill[act.skillId]) {
                      const cInfo = craftTabBySkill[act.skillId]
                      const outId = act.yields?.[0]?.itemId || act.id
                      recipeUses.push({
                        actionId: act.id,
                        recipeName: act.name || getItemNameById(outId),
                        outputId: outId,
                        qtyNeeded: Number(consumeEntry.qty || 1),
                        reqLevel: Number(act.requirements?.skillLevel || 1),
                        skillLabel: cInfo.label,
                        tab: cInfo.tab,
                        prof: cInfo.prof,
                      })
                    }
                  }

                  if (monsterSources.length === 0 && gatherSources.length === 0 && recipeUses.length === 0) {
                    return null
                  }

                  return (
                    <div className="item-codex-section">
                      {(monsterSources.length > 0 || gatherSources.length > 0) && (
                        <div className="codex-block">
                          <div className="codex-block-title">
                            📍 获取来源 ({monsterSources.length + gatherSources.length})
                          </div>
                          <div className="codex-list">
                            {gatherSources.map((g) => (
                              <div key={g.actionId} className="codex-row">
                                <span className="codex-row-main">
                                  ⛏️ <b>{g.actionName}</b> <small>({g.skillLabel} Lv.{g.reqLevel})</small>
                                </span>
                                <button
                                  type="button"
                                  className="qty-chip active"
                                  onClick={() => {
                                    close()
                                    setActiveTab(g.tab)
                                  }}
                                >
                                  前往采集 →
                                </button>
                              </div>
                            ))}
                            {monsterSources.slice(0, 6).map((ms) => (
                              <div key={`${ms.stageId}-${ms.monsterId}`} className="codex-row">
                                <span className="codex-row-main">
                                  {ms.isBoss ? '👹' : '👾'} <b>{ms.monsterName}</b>{' '}
                                  <small>({ms.stageName} · 掉率 {ms.chancePct}%)</small>
                                </span>
                                <button
                                  type="button"
                                  className="qty-chip active"
                                  onClick={() => {
                                    close()
                                    if (ms.isBoss) {
                                      setPartyTargetStageId(ms.stageId)
                                      setActiveTab('party')
                                    } else {
                                      setSelectedMap(ms.stageId)
                                      setActiveTab('adventure')
                                    }
                                  }}
                                >
                                  {ms.isBoss ? '组队讨伐 →' : '前往讨伐 →'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {recipeUses.length > 0 && (
                        <div className="codex-block">
                          <div className="codex-block-title">🔨 制作用途 ({recipeUses.length} 个配方需要此材料)</div>
                          <div className="codex-list">
                            {recipeUses.slice(0, 8).map((r) => (
                              <div key={r.actionId} className="codex-row">
                                <span className="codex-row-main">
                                  <span className="item-icon-compact" style={{ marginRight: 4 }}>
                                    <T1ItemIcon itemId={r.outputId} fallback={getItemIcon(r.outputId)} alt="" />
                                  </span>
                                  <b>{r.recipeName}</b>{' '}
                                  <small>({r.skillLabel} Lv.{r.reqLevel} · 需 ×{r.qtyNeeded})</small>
                                </span>
                                <button
                                  type="button"
                                  className="qty-chip active"
                                  onClick={() => {
                                    close()
                                    setCurrentProfession(r.prof)
                                    setActiveTab(r.tab)
                                  }}
                                >
                                  前往制作 →
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
                <div className="modal-actions">
                  {(type === 'consumable' || type === 'food') && (
                    <button className="btn-action craftable" onClick={useFromDetail}>
                      使用
                    </button>
                  )}
                  {type === 'book' && (
                    <button className="btn-action craftable" onClick={learnFromDetail}>
                      {bookKnown ? `重读（固定 +${BOOK_REREAD_XP} 技能经验）` : '阅读并学会'}
                    </button>
                  )}
                  {eqKey && (
                    <button className={`btn-action ${equippedHere ? '' : 'craftable'}`} onClick={equipFromDetail}>
                      {equippedHere
                        ? '卸下'
                        : type === 'weapon'
                        ? '装备到主手'
                        : type === 'offhand' || type === 'shield'
                        ? '装备到副手'
                        : type === 'accessory'
                        ? '佩戴饰品'
                        : '穿上'}
                    </button>
                  )}
                  {packItem.toolFor && (
                    <button
                      className={`btn-action ${(playerState.equipment as any)?.tool === selectedItem.id ? '' : 'craftable'}`}
                      onClick={async () => {
                        try {
                          apiClient.clearCache()
                          if ((playerState.equipment as any)?.tool === selectedItem.id) {
                            await apiClient.unequipItem('tool')
                            toast.info('已卸下工具')
                          } else {
                            await apiClient.equipItem('tool', selectedItem.id)
                            playGameSound('equip')
                            toast.success(
                              `已装备为工具：${toolEffectLine(
                                packItem,
                                professionLabel(packItem.toolFor),
                                Number(playerState.equipment?.enhancementLevels?.[selectedItem.id] || 0)
                              )}`
                            )
                          }
                          await refreshPlayerState()
                          close()
                        } catch (e: any) {
                          toast.error(e?.message || '操作失败')
                        }
                      }}
                    >
                      {(playerState.equipment as any)?.tool === selectedItem.id
                        ? '卸下工具'
                        : `装备为工具（${toolEffectLine(packItem, professionLabel(packItem.toolFor), itemEnh)}）`}
                    </button>
                  )}
                  <button className="btn-secondary" onClick={close}>
                    关闭
                  </button>
                </div>
              </>
            )
          })()}
      </div>
    </div>
  )
}

export function ProfessionSwitchModal({
  showProfessionModal,
  setShowProfessionModal,
  chapterDone,
  playerState,
  currentProfession,
  setCurrentProfession,
  setActiveTab,
  playerGender,
}: {
  showProfessionModal: boolean
  setShowProfessionModal: (b: boolean) => void
  chapterDone: boolean
  playerState: PlayerState
  currentProfession: ProfessionId
  setCurrentProfession: (p: ProfessionId) => void
  setActiveTab: (t: ActiveTab) => void
  playerGender: 'male' | 'female' | 'animal'
}) {
  const toast = useToast()
  if (!showProfessionModal) return null
  return (
    <div className="modal-overlay" onClick={() => setShowProfessionModal(false)}>
      <div className="modal-content profession-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          type="button"
          onClick={() => setShowProfessionModal(false)}
          aria-label="关闭"
        >
          ✕
        </button>
        <h3 className="modal-title">选择职业</h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 8,
          }}
        >
          <p className="modal-subtitle" style={{ margin: 0 }}>
            {chapterDone ? '点当前职业可关闭；点其他职业会跳到对应采集页' : '第一章只做伐木工。矿山的门还没开。'}
          </p>
        </div>

        <div className="profession-grid">
          {Object.values(PROFESSIONS)
            .filter((prof) => chapterDone || prof.id === 'woodcutter')
            .map((prof) => {
              const skill = playerState.skills[prof.skill] || { level: 1, xp: 0 }
              const craft = playerState.skills[prof.craftSkill] || { level: 1, xp: 0 }
              const isCurrent = prof.id === currentProfession
              const nextLevelXp = xpToNextLevel(Math.max(skill.level, craft.level))
              const lead = skill.level >= craft.level ? skill : craft
              const xpProgress = Number.isFinite(nextLevelXp) && nextLevelXp > 0 ? (lead.xp / nextLevelXp) * 100 : 100

              return (
                <div
                  key={prof.id}
                  className={`profession-card ${isCurrent ? 'current' : ''}`}
                  onClick={() => {
                    if (isCurrent) {
                      setShowProfessionModal(false)
                      return
                    }
                    setCurrentProfession(prof.id)
                    setActiveTab(prof.gatherTab)
                    setShowProfessionModal(false)
                    void apiClient.setActiveClass(prof.id).catch((e: any) => {
                      toast.error(e?.message || '切换职业失败')
                    })
                  }}
                >
                  {isCurrent && <div className="current-badge">当前</div>}
                  <div
                    className="profession-icon"
                    style={{ height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <T1Art kind="character" id={characterArtId(prof.id, playerGender)} fallback={prof.icon} alt={prof.name} />
                  </div>
                  <div className="profession-name">
                    {prof.icon} {prof.name}
                  </div>
                  <div className="profession-level">
                    {prof.gatherName} Lv.{skill.level} · {prof.craftName} Lv.{craft.level}
                  </div>

                  <div className="profession-xp-bar">
                    <div className="profession-xp-fill" style={{ width: `${Math.min(100, xpProgress)}%` }} />
                  </div>
                  <div className="profession-xp-text">
                    {lead === skill ? prof.gatherName : prof.craftName}经验 {Math.floor(lead.xp)}/
                    {Number.isFinite(nextLevelXp) ? nextLevelXp : 'MAX'} ({Math.floor(Math.min(100, xpProgress))}%)
                  </div>

                  <div className="profession-skills">
                    <span className="skill-tag">{prof.gatherName}</span>
                    <span className="skill-tag">{prof.craftName}</span>
                  </div>
                  <div className="profession-perk-box">
                    <div className="profession-perk-title">
                      【{getProfessionPerk(prof.id).traitName}】{getProfessionPerk(prof.id).shortTag}
                    </div>
                    <div className="profession-perk-sub">本职5级起：速度+5% · 每5级效率+1%</div>
                  </div>
                </div>
              )
            })}
        </div>

        <div className="profession-tips">
          <div className="tip-text">点当前职业关闭，点其他职业切换并进入采集页</div>
        </div>
      </div>
    </div>
  )
}

export function FirstBladeBuildModal({
  playerState,
  buildModalDelayDone,
  actionLoading,
  setActionLoading,
  refreshPlayerState,
}: {
  playerState: PlayerState
  buildModalDelayDone: boolean
  actionLoading: boolean
  setActionLoading: (b: boolean) => void
  refreshPlayerState: () => Promise<void>
}) {
  const toast = useToast()
  if (!((playerState?.stats?.totalKills ?? 0) >= 1 && !playerState?.chapter1Build && buildModalDelayDone)) {
    return null
  }
  const choose = async (buildId: 'sharpened_edge' | 'thick_bark') => {
    if (actionLoading) return
    setActionLoading(true)
    try {
      await apiClient.chooseChapterBuild(buildId)
      apiClient.clearCache()
      playGameSound('unlock')
      await refreshPlayerState()
    } catch (e: any) {
      toast.error(e?.message || '选择流派失败')
    } finally {
      setActionLoading(false)
    }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-content build-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">选择你的第一刀</h3>
        <p className="modal-desc">这一选择会改变之后的森林战斗，只能选一次。</p>
        <button
          className="btn-action skill-action build-option"
          disabled={actionLoading}
          onClick={() => void choose('sharpened_edge')}
        >
          <T1Art kind="skills" id="sharpened_edge" alt="" />
          <span className="build-copy">
            <strong>开刃 — 攻击 +4</strong>
            <small>进攻型：显著提升普攻与重劈伤害，加快清怪节奏</small>
          </span>
        </button>
        <button
          className="btn-action skill-action build-option"
          style={{ marginTop: 8 }}
          disabled={actionLoading}
          onClick={() => void choose('thick_bark')}
        >
          <T1Art kind="skills" id="thick_bark" alt="" />
          <span className="build-copy">
            <strong>厚树皮 — 生命 +20 · 防御 +4</strong>
            <small>稳健型：提升生命上限与防御减伤，面对强敌更耐打</small>
          </span>
        </button>
      </div>
    </div>
  )
}
