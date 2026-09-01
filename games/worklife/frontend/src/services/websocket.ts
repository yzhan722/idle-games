/**
 * WebSocket 聊天客户端
 * 负责与后端 /ws 端点建立 WebSocket 连接，处理聊天消息的收发。
 * 
 * 协议：
 *   发送：{ type: "chat:send", channel: string, content: string }
 *   接收：{ type: "chat:message", channel, sender, senderProfession, ts, content }
 *         { type: "chat:system", channel, ts, text }
 *         { type: "chat:error", message, ts }
 */

export interface ChatMsg {
  id: string
  type: 'message' | 'system' | 'error'
  channel: string
  sender: string
  senderProfession?: string
  content: string
  ts: string
  isSelf?: boolean
}

type MsgListener = (msg: ChatMsg) => void
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void

class ChatWebSocket {
  private ws: WebSocket | null = null
  private token: string = ''
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseDelay = 1000
  private msgListeners: Set<MsgListener> = new Set()
  private statusListeners: Set<StatusListener> = new Set()
  private _status: 'connecting' | 'connected' | 'disconnected' = 'disconnected'
  private intentionalClose = false

  get status() { return this._status }

  /**
   * 建立连接
   */
  connect(token: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      // 已连接或正在连接中
      if (this.token === token) return
      // token 变了，先断开再重连
      this.disconnect()
    }

    this.token = token
    this.intentionalClose = false
    this._connect()
  }

  /**
   * 主动断开
   */
  disconnect() {
    this.intentionalClose = true
    this.reconnectAttempts = 0
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  /**
   * 发送聊天消息
   */
  send(channel: string, content: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify({ type: 'chat:send', channel, content }))
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
    if (import.meta.env.VITE_API_URL) {
      // 生产环境或自定义后端地址
      const apiUrl = String(import.meta.env.VITE_API_URL).replace(/^http/, 'ws').replace(/\/$/, '')
      wsUrl = `${apiUrl}/ws?token=${encodeURIComponent(this.token)}`
    } else if (import.meta.env.DEV) {
      // 开发环境直连后端
      wsUrl = `${protocol}//${window.location.hostname}:3001/ws?token=${encodeURIComponent(this.token)}`
    } else {
      // 生产部署同域 (nginx /ws -> backend)
      wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(this.token)}`
    }

    try {
      this.ws = new WebSocket(wsUrl)
    } catch {
      this.setStatus('disconnected')
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.setStatus('connected')
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
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

    this.ws.onclose = () => {
      this.ws = null
      this.setStatus('disconnected')
      if (!this.intentionalClose) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      // onerror 之后会触发 onclose，这里不需要额外处理
    }
  }

  private parseServerMessage(data: any): ChatMsg | null {
    if (!data || !data.type) return null

    if (data.type === 'chat:message') {
      return {
        id: `${data.ts}_${data.sender}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'message',
        channel: data.channel || 'world',
        sender: data.sender || '未知',
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
        channel: 'world',
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
