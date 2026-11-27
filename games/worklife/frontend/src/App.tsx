import type { ComponentType } from 'react'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { GameProvider } from './contexts/GameContext'
import { ToastProvider } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LegalPage } from './components/LegalPage'
import { lazyComponent } from './components/lazyPanel'
import { useAuth } from './hooks/useAuth'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <h1 className="login-title text-2xl mb-2">WorkLife</h1>
        <p className="text-secondary">加载中...</p>
      </div>
    </div>
  )
}

function LoadFailed({ retry }: { retry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="login-title text-2xl mb-2">没加载出来</h1>
        <p className="text-secondary mb-4">看看网络，再试一次</p>
        <button type="button" className="btn-primary" onClick={retry}>重试</button>{' '}
        <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>刷新页面</button>
      </div>
    </div>
  )
}

// 代码分割：按需加载登录页和游戏主界面，减少首屏 bundle 体积；取不到会自动重试，发了新版本就整页刷新
const screenView = {
  autoReload: true,
  loading: () => <LoadingFallback />,
  failed: (_props: object, retry: () => void) => <LoadFailed retry={retry} />,
}
const LoginScreen: ComponentType = lazyComponent(() => import('./components/LoginScreen'), screenView)
const NewGameInterface: ComponentType = lazyComponent(() => import('./components/NewGameInterface'), screenView)

function AppContent() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingFallback />
  }
  
  if (!user) {
    return <LoginScreen />
  }
  
  return (
    <GameProvider key={user.id}>
      <NewGameInterface />
    </GameProvider>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
          <LegalPage />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
