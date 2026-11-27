import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';

/*
 * 同好会（真人公会）：并入竞技城镇面板的一个页签，和真人榜放在一起。
 * 只有协作与展示，不给任何加成；成员、在线、本周数都由服务器给，名字按纯文本渲染（React 自动转义）。
 */

type Summary = { id: string; name: string; memberCount: number; max: number };
type Member = { userId: string; name: string; isLeader: boolean; online: boolean; joinedAt: string; week: { kills: number; made: number } };
type Pending = { userId: string; name: string; at: string };
type CircleHome = {
  circle: null | {
    id: string;
    name: string;
    memberCount: number;
    max: number;
    isLeader: boolean;
    members: Member[];
    applications: Pending[];
    invited: Pending[];
  };
  invites: Summary[];
  applied: Summary[];
  createCost: number;
};

/** 成员行下面展开的会长操作（与聊天栏发言人菜单同一种排法）。 */
const menuRow = { gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 4 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function CircleView() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [home, setHome] = useState<CircleHome | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<'none' | 'create' | 'search'>('none');
  const [text, setText] = useState('');
  const [found, setFound] = useState<Summary[] | null>(null);
  const [inviteId, setInviteId] = useState('');
  const [busy, setBusy] = useState(false);
  /** 会长点开了哪个成员的「⋯」。 */
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res: any = await apiClient.getCircle();
      setHome(res.home as CircleHome);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 写操作：成功失败都用服务器回的最新状态。 */
  const run = async (fn: () => Promise<any>, done?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fn();
      if (res?.home) setHome(res.home as CircleHome);
      if (done) toastRef.current.success(done);
    } catch (e: any) {
      if (e?.details?.home) setHome(e.details.home as CircleHome);
      toastRef.current.error(e?.message || '没成功');
    } finally {
      setBusy(false);
    }
  };

  const search = () =>
    void run(async () => {
      const res: any = await apiClient.searchCircles(text.trim());
      setFound(res.circles as Summary[]);
    });

  if (failed) {
    return (
      <button type="button" className="rb-board-btn rb-retry" onClick={() => void load()}>
        没加载出来，点这里重试
      </button>
    );
  }
  if (!home) return <div className="prog-empty">加载中…</div>;

  const c = home.circle;
  if (!c) {
    return (
      <div className="rb-view" data-testid="circle-empty">
        {home.invites.map((s) => (
          <div key={s.id} className="rb-row" data-testid="circle-invite">
            <span className="rb-rank">邀</span>
            <bdi className="rb-name">{s.name}</bdi>
            <span className="rb-boards">
              <button type="button" className="rb-board-btn" disabled={busy} onClick={() => void run(() => apiClient.circleAction('accept', { circleId: s.id }), '已加入')}>
                加入
              </button>
              <button type="button" className="rb-board-btn" disabled={busy} onClick={() => void run(() => apiClient.circleAction('decline', { circleId: s.id }))}>
                不了
              </button>
            </span>
          </div>
        ))}
        {home.applied.map((s) => (
          <div key={s.id} className="rb-row">
            <span className="rb-rank" title="已申请，等会长通过">⏳</span>
            <bdi className="rb-name">{s.name}</bdi>
            <button type="button" className="rb-board-btn" disabled={busy} onClick={() => void run(() => apiClient.circleAction('cancel_apply', { circleId: s.id }))}>
              撤回
            </button>
          </div>
        ))}
        <div className="rb-boards">
          <button type="button" data-testid="circle-create-btn" className={`rb-board-btn ${mode === 'create' ? 'active' : ''}`} onClick={() => setMode('create')}>
            创建
          </button>
          <button type="button" data-testid="circle-search-btn" className={`rb-board-btn ${mode === 'search' ? 'active' : ''}`} onClick={() => setMode('search')}>
            搜索
          </button>
        </div>
        {mode !== 'none' && (
          <div className="chat-input-area">
            <input
              className="chat-input"
              maxLength={12}
              placeholder={mode === 'create' ? '同好会名字' : '名字'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mode === 'search') search();
              }}
            />
            {mode === 'create' ? (
              <button
                type="button"
                className="chat-send-btn"
                disabled={busy || !text.trim()}
                title={`花 ${home.createCost} 金币；不给任何加成`}
                onClick={() => void run(() => apiClient.createCircle(text.trim()), '已创建')}
              >
                🪙 {home.createCost}
              </button>
            ) : (
              <button type="button" className="chat-send-btn" disabled={busy} onClick={search}>
                🔍
              </button>
            )}
          </div>
        )}
        {mode === 'search' && found && (
          found.length === 0 ? (
            <div className="prog-empty">没找到</div>
          ) : (
            <ul className="rb-list">
              {found.map((s) => (
                <li key={s.id} className="rb-row">
                  <span className="rb-rank">{s.memberCount}/{s.max}</span>
                  <bdi className="rb-name">{s.name}</bdi>
                  <button
                    type="button"
                    className="rb-board-btn"
                    disabled={busy || s.memberCount >= s.max}
                    onClick={() => void run(() => apiClient.circleAction('apply', { circleId: s.id }), '已申请')}
                  >
                    申请
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    );
  }

  const confirmThen = (msg: string, fn: () => Promise<any>, done?: string) => {
    setMenuFor(null);
    if (window.confirm(msg)) void run(fn, done);
  };

  return (
    <div className="rb-view" data-testid="circle-home">
      <div className="rb-me">
        <bdi>{c.name}</bdi> · {c.memberCount}/{c.max}
      </div>
      <ol className="rb-list" data-testid="circle-members">
        {c.members.map((m) => (
          <li key={m.userId} className="rb-row">
            <span className="rb-rank">
              <span className={`party-status-dot ${m.online ? 'online' : 'offline'}`} title={m.online ? '在线' : '离线'} aria-hidden="true" />
              {m.isLeader ? ' 👑' : ''}
            </span>
            <bdi className="rb-name">{m.name}</bdi>
            <span className="rb-score" title="本周击杀 / 本周采集与制作（只做展示，不给加成）">
              ⚔{m.week.kills} · 🔨{m.week.made}
              {c.isLeader && !m.isLeader && (
                <>
                  {' '}
                  <button type="button" className="qty-chip" disabled={busy} title="转让、移出" aria-expanded={menuFor === m.userId} onClick={() => setMenuFor(menuFor === m.userId ? null : m.userId)}>
                    ⋯
                  </button>
                </>
              )}
            </span>
            {c.isLeader && !m.isLeader && menuFor === m.userId && (
              <div role="menu" style={menuRow}>
                <button type="button" className="qty-chip" disabled={busy} onClick={() => confirmThen(`把会长交给「${m.name}」？`, () => apiClient.circleAction('transfer', { targetUserId: m.userId }), '已转让')}>
                  👑 转让
                </button>
                <button type="button" className="qty-chip" disabled={busy} onClick={() => confirmThen(`移出「${m.name}」？`, () => apiClient.circleAction('kick', { targetUserId: m.userId }))}>
                  移出
                </button>
                <button type="button" className="qty-chip" aria-label="关闭" onClick={() => setMenuFor(null)}>
                  ✕
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      {c.isLeader && c.applications.length > 0 && (
        <ul className="rb-list" data-testid="circle-applications">
          {c.applications.map((a) => (
            <li key={a.userId} className="rb-row">
              <span className="rb-rank">申</span>
              <bdi className="rb-name">{a.name}</bdi>
              <span className="rb-boards">
                <button type="button" className="rb-board-btn" disabled={busy} onClick={() => void run(() => apiClient.circleAction('approve', { targetUserId: a.userId }))}>
                  ✓
                </button>
                <button type="button" className="rb-board-btn" disabled={busy} onClick={() => void run(() => apiClient.circleAction('reject', { targetUserId: a.userId }))}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {c.isLeader && c.memberCount < c.max && (
        <div className="chat-input-area">
          <input className="chat-input" placeholder="玩家 ID" value={inviteId} onChange={(e) => setInviteId(e.target.value.trim())} />
          <button
            type="button"
            className="chat-send-btn"
            disabled={busy || !UUID.test(inviteId)}
            onClick={() =>
              void run(async () => {
                const res = await apiClient.circleAction('invite', { targetUserId: inviteId });
                setInviteId('');
                return res;
              }, '已邀请')
            }
          >
            邀请
          </button>
        </div>
      )}
      <div className="rb-boards">
        <span className="rb-note" title="团内聊天在聊天栏的「同好会」频道，只有成员看得到">💬 聊天栏 → 同好会</span>
        {c.isLeader ? (
          <button type="button" className="rb-board-btn" disabled={busy} onClick={() => confirmThen('解散后所有人退出，确定？', () => apiClient.circleAction('disband'), '已解散')}>
            解散
          </button>
        ) : (
          <button type="button" className="rb-board-btn" disabled={busy} onClick={() => confirmThen('退出同好会？', () => apiClient.circleAction('leave'), '已退出')}>
            退出
          </button>
        )}
      </div>
    </div>
  );
}
