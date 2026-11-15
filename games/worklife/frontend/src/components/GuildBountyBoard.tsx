import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../services/api'
import { GoldIcon, GuildFramedAvatar, T1Art, resolveEquippedGuildFrame } from './T1Art'
import { useToast } from './Toast'
import type { ActiveTab, ProfessionId } from '../gameplay/gameConstants'
import type { PlayerState } from '../types/game'
import './GuildBountyBoard.css'

interface BountyAffixInfo {
  id: string
  name: string
  enName: string
  iconKind: 'skills'
  iconId: string
  tone: 'emerald' | 'crimson' | 'cyan' | 'amber' | 'gold'
  ecologicalSummary: string
  activeEffectText: string
  lingeringEffectText: string
  status: 'active' | 'lingering' | 'standby'
}

interface GuildBountyEntry {
  id: string
  templateId: string
  name: string
  description: string
  metric: 'gather' | 'craft' | 'kill'
  target: number
  baseline: number
  progress: number
  completed: boolean
  accepted: boolean
  claimed: boolean
  rarity: 'common' | 'rare' | 'epic'
  honorReward?: number
  reward: { gold: number; reputation: number; items?: Record<string, number> }
  affix: BountyAffixInfo
}

interface ComboMilestoneInfo {
  id: 'chain_2' | 'chain_full'
  name: string
  badgeText: string
  iconKind: 'skills'
  iconId: string
  requiredCount: number
  progress: number
  claimed: boolean
  claimable: boolean
  honorPoints: number
  forgingEmblems: number
  gold: number
  reputation: number
  bonusItems?: Record<string, number>
  summary: string
}

interface GuildHonorShopItemInfo {
  id: string
  name: string
  category: 'frame' | 'forging' | 'supply'
  categoryLabel: string
  iconKind: 'skills' | 'materials'
  iconId: string
  honorCost: number
  emblemCost: number
  dailyLimit?: number
  dailyRemaining: number | null
  boughtToday: number
  frameLabel?: string
  frameTheme?: 'crimson' | 'astral'
  summary: string
  effectText: string
  unlocked: boolean
  isEquipped: boolean
  canRedeem: boolean
}

interface BountyBoardResponse {
  date: string
  seedKey: string
  rerollsUsed: number
  maxRerolls: number
  rerollCost: number
  bounties: GuildBountyEntry[]
  activeAffixSummary: {
    activeAffixes: Array<{ id: string; name: string; mode: 'active' | 'lingering'; effectText: string }>
  }
  combo: {
    completedToday: number
    fullBoardTarget: number
    milestones: ComboMilestoneInfo[]
  }
  guildHonor: {
    honorPoints: number
    totalHonorEarned: number
    forgingEmblems: number
    totalChainsCompleted: number
    fullClears: number
    unlockedFrames: string[]
    equippedFrame: {
      id: string
      frameLabel: string
      frameTheme: 'crimson' | 'astral'
      iconKind: 'skills' | 'materials'
      iconId: string
    } | null
    shopItems: GuildHonorShopItemInfo[]
  }
}

const RARITY_LABEL: Record<'common' | 'rare' | 'epic', string> = {
  common: '普通委托',
  rare: '精锐委托',
  epic: '史诗讨伐',
}

const METRIC_LABEL: Record<'gather' | 'craft' | 'kill', string> = {
  gather: '生态采集',
  craft: '军备锻造',
  kill: '魔物讨伐',
}

export interface GuildBountyBoardProps {
  playerState: PlayerState
  playerAvatar?: string | null
  playerGender: 'male' | 'female' | 'animal'
  setCurrentProfession: (p: ProfessionId) => void
  setActiveTab: (t: ActiveTab) => void
  refreshPlayerState: () => Promise<void>
}

