import { useEffect, useState } from 'react'
import { apiClient } from '../services/api'
import { T1ItemIcon } from './T1Art'
import { playGameSound } from '../gameplay/sound'
import { useToast } from './Toast'
import {
  PRODUCTION_TEAS,
  getItemIcon,
  getTierName,
  resolveItemInfo,
  type ProfessionId,
} from '../gameplay/gameConstants'
import type { PlayerState } from '../types/game'

export function ProductionTeaBar({
  playerState,
  refreshPlayerState,
}: {
  playerState: PlayerState
  refreshPlayerState: () => Promise<void>
}) {
  const toast = useToast()
  const nowMs = Date.now()
  return (
    <div className="production-tea-bar" role="region" aria-label="生产茶饮补给栏">
      <div className="production-tea-head">
        <span className="production-tea-title">🍵 生产茶饮与药剂席</span>
        <small className="production-tea-sub">通过【烹饪 / 炼金】生产技能制作后可在此直接饮用（重复饮用叠加持续时间）</small>
      </div>
      <div className="production-tea-grid">
        {PRODUCTION_TEAS.map((tea) => {
          const count = Number(playerState.inventory?.[tea.id] || 0)
          const activeBuff = (playerState.activeBuffs || []).find(
            (b) => (b.id === tea.buffId || b.sourceItemId === tea.id) && Date.parse(b.expiresAt) > nowMs
          )
          const remSec = activeBuff ? Math.max(0, Math.floor((Date.parse(activeBuff.expiresAt) - nowMs) / 1000)) : 0
          const remText =
            remSec > 0
              ? `${Math.floor(remSec / 60)}:${String(remSec % 60).padStart(2, '0')}`
              : null
          return (
            <div key={tea.id} className={`production-tea-chip${remSec > 0 ? ' is-active' : ''}`} title={tea.desc}>
              <span className="production-tea-icon item-icon-compact">
                <T1ItemIcon itemId={tea.id} fallback={getItemIcon(tea.id)} alt="" />
              </span>
              <div className="production-tea-info">
                <div className="production-tea-name-row">
                  <strong>{tea.name}</strong>
                  <span className="production-tea-effect">{tea.tag}</span>
                </div>
                <div className="production-tea-meta">
                  {remText ? (
                    <span className="tea-buff-active">⏳ 生效中 {remText} · 库存 ×{count}</span>
                  ) : (
                    <span>库存 ×{count} · {tea.craftSource}</span>
                  )}
                </div>
              </div>
              {count > 0 && (
                <div className="production-tea-actions">
                  <button
                    type="button"
                    className="qty-chip active"
                    onClick={async () => {
                      try {
                        apiClient.clearCache()
                        const res: any = await apiClient.consumeItem(tea.id)
                        await refreshPlayerState()
                        toast.success(`🍵 已饮用「${tea.name}」（${res?.buff?.name || tea.tag}）`)
                      } catch (e: any) {
                        toast.error(e?.message || '饮用失败')
                      }
                    }}
                  >
                    品饮
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AlchemyCoinifyPanel({
  playerState,
  contentPack,
  currentProfession,
  skillLevel,
  coinifyItemId,
  setCoinifyItemId,
  coinifyFilter,
  setCoinifyFilter,
  coinifyBusy,
  setCoinifyBusy,
  refreshPlayerState,
}: {
  playerState: PlayerState
  contentPack: any
  currentProfession: ProfessionId
  skillLevel: number
  coinifyItemId: string
  setCoinifyItemId: (id: string) => void
  coinifyFilter: 'all' | 'material' | 'gear' | 'consumable'
  setCoinifyFilter: (f: 'all' | 'material' | 'gear' | 'consumable') => void
  coinifyBusy: boolean
  setCoinifyBusy: (b: boolean) => void
  refreshPlayerState: () => Promise<void>
}) {
  const toast = useToast()
  const equippedSet = new Set(
    Object.entries(playerState.equipment || {})
      .filter(([k, v]) => typeof v === 'string' && !['enhancementLevels', 'durability', 'maxDurability'].includes(k))
      .map(([, v]) => String(v))
  )
  const classBonus = currentProfession === 'alchemist' ? 0.15 : 0
  const multiplier = Math.round((0.85 + Math.min(1.15, (skillLevel - 1) * 0.012) + classBonus) * 100) / 100
  const critChancePct = Math.min(35, Math.round((15 + skillLevel * 0.2) * 10) / 10)
  const tierBasePrice: Record<number, number> = {
    1: 20, 2: 60, 3: 150, 4: 400, 5: 1000, 6: 2500, 7: 6000, 8: 14000, 9: 32000, 10: 70000, 11: 150000, 12: 320000,
  }

  const candidates = Object.entries(playerState.inventory || {})
    .filter(([id, count]) => id !== 'gold' && (count || 0) > 0)
    .map(([id, count]) => {
      const packDef: any = contentPack?.items?.find((i: any) => i.id === id)
      const info = resolveItemInfo(id, contentPack)
      const tier = Math.max(1, Number(packDef?.tier ?? info.tier ?? 1))
      const baseVal = Math.max(2, Number(packDef?.value || tierBasePrice[tier] || tier * 30))
      const shopSellVal = Math.max(1, Math.floor(baseVal * 0.35))
      const coinifyVal = Math.max(2, Math.round(baseVal * multiplier))
      const xpEach = Math.max(4, Math.round(tier * 6))
      const isEquipped = equippedSet.has(id)
      const spareCount = isEquipped ? Math.max(0, Number(count) - 1) : Number(count)
      return {
        id,
        name: packDef?.name || info.name || id,
        type: String(packDef?.type || info.type || 'material'),
        tier,
        count: Number(count),
        spareCount,
        isEquipped,
        shopSellVal,
        coinifyVal,
        xpEach,
      }
    })
    .filter((item) => {
      if (item.spareCount <= 0) return false
      if (coinifyFilter === 'material') return item.type === 'material'
      if (coinifyFilter === 'gear') return ['weapon', 'armor', 'offhand', 'shield', 'accessory'].includes(item.type)
      if (coinifyFilter === 'consumable') return ['consumable', 'food', 'book'].includes(item.type)
      return true
    })
    .sort((a, b) => b.tier - a.tier || b.coinifyVal - a.coinifyVal)

  const selected = candidates.find((c) => c.id === coinifyItemId) || candidates[0] || null

  const runCoinify = async (itemId: string, qty: number) => {
    if (coinifyBusy || qty < 1) return
    setCoinifyBusy(true)
    try {
      apiClient.clearCache()
      const res: any = await apiClient.alchemyCoinify(itemId, qty)
      playGameSound('craft-complete')
      await refreshPlayerState()
      const critMsg = res?.critCount > 0 ? ` · 触发 ${res.critCount} 次双倍暴击！` : ''
      const lvMsg = res?.leveledTo ? ` · 炼金升至 Lv.${res.leveledTo}！` : ''
      toast.success(`✨ 点石成金：获得 +${res?.goldGained || 0} 金币、+${res?.xpGained || 0} 炼金经验${critMsg}${lvMsg}`)
    } catch (e: any) {
      toast.error(e?.message || '点石成金失败')
    } finally {
      setCoinifyBusy(false)
    }
  }

  return (
    <div className="coinify-branch-panel" aria-label="点石成金分支">
      <div className="coinify-summary-banner">
        <div className="coinify-summary-metric">
          <span>炼金点金倍率</span>
          <strong>{Math.round(multiplier * 100)}% 基础价</strong>
          <small>远高于商店回收价 (35%)</small>
        </div>
        <div className="coinify-summary-metric">
          <span>炼金双倍暴击率</span>
          <strong>{critChancePct}%</strong>
          <small>触发时该件点化金币 ×2</small>
        </div>
        <div className="coinify-summary-metric">
          <span>当前炼金等级</span>
          <strong>Lv.{skillLevel}</strong>
          <small>每次点化直接增长炼金经验</small>
        </div>
      </div>

      <div className="coinify-filter-bar">
        {([
          ['all', '全部可点化'],
          ['material', '材料/掉落'],
          ['gear', '闲置装备'],
          ['consumable', '药剂/食谱/书'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`category-btn ${coinifyFilter === key ? 'active' : ''}`}
            onClick={() => setCoinifyFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {candidates.length === 0 ? (
        <div className="no-favorites">
          <div className="empty-icon">✨</div>
          <p>当前分类下没有可点化的闲置物品</p>
          <p className="hint-text">去采集、制作或打怪获取材料与战利品后再来点石成金</p>
        </div>
      ) : (
        <div className="coinify-workspace">
          {selected && (
            <div className="coinify-spotlight-card">
              <div className="coinify-spotlight-head">
                <span className="coinify-spotlight-icon item-icon-compact">
                  <T1ItemIcon itemId={selected.id} fallback={getItemIcon(selected.id)} alt="" />
                </span>
                <div className="coinify-spotlight-title">
                  <strong>{selected.name}</strong>
                  <span>
                    {getTierName(selected.tier)} · 可点化库存 ×{selected.spareCount}
                  </span>
                </div>
              </div>
              <div className="coinify-compare-row">
                <span>商店贱卖：{selected.shopSellVal} 金/件</span>
                <span className="coinify-gold-highlight">✨ 点石成金：{selected.coinifyVal} 金/件（暴击 {selected.coinifyVal * 2} 金）</span>
                <span className="coinify-xp-highlight">🧪 +{selected.xpEach} 炼金XP/件</span>
              </div>
              <div className="coinify-action-btns">
                {[1, 10, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="btn-action craftable"
                    disabled={coinifyBusy || selected.spareCount < n}
                    onClick={() => void runCoinify(selected.id, n)}
                  >
                    ✨ 点化 ×{n} (+{selected.coinifyVal * n}💰)
                  </button>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={coinifyBusy || selected.spareCount < 1}
                  onClick={() => void runCoinify(selected.id, selected.spareCount)}
                >
                  全部点化 ×{selected.spareCount} (+{selected.coinifyVal * selected.spareCount}💰)
                </button>
              </div>
            </div>
          )}

          <div className="coinify-item-grid">
            {candidates.map((item) => {
              const isSel = selected?.id === item.id
              return (
                <div
                  key={item.id}
                  className={`coinify-item-card${isSel ? ' is-selected' : ''}`}
                  onClick={() => setCoinifyItemId(item.id)}
                >
                  <div className="coinify-item-top">
                    <span className="item-icon-compact">
                      <T1ItemIcon itemId={item.id} fallback={getItemIcon(item.id)} alt="" />
                    </span>
                    <div className="coinify-item-name">
                      <strong>{item.name}</strong>
                      <small>×{item.spareCount} · {getTierName(item.tier)}</small>
                    </div>
                  </div>
                  <div className="coinify-item-bottom">
                    <span className="coinify-gold-tag">✨ {item.coinifyVal}💰</span>
                    <span className="coinify-xp-tag">+{item.xpEach} XP</span>
                    <button
                      type="button"
                      className="qty-chip active"
                      disabled={coinifyBusy}
                      onClick={(e) => {
                        e.stopPropagation()
                        void runCoinify(item.id, 1)
                      }}
                    >
                      点化×1
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** Persistent combat HP chip — wounds carry between fights, pool refills over ~60s out of combat. */
export function CombatHpChip({
  maxHp,
  combatHp,
  combatHpAt,
  activeClassId,
}: {
  maxHp: number
  combatHp?: number
  combatHpAt?: number
  activeClassId?: string
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  const spanSec = activeClassId === 'farmer' ? 40 : 60
  const baseHp = combatHp === undefined ? maxHp : Math.min(Math.max(0, combatHp), maxHp)
  const curExact =
    baseHp < maxHp && combatHpAt !== undefined
      ? Math.min(maxHp, baseHp + (Math.max(0, now - combatHpAt) / (spanSec * 1000)) * maxHp)
      : baseHp
  const cur = Math.min(maxHp, Math.floor(curExact))
  if (cur >= maxHp) return null
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (curExact / maxHp) * 100)) : 100
  const secsLeft = Math.max(1, Math.ceil(((maxHp - curExact) / maxHp) * spanSec))
  return (
    <div className="page-info combat-hp-chip" title="战斗血量会跨场保留；脱战后约 1 分钟回满">
      <p>
        ❤️ 生命值 <b>{cur}</b> / {maxHp} ({Math.floor(pct)}%) · 回血中（约 {secsLeft}s 回满）
      </p>
      <div className="combat-hp-chip-bar" aria-hidden="true">
        <div className="combat-hp-chip-fill" style={{ width: `${pct.toFixed(1)}%` }} />
      </div>
    </div>
  )
}
