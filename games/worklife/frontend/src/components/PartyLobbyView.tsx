import { apiClient } from "../services/api";
import { T1Art } from "./T1Art";
import { MonsterSceneBackdrop } from "./MonsterSceneBackdrop";
import {
  getBossSignatureSkills,
  normalizeStageId,
  type PartyInvite,
  type PartyListItem,
  type PartyPayload,
  type StageBossDungeon,
} from "../gameplay/partyRaidData";

export interface PartyLobbyViewProps {
  bossDungeons: StageBossDungeon[];
  actStage: string;
  setActStage: (stageId: string) => void;
  busy: boolean;
  party: PartyPayload | null;
  invites: PartyInvite[];
  publicParties: PartyListItem[];
  joinId: string;
  setJoinId: (id: string) => void;
  inviteId: string;
  setInviteId: (id: string) => void;
  isLeader: boolean;
  userId?: string;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  quickStartBossDungeon: (stageId: string) => Promise<void>;
  onQuickJoinAndStart: (p: PartyListItem) => void;
  onCopyPartyId: (partyId: string) => void;
}

export function PartyLobbyView({
  bossDungeons,
  actStage,
  setActStage,
  busy,
  party,
  invites,
  publicParties,
  joinId,
  setJoinId,
  inviteId,
  setInviteId,
  isLeader,
  userId,
  run,
  quickStartBossDungeon,
  onQuickJoinAndStart,
  onCopyPartyId,
}: PartyLobbyViewProps) {
  return (
    <>
      <div className="page-header">
        <h2 className="section-title">组队首领副本</h2>
        <div className="page-info">
          <p>
            魔物数量随小队人数动态扩编（1～6 人对应每波 2～6 只魔物，首领战更会率领亲卫同屏出战）· 每位首领皆拥有专属全屏 AOE 与独门秘技
          </p>
        </div>
      </div>

      {/* BOSS DUNGEON SELECTOR CARDS */}
      <div className="category-section">
        <div className="party-boss-dungeon-grid">
          {bossDungeons.map((dungeon) => {
            const isSelected = normalizeStageId(actStage) === dungeon.id;
            const bossSkills = getBossSignatureSkills(dungeon.boss.id);
            return (
              <div
                key={dungeon.id}
                className={`party-boss-dungeon-card${isSelected ? " selected" : ""}`}
                onClick={() => setActStage(dungeon.id)}
              >
                <div className="party-boss-card-top">
                  <div className="party-boss-avatar">
                    <MonsterSceneBackdrop monsterId={dungeon.boss.id} mapId={dungeon.id} isBoss variant="card" />
                    <T1Art kind="monster" id={dungeon.boss.id} fallback={dungeon.boss.icon || "👹"} alt={dungeon.boss.name} />
                  </div>
                  <div className="party-boss-meta">
                    <div className="party-boss-stage-name">{dungeon.name}</div>
                    <div className="party-boss-name">
                      👑 {dungeon.boss.name} <small>Lv.{dungeon.boss.level}</small>
                    </div>
                    <div className="party-boss-reward-line">
                      <span>✨ +{dungeon.boss.xp} 经验</span>
                      <span>💰 +{dungeon.boss.gold} 金币</span>
                    </div>
                    <div className="boss-skill-strip card-skill-strip">
                      {bossSkills.map((sk) => (
                        <span
                          key={sk.id}
                          className={`boss-skill-chip${sk.kind === "aoe" ? " is-aoe" : ""}`}
                          title={`${sk.name}（${sk.tag}）：${sk.desc}`}
                        >
                          {sk.kind === "aoe" ? "🌋" : "⚡"} {sk.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="party-boss-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      void quickStartBossDungeon(dungeon.id);
                    }}
                  >
                    {party ? "⚔️ 开启讨伐" : "⚡ 组队讨伐"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CURRENT PARTY ROSTER OR PUBLIC BOT PARTIES */}
      {!party ? (
        <>
          {invites.length > 0 && (
            <div className="category-section">
              <h3>队伍邀请</h3>
              <ul>
                {invites.map((inv) => (
                  <li key={inv.partyId} className="party-id-row">
                    收到冒险小队邀请（队伍码 <code>{inv.partyId.slice(0, 8)}</code>）
                    <button
                      className="btn btn-primary"
                      style={{ marginLeft: 8 }}
                      disabled={busy}
                      onClick={() => run(() => apiClient.acceptPartyInvite(inv.partyId))}
                    >
                      接受
                    </button>
                    <button
                      className="btn"
                      style={{ marginLeft: 4 }}
                      disabled={busy}
                      onClick={() => run(() => apiClient.declinePartyInvite(inv.partyId))}
                    >
                      拒绝
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="category-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>常驻讨伐小队（加入即享满编协战队友）</h3>
              <button className="btn btn-primary" disabled={busy} onClick={() => run(() => apiClient.createParty())}>
                + 创建我的讨伐小队
              </button>
            </div>

            {publicParties.length === 0 ? (
              <p>暂无公开队伍，可直接点击上方首领卡片一键组建小队开战！</p>
            ) : (
              <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {publicParties.map((p) => {
                  const stageNorm = normalizeStageId(p.recommendedStageId);
                  const targetDungeon = bossDungeons.find((d) => d.id === stageNorm) || bossDungeons[0];
                  return (
                    <li
                      key={p.id}
                      className="party-id-row"
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}
                    >
                      <span>
                        <strong>{p.name || "冒险小队"}</strong>
                        {p.leaderName && <span style={{ opacity: 0.85 }}> · 驻守：{p.leaderName}</span>}
                        <span> · {p.memberCount}/6 人</span>
                        {targetDungeon && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: "#fbbf24" }}>
                            🎯 目标：{targetDungeon.name} · {targetDungeon.boss.name}
                          </span>
                        )}
                        {p.isBotParty && (
                          <span style={{ marginLeft: 6, fontSize: 12, color: "var(--accent, #6ee7b7)" }}>
                            🤖 队员已准备
                          </span>
                        )}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              if (p.recommendedStageId) setActStage(normalizeStageId(p.recommendedStageId));
                              await apiClient.joinParty(p.id);
                            })
                          }
                        >
                          加入小队
                        </button>
                        <button
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => onQuickJoinAndStart(p)}
                        >
                          ⚔️ 加入并直接开战
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="chat-input-area" style={{ marginTop: 12 }}>
              <input
                className="chat-input"
                placeholder="输入好友队伍 ID 加入"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.trim())}
              />
              <button className="chat-send-btn" disabled={busy || !joinId} onClick={() => run(() => apiClient.joinParty(joinId))}>
                加入
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="category-section">
          <div
            className="party-id-row"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 15 }}>{party.name || "冒险小队"}</strong>
              <span style={{ fontSize: 12, opacity: 0.85 }}>({party.members.length}/6 人)</span>
              <span style={{ opacity: 0.75, fontSize: 12 }}>
                队伍码：<code>{party.id.slice(0, 8)}</code>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {party.members.length < 6 && (
                <button type="button" className="header-menu-btn" disabled={busy} onClick={() => run(() => apiClient.recruitPartyBot(party.id))}>
                  🤖 招募队友
                </button>
              )}
              <button
                type="button"
                className="header-menu-btn"
                onClick={() => onCopyPartyId(party.id)}
              >
                复制 ID
              </button>
              <button type="button" className="header-menu-btn" disabled={busy} onClick={() => run(() => apiClient.leaveParty(party.id))}>
                {isLeader && party.members.length === 1 ? "解散队伍" : "离开队伍"}
              </button>
            </div>
          </div>

          <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {party.members.map((m) => (
              <li
                key={m.userId}
                className="party-id-row"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
              >
                <span>
                  {m.isBot ? "🤖" : m.isOnline ? "🟢" : "⚫"} <b>{m.role === "leader" ? "队长" : "队员"}</b> ·{" "}
                  <span>{m.displayName || "神秘冒险者"}</span>
                  {m.title && <small style={{ marginLeft: 6, opacity: 0.75 }}>[{m.title}]</small>}
                  {m.combatLevel && <small style={{ marginLeft: 6, opacity: 0.8 }}>Lv.{m.combatLevel}</small>}
                  {m.userId === userId ? "（你）" : ""}
                </span>
                {isLeader && m.userId !== userId && (
                  <span style={{ marginLeft: 8 }}>
                    {!m.isBot && (
                      <button className="btn" disabled={busy} onClick={() => run(() => apiClient.transferPartyLeadership(party.id, m.userId))}>
                        移交队长
                      </button>
                    )}
                    <button
                      className="btn"
                      style={{ marginLeft: 4 }}
                      disabled={busy}
                      onClick={() => run(() => apiClient.kickPartyMember(party.id, m.userId))}
                    >
                      移出
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>

          {party.members.length < 6 && (
            <div className="chat-input-area" style={{ marginTop: 10 }}>
              <input
                className="chat-input"
                placeholder="输入真人玩家 ID 邀请入队"
                value={inviteId}
                onChange={(e) => setInviteId(e.target.value.trim())}
              />
              <button
                className="chat-send-btn"
                disabled={busy || !inviteId}
                onClick={() =>
                  run(async () => {
                    await apiClient.inviteToParty(party.id, inviteId);
                    setInviteId("");
                  })
                }
              >
                邀请玩家
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
