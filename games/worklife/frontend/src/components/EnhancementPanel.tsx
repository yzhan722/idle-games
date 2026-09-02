import { useState, useEffect } from 'react'
import { apiClient } from '../services/api'
import { logger } from '../utils/logger'
import { getItemName } from '../utils/itemNames'

const SLOT_LABEL: Record<string, string> = {
  main_hand: '主手',
  off_hand: '副手',
  head: '帽子',
  chest: '上衣',
  legs: '裤子',
  feet: '鞋子',
  accessory1: '饰品',
  accessory2: '饰品',
}

interface EnhancementPanelProps {
  playerState: any
  onRefresh: () => void
}

export function EnhancementPanel({ playerState, onRefresh }: EnhancementPanelProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [enhancementInfo, setEnhancementInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 获取可强化的装备
  const getEnhanceableItems = () => {
    const items: any[] = []
    const equipment = playerState?.equipment || {}
    
    Object.entries(equipment).forEach(([slot, itemId]) => {
      if (itemId && typeof itemId === 'string' && 
          slot !== 'enhancementLevels' && 
          slot !== 'durability' && 
          slot !== 'maxDurability') {
        const currentLevel = equipment.enhancementLevels?.[itemId] || 0
        items.push({
          slot,
          itemId,
          currentLevel,
          name: getItemName(itemId)
        })
      }
    })
    
    return items
  }

  const loadEnhancementInfo = async (itemId: string) => {
    try {
      const info = await apiClient.getEnhancementInfo(itemId)
      setEnhancementInfo(info)
    } catch (error) {
      logger.error('Failed to load enhancement info:', error)
      setEnhancementInfo(null)
    }
  }

  useEffect(() => {
    if (selectedItem) {
      loadEnhancementInfo(selectedItem)
    }
  }, [selectedItem])

  const handleEnhance = async () => {
    if (!selectedItem || !enhancementInfo) return

    setLoading(true)
    setMessage('')

    try {
      const result = await apiClient.enhanceEquipment(
        selectedItem,
        enhancementInfo.currentLevel + 1
      )

      if (result.success) {
        setMessage(`✓ 强化成功！${selectedItem} 现在是 +${result.newLevel}`)
        await onRefresh()
        await loadEnhancementInfo(selectedItem)
      } else {
        setMessage(`✗ 强化失败：${result.failureReason || '未知错误'}`)
      }
    } catch (error: any) {
      setMessage(`✗ 错误：${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const items = getEnhanceableItems()

  return (
    <div className="enhancement-panel">
      <h2>装备强化</h2>
      
      <div className="enhancement-layout">
        {/* 装备列表 */}
        <div className="equipment-list">
          <h3>可强化装备</h3>
          {items.length === 0 ? (
            <p className="empty-message">没有可强化的装备</p>
          ) : (
            <div className="item-grid">
              {items.map((item) => (
                <div
                  key={item.itemId}
                  className={`equipment-card ${selectedItem === item.itemId ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(item.itemId)}
                >
                  <div className="item-name">{item.name}</div>
                  <div className="item-slot">{SLOT_LABEL[item.slot] || item.slot}</div>
                  <div className="item-level">+{item.currentLevel}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 强化详情 */}
        <div className="enhancement-details">
          {selectedItem && enhancementInfo ? (
            <>
              <h3>强化信息</h3>
              <div className="info-section">
                <div className="info-row">
                  <span>当前等级：</span>
                  <span>+{enhancementInfo.currentLevel}</span>
                </div>
                <div className="info-row">
                  <span>最大等级：</span>
                  <span>+{enhancementInfo.maxLevel}</span>
                </div>
                <div className="info-row">
                  <span>成功率：</span>
                  <span>{(enhancementInfo.successRate * 100).toFixed(1)}%</span>
                </div>
              </div>

              {enhancementInfo.canEnhance && (
                <>
                  <h4>所需材料</h4>
                  <div className="materials-list">
                    {Object.entries(enhancementInfo.nextLevelCost).map(([itemId, qty]: [string, any]) => (
                      <div key={itemId} className="material-item">
                        <span>{getItemName(itemId)}</span>
                        <span>x{qty}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    className="enhance-button"
                    onClick={handleEnhance}
                    disabled={loading}
                  >
                    {loading ? '强化中...' : `强化到 +${enhancementInfo.currentLevel + 1}`}
                  </button>
                </>
              )}

              {!enhancementInfo.canEnhance && (
                <p className="warning-message">
                  {enhancementInfo.currentLevel >= enhancementInfo.maxLevel
                    ? '已达到最大强化等级'
                    : `需要 ${enhancementInfo.requiredProfession} 职业的强化技能`}
                </p>
              )}

              {message && (
                <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}
            </>
          ) : (
            <p className="empty-message">请选择要强化的装备</p>
          )}
        </div>
      </div>

      <style>{`
        .enhancement-panel {
          padding: 20px;
        }

        .enhancement-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }

        .equipment-list, .enhancement-details {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 15px;
        }

        .item-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
          margin-top: 10px;
        }

        .equipment-card {
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid transparent;
          border-radius: 6px;
          padding: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .equipment-card:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .equipment-card.selected {
          border-color: #4CAF50;
          background: rgba(76, 175, 80, 0.2);
        }

        .item-name {
          font-weight: bold;
          margin-bottom: 5px;
          text-transform: capitalize;
        }

        .item-slot {
          font-size: 0.9em;
          color: #aaa;
        }

        .item-level {
          font-size: 1.2em;
          color: #FFD700;
          margin-top: 5px;
        }

        .info-section {
          margin: 15px 0;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .materials-list {
          margin: 10px 0;
        }

        .material-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          margin-bottom: 5px;
        }

        .enhance-button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 15px;
          transition: all 0.3s;
        }

        .enhance-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .enhance-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message {
          margin-top: 15px;
          padding: 10px;
          border-radius: 6px;
          text-align: center;
        }

        .message.success {
          background: rgba(76, 175, 80, 0.2);
          color: #4CAF50;
        }

        .message.error {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }

        .empty-message, .warning-message {
          text-align: center;
          color: #aaa;
          padding: 20px;
        }

        .warning-message {
          color: #ff9800;
        }
      `}</style>
    </div>
  )
}