export function GuildBountyBoard({
  playerState,
  playerAvatar,
  playerGender,
  setCurrentProfession,
  setActiveTab,
  refreshPlayerState,
}: GuildBountyBoardProps) {
  const toast = useToast()
  const [boardData, setBoardData] = useState<BountyBoardResponse | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const loadBoard = useCallback(async () => {
    try {
      const res = await apiClient.getBounties()
      if (res && Array.isArray(res.bounties)) {
        setBoardData(res as BountyBoardResponse)
      }
    } catch {
      // 离线或瞬时请求抖动时保持上一帧展示
    }
  }, [])

  useEffect(() => {
    void loadBoard()
  }, [loadBoard, playerState.bounties?.date, playerState.bounties?.rerollsUsed])

  // 利用 playerState.stats 实时推导本地最新进度，采集/制作/战斗每跳立即反馈进度条
  const liveBounties = useMemo(() => {
    if (!boardData) return []
    const stats = playerState.stats
    return boardData.bounties.map((b) => {
      const statVal =
        b.metric === 'gather'
          ? Number(stats?.totalGathered ?? 0)
          : b.metric === 'craft'
            ? Number(stats?.totalCrafted ?? 0)
            : Number(stats?.totalKills ?? 0)
      const liveProg = b.accepted
        ? Math.max(b.progress, Math.max(0, Math.min(b.target, statVal - b.baseline)))
        : b.progress
      const completed = liveProg >= b.target
      const status: BountyAffixInfo['status'] =
        b.accepted && !b.claimed && !completed
          ? 'active'
          : b.claimed || b.affix.status === 'lingering'
            ? 'lingering'
            : 'standby'
      return {
        ...b,
        progress: liveProg,
        completed,
        affix: { ...b.affix, status },
      }
    })
  }, [boardData, playerState.stats])

  const equippedFrameMeta =
    resolveEquippedGuildFrame(playerState.guildHonor) ||
    (boardData?.guildHonor?.equippedFrame
      ? {
          id: boardData.guildHonor.equippedFrame.id,
          label: boardData.guildHonor.equippedFrame.frameLabel,
          iconId: boardData.guildHonor.equippedFrame.iconId,
          theme: boardData.guildHonor.equippedFrame.frameTheme,
        }
      : null)

  const runAction = async (key: string, fn: () => Promise<any>, okMessage?: (res: any) => string) => {
    if (busyKey) return
    setBusyKey(key)
    try {
      apiClient.clearCache()
      const res = await fn()
      if (res && Array.isArray(res.bounties)) {
        setBoardData(res as BountyBoardResponse)
      } else {
        await loadBoard()
      }
      await refreshPlayerState()
      if (okMessage) toast.success(okMessage(res))
    } catch (err: any) {
      toast.error(err?.message || '操作失败，请稍后重试')
    } finally {
      setBusyKey(null)
    }
  }

  const jumpToContractMetric = (metric: 'gather' | 'craft' | 'kill') => {
    if (metric === 'gather') {
      setCurrentProfession('woodcutter')
      setActiveTab('logging')
      return
    }
    if (metric === 'craft') {
      setCurrentProfession('woodcutter')
      setActiveTab('woodworking')
      return
    }
    const grid = document.querySelector('.monster-grid')
    if (grid && typeof grid.scrollIntoView === 'function') {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!boardData) {
    return (
      <section className="guild-bounty-shell loading" aria-label="异世界公会每日词缀讨伐委托板">
        <div className="guild-bounty-header">
          <div className="guild-bounty-title-group">
            <T1Art kind="skills" id="guild_honor_crest" className="guild-header-crest" alt="" />
            <div>
              <h3 className="guild-bounty-title">异世界公会 · 每日词缀讨伐委托板</h3>
              <p className="guild-bounty-sub">正在同步今日生态词缀与连携赏金委托…</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const { combo, guildHonor } = boardData
  const rerollsLeft = Math.max(0, boardData.maxRerolls - boardData.rerollsUsed)
  const activeFieldList = liveBounties.filter((b) => b.affix.status === 'active' || b.affix.status === 'lingering')

  return (
    <section className="guild-bounty-shell" aria-label="异世界公会每日词缀讨伐委托板">
      <div className="guild-bounty-header">
        <div className="guild-bounty-title-group">
          <GuildFramedAvatar
            avatar={playerAvatar ?? playerState.settings?.avatar}
            gender={playerGender}
            frameId={equippedFrameMeta?.id || null}
            size={42}
            className="guild-board-avatar"
          />
          <div className="guild-bounty-heading-copy">
            <div className="guild-bounty-title-row">
              <h3 className="guild-bounty-title">异世界公会 · 每日词缀讨伐委托板</h3>
              <span className="guild-seed-pill" title={`确定性日切种子：${boardData.seedKey}`}>
                日切 {boardData.date}
              </span>
              {equippedFrameMeta && (
                <span className={`guild-equipped-frame-pill theme-${equippedFrameMeta.theme}`}>
                  <T1Art kind="skills" id={equippedFrameMeta.iconId} className="guild-inline-icon" alt="" />
                  {equippedFrameMeta.label}
                </span>
              )}
            </div>
            <p className="guild-bounty-sub">
              接取词缀委托即刻激活生态战域修正；同日达成 2 连携与全板制霸可赢取公会荣誉、稀有锻造徽记与专属边框。
            </p>
          </div>
        </div>

        <div className="guild-bounty-wallet-bar">
          <div className="guild-currency-chip honor" title="公会荣誉积分（跨日与转生永久保留）">
            <T1Art kind="skills" id="guild_honor_crest" className="guild-inline-icon" alt="" />
            <span className="guild-currency-label">公会荣誉</span>
            <strong className="guild-currency-val">{guildHonor.honorPoints}</strong>
          </div>
          <div className="guild-currency-chip emblem" title="稀有锻造徽记（连携赏金产出，可兑换专属边框与秘锻礼匣）">
            <T1Art kind="skills" id="forging_emblem" className="guild-inline-icon" alt="" />
            <span className="guild-currency-label">锻造徽记</span>
            <strong className="guild-currency-val">{guildHonor.forgingEmblems}</strong>
          </div>
          <button
            type="button"
            className="guild-reroll-btn"
            disabled={rerollsLeft <= 0 || (playerState.inventory.gold || 0) < boardData.rerollCost || !!busyKey}
            onClick={() =>
              void runAction(
                'reroll',
                () => apiClient.rerollBounties(),
                () => `委托板已刷新（今日剩余 ${Math.max(0, rerollsLeft - 1)} 次）`
              )
            }
            title="保留进行中委托，重掷其余槽位的生态词缀契约"
          >
            <GoldIcon /> {boardData.rerollCost} 刷新 ({rerollsLeft}/{boardData.maxRerolls})
          </button>
          <button
            type="button"
            className="guild-collapse-btn"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? '展开委托' : '收起'}
          </button>
        </div>
      </div>

      {activeFieldList.length > 0 && (
        <div className="guild-active-affix-strip" role="status">
          <span className="guild-strip-tag">当前生效词缀场：</span>
          {activeFieldList.map((b) => (
            <span key={b.id} className={`guild-active-affix-chip tone-${b.affix.tone} mode-${b.affix.status}`}>
              <T1Art kind="skills" id={b.affix.iconId} className="guild-inline-icon" alt="" />
              <b>{b.affix.name}</b>
              <em>{b.affix.status === 'active' ? b.affix.activeEffectText : b.affix.lingeringEffectText}</em>
            </span>
          ))}
        </div>
      )}

      {!collapsed && (
        <>
          {/* 1. 每日词缀讨伐委托 4 槽矩阵 */}
          <div className="guild-contract-grid">
            {liveBounties.map((b) => {
              const pct = b.target > 0 ? Math.min(100, Math.round((b.progress / b.target) * 100)) : 0
              const canClaim = b.accepted && !b.claimed && b.completed
              return (
                <article
                  key={b.id}
                  className={`guild-contract-card rarity-${b.rarity} tone-${b.affix.tone}${b.claimed ? ' is-claimed' : canClaim ? ' is-ready' : b.accepted ? ' is-active' : ''}`}
                >
                  <div className="guild-contract-top">
                    <div className="guild-affix-badge">
                      <T1Art kind="skills" id={b.affix.iconId} className="guild-affix-art" alt="" />
                      <div className="guild-affix-titles">
                        <span className={`guild-affix-pill tone-${b.affix.tone}`}>{b.affix.name}</span>
                        <strong className="guild-contract-name">{b.name}</strong>
                      </div>
                    </div>
                    <div className="guild-contract-tags">
                      <span className={`guild-rarity-chip rarity-${b.rarity}`}>{RARITY_LABEL[b.rarity]}</span>
                      <span className="guild-metric-chip">{METRIC_LABEL[b.metric]}</span>
                    </div>
                  </div>

                  <p className="guild-affix-effect-line">{b.affix.activeEffectText}</p>
                  <p className="guild-contract-desc">{b.description}</p>

                  <div className="guild-progress-wrap">
                    <div className="guild-progress-track">
                      <div
                        className={`guild-progress-fill${b.completed ? ' full' : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="guild-progress-nums">
                      {b.accepted ? `${b.progress} / ${b.target}` : `接取后计数 0 / ${b.target}`}
                    </span>
                  </div>

                  <div className="guild-contract-footer">
                    <div className="guild-reward-list">
                      <span className="guild-reward-item gold">
                        <GoldIcon /> +{b.reward.gold}
                      </span>
                      <span className="guild-reward-item rep">声望 +{b.reward.reputation}</span>
                      <span className="guild-reward-item honor">
                        <T1Art kind="skills" id="guild_honor_crest" className="guild-inline-icon" alt="" /> +{b.honorReward || 16}
                      </span>
                    </div>

                    <div className="guild-contract-actions">
                      {b.claimed ? (
                        <span className="guild-state-done">已结清 · 余韵生效</span>
                      ) : canClaim ? (
                        <button
                          type="button"
                          className="guild-btn primary claim"
                          disabled={!!busyKey}
                          onClick={() =>
                            void runAction(
                              `claim-${b.id}`,
                              () => apiClient.claimBounty(b.id),
                              (res) =>
                                `完成「${b.name}」！金币 +${res?.reward?.gold ?? b.reward.gold} · 公会荣誉 +${res?.reward?.honorGained ?? (b.honorReward || 16)}`
                            )
                          }
                        >
                          领取赏金
                        </button>
                      ) : b.accepted ? (
                        <button
                          type="button"
                          className="guild-btn ghost"
                          onClick={() => jumpToContractMetric(b.metric)}
                        >
                          {b.metric === 'gather' ? '去采集' : b.metric === 'craft' ? '去制作' : '去讨伐'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="guild-btn accept"
                          disabled={!!busyKey}
                          onClick={() =>
                            void runAction(
                              `accept-${b.id}`,
                              () => apiClient.acceptBounty(b.id),
                              () => `已接取「${b.name}」，词缀「${b.affix.name}」立即生效！`
                            )
                          }
                        >
                          接取委托
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {/* 2. 连携奖励赏金系统进度条（2-Chain & Full-Board Clear） */}
          <div className="guild-combo-bar">
            <div className="guild-combo-summary">
              <div className="guild-combo-title-line">
                <T1Art kind="skills" id="forging_emblem" className="guild-combo-emblem-art" alt="" />
                <div>
                  <strong className="guild-combo-title">今日讨伐连携赏金</strong>
                  <span className="guild-combo-count">
                    已完成 <b>{combo.completedToday}</b> / {combo.fullBoardTarget} 份委托
                    {guildHonor.fullClears > 0 && ` · 累计全制霸 ${guildHonor.fullClears} 次`}
                  </span>
                </div>
              </div>
              <div className="guild-combo-meter">
                <div
                  className="guild-combo-meter-fill"
                  style={{
                    width: `${Math.min(100, Math.round((combo.completedToday / Math.max(1, combo.fullBoardTarget)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="guild-combo-milestones">
              {combo.milestones.map((m) => (
                <div
                  key={m.id}
                  className={`guild-combo-node${m.claimed ? ' claimed' : m.claimable ? ' claimable' : ''}`}
                >
                  <T1Art kind={m.iconKind} id={m.iconId} className="guild-combo-node-art" alt="" />
                  <div className="guild-combo-node-copy">
                    <div className="guild-combo-node-head">
                      <strong>{m.name}</strong>
                      <span className="guild-combo-req">
                        {m.progress}/{m.requiredCount}
                      </span>
                    </div>
                    <div className="guild-combo-rewards">
                      <span>
                        <T1Art kind="skills" id="guild_honor_crest" className="guild-inline-icon" alt="" /> 荣誉 +{m.honorPoints}
                      </span>
                      <span>
                        <T1Art kind="skills" id="forging_emblem" className="guild-inline-icon" alt="" /> 徽记 +{m.forgingEmblems}
                      </span>
                      <span>
                        <GoldIcon /> +{m.gold}
                      </span>
                    </div>
                  </div>
                  {m.claimed ? (
                    <span className="guild-combo-done">已领连携</span>
                  ) : (
                    <button
                      type="button"
                      className={`guild-btn ${m.claimable ? 'primary claim' : 'disabled'}`}
                      disabled={!m.claimable || !!busyKey}
                      onClick={() =>
                        void runAction(
                          `combo-${m.id}`,
                          () => apiClient.claimBountyCombo(m.id),
                          () => `连携赏金「${m.name}」到账：荣誉 +${m.honorPoints} · 稀有锻造徽记 +${m.forgingEmblems}！`
                        )
                      }
                    >
                      {m.claimable ? '领取连携' : `差 ${Math.max(0, m.requiredCount - m.progress)} 份`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. 公会荣誉与稀有锻造徽记兑换所（专属头像边框 & 锻造战备补给） */}
          <div className="guild-honor-exchange">
            <div className="guild-exchange-head">
              <strong className="guild-exchange-title">
                <T1Art kind="skills" id="guild_honor_crest" className="guild-inline-icon" alt="" /> 公会荣誉徽记兑换所 · 专属头像边框与秘锻补给
              </strong>
              {equippedFrameMeta && (
                <button
                  type="button"
                  className="guild-unequip-frame-btn"
                  disabled={!!busyKey}
                  onClick={() =>
                    void runAction(
                      'frame-unequip',
                      () => apiClient.equipGuildFrame(null),
                      () => '已卸下专属公会边框'
                    )
                  }
                >
                  卸下当前边框
                </button>
              )}
            </div>

            <div className="guild-shop-grid">
              {guildHonor.shopItems.map((item) => (
                <div
                  key={item.id}
                  className={`guild-shop-card cat-${item.category}${item.isEquipped ? ' equipped' : item.unlocked ? ' unlocked' : ''}`}
                >
                  <div className="guild-shop-art-box">
                    {item.category === 'frame' ? (
                      <GuildFramedAvatar
                        avatar={playerAvatar ?? playerState.settings?.avatar}
                        gender={playerGender}
                        frameId={item.id}
                        size={44}
                      />
                    ) : (
                      <T1Art kind={item.iconKind} id={item.iconId} className="guild-shop-icon" alt="" />
                    )}
                  </div>

                  <div className="guild-shop-body">
                    <div className="guild-shop-title-row">
                      <strong className="guild-shop-name">{item.name}</strong>
                      <span className="guild-shop-cat">{item.categoryLabel}</span>
                    </div>
                    <p className="guild-shop-effect">{item.effectText}</p>
                    <div className="guild-shop-bottom">
                      <div className="guild-shop-costs">
                        <span className="cost-honor">
                          <T1Art kind="skills" id="guild_honor_crest" className="guild-inline-icon" alt="" /> {item.honorCost}
                        </span>
                        {item.emblemCost > 0 && (
                          <span className="cost-emblem">
                            <T1Art kind="skills" id="forging_emblem" className="guild-inline-icon" alt="" /> {item.emblemCost}
                          </span>
                        )}
                        {item.dailyRemaining !== null && (
                          <span className="guild-shop-limit">今日余 {item.dailyRemaining}/{item.dailyLimit}</span>
                        )}
                      </div>

                      {item.category === 'frame' && item.unlocked ? (
                        item.isEquipped ? (
                          <span className="guild-frame-equipped-tag">佩戴中</span>
                        ) : (
                          <button
                            type="button"
                            className="guild-btn accept"
                            disabled={!!busyKey}
                            onClick={() =>
                              void runAction(
                                `equip-${item.id}`,
                                () => apiClient.equipGuildFrame(item.id),
                                () => `已佩戴专属边框「${item.frameLabel || item.name}」`
                              )
                            }
                          >
                            佩戴边框
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          className={`guild-btn ${item.canRedeem ? 'primary' : 'disabled'}`}
                          disabled={!item.canRedeem || !!busyKey}
                          onClick={() =>
                            void runAction(
                              `redeem-${item.id}`,
                              () => apiClient.redeemGuildHonor(item.id),
                              () =>
                                item.category === 'frame'
                                  ? `成功解锁并佩戴「${item.frameLabel || item.name}」！`
                                  : `成功兑换「${item.name}」！`
                            )
                          }
                        >
                          {item.dailyRemaining === 0 ? '今日已满' : '荣誉兑换'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
