import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import './LoginScreen.css'

export default function LoginScreen() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [typedText, setTypedText] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 打字机效果
  useEffect(() => {
    const fullText = '多职业放置 RPG 系统'
    let index = 0
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(timer)
      }
    }, 80)
    return () => clearInterval(timer)
  }, [])

  // 粒子动画背景
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; color: string
    }> = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['rgba(212, 165, 116,', 'rgba(155, 127, 212,', 'rgba(255, 209, 102,', 'rgba(100, 200, 255,']
    
    // 初始化粒子
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        
        // 边界回弹
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        // 绘制粒子
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha})`
        ctx.fill()

        // 辉光效果
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha * 0.3})`
        ctx.fill()
      })

      // 绘制连线（距离近的粒子之间）
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(212, 165, 116, ${0.1 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const handleLogin = async () => {
    try {
      setErrorMsg('')
      setLoading(true)
      await login(deviceId || undefined)
    } catch (error) {
      setErrorMsg('登录失败，请检查网络后重试')
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
        {/* 头部 */}
        <div className="login-head">
          <div className="login-logo">W</div>
          <h1 className="login-title">WorkLife</h1>
          <p className="login-subtitle">
            {typedText}
            <span className="typewriter-cursor">|</span>
          </p>
          <div className="login-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        {/* 表单 */}
        <div className="login-field">
          <label className="login-label">
            <span>🔑</span>
            设备 ID（可选）
          </label>
          <input
            type="text"
            className="input"
            placeholder="留空自动生成唯一 ID"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          />
          <div className="login-hint">
            <span>💡</span>
            使用相同设备 ID 可以恢复之前的游戏进度
          </div>
        </div>

        <button
          className="btn btn-primary login-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading-spinner"></div>
              <span>登录中...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>开始游戏</span>
            </>
          )}
        </button>

        {errorMsg && (
          <div className="login-error" role="alert">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* 底部功能展示 */}
        <div className="login-features">
          <div className="login-feature">
            <div className="login-feature__icon">⚒️</div>
            <div className="login-feature__label">装备强化</div>
          </div>
          <div className="login-feature">
            <div className="login-feature__icon">🏪</div>
            <div className="login-feature__label">交易行</div>
          </div>
          <div className="login-feature">
            <div className="login-feature__icon">👥</div>
            <div className="login-feature__label">组队系统</div>
          </div>
        </div>

        <div className="login-foot">
          <p><span>✨</span>多职业放置 RPG 系统演示版</p>
          <p><span>🎮</span>包含装备强化、交易行、组队等功能</p>
        </div>
      </div>
    </div>
  )
}
