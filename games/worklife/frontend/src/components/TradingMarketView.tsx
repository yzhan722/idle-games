import { GoldIcon, T1Art, T1ItemIcon } from './T1Art'
import { MarketItemGrid } from './MarketItemGrid'
import { MarketMyOrders } from './MarketMyOrders'
import { getItemIcon, getTierName, resolveItemInfo } from '../gameplay/gameConstants'
import type { PlayerState } from '../types/game'
import './T1UiIcons.css'

export interface TradingMarketViewProps {
  playerState: PlayerState
  userId?: string
  contentPack: any
  allItems: any
  itemsLoading: boolean
  selectedTradingItem: string | null
  setSelectedTradingItem: (id: string | null) => void
  tradingOrders: any[]
  tradingOrdersLoading: boolean
  marketRefreshKey: number
  setMarketRefreshKey: React.Dispatch<React.SetStateAction<number>>
  orderType: 'sell' | 'buy'
  setOrderType: (t: 'sell' | 'buy') => void
  sellQuantity: number
  setSellQuantity: React.Dispatch<React.SetStateAction<number>>
  sellPrice: number
  setSellPrice: React.Dispatch<React.SetStateAction<number>>
  showSellModal: boolean
  setShowSellModal: (b: boolean) => void
  showPurchaseModal: boolean
  setShowPurchaseModal: (b: boolean) => void
  purchaseQuantity: number
  setPurchaseQuantity: (n: number) => void
  selectedOrder: { id: string; quantity: number; price: number; type: 'sell' | 'buy' } | null
  setSelectedOrder: (o: { id: string; quantity: number; price: number; type: 'sell' | 'buy' } | null) => void
  orderSubmitting: boolean
  handleCreateOrder: () => Promise<void>
  handleBuyOrder: () => Promise<void>
  getItemNameById: (id: string) => string
  refreshPlayerState: () => Promise<void>
}

