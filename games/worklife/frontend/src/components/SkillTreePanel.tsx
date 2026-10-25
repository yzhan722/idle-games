import { useState, useEffect } from 'react'
import { apiClient } from '../services/api'
import { logger } from '../utils/logger'

interface SkillTreePanelProps {
  playerState: any
  onRefresh: () => void
  currentProfession?: string
  onBack?: () => void
}

export function SkillTreePanel({ playerState: _playerState, onRefresh, currentProfession = 'woodcutter', onBack }: SkillTreePanelProps) {
  const [skillTree, setSkillTree] = useState<any>(null)
  const [skillProgress, setSkillProgress] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const professionNames: Record<string, { name: string; icon: string }> = {
    woodcutter: { name: '伐木工', icon: '🪓' },
    blacksmith: { name: '铁匠', icon: '⚒️' },
    farmer: { name: '农夫', icon: '🌾' },
    chef: { name: '厨师', icon: '👨‍🍳' },
    tailor: { name: '裁缝', icon: '🧵' },
    alchemist: { name: '炼金术师', icon: '⚗️' },
  }

  useEffect(() => {
    loadSkillData()
  }, [currentProfession])

  const loadSkillData = async () => {
    try {
      const [tree, progress] = await Promise.all([
        apiClient.getSkillTree(currentProfession),
        apiClient.getSkillProgress(currentProfession)
      ])
      setSkillTree(tree)
      setSkillProgress(progress)
    } catch (error) {
      logger.error('加载技能数据失败:', error)
    }
  }

  const handleUnlockNode = async (nodeId: string) => {
    if (loading) return
    setLoading(true)
    setMessage('')

    try {
      const result = await apiClient.unlockSkillNode(currentProfession, nodeId)
      
      if (result.success) {
        apiClient.clearCache()
        setMessage(`✓ 成功解锁技能节点！`)
        await onRefresh()
        await loadSkillData()
      } else {
        setMessage(`✗ 解锁失败：${result.message || '未知错误'}`)
      }
    } catch (error: any) {
      setMessage(`✗ 错误：${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const isNodeUnlocked = (nodeId: string) => {
    return skillProgress?.unlockedRecipes?.includes(nodeId) || false
  }

  const canUnlockNode = (node: any) => {
    if (!skillProgress) return false
    if (isNodeUnlocked(node.id)) return false
    if (skillProgress.level < (node.requirements?.level || 1)) return false
    const prereqs: string[] = node.requirements?.prerequisites || []
    if (prereqs.length > 0 && !prereqs.every((p) => isNodeUnlocked(p))) return false
    
    return true
  }

  const currentProfessionInfo = professionNames[currentProfession] || { name: '未知职业', icon: '❓' }
  const skillNodes = [...(skillTree?.skillNodes || [])].sort((a: any, b: any) => {
    const rank = (n: any) => {
      if (isNodeUnlocked(n.id)) return 1
      if (canUnlockNode(n)) return 0
      return 2
    }
    return rank(a) - rank(b)
  })
  const unlockableCount = skillNodes.filter((n: any) => canUnlockNode(n)).length

  return (
    <div className="skill-tree-panel">
      <div className="skill-tree-header">
        <div className="skill-tree-title-row">
          <h2>
            <span className="profession-icon">{currentProfessionInfo.icon}</span>
            {currentProfessionInfo.name}技能树
          </h2>
          {onBack && (
            <button type="button" className="skill-tree-back-btn" onClick={onBack}>
              ← 返回
            </button>
          )}
        </div>
      </div>

      {skillProgress && (
        <div className="skill-progress">
          <div className="progress-info">
            <span>综合等级：<strong>Lv.{skillProgress.level}</strong></span>
            {typeof skillProgress.gatherLevel === 'number' && typeof skillProgress.craftLevel === 'number' ? (
              <span>采集 <strong>Lv.{skillProgress.gatherLevel}</strong> · 生产 <strong>Lv.{skillProgress.craftLevel}</strong></span>
            ) : (
              <span>经验：<strong>{skillProgress.xp}</strong></span>
            )}
            <span>已解锁：<strong>{skillProgress.unlockedRecipes?.length || 0} / {skillNodes.length}</strong> 个节点</span>
          </div>
        </div>
      )}

      {unlockableCount > 0 && (
        <div className="page-info">
          <p>
            有 {unlockableCount} 个节点可以解锁
            {currentProfession === 'woodcutter' && !isNodeUnlocked('woodcutter_armor_crafting') ? '。先解锁「木制装备制作」才能做胸甲' : ''}
            。
          </p>
        </div>
      )}

      {skillTree && (
        <div className="skill-nodes">
          {skillNodes.map((node: any) => {
            const unlocked = isNodeUnlocked(node.id)
            const canUnlock = canUnlockNode(node)
            
            return (
              <div
                key={node.id}
                className={`skill-node ${unlocked ? 'unlocked' : ''} ${canUnlock ? 'available' : 'locked'}`}
              >
                <div className="node-body">
                  <div className="node-header">
                    <h4>{node.name}</h4>
                    <span className="node-level">Lv.{node.requirements.level}</span>
                  </div>
                  
                  <p className="node-description">{node.description}</p>
                  
                  {node.unlocks && (
                    <div className="unlocks">
                      {node.unlocks.recipes && (
                        <div><span>解锁配方：{node.unlocks.recipes.length} 个</span></div>
                      )}
                      {node.unlocks.actions && (
                        <div><span>解锁动作：{node.unlocks.actions.length} 个</span></div>
                      )}
                      {node.unlocks.enhancements && (
                        <div><span>解锁强化：{node.unlocks.enhancements.length} 个</span></div>
                      )}
                    </div>
                  )}
                </div>
                
                {!unlocked && canUnlock && (
                  <button
                    className="unlock-button"
                    onClick={() => handleUnlockNode(node.id)}
                    disabled={loading}
                  >
                    {loading ? '解锁中...' : '解锁节点'}
                  </button>
                )}
                
                {unlocked && (
                  <div className="unlocked-badge">✓ 已解锁</div>
                )}

                {!unlocked && !canUnlock && (
                  <div className="locked-badge">🔒 需达到 Lv.{node.requirements.level}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {message && (
        <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <style>{`
        .skill-tree-panel {
          max-width: 1080px;
          padding: 4px 0 24px;
        }

        .skill-tree-header {
          margin-bottom: 14px;
        }

        .skill-tree-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .skill-tree-header h2 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-family: var(--font-display);
          font-size: 22px;
          color: var(--text-primary);
        }

        .profession-icon {
          font-size: 22px;
          line-height: 1;
        }

        .skill-tree-back-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid var(--border-strong);
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .skill-tree-back-btn:hover {
          border-color: var(--brand-bright);
          background: rgba(212, 154, 72, 0.14);
        }

        .skill-progress {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 18px;
          margin: 0 0 14px;
        }

        .progress-info {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          font-size: 13px;
          color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
        }

        .progress-info strong {
          color: var(--brand-bright);
          font-weight: 600;
        }

        .skill-nodes {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 14px;
          margin-top: 14px;
        }

        .skill-node {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px;
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .skill-node.available {
          border-color: rgba(110, 197, 122, 0.65);
          background: linear-gradient(160deg, rgba(110, 197, 122, 0.12), var(--bg-surface));
        }

        .skill-node.unlocked {
          border-color: rgba(212, 154, 72, 0.6);
          background: linear-gradient(160deg, rgba(212, 154, 72, 0.12), var(--bg-surface));
        }

        .node-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .node-header h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .node-level {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .skill-node.unlocked .node-level {
          border-color: rgba(212, 154, 72, 0.45);
          color: var(--brand-bright);
        }

        .node-description {
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.5;
          margin: 6px 0 10px;
        }

        .unlocks {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .unlocks span {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 6px;
          background: var(--bg-base);
          border: 1px solid var(--border);
        }

        .unlock-button {
          width: 100%;
          padding: 9px 12px;
          background: linear-gradient(180deg, #5da868, #468a51);
          color: #fff;
          border: 1px solid rgba(143, 215, 154, 0.45);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          margin-top: auto;
          transition: filter 0.15s ease;
        }

        .unlock-button:hover:not(:disabled) {
          filter: brightness(1.08);
        }

        .unlock-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .unlocked-badge {
          text-align: center;
          color: var(--brand-bright);
          font-size: 13px;
          font-weight: 600;
          margin-top: auto;
          padding: 8px;
          background: rgba(212, 154, 72, 0.12);
          border: 1px solid rgba(212, 154, 72, 0.35);
          border-radius: 8px;
        }

        .locked-badge {
          text-align: center;
          color: var(--text-muted);
          font-size: 12.5px;
          font-weight: 500;
          margin-top: auto;
          padding: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border);
          border-radius: 8px;
        }

        .message {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 8px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
        }

        .message.success {
          background: rgba(110, 197, 122, 0.15);
          border: 1px solid rgba(110, 197, 122, 0.4);
          color: #8fd79a;
        }

        .message.error {
          background: rgba(224, 97, 78, 0.15);
          border: 1px solid rgba(224, 97, 78, 0.4);
          color: #f0b6a4;
        }
      `}</style>
    </div>
  )
}
