import { useEffect, useState } from "react";
import { apiClient } from "../services/api";
import { useGame } from "../contexts/GameContext";
import type { PartyState } from "../types/game";

type PartyPayload = {
  id: string;
  leaderId: string;
  members: Array<{ userId: string; role: string; isOnline?: boolean }>;
  createdAt?: string;
};

export function PartyPanel() {
  const { playerState, refreshPlayerState } = useGame();
  const [party, setParty] = useState<PartyPayload | null>(null);
  const [joinId, setJoinId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const partyState = playerState?.partyState as PartyState | undefined;

  const reload = async () => {
    apiClient.clearCache();
    const res: any = await apiClient.getMyParty().catch(() => ({ party: null }));
    setParty(res?.party ?? null);
  };

  useEffect(() => {
    void reload();
  }, [partyState?.partyId]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refreshPlayerState();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="trading-layout">
      <div className="page-header">
        <h2 className="section-title">组队</h2>
        <div className="page-info">
          <p>创建或加入一支最多 6 人的队伍，职业/队伍聊天会对同队玩家可见。</p>
        </div>
      </div>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      {!party ? (
        <div className="category-section">
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => apiClient.createParty())}>
            创建队伍
          </button>
          <div className="chat-input-area" style={{ marginTop: 12 }}>
            <input
              className="chat-input"
              placeholder="输入队伍 ID 加入"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value.trim())}
            />
            <button
              className="chat-send-btn"
              disabled={busy || !joinId}
              onClick={() => run(() => apiClient.joinParty(joinId))}
            >
              加入
            </button>
          </div>
        </div>
      ) : (
        <div className="category-section">
          <p className="party-id-row">
            队伍码：<code>{party.id.slice(0, 8)}</code>
            <button
              type="button"
              className="header-menu-btn"
              style={{ marginLeft: 8 }}
              onClick={() => {
                void navigator.clipboard.writeText(party.id);
              }}
            >
              复制完整 ID
            </button>
          </p>
          <ul>
            {party.members.map((m) => (
              <li key={m.userId}>
                {m.role === "leader" ? "队长" : "队员"} · {m.userId.slice(0, 8)}
              </li>
            ))}
          </ul>
          <button
            className="btn"
            disabled={busy}
            onClick={() => run(() => apiClient.leaveParty(party.id))}
          >
            离开队伍
          </button>
        </div>
      )}
    </div>
  );
}