export function TradingMarketView({
  playerState,
  userId,
  contentPack,
  allItems,
  itemsLoading,
  selectedTradingItem,
  setSelectedTradingItem,
  tradingOrders,
  tradingOrdersLoading,
  marketRefreshKey,
  setMarketRefreshKey,
  orderType,
  setOrderType,
  sellQuantity,
  setSellQuantity,
  sellPrice,
  setSellPrice,
  showSellModal,
  setShowSellModal,
  showPurchaseModal,
  setShowPurchaseModal,
  purchaseQuantity,
  setPurchaseQuantity,
  selectedOrder,
  setSelectedOrder,
  orderSubmitting,
  handleCreateOrder,
  handleBuyOrder,
  getItemNameById,
  refreshPlayerState,
}: TradingMarketViewProps) {
  const getItemInfo = (id: string) => resolveItemInfo(id, contentPack)

  return (
    <div className="trading-layout">
      {itemsLoading ? (
        <div className="loading-screen">
          <div><T1Art kind="ui" id="nav-trading" fallback="" alt="" className="inline-t1-icon" /> 加载道具数据中...</div>
        </div>
      ) : !selectedTradingItem ? (
        <>
          <div className="page-header">
            <h2 className="section-title">交易行</h2>
            <div className="page-info">
              <p>玩家之间买卖任何物品：直接吃掉最优挂单，或按自己的价格挂出售单 / 收购单。商会补给站亦常年以高于店价的溢价供应基础资源，保障新手起步循环。成交按卖方所得收 5% 税。</p>
            </div>
          </div>
          <MarketItemGrid
            groups={[
              { id: 'materials', title: '材料', iconId: 'nav-woodworking', items: allItems?.materials || [] },
              { id: 'weapons', title: '武器', iconId: 'nav-melee', items: allItems?.weapons || [] },
              {
                id: 'armor',
                title: '防具',
                iconId: 'stat-def',
                items: [
                  ...(allItems?.armor || []),
                  ...((allItems?.all || []).filter(
                    (i: any) =>
                      (i.type === 'offhand' || i.type === 'shield') &&
                      !(allItems?.armor || []).some((a: any) => a.id === i.id)
                  )),
                ],
              },
              { id: 'accessories', title: '饰品', iconId: 'nav-crystal', items: (allItems?.all || []).filter((i: any) => i.type === 'accessory') },
              { id: 'tools', title: '工具', iconId: 'nav-logging', items: (allItems?.all || []).filter((i: any) => !!i.toolFor) },
              { id: 'consumables', title: '消耗品', iconId: 'nav-cooking', items: allItems?.consumables || [] },
              { id: 'books', title: '技能书', iconId: 'nav-magic', items: (allItems?.all || []).filter((i: any) => i.type === 'book') },
            ]}
            inventory={playerState.inventory}
            iconOf={getItemIcon}
            onPick={(id) => setSelectedTradingItem(id)}
            refreshKey={marketRefreshKey}
          />
          <MarketMyOrders
            nameOf={getItemNameById}
            refreshKey={marketRefreshKey}
            onChanged={() => {
              setMarketRefreshKey((k) => k + 1)
              void refreshPlayerState()
            }}
          />
        </>
      ) : (
        <>
          <div className="trading-detail-header">
            <button className="btn-back-trading" onClick={() => setSelectedTradingItem(null)}>
              ← 返回列表
            </button>
            <div className="trading-detail-title">
              <span className="detail-icon item-icon-compact">
                <T1ItemIcon itemId={selectedTradingItem} fallback={getItemIcon(selectedTradingItem)} alt="" />
              </span>
              <span className="detail-name">{getItemInfo(selectedTradingItem).name}</span>
              <span className="detail-tier">{getTierName(getItemInfo(selectedTradingItem).tier)}</span>
              <span className="detail-owned">拥有 {playerState.inventory[selectedTradingItem] || 0}</span>
              {(() => {
                const asks = tradingOrders.filter((o) => o.type === 'sell').map((o) => o.price)
                const bids = tradingOrders.filter((o) => o.type === 'buy').map((o) => o.price)
                const shop = Number(contentPack?.items?.find((i: any) => i.id === selectedTradingItem)?.value || 0)
                return (
                  <span className="detail-market">
                    {asks.length ? `最低卖价 ${Math.min(...asks)}` : '无卖单'} ·{' '}
                    {bids.length ? `最高收购 ${Math.max(...bids)}` : '无收购'}
                    {shop ? ` · 店价 ${shop}` : ''}
                  </span>
                )
              })()}
            </div>
            <div className="trading-detail-actions">
              <button
                className="btn-create-order sell"
                disabled={(playerState.inventory[selectedTradingItem] || 0) <= 0}
                title={(playerState.inventory[selectedTradingItem] || 0) <= 0 ? '背包中没有该物品可出售' : undefined}
                onClick={() => {
                  setOrderType('sell')
                  setSellQuantity(1)
                  const asks = tradingOrders.filter((o) => o.type === 'sell').map((o) => o.price)
                  const shop = Number(contentPack?.items?.find((i: any) => i.id === selectedTradingItem)?.value || 0)
                  if (asks.length) setSellPrice(Math.max(1, Math.min(...asks)))
                  else if (shop > 0) setSellPrice(Math.max(1, shop * 2))
                  setShowSellModal(true)
                }}
              >
                <T1Art kind="ui" id="nav-trading" fallback="" alt="" /> 挂出售单
              </button>
              <button
                className="btn-create-order buy"
                onClick={() => {
                  setOrderType('buy')
                  setSellQuantity(1)
                  const bids = tradingOrders.filter((o) => o.type === 'buy').map((o) => o.price)
                  const shop = Number(contentPack?.items?.find((i: any) => i.id === selectedTradingItem)?.value || 0)
                  if (bids.length) setSellPrice(Math.max(1, Math.max(...bids)))
                  else if (shop > 0) setSellPrice(Math.max(1, shop))
                  setShowSellModal(true)
                }}
              >
                <T1Art kind="ui" id="nav-inventory" fallback="" alt="" /> 挂收购单
              </button>
            </div>
          </div>

          <div className="trading-orders-container">
            <div className="orders-column">
              <div className="orders-header sell">
                <h3><T1Art kind="ui" id="nav-trading" fallback="" alt="" /> 出售单</h3>
                <span className="orders-hint">价格从低到高</span>
              </div>
              <div className="orders-list">
                {tradingOrdersLoading ? (
                  <div className="orders-loading">加载中...</div>
                ) : (
                  <>
                    {tradingOrders
                      .filter((order) => order.type === 'sell')
                      .sort((a, b) => a.price - b.price)
                      .slice(0, 5)
                      .map((order) => (
                        <div key={order.id} className="order-item-compact sell">
                          <span className="order-quantity">
                            x{order.quantity}
                            {order.username === '商会补给站' && (
                              <small style={{ marginLeft: 6, opacity: 0.72, fontSize: '0.75rem' }}>商会预设</small>
                            )}
                          </span>
                          <span className="order-price">{order.price} <GoldIcon /></span>
                        </div>
                      ))}
                    {tradingOrders.filter((order) => order.type === 'sell').length === 0 && (
                      <div className="orders-empty">
                        <div className="empty-text">暂无出售单</div>
                      </div>
                    )}
                    {tradingOrders.filter((order) => order.type === 'sell' && order.userId !== userId).length > 0 && (
                      <button
                        className="btn-quick-buy"
                        onClick={() => {
                          const sellOrders = tradingOrders
                            .filter((order) => order.type === 'sell' && order.userId !== userId)
                            .sort((a, b) => a.price - b.price)
                          if (sellOrders.length > 0) {
                            setSelectedOrder(sellOrders[0])
                            setPurchaseQuantity(1)
                            setShowPurchaseModal(true)
                          }
                        }}
                      >
                        <GoldIcon /> 购买
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="orders-column">
              <div className="orders-header buy">
                <h3><T1Art kind="ui" id="nav-inventory" fallback="" alt="" /> 收购单</h3>
                <span className="orders-hint">价格从高到低</span>
              </div>
              <div className="orders-list">
                {tradingOrdersLoading ? (
                  <div className="orders-loading">加载中...</div>
                ) : (
                  <>
                    {tradingOrders
                      .filter((order) => order.type === 'buy')
                      .sort((a, b) => b.price - a.price)
                      .slice(0, 5)
                      .map((order) => (
                        <div key={order.id} className="order-item-compact buy">
                          <span className="order-quantity">
                            x{order.quantity}
                            {order.username === '商会补给站' && (
                              <small style={{ marginLeft: 6, opacity: 0.72, fontSize: '0.75rem' }}>商会预设</small>
                            )}
                          </span>
                          <span className="order-price">{order.price} <GoldIcon /></span>
                        </div>
                      ))}
                    {tradingOrders.filter((order) => order.type === 'buy').length === 0 && (
                      <div className="orders-empty">
                        <div className="empty-text">暂无收购单</div>
                      </div>
                    )}
                    {tradingOrders.filter((order) => order.type === 'buy' && order.userId !== userId).length > 0 && (
                      <button
                        className="btn-quick-sell"
                        onClick={() => {
                          const buyOrders = tradingOrders
                            .filter((order) => order.type === 'buy' && order.userId !== userId)
                            .sort((a, b) => b.price - a.price)
                          if (buyOrders.length > 0) {
                            setSelectedOrder(buyOrders[0])
                            setPurchaseQuantity(1)
                            setShowPurchaseModal(true)
                          }
                        }}
                      >
                        <T1Art kind="ui" id="nav-trading" fallback="" alt="" /> 出售
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <MarketMyOrders
            nameOf={getItemNameById}
            refreshKey={marketRefreshKey}
            onChanged={() => {
              setMarketRefreshKey((k) => k + 1)
              void refreshPlayerState()
            }}
          />
        </>
      )}

      {/* 上架物品弹窗 */}
      {showSellModal && (
        <div className="modal-overlay" onClick={() => setShowSellModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              aria-label="关闭"
              onClick={() => setShowSellModal(false)}
            >
              ✕
            </button>
            <h3 className="modal-title">
              <T1Art kind="ui" id={orderType === 'sell' ? 'nav-trading' : 'nav-inventory'} fallback="" alt="" /> {orderType === 'sell' ? '挂出售单' : '挂收购单'}
              {selectedTradingItem && ` - ${getItemInfo(selectedTradingItem).name}`}
            </h3>
            <div className="sell-form">
              <div className="form-group">
                <label className="form-label">
                  <span>{orderType === 'sell' ? '出售数量' : '收购数量'}</span>
                  {selectedTradingItem && orderType === 'sell' && (
                    <span className="form-hint">（拥有 {playerState.inventory[selectedTradingItem] || 0}）</span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="form-input"
                    style={{ flex: 1 }}
                    min="1"
                    max={orderType === 'sell' && selectedTradingItem ? playerState.inventory[selectedTradingItem] || 0 : undefined}
                    value={sellQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      const maxQty =
                        orderType === 'sell' && selectedTradingItem
                          ? playerState.inventory[selectedTradingItem] || 0
                          : 999999
                      setSellQuantity(Math.max(1, Math.min(value, maxQty)))
                    }}
                  />
                  {orderType === 'sell' && selectedTradingItem && (
                    <button
                      type="button"
                      className="btn-max"
                      onClick={() => {
                        const maxQty = playerState.inventory[selectedTradingItem] || 0
                        setSellQuantity(Math.max(1, maxQty))
                      }}
                    >
                      最大
                    </button>
                  )}
                </div>
                {selectedTradingItem && (
                  <div className="sell-preset-chips">
                    {[1, 5, 10, 50].map((n) => {
                      const maxQty = orderType === 'sell' ? playerState.inventory[selectedTradingItem] || 1 : 999999
                      if (n > maxQty && n !== 1) return null
                      return (
                        <button
                          key={n}
                          type="button"
                          className={`qty-chip${sellQuantity === n ? ' active' : ''}`}
                          onClick={() => setSellQuantity(Math.min(maxQty, n))}
                        >
                          ×{n}
                        </button>
                      )
                    })}
                    {orderType === 'sell' && (playerState.inventory[selectedTradingItem] || 0) >= 4 && (
                      <button
                        type="button"
                        className="qty-chip"
                        onClick={() =>
                          setSellQuantity(Math.max(1, Math.floor((playerState.inventory[selectedTradingItem] || 0) / 2)))
                        }
                      >
                        半仓
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>单价（金币）</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Math.max(1, parseInt(e.target.value) || 1))}
                />
                {selectedTradingItem &&
                  (() => {
                    const asks = tradingOrders.filter((o) => o.type === 'sell').map((o) => o.price)
                    const bids = tradingOrders.filter((o) => o.type === 'buy').map((o) => o.price)
                    const shop = Number(contentPack?.items?.find((i: any) => i.id === selectedTradingItem)?.value || 0)
                    const bestAsk = asks.length ? Math.min(...asks) : 0
                    const bestBid = bids.length ? Math.max(...bids) : 0
                    return (
                      <div className="sell-preset-chips">
                        {shop > 0 && (
                          <button type="button" className="qty-chip" onClick={() => setSellPrice(Math.max(1, shop))}>
                            店价 {shop}
                          </button>
                        )}
                        {bestAsk > 0 && (
                          <button type="button" className="qty-chip" onClick={() => setSellPrice(Math.max(1, bestAsk))}>
                            最低卖 {bestAsk}
                          </button>
                        )}
                        {bestBid > 0 && (
                          <button type="button" className="qty-chip" onClick={() => setSellPrice(Math.max(1, bestBid))}>
                            最高买 {bestBid}
                          </button>
                        )}
                        <button
                          type="button"
                          className="qty-chip"
                          onClick={() => setSellPrice((p) => Math.max(1, Math.floor(p * 0.95)))}
                        >
                          -5%
                        </button>
                        <button
                          type="button"
                          className="qty-chip"
                          onClick={() => setSellPrice((p) => Math.max(1, Math.ceil(p * 1.05)))}
                        >
                          +5%
                        </button>
                      </div>
                    )
                  })()}
              </div>

              <div className="sell-summary">
                <div className="summary-row">
                  <span>总{orderType === 'sell' ? '价' : '金额'}</span>
                  <span className="summary-value gold">{sellQuantity * sellPrice} <GoldIcon /></span>
                </div>
                {orderType === 'sell' && (
                  <>
                    <div className="summary-row">
                      <span>手续费(5%)</span>
                      <span className="summary-value">{Math.floor(sellQuantity * sellPrice * 0.05)} <GoldIcon /></span>
                    </div>
                    <div className="summary-row total">
                      <span>实际收入</span>
                      <span className="summary-value gold">
                        {sellQuantity * sellPrice - Math.floor(sellQuantity * sellPrice * 0.05)} <GoldIcon />
                      </span>
                    </div>
                  </>
                )}
                {orderType === 'buy' && (
                  <div className="summary-row total">
                    <span>需要支付</span>
                    <span className="summary-value gold">{sellQuantity * sellPrice} <GoldIcon /></span>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  className="btn-action"
                  disabled={
                    Boolean(
                      (orderType === 'sell' &&
                        selectedTradingItem &&
                        sellQuantity > (playerState.inventory[selectedTradingItem] || 0)) ||
                        (orderType === 'buy' && sellQuantity * sellPrice > (playerState.inventory.gold || 0))
                    )
                  }
                  onClick={handleCreateOrder}
                >
                  确认挂单
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowSellModal(false)
                    setSellQuantity(1)
                    setSellPrice(10)
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 购买/出售弹窗 */}
      {showPurchaseModal && selectedOrder && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowPurchaseModal(false)
            setPurchaseQuantity(1)
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {selectedOrder.type === 'sell' ? <><GoldIcon /> 购买物品</> : <><T1Art kind="ui" id="nav-trading" fallback="" alt="" /> 出售物品</>}
              {selectedTradingItem && ` - ${getItemInfo(selectedTradingItem).name}`}
            </h3>
            <div className="sell-form">
              <div className="form-group">
                <label className="form-label">
                  <span>{selectedOrder.type === 'sell' ? '购买数量' : '出售数量'}</span>
                  <span className="form-hint">（订单数量 {selectedOrder.quantity}）</span>
                  {selectedOrder.type === 'buy' && selectedTradingItem && (
                    <span className="form-hint">（拥有 {playerState.inventory[selectedTradingItem] || 0}）</span>
                  )}
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max={
                    selectedOrder.type === 'buy' && selectedTradingItem
                      ? Math.min(selectedOrder.quantity, playerState.inventory[selectedTradingItem] || 0)
                      : selectedOrder.quantity
                  }
                  value={purchaseQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1
                    const maxQty =
                      selectedOrder.type === 'buy' && selectedTradingItem
                        ? Math.min(selectedOrder.quantity, playerState.inventory[selectedTradingItem] || 0)
                        : selectedOrder.quantity
                    setPurchaseQuantity(Math.max(1, Math.min(value, maxQty)))
                  }}
                />
              </div>

              <div className="sell-summary">
                <div className="summary-row">
                  <span>单价</span>
                  <span className="summary-value">{selectedOrder.price} <GoldIcon /></span>
                </div>
                {selectedOrder.type === 'buy' && (
                  <>
                    <div className="summary-row">
                      <span>总价</span>
                      <span className="summary-value gold">{purchaseQuantity * selectedOrder.price} <GoldIcon /></span>
                    </div>
                    <div className="summary-row">
                      <span>手续费(5%)</span>
                      <span className="summary-value">{Math.floor(purchaseQuantity * selectedOrder.price * 0.05)} <GoldIcon /></span>
                    </div>
                  </>
                )}
                <div className="summary-row total">
                  <span>{selectedOrder.type === 'sell' ? '总支付' : '实际收入'}</span>
                  <span className="summary-value gold">
                    {selectedOrder.type === 'sell'
                      ? purchaseQuantity * selectedOrder.price
                      : purchaseQuantity * selectedOrder.price -
                        Math.floor(purchaseQuantity * selectedOrder.price * 0.05)}{' '}
                    <GoldIcon />
                  </span>
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="btn-action"
                  disabled={
                    orderSubmitting ||
                    Boolean(
                      (selectedOrder.type === 'sell' &&
                        purchaseQuantity * selectedOrder.price > (playerState.inventory.gold || 0)) ||
                        (selectedOrder.type === 'buy' &&
                          selectedTradingItem &&
                          purchaseQuantity > (playerState.inventory[selectedTradingItem] || 0))
                    )
                  }
                  onClick={handleBuyOrder}
                >
                  {orderSubmitting ? '处理中...' : `确认${selectedOrder.type === 'sell' ? '购买' : '出售'}`}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowPurchaseModal(false)
                    setPurchaseQuantity(1)
                    setSelectedOrder(null)
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
