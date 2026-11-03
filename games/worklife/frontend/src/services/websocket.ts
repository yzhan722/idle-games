/**
 * WebSocket 聊天客户端
 * 负责与后端 /ws 端点建立 WebSocket 连接，处理聊天消息的收发。
 * 
 * 协议：
 *   发送：{ type: "chat:send", channel: string, content: string }
 *   接收：{ type: "chat:message", channel, sender, senderProfession, ts, content }
 *         { type: "chat:system", channel, ts, text }
 *         { type: "chat:error", message, ts }
 *         { type: "notify", kind, ts, ...payload }   — 市场/强化/组队等定向通知
 *         { type: "party:event", event, ts, ... }  — 队伍频道广播事件
 */

/** 服务端定向通知 / 队伍频道事件的统一形状。 */
export interface NotifyMsg {
  kind: string
  ts: string
  [key: string]: unknown
}

export interface ChatMsg {
  id: string
  type: 'message' | 'system' | 'error'
  channel: string
  sender: string
  senderName?: string
  senderProfession?: string
  content: string
  ts: string
  isSelf?: boolean
}

type MsgListener = (msg: ChatMsg) => void
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void
type NotifyListener = (msg: NotifyMsg) => void

class ChatWebSocket {
  private ws: WebSocket | null = null
  private token: string = ''
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseDelay = 1000
  private msgListeners: Set<MsgListener> = new Set()
  private statusListeners: Set<StatusListener> = new Set()
  private notifyListeners: Set<NotifyListener> = new Set()
  private _status: 'connecting' | 'connected' | 'disconnected' = 'disconnected'
  private intentionalClose = false
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null

  get status() { return this._status }

  /**
   * 建立连接
   */
  connect(token: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      // 已连接或正在连接中
      if (this.token === token) return
      // token 变了，立刻断开再重连（不走延迟断开，避免误伤新 socket）
      this.intentionalClose = true
      this._closeNow()
      this.intentionalClose = false
    }

