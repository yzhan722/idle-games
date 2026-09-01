import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react'
import { apiClient } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { logger } from '../utils/logger'
import type { PlayerState } from '../types'

interface GameContextType {
  playerState: PlayerState | null
  loading: boolean
  error: Error | null
  refreshPlayerState: () => Promise<void>
  startLifeAction: (actionId: string, quantity?: number) => Promise<PlayerState | undefined>
  stopAction: () => Promise<void>
  startCombatFarm: (stageId: string) => Promise<void>
  clearError: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const refreshTimerRef = useRef<number | null>(null)
  const refreshInFlightRef = useRef(false)

  const clearError = useCallback(() => setError(null), [])

  const commitPlayerState = useCallback((state: PlayerState) => {
    // 直接更新状态。之前用 requestAnimationFrame 包裹，但 rAF 在后台标签页会被
    // 浏览器挂起/节流，对放置类游戏（玩家常切到后台挂机）是致命问题——会导致
    // 玩家状态永远不更新、界面卡在“加载中...”。React 18 已自动批处理，无需 rAF。
    setPlayerState(state)
    logger.debug('Player state updated')
  }, [])

  const refreshPlayerState = useCallback(async () => {
    if (!user || refreshInFlightRef.current) return
    refreshInFlightRef.current = true
    
    try {
      setError(null)
      logger.debug('Refreshing player state...')
      const response = await apiClient.get('/player/state')
      commitPlayerState(response)
    } catch (err) {
      logger.error('Failed to fetch player state:', err)
      const error = err instanceof Error ? err : new Error('获取玩家状态失败')
      setError(error)
    } finally {
      refreshInFlightRef.current = false
    }
  }, [user, commitPlayerState])

  const startLifeAction = useCallback(async (actionId: string, quantity?: number) => {
    if (!user) return

    try {
      setError(null)
      const response = await apiClient.post('/actions/start', { actionId, quantity })
      commitPlayerState(response)
      return response
    } catch (err) {
      logger.error('Failed to start life action:', err)
      const error = err instanceof Error ? err : new Error('开始动作失败')
      setError(error)
      throw error
    }
  }, [user, commitPlayerState])

  const stopAction = useCallback(async () => {
    if (!user) return
    
    try {
      setError(null)
      const response = await apiClient.post('/actions/stop', {})
      commitPlayerState(response)
    } catch (err) {
      logger.error('Failed to stop action:', err)
      const error = err instanceof Error ? err : new Error('停止动作失败')
      setError(error)
      throw error
    }
  }, [user, commitPlayerState])

  const startCombatFarm = useCallback(async (stageId: string) => {
    if (!user) return
    
    try {
      setError(null)
      const response = await apiClient.post('/combat/start', { stageId })
      setPlayerState(response)
    } catch (err) {
      logger.error('Failed to start combat farm:', err)
      const error = err instanceof Error ? err : new Error('开始战斗失败')
      setError(error)
      throw error
    }
  }, [user])

  useEffect(() => {
    logger.debug('User changed:', user?.id)
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    const POLL_INTERVAL = 15_000 // 15 秒

    // 启动/恢复轮询
    function startPolling() {
      if (refreshTimerRef.current) return
      refreshTimerRef.current = window.setInterval(() => {
        void refreshPlayerState()
      }, POLL_INTERVAL)
    }

    // 暂停轮询（切后台时调用，避免浪费流量和服务器资源）
    function stopPolling() {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }

    // 切回前台：立即刷新（让玩家马上看到挂机收益）并恢复定时轮询
    // 切到后台：暂停轮询
    const handleVisibility = () => {
      if (!user) return
      if (document.visibilityState === 'visible') {
        void refreshPlayerState()
        startPolling()
      } else {
        stopPolling()
      }
    }

    if (user) {
      setLoading(true)
      refreshPlayerState().finally(() => {
        setLoading(false)
      })
      startPolling()
      document.addEventListener('visibilitychange', handleVisibility)
    } else {
      setPlayerState(null)
      setLoading(false)
    }

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user, refreshPlayerState])

  const value = useMemo(() => ({
    playerState,
    loading,
    error,
    refreshPlayerState,
    startLifeAction,
    stopAction,
    startCombatFarm,
    clearError
  }), [playerState, loading, error, refreshPlayerState, startLifeAction, stopAction, startCombatFarm, clearError]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}