/** @fastify/websocket v11 passes the raw `ws` socket; older code used `{ socket }`. */

export function socketFromWsConnection(connection: any): any | null {
  if (!connection) return null;
  if (typeof connection.send === "function") return connection;
  if (connection.socket && typeof connection.send !== "function") {
    return connection.socket;
  }
  return connection.socket ?? null;
}