    // 取消了尚未生效的延迟断开（组件卸载→快速重挂载的场景，如 React StrictMode）
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = null
    }
    this.token = token
    this.intentionalClose = false
    this._connect()
  }

  /**
   * 主动断开。延迟 ~1s 生效：StrictMode 双挂载、路由快速切换会立刻再 connect，
   * 延迟可让 socket 存活并复用，避免"建连即断"的握手浪费。
   */
  disconnect() {
    this.intentionalClose = true
    this.reconnectAttempts = 0
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer)
    }
    this.disconnectTimer = setTimeout(() => {
      this.disconnectTimer = null
      if (!this.intentionalClose) return // 期间又被 connect 复活
      this._closeNow()
    }, 1000)
  }

  private _closeNow() {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  /**
   * 发送聊天消息。channel 'private' 需要 recipient（对方 userId）。
   */
  send(channel: string, content: string, recipient?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify({ type: 'chat:send', channel, content, ...(recipient ? { recipient } : {}) }))
    return true
  }

  /**
   * 监听消息
   */
  onMessage(listener: MsgListener): () => void {
    this.msgListeners.add(listener)
    return () => { this.msgListeners.delete(listener) }
  }

  /**
   * 监听服务端定向通知（notify）与频道事件（party:event 等）
   */
  onNotify(listener: NotifyListener): () => void {
    this.notifyListeners.add(listener)
    return () => { this.notifyListeners.delete(listener) }
  }

  /**
   * 监听连接状态
   */
  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener)
    // 立即通知当前状态
    listener(this._status)
    return () => { this.statusListeners.delete(listener) }
  }

  // =========== 内部方法 ===========

  private _connect() {
    this.setStatus('connecting')

    // 构建 WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // 后端 WebSocket 在 /ws 路径上（不经过 /api 前缀），但开发环境下 Vite 代理可能配了 /api
    // 生产环境：nginx 已将 /ws 代理到 backend:3001/ws
    // 开发环境：直接连 localhost:3001/ws
    let wsUrl: string
    // token 走连接后的首条 auth 消息，不进 URL —— query 里的 JWT 会落 nginx/access log
    if (import.meta.env.VITE_API_URL) {
      // 生产环境或自定义后端地址
      const apiUrl = String(import.meta.env.VITE_API_URL).replace(/^http/, 'ws').replace(/\/$/, '')
      wsUrl = `${apiUrl}/ws`
    } else {
      // 开发走 Vite 代理 /ws；生产同域 nginx /ws
      wsUrl = `${protocol}//${window.location.host}/ws`
    }

    let socket: WebSocket
    try {
      socket = new WebSocket(wsUrl)
    } catch {
      this.setStatus('disconnected')
      this.scheduleReconnect()
      return
    }
    this.ws = socket

    socket.onopen = () => {
      if (this.ws !== socket) return
      // 首条消息即认证：服务端 5s 内收不到有效 auth 会断开。
      // 收到 auth:ok 前不算 connected，避免"已连接但发言全丢"。
      socket.send(JSON.stringify({ type: 'auth', token: this.token }))
    }

    socket.onmessage = (event) => {
      if (this.ws !== socket) return
      try {
        const data = JSON.parse(event.data)
        if (data?.type === 'auth:ok') {
          this.reconnectAttempts = 0
          this.setStatus('connected')
          return
        }
        const notify = this.parseNotifyMessage(data)
        if (notify) {
          for (const listener of this.notifyListeners) {
            listener(notify)
          }
          return
        }
        const msg = this.parseServerMessage(data)
        if (msg) {
          for (const listener of this.msgListeners) {
            listener(msg)
          }
        }
      } catch {
        // 忽略无法解析的消息
      }
    }

    socket.onclose = () => {
      // 旧 socket 关闭不得清掉新连接（token 变更换号场景）
      if (this.ws !== socket) return
      this.ws = null
      this.setStatus('disconnected')
      if (!this.intentionalClose) {
        this.scheduleReconnect()
      }
    }

    socket.onerror = () => {
      // onerror 之后会触发 onclose，这里不需要额外处理
    }
  }

  private parseNotifyMessage(data: any): NotifyMsg | null {
    if (!data || typeof data.type !== 'string') return null
    if (data.type === 'notify' && typeof data.kind === 'string') {
      return { kind: data.kind, ts: data.ts || new Date().toISOString(), ...data }
    }
    if (data.type === 'party:event' && typeof data.event === 'string') {
      return { kind: `party:${data.event}`, ts: data.ts || new Date().toISOString(), ...data }
    }
    return null
  }

  private parseServerMessage(data: any): ChatMsg | null {
    if (!data || !data.type) return null

    if (data.type === 'chat:message') {
      return {
        id: `${data.ts}_${data.sender}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'message',
        channel: data.channel || 'world',
        sender: data.sender || '未知',
        senderName: data.senderName,
        senderProfession: data.senderProfession,
        content: data.content || '',
        ts: data.ts || new Date().toISOString(),
        isSelf: data.isSelf || false,
      }
    }

    if (data.type === 'chat:system') {
      return {
        id: `sys_${data.ts}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'system',
        channel: data.channel || 'world',
        sender: '系统',
        content: data.text || '',
        ts: data.ts || new Date().toISOString(),
      }
    }

    if (data.type === 'chat:error') {
      return {
        id: `err_${data.ts}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'error',
        // 用服务端附的频道归属，限频/私聊错误不再全堆到世界频道
        channel: typeof data.channel === 'string' ? data.channel : 'world',
        sender: '系统',
        content: data.message || '发生错误',
        ts: data.ts || new Date().toISOString(),
      }
    }

    return null
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    // 指数退避 + 抖动
    const delay = Math.min(30000, this.baseDelay * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 500)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.intentionalClose) {
        this._connect()
      }
    }, delay)
  }

  private setStatus(status: 'connecting' | 'connected' | 'disconnected') {
    if (this._status === status) return
    this._status = status
    for (const listener of this.statusListeners) {
      listener(status)
    }
  }
}

// 导出单例
export const chatWs = new ChatWebSocket()
