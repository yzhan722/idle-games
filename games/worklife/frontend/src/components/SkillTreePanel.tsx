import { useState, useEffect } from 'react'
import { apiClient } from '../services/api'
import { logger } from '../utils/logger'

interface SkillTreePanelProps {
  playerState: any
  onRefresh: () => void
  currentProfession?: string
}

export function SkillTreePanel({ playerState: _playerState, onRefresh, currentProfession = 'woodcutter' }: SkillTreePanelProps) {
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
    setLoading(true)
    setMessage('')

    try {
      const result = await apiClient.unlockSkillNode(currentProfession, nodeId)
      
      if (result.success) {
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
    if (skillProgress.level < node.requirements.level) return false
    
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
        <h2>{currentProfessionInfo.name}技能树</h2>
      </div>

      {skillProgress && (
        <div className="skill-progress">
          <div className="progress-info">
            <span>等级：{skillProgress.level}</span>
            <span>经验：{skillProgress.xp}</span>
            <span>已解锁：{skillProgress.unlockedRecipes?.length || 0} 个节点</span>
          </div>
        </div>
      )}

      {unlockableCount > 0 && (
        <div className="page-info">
          <p>
            有 {unlockableCount} 个节点可以解锁
            {!isNodeUnlocked('woodcutter_armor_crafting') ? '。先解锁「木制装备制作」才能做胸甲' : ''}
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
                className={`skill-node ${unlocked ? 'unlocked' : ''} ${canUnlock ? 'available' : ''}`}
              >
                <div className="node-header">
                  <h4>{node.name}</h4>
                  <span className="node-level">Lv.{node.requirements.level}</span>
                </div>
                
                <p className="node-description">{node.description}</p>
                
                {node.unlocks && (
                  <div className="unlocks">
                    {node.unlocks.recipes && (
                      <div><small>解锁配方：{node.unlocks.recipes.length} 个</small></div>
                    )}
                    {node.unlocks.actions && (
                      <div><small>解锁动作：{node.unlocks.actions.length} 个</small></div>
                    )}
                    {node.unlocks.enhancements && (
                      <div><small>解锁强化：{node.unlocks.enhancements.length} 个</small></div>
                    )}
                  </div>
                )}
                
                {!unlocked && canUnlock && (
                  <button
                    className="unlock-button"
                    onClick={() => handleUnlockNode(node.id)}
                    disabled={loading}
                  >
                    {loading ? '解锁中...' : '解锁'}
                  </button>
                )}
                
                {unlocked && (
                  <div className="unlocked-badge">✓ 已解锁</div>
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
          padding: 20px;
        }

        .skill-tree-header {
          margin-bottom: 20px;
        }

        .skill-tree-header h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.8em;
          color: #fff;
        }

        .profession-icon {
          font-size: 1.2em;
        }

        .skill-progress {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
        }

        .progress-info {
          display: flex;
          justify-content: space-around;
          gap: 20px;
        }

        .progress-info span {
          font-weight: bold;
        }

        .skill-nodes {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .skill-node {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 15px;
          transition: all 0.3s;
        }

        .skill-node.available {
          border-color: #4CAF50;
          background: rgba(76, 175, 80, 0.1);
        }

        .skill-node.unlocked {
          border-color: #FFD700;
          background: rgba(255, 215, 0, 0.1);
        }

        .node-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .node-header h4 {
          margin: 0;
        }

        .node-level {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.9em;
        }

        .node-description {
          color: #ccc;
          font-size: 0.9em;
          margin: 10px 0;
        }

        .unlocks {
          margin-top: 10px;
          font-size: 0.85em;
          color: #aaa;
        }

        .unlock-button {
          width: 100%;
          padding: 8px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 10px;
          transition: all 0.2s;
        }

        .unlock-button:hover:not(:disabled) {
          background: #45a049;
          transform: translateY(-2px);
        }

        .unlock-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .unlocked-badge {
          text-align: center;
          color: #FFD700;
          font-weight: bold;
          margin-top: 10px;
          padding: 8px;
          background: rgba(255, 215, 0, 0.1);
          border-radius: 6px;
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
      `}</style>
    </div>
  )
}
