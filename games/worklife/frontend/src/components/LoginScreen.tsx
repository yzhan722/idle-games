import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { T1Art } from './T1Art'
import './LoginScreen.css'

export default function LoginScreen() {
  const { loginAccount, registerAccount } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const typedText = '奇幻放置冒险与生活工坊 RPG'
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    document.title = '异世界の打工生活 · 奇幻放置冒险与工坊 RPG'
  }, [])

  // 粒子动画背景
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; color: string
    }> = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['rgba(212, 154, 72,', 'rgba(232, 196, 150,', 'rgba(122, 158, 92,']

    for (let i = 0; i < 18; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        size: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.22 + 0.08,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const mapAuthError = (err: unknown, fallback: string) => {
    const e = err as { code?: string; status?: number; message?: string }
    const code = e?.code || ''
    if (code === 'user_not_found') return '该账号尚未注册，请点击下方按钮直接注册，或切换到「注册账号」'
    if (code === 'invalid_credentials') return '密码不正确，请核对密码后重试'
    if (code === 'username_taken') return '该账号名已被注册，如果是你的账号请直接切换到「账号登录」'
    if (code === 'username_invalid') return '账号名长度需为 1-32 个字符'
    if (code === 'password_invalid') return '密码长度至少需要 4 位字符'
    if (e?.message && !e.message.startsWith('HTTP ')) return e.message
    return fallback
  }

  const handleSubmit = async (overrideMode?: 'login' | 'register') => {
    const activeMode = overrideMode || tab
    const trimmed = username.trim()
    if (!trimmed || !password) {
      setErrorCode('')
      setErrorMsg('请输入账号和密码')
      return
    }
    if (trimmed.length < 1 || trimmed.length > 32) {
      setErrorCode('username_invalid')
      setErrorMsg('账号名长度需为 1-32 个字符')
      return
    }
    if (password.length < 4) {
      setErrorCode('password_invalid')
      setErrorMsg('密码长度至少需要 4 位字符')
      return
    }
    if (activeMode === 'register' && !overrideMode && confirmPassword !== password) {
      setErrorCode('')
      setErrorMsg('两次输入的密码不一致')
      return
    }
    try {
      setErrorMsg('')
      setErrorCode('')
      setLoading(true)
      if (activeMode === 'login') {
        await loginAccount(trimmed, password)
      } else {
        await registerAccount(trimmed, password)
      }
    } catch (error) {
      const code = (error as { code?: string })?.code || ''
      setErrorCode(code)
      setErrorMsg(mapAuthError(error, activeMode === 'login' ? '登录失败，请检查账号密码' : '注册失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      {/* 粒子动画背景 */}
      <canvas ref={canvasRef} className="login-particles-canvas" />

      {/* 背景装饰 */}
      <div className="login-bg">
        <div className="login-orb login-orb--brand"></div>
        <div className="login-orb login-orb--purple"></div>
        <div className="login-orb login-orb--gold"></div>
      </div>

      <div className="login-card">
        <div className="login-head">
          <div className="login-crest" aria-hidden="true">
            <T1Art kind="ui" id="logo" alt="" />
          </div>
          <p className="login-kicker">异世界の</p>
          <h1 className="login-title">打工生活</h1>
          <p className="login-subtitle">{typedText}</p>
          <p className="login-tagline">
            穿越到异世界，没有金手指，只有一把斧头和一片林子。先砍一棵树，把今天的工钱挣出来。
          </p>
        </div>

        <div className="login-mode-tabs" role="tablist" aria-label="登录或注册">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={`login-mode-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrorMsg(''); setErrorCode('') }}
          >
            账号登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'register'}
            className={`login-mode-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrorMsg(''); setErrorCode('') }}
          >
            注册账号
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <div className="login-field">
            <label className="login-label" htmlFor="username">账号</label>
            <input
              id="username"
              type="text"
              className="input"
              placeholder="输入账号名（支持中文、字母、数字、邮箱等）"
              autoComplete="username"
              maxLength={32}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="输入密码（至少 4 位字符）"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {tab === 'register' && (
            <div className="login-field">
              <label className="login-label" htmlFor="confirm-password">确认密码</label>
              <input
                id="confirm-password"
                type="password"
                className="input"
                placeholder="再次输入密码以确认"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? (tab === 'login' ? '登录中...' : '注册并进入中...') : (tab === 'login' ? '登录进入游戏' : '立即注册并开始打工')}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                setTab(tab === 'login' ? 'register' : 'login')
                setErrorMsg('')
                setErrorCode('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--border-brand, #d9a04a)',
                fontSize: 13,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 4,
              }}
            >
              {tab === 'login' ? '还没有账号？点此 10 秒免费注册' : '已有账号？点此直接登录'}
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="login-error" role="alert">
            <div>{errorMsg}</div>
            {errorCode === 'user_not_found' && tab === 'login' && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 8, width: '100%', fontSize: 13, padding: '8px 12px' }}
                disabled={loading}
                onClick={() => {
                  setConfirmPassword(password)
                  setTab('register')
                  void handleSubmit('register')
                }}
              >
                ✨ 立即用当前填写的账号密码直接注册并进入游戏
              </button>
            )}
            {errorCode === 'username_taken' && tab === 'register' && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 8, width: '100%', fontSize: 13, padding: '8px 12px' }}
                disabled={loading}
                onClick={() => {
                  setTab('login')
                  void handleSubmit('login')
                }}
              >
                🔑 切换到「账号登录」并用当前密码登录
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
