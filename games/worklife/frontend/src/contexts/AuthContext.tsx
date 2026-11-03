import { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { apiClient } from '../services/api'
import { logger } from '../utils/logger'

interface User {
  id: string
  token: string
  username?: string
  /** 历史恢复凭证字段（兼容保留） */
  resumeToken?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (deviceId?: string) => Promise<void>
  /** 账号密码登录 */
  loginAccount: (username: string, password: string) => Promise<void>
  /** 账号密码注册 */
  registerAccount: (username: string, password: string) => Promise<void>
  /** 写入一个新会话 */
  applySession: (response: { userId: string; token: string; username?: string; resumeToken?: string }) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export { AuthContext }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const restoreSession = async () => {
      const savedUser = localStorage.getItem('worklife_user')
      if (!savedUser) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const userData = JSON.parse(savedUser)
        if (userData?.token && userData?.username) {
          apiClient.setToken(userData.token)
          if (!cancelled) {
            setUser(userData)
            setLoading(false)
          }
          return
        }
        if (userData?.token) {
          apiClient.setToken(userData.token)
          try {
            const me = await apiClient.get<{ userId: string; username?: string | null }>('/auth/me')
            if (me?.userId) {
              const hydrated: User = {
                id: me.userId || userData.id,
                token: userData.token,
                username: me.username || userData.username || undefined,
              }
              localStorage.setItem('worklife_user', JSON.stringify(hydrated))
              if (!cancelled) {
                setUser(hydrated)
                setLoading(false)
              }
              return
            }
          } catch (err: any) {
            if (err?.status !== 401) {
              if (!cancelled) {
                setUser(userData)
                setLoading(false)
              }
              return
            }
          }
          apiClient.setToken('')
        }
        localStorage.removeItem('worklife_user')
      } catch (error) {
        logger.error('Failed to parse saved user data:', error)
        localStorage.removeItem('worklife_user')
      }
      if (!cancelled) setLoading(false)
    }
    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const persistSession = useCallback((response: { userId: string; token: string; username?: string; resumeToken?: string }) => {
    const prev = localStorage.getItem('worklife_user')
    const prevParsed = (() => {
      try { return prev ? JSON.parse(prev) : undefined } catch { return undefined }
    })()
    const resumeToken = response.resumeToken || prevParsed?.resumeToken
    const userData: User = {
      id: response.userId,
      token: response.token,
      username: response.username || prevParsed?.username,
      ...(resumeToken ? { resumeToken } : {}),
    }
    if (resumeToken) {
      localStorage.setItem('worklife_guest_resume_token', resumeToken)
      localStorage.setItem('guest_resume_token', resumeToken)
    }
    apiClient.setToken(userData.token)
    localStorage.setItem('worklife_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const login = useCallback(async (_deviceId?: string) => {
    throw new Error('请使用账号密码注册或登录')
  }, [])

  // 注意：loginAccount 与 registerAccount 严禁翻转顶层 loading（否则 AppContent 会卸载 LoginScreen 导致报错信息与当前 Tab 丢失）
  const loginAccount = useCallback(async (username: string, password: string) => {
    const trimmed = username.trim()
    const res = await apiClient.post('/auth/login', { username: trimmed, password })
    persistSession({ ...res, username: res?.username || trimmed })
  }, [persistSession])

  const registerAccount = useCallback(async (username: string, password: string) => {
    const trimmed = username.trim()
    const res = await apiClient.post('/auth/register', { username: trimmed, password })
    persistSession({ ...res, username: res?.username || trimmed })
  }, [persistSession])

  const logout = useCallback(() => {
    void apiClient.post('/auth/logout', {}).catch(() => {})
    setUser(null)
    apiClient.setToken('')
    localStorage.removeItem('worklife_user')
    localStorage.removeItem('worklife_guest_resume_token')
    localStorage.removeItem('guest_resume_token')
  }, [])

  // 注册全局 401 处理：会话失效时回到账号登录页
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
    loginAccount,
    registerAccount,
    applySession: persistSession,
    logout
  }), [user, loading, login, loginAccount, registerAccount, persistSession, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
