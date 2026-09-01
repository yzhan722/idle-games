import { useState, useEffect } from 'react'
import { apiClient } from '../services/api'
import { logger } from '../utils/logger'

interface TradingMarketPanelProps {
  playerState: any
  onRefresh: () => void
}

export function TradingMarketPanel({ playerState, onRefresh }: TradingMarketPanelProps) {
  const [activeView, setActiveView] = useState<'browse' | 'sell' | 'history'>('browse')
  const [listings, setListings] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 出售表单
  const [sellItemId, setSellItemId] = useState('')
  const [sellQuantity, setSellQuantity] = useState(1)
  const [sellPrice, setSellPrice] = useState(100)

  useEffect(() => {
    if (activeView === 'browse') {
      loadListings()
    }
  }, [activeView, searchQuery])

  const loadListings = async () => {
    try {
      const data = await apiClient.getMarketListings(searchQuery)
      setListings(data)
    } catch (error) {
      logger.error('Failed to load listings:', error)
    }
  }

  const handlePurchase = async (listingId: string, quantity: number) => {
    setLoading(true)
    setMessage('')

    try {
      const result = await apiClient.purchaseItem(listingId, quantity)
      
      if (result.success) {
        setMessage('✓ 购买成功！')
        await onRefresh()
        await loadListings()
      } else {
        setMessage(`✗ 购买失败：${result.message}`)
      }
    } catch (error: any) {
      setMessage(`✗ 错误：${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleListItem = async () => {
    if (!sellItemId || sellQuantity < 1 || sellPrice < 1) {
      setMessage('✗ 请填写完整信息')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await apiClient.listItemForSale(sellItemId, sellQuantity, sellPrice)
      setMessage('✓ 上架成功！')
      setSellItemId('')
      setSellQuantity(1)
      setSellPrice(100)
      await onRefresh()
    } catch (error: any) {
      setMessage(`✗ 错误：${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getPlayerItems = () => {
    const inventory = playerState?.inventory || {}
    return Object.entries(inventory)
      .filter(([id, qty]) => id !== 'gold' && (qty as number) > 0)
      .map(([id, qty]) => ({ id, quantity: qty as number }))
  }

  return (
    <div className="trading-market-panel">
      <h2>交易市场</h2>

      {/* 视图切换 */}
      <div className="view-tabs">
        <button
          className={activeView === 'browse' ? 'active' : ''}
          onClick={() => setActiveView('browse')}
        >
          浏览商品
        </button>
        <button
          className={activeView === 'sell' ? 'active' : ''}
          onClick={() => setActiveView('sell')}
        >
          出售物品
        </button>
        <button
          className={activeView === 'history' ? 'active' : ''}
          onClick={() => setActiveView('history')}
        >
          交易记录
        </button>
      </div>

      {/* 浏览商品 */}
      {activeView === 'browse' && (
        <div className="browse-view">
          <div className="search-bar">
            <input
              type="text"
              placeholder="搜索物品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="listings-grid">
            {listings.length === 0 ? (
              <p className="empty-message">暂无商品</p>
            ) : (
              listings.map((listing) => (
                <div key={listing.id} className="listing-card">
                  <div className="listing-header">
                    <h4>{listing.itemId}</h4>
                    <span className="quantity">x{listing.quantity}</span>
                  </div>
                  
                  <div className="listing-price">
                    <span className="price">{listing.pricePerUnit} 金币/个</span>
                    <span className="total">总价: {listing.pricePerUnit * listing.quantity}</span>
                  </div>
                  
                  <div className="listing-seller">
                    <small>卖家: {listing.sellerId.slice(0, 8)}...</small>
                  </div>
                  
                  <button
                    className="buy-button"
                    onClick={() => handlePurchase(listing.id, listing.quantity)}
                    disabled={loading}
                  >
                    购买
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 出售物品 */}
      {activeView === 'sell' && (
        <div className="sell-view">
          <div className="sell-form">
            <div className="form-group">
              <label>选择物品</label>
              <select
                value={sellItemId}
                onChange={(e) => setSellItemId(e.target.value)}
              >
                <option value="">-- 选择物品 --</option>
                {getPlayerItems().map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} (拥有: {item.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>数量</label>
              <input
                type="number"
                min="1"
                value={sellQuantity}
                onChange={(e) => setSellQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="form-group">
              <label>单价 (金币)</label>
              <input
                type="number"
                min="1"
                value={sellPrice}
                onChange={(e) => setSellPrice(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="form-summary">
              <p>总收入: {sellQuantity * sellPrice} 金币</p>
              <p>手续费 (5%): {Math.floor(sellQuantity * sellPrice * 0.05)} 金币</p>
              <p>实际获得: {Math.floor(sellQuantity * sellPrice * 0.95)} 金币</p>
            </div>

            <button
              className="list-button"
              onClick={handleListItem}
              disabled={loading || !sellItemId}
            >
              {loading ? '上架中...' : '上架出售'}
            </button>
          </div>
        </div>
      )}

      {/* 交易记录 */}
      {activeView === 'history' && (
        <div className="history-view">
          <p className="empty-message">交易记录功能开发中...</p>
        </div>
      )}

      {message && (
        <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <style>{`
        .trading-market-panel {
          padding: 20px;
        }

        .view-tabs {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }

        .view-tabs button {
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid transparent;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-tabs button:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .view-tabs button.active {
          border-color: #4CAF50;
          background: rgba(76, 175, 80, 0.2);
        }

        .search-bar {
          margin: 20px 0;
        }

        .search-bar input {
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 16px;
        }

        .listings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .listing-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 15px;
          transition: all 0.2s;
        }

        .listing-card:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .listing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .listing-header h4 {
          margin: 0;
          font-size: 1.1em;
        }

        .quantity {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.9em;
        }

        .listing-price {
          margin: 10px 0;
        }

        .price {
          display: block;
          font-size: 1.2em;
          color: #FFD700;
          font-weight: bold;
        }

        .total {
          display: block;
          font-size: 0.9em;
          color: #aaa;
          margin-top: 5px;
        }

        .listing-seller {
          margin: 10px 0;
          color: #aaa;
        }

        .buy-button {
          width: 100%;
          padding: 10px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }

        .buy-button:hover:not(:disabled) {
          background: #45a049;
          transform: translateY(-2px);
        }

        .buy-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sell-form {
          max-width: 500px;
          margin: 20px auto;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: white;
          font-size: 16px;
        }

        .form-summary {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
        }

        .form-summary p {
          margin: 5px 0;
        }

        .list-button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        }

        .list-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .list-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message {
          margin-top: 20px;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          font-weight: bold;
        }

        .message.success {
          background: rgba(76, 175, 80, 0.2);
          color: #4CAF50;
        }

        .message.error {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }

        .empty-message {
          text-align: center;
          color: #aaa;
          padding: 40px;
          font-size: 1.1em;
        }
      `}</style>
    </div>
  )
}
