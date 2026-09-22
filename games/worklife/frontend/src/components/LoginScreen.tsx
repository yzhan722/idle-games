import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import './LoginScreen.css'

export default function LoginScreen() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const typedText = '多职业放置 RPG'
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    const colors = ["rgba(212, 154, 72,", "rgba(232, 196, 150,", "rgba(122, 158, 92,"];

    for (let i = 0; i < 18; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        size: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.22 + 0.08,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
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
      })

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
        <div className="login-head">
          <p className="login-kicker">异世界の</p>
          <h1 className="login-title">打工生活</h1>
          <p className="login-subtitle">{typedText}</p>
          <p className="login-tagline">
            穿越到异世界，没有金手指，只有一把斧头和一片林子。先砍一棵树，把今天的工钱挣出来。
          </p>
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="device-id">
            设备 ID（可选）
          </label>
          <input
            id="device-id"
            type="text"
            className="input"
            placeholder="留空则生成本机存档"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          />
          <p className="login-hint">同一设备 ID 可找回进度</p>
        </div>

        <button className="btn btn-primary login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? (
            <>
              <div className="loading-spinner"></div>
              <span>进入中...</span>
            </>
          ) : (
            <span>开始打工</span>
          )}
        </button>

        {errorMsg && (
          <div className="login-error" role="alert">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  )
}
