import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../services/api'
import { setGameSoundEnabled } from '../gameplay/sound';
import { useAuth } from '../hooks/useAuth';
import { useGame } from '../contexts/GameContext';
import { encryptSaveEnvelope, decryptSaveEnvelope } from '../utils/saveCrypto';
import { useToast, setToastNotificationsEnabled } from './Toast';
import './ProgressionPanels.css';

// ============ 通用弹窗外壳 ============
function PanelModal({
  title,
  icon,
  onClose,
  children
}: {
  title: string;
  icon: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="prog-overlay" onClick={onClose}>
      <div className="prog-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prog-header">
          <span className="prog-title">
            <span className="prog-title-icon">{icon}</span>
            {title}
          </span>
          <button className="prog-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="prog-body">{children}</div>
      </div>
    </div>
  );
}

// ============ 成就面板 ============
interface AchievementView {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  target: number;
  reward: { gold?: number };
  progress: number;
  current: number;
  unlocked: boolean;
  claimed: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  gathering: '采集',
  crafting: '制作',
  combat: '战斗',
  wealth: '财富',
  progression: '成长',
  misc: '杂项'
};

export function AchievementsPanel({ onClose, onGoldChange }: { onClose: () => void; onGoldChange?: (gold: number) => void }) {
  const [list, setList] = useState<AchievementView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [claiming, setClaiming] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getAchievements();
      setList(res.achievements || []);
    } catch (e) {
      toast.error('成就加载失败');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const claim = async (a: AchievementView) => {
    if (claiming) return;
    setClaiming(a.id);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.claimAchievement(a.id);
      toast.reward(`领取「${a.name}」奖励 +${res.goldGained} 金币`);
      onGoldChange?.(res.gold);
      await load();
    } catch (e: any) {
      toast.error(e?.message || '领取失败');
    } finally {
      setClaiming(null);
    }
  };

  const filtered = filter === 'all' ? list : list.filter((a) => a.category === filter);
  const unlockedCount = list.filter((a) => a.unlocked).length;
  const claimableCount = list.filter((a) => a.unlocked && !a.claimed).length;
  const categories = ['all', 'gathering', 'crafting', 'combat', 'wealth', 'progression', 'misc'];

  return (
    <PanelModal title="成就" icon="🏆" onClose={onClose}>
      <div className="prog-summary">
        已达成 <b>{unlockedCount}</b> / {list.length}
        {claimableCount > 0 && <span className="prog-badge">{claimableCount} 个可领取</span>}
      </div>

      <div className="prog-filters">
        {categories.map((c) => (
          <button
            key={c}
            className={`prog-filter-btn ${filter === c ? 'active' : ''}`}
            onClick={() => setFilter(c)}
          >
            {c === 'all' ? '全部' : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="prog-loading">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="prog-empty">暂无成就</div>
      ) : (
        <div className="ach-grid">
          {filtered.map((a) => {
            const pct = Math.min(100, Math.max(0, Math.floor((a.progress / Math.max(1, a.target)) * 100)));
            return (
              <div
                key={a.id}
                className={`ach-card ${a.unlocked ? 'unlocked' : 'locked'} ${a.claimed ? 'claimed' : ''}`}
              >
                <div className="ach-icon">{a.icon}</div>
                <div className="ach-info">
                  <div className="ach-name">
                    {a.name}
                    {a.claimed && <span className="ach-done">已领取</span>}
                  </div>
                  <div className="ach-desc">{a.description}</div>
                  <div className="ach-progressbar">
                    <div className="ach-progressbar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="ach-meta">
                    <span className="ach-count">
                      {Math.min(a.current, a.target)} / {a.target} ({pct}%)
                    </span>
                    <span className="ach-reward">💰 {a.reward.gold || 0}</span>
                  </div>
                </div>
                {a.unlocked && !a.claimed && (
                  <button
                    className="ach-claim-btn"
                    disabled={claiming === a.id}
                    onClick={() => claim(a)}
                  >
                    {claiming === a.id ? '…' : '领取'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelModal>
  );
}

// ============ 每日任务面板 ============
interface DailyQuestView {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: { gold: number; xp?: number };
}

export function DailyQuestsPanel({ onClose, onGoldChange }: { onClose: () => void; onGoldChange?: (gold: number) => void }) {
  const [quests, setQuests] = useState<DailyQuestView[]>([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getDailyQuests();
      setQuests(res.quests || []);
      setDate(res.date || '');
    } catch (e) {
      toast.error('每日任务加载失败');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const claim = async (q: DailyQuestView) => {
    if (claiming) return;
    setClaiming(q.id);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.claimDailyQuest(q.id);
      toast.reward(`完成「${q.name}」+${res.goldGained} 金币${res.xpGained ? ` · +${res.xpGained} 经验` : ''}`);
      onGoldChange?.(res.gold);
      await load();
    } catch (e: any) {
      toast.error(e?.message || '领取失败');
    } finally {
      setClaiming(null);
    }
  };

  return (
    <PanelModal title="每日任务" icon="📅" onClose={onClose}>
      <div className="prog-summary">
        刷新日期：{date || '—'}（每日 0 点刷新）
      </div>
      {loading ? (
        <div className="prog-loading">加载中…</div>
      ) : quests.length === 0 ? (
        <div className="prog-empty">暂无任务</div>
      ) : (
        <div className="daily-list">
          {[...quests].sort((a, b) => {
            const rank = (q: DailyQuestView) => (q.claimed ? 2 : q.completed ? 0 : 1);
            return rank(a) - rank(b);
          }).map((q) => {
            const pct = Math.min(100, Math.max(0, Math.floor((q.progress / Math.max(1, q.target)) * 100)));
            return (
              <div key={q.id} className={`daily-card ${q.completed ? 'completed' : ''} ${q.claimed ? 'claimed' : ''}`}>
                <div className="daily-icon">{q.icon}</div>
                <div className="daily-info">
                  <div className="daily-name">{q.name}</div>
                  <div className="daily-desc">{q.description}</div>
                  <div className="ach-progressbar">
                    <div className="ach-progressbar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="ach-meta">
                    <span className="ach-count">{q.progress} / {q.target} ({pct}%)</span>
                    <span className="ach-reward">💰 {q.reward.gold}{q.reward.xp ? ` · ⭐ ${q.reward.xp} 经验` : ''}</span>
                  </div>
                </div>
                {q.claimed ? (
                  <span className="daily-done">✓</span>
                ) : q.completed ? (
                  <button className="ach-claim-btn" disabled={claiming === q.id} onClick={() => claim(q)}>
                    {claiming === q.id ? '…' : '领取'}
                  </button>
                ) : (
                  <span className="daily-progress-tag">{pct}%</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelModal>
  );
}

// ============ 设置面板 ============
interface SettingsView {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  compactMode: boolean;
  notificationsEnabled: boolean;
}

const SETTING_ROWS: Array<{ key: keyof SettingsView; label: string; desc: string }> = [
  { key: 'soundEnabled', label: '音效', desc: '开启动作与奖励音效' },
  { key: 'animationsEnabled', label: '动画效果', desc: '开启界面过渡与进度动画' },
  { key: 'notificationsEnabled', label: '通知提示', desc: '显示奖励/成就 Toast 通知' },
  { key: 'compactMode', label: '紧凑模式', desc: '减小间距，单屏显示更多内容' }
];

/** 账号信息展示（兼容历史未绑号存档补绑） */
function BindAccountSection() {
  const toast = useToast();
  const { user, applySession, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [bound, setBound] = useState(user?.username || '');

  const bind = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res: any = await apiClient.bindPassword(username.trim(), password);
      // 绑定即吊销旧会话：响应里的新 token 必须换上，否则下一个请求就 401
      if (res?.token) applySession({ userId: res.userId || user?.id || '', token: res.token, username: res.username || username.trim(), resumeToken: res.resumeToken });
      setBound(res?.username || username.trim());
      setPassword('');
      toast.success('账号已绑定，下次可用用户名+密码登录');
    } catch (e: any) {
      toast.error(e?.code === 'username_taken' ? '用户名已被占用' : (e?.message || '绑定失败'));
    } finally {
      setBusy(false);
    }
  };

  const activeAccount = bound || user?.username;

  return (
    <div className="settings-bind">
      <div className="settings-text" style={{ marginBottom: 8 }}>
        <div className="settings-label">🔐 游戏账号</div>
        <div className="settings-desc">{activeAccount ? `当前登录账号：${activeAccount}（云端实时存档，支持跨设备登录）` : '绑定后可用账号密码在任何设备登录这个存档'}</div>
      </div>
      {activeAccount ? (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="settings-export-btn"
            onClick={() => logout()}
          >
            🚪 退出登录 / 切换账号
          </button>
        </div>
      ) : (
        <div className="settings-bind-form">
          <input className="input" placeholder="账号（1-32 位字符）" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <input className="input" type="password" placeholder="密码（至少 4 位）" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <button className="settings-export-btn" disabled={busy || !username.trim() || password.length < 4} onClick={() => void bind()}>
            {busy ? '绑定中…' : '绑定'}
          </button>
        </div>
      )}
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [exportedCode, setExportedCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, applySession } = useAuth();
  const { refreshPlayerState } = useGame();
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiClient.getSettings();
        const loaded = res.settings || {
          soundEnabled: true,
          animationsEnabled: true,
          compactMode: false,
          notificationsEnabled: true
        };
        setSettings(loaded);
        setToastNotificationsEnabled(loaded.notificationsEnabled ?? true);
      } catch (e) {
        toast.error('设置加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const toggle = async (key: keyof SettingsView) => {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await apiClient.updateSettings({ [key]: next[key] });
      if (key === "soundEnabled") setGameSoundEnabled(next.soundEnabled);
      if (key === "notificationsEnabled") setToastNotificationsEnabled(next.notificationsEnabled);
      document.body.classList.toggle('compact-mode', next.compactMode);
      document.body.classList.toggle('no-animations', !next.animationsEnabled);
    } catch (e) {
      toast.error('保存失败');
      setSettings(settings); // 回滚
    }
  };

  const exportData = async () => {
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      apiClient.clearCache();
      const state: any = await apiClient.get('/player/state');
      const token = apiClient.getToken() || '';
      const resumeToken =
        user?.resumeToken ||
        localStorage.getItem('worklife_guest_resume_token') ||
        localStorage.getItem('guest_resume_token');
      // 始终使用 AES-256-GCM 认证加密生成 WLS1 密文（绝不导出明文 JSON）
      const saveCode = await encryptSaveEnvelope({
        v: 1,
        exportedAt: Date.now(),
        userId: user?.id || state?.userId,
        session: token
          ? {
              userId: user?.id || state?.userId || '',
              token,
              username: user?.username || null,
              resumeToken: resumeToken || null,
            }
          : undefined,
        state,
      });
      setExportedCode(saveCode);
      const blob = new Blob([saveCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worklife-save-${new Date().toISOString().slice(0, 10)}.wlsave`;
      a.click();
      URL.revokeObjectURL(url);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(saveCode).catch(() => undefined);
      }
      toast.success('加密存档（.wlsave）已导出并复制到剪贴板');
    } catch (e) {
      toast.error('加密存档导出失败');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleImportSaveCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      toast.error('请先粘贴加密存档码或选择加密存档文件');
      return;
    }
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      // 1. 前端先行校验 AES-256-GCM 密文与防篡改认证标签（拒绝任何明文 JSON 或篡改数据）
      const envelope = await decryptSaveEnvelope(code);

      // 2. 调用服务端导入接口覆盖恢复状态；若携带原会话凭证且跨设备导入也可同步恢复
      let serverImported = false;
      try {
        await apiClient.importEncryptedSave(code);
        serverImported = true;
      } catch {
        // 若服务端接口尚未就绪或跨浏览器恢复原账号会话，应用加密包内的会话与设置
        if (envelope.session?.token && envelope.session?.userId) {
          applySession({
            userId: envelope.session.userId,
            token: envelope.session.token,
            username: envelope.session.username ?? undefined,
            resumeToken: envelope.session.resumeToken ?? undefined,
          });
          try {
            await apiClient.importEncryptedSave(code);
            serverImported = true;
          } catch {
            // 继续同步基础设置与刷新状态
          }
        }
        if (!serverImported && envelope.state?.settings) {
          await apiClient.updateSettings({
            soundEnabled: envelope.state.settings.soundEnabled,
            animationsEnabled: envelope.state.settings.animationsEnabled,
            compactMode: envelope.state.settings.compactMode,
            notificationsEnabled: envelope.state.settings.notificationsEnabled,
            playerName: envelope.state.settings.playerName,
            avatar: envelope.state.settings.avatar,
            gender: envelope.state.settings.gender,
            characterCreated: envelope.state.settings.characterCreated,
            tutorialDone: envelope.state.settings.tutorialDone,
          }).catch(() => undefined);
        }
      }

      if (envelope.state?.settings) {
        if (typeof envelope.state.settings.soundEnabled === 'boolean') {
          setGameSoundEnabled(envelope.state.settings.soundEnabled);
        }
        if (typeof envelope.state.settings.notificationsEnabled === 'boolean') {
          setToastNotificationsEnabled(envelope.state.settings.notificationsEnabled);
        }
        document.body.classList.toggle('compact-mode', Boolean(envelope.state.settings.compactMode));
        document.body.classList.toggle('no-animations', envelope.state.settings.animationsEnabled === false);
      }
      apiClient.clearCache();
      await refreshPlayerState();
      setImportCode('');
      toast.success('加密存档导入成功！');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || '存档导入失败：密文无效或已被篡改');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      await handleImportSaveCode(text);
    } catch {
      toast.error('读取存档文件失败');
    }
  };

  return (
    <PanelModal title="设置" icon="⚙️" onClose={onClose}>
      {loading || !settings ? (
        <div className="prog-loading">加载中…</div>
      ) : (
        <>
          <div className="settings-list">
            {SETTING_ROWS.map((r) => (
              <div key={r.key} className="settings-row">
                <div className="settings-text">
                  <div className="settings-label">{r.label}</div>
                  <div className="settings-desc">{r.desc}</div>
                </div>
                <button
                  className={`settings-toggle ${settings[r.key] ? 'on' : 'off'}`}
                  onClick={() => toggle(r.key)}
                  aria-pressed={settings[r.key]}
                >
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            ))}
          </div>
          <BindAccountSection />
          <div className="settings-save-section">
            <div className="settings-text" style={{ marginBottom: 8 }}>
              <div className="settings-label">🛡️ 加密存档备份与恢复</div>
              <div className="settings-desc">存档采用 AES-256-GCM 认证加密（.wlsave），防篡改且不支持明文 JSON 导入</div>
            </div>
            <div className="settings-save-buttons">
              <button className="settings-export-btn" disabled={saveBusy} onClick={() => void exportData()}>
                {saveBusy ? '处理中…' : '📤 导出加密存档 (.wlsave)'}
              </button>
              <button
                type="button"
                className="settings-export-btn"
                disabled={saveBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                📂 选择加密存档文件导入
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".wlsave,.txt"
                style={{ display: 'none' }}
                onChange={(e) => void handleFileChange(e)}
              />
            </div>
            {exportedCode && (
              <div className="settings-save-code-box">
                <input
                  className="input"
                  readOnly
                  value={exportedCode}
                  onFocus={(e) => e.currentTarget.select()}
                  title="已导出的加密存档串"
                />
              </div>
            )}
            <div className="settings-import-row">
              <input
                className="input"
                placeholder="粘贴 WLS1. 开头的加密存档密文…"
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
              />
              <button
                type="button"
                className="settings-export-btn settings-import-submit"
                disabled={saveBusy || !importCode.trim()}
                onClick={() => void handleImportSaveCode(importCode)}
              >
                📥 导入存档
              </button>
            </div>
          </div>
        </>
      )}
    </PanelModal>
  );
}
