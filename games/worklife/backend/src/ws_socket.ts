/** @fastify/websocket v11 passes the raw `ws` socket; older code used `{ socket }`. */

export function socketFromWsConnection(connection: any): any | null {
  if (!connection) return null;
  if (typeof connection.send === "function") return connection;
  if (connection.socket && typeof connection.send !== "function") {
    return connection.socket;
  }
  return connection.socket ?? null;
}

/** 登录状态被吊销（登出、绑定或换绑凭据）时的关闭码：客户端收到后不再用旧凭证重连。 */
export const WS_SESSION_REVOKED = 4401;

/** 还能收发。关闭握手没走完的连接（对方故意不回）也算断了，之后发来的消息不再处理。 */
export function socketIsOpen(socket: any): boolean {
  return Boolean(socket) && (socket.readyState === undefined || socket.readyState === 1);
}

/**
 * 同一账号的全部在线连接（多开标签页、刷新时新旧连接会短暂并存）。
 * 存储里每个账号只记一条「当前连接」收消息，其余连接在这里登记，注销账号、登出、换绑凭据时一并断开。
 */
export function createSocketRegistry() {
  const byUser = new Map<string, Set<any>>();
  return {
    add(userId: string, socket: any) {
      if (!socket) return;
      const set = byUser.get(userId) ?? new Set<any>();
      set.add(socket);
      byUser.set(userId, set);
    },
    /** 去掉一条连接，返回还在线的另一条（没有则 undefined；正在关的不算）。 */
    remove(userId: string, socket: any): any | undefined {
      const set = byUser.get(userId);
      if (!set) return undefined;
      set.delete(socket);
      if (set.size === 0) byUser.delete(userId);
      return [...set].reverse().find(socketIsOpen);
    },
    closeAll(userId: string, code?: number, reason?: string) {
      const set = byUser.get(userId);
      byUser.delete(userId);
      for (const socket of set ?? []) {
        try {
          if (code === undefined) socket.close?.();
          else socket.close?.(code, reason);
        } catch {}
      }
    },
  };
}
