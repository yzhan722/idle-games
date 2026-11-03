import { lazy, Suspense } from 'react'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { GameProvider } from './contexts/GameContext'
import { ToastProvider } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAuth } from './hooks/useAuth'

// 代码分割：按需加载登录页和游戏主界面，减少首屏 bundle 体积
const LoginScreen = lazy(() => import('./components/LoginScreen'))
const NewGameInterface = lazy(() => import('./components/NewGameInterface'))

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

function AppContent() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingFallback />
  }
  
  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginScreen />
      </Suspense>
    )
  }
  
  return (
    <GameProvider key={user.id}>
      <Suspense fallback={<LoadingFallback />}>
        <NewGameInterface />
      </Suspense>
    </GameProvider>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
