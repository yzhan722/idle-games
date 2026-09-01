import { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { apiClient } from '../services/api'
import { logger } from '../utils/logger'

interface User {
  id: string
  token: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (deviceId?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export { AuthContext }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查本地存储的认证信息
    const savedUser = localStorage.getItem('worklife_user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        apiClient.setToken(userData.token)
      } catch (error) {
        logger.error('Failed to parse saved user data:', error)
        localStorage.removeItem('worklife_user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (deviceId?: string) => {
    try {
      setLoading(true)
      const persistedDeviceId = deviceId || localStorage.getItem('worklife_device_id') || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('worklife_device_id', persistedDeviceId)
      const response = await apiClient.post('/auth/guest', {
        deviceId: persistedDeviceId
      })
      
      const userData = {
        id: response.userId,
        token: response.token
      }
      
      setUser(userData)
      apiClient.setToken(userData.token)
      localStorage.setItem('worklife_user', JSON.stringify(userData))
    } catch (error) {
      logger.error('Login failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    apiClient.setToken('')
    localStorage.removeItem('worklife_user')
    // 保留 worklife_device_id，便于下次以同一访客身份恢复存档
  }, [])

  // 注册全局 401 处理：token 失效时自动登出，避免卡在游戏界面无限重试
  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => {
      setUser(null)
      apiClient.setToken('')
      localStorage.removeItem('worklife_user')
    })
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout
  }), [user, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

