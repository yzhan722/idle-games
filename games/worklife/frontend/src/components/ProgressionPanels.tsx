import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { useToast } from './Toast';
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
    setClaiming(a.id);
    try {
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
            const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
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
                      {Math.min(a.current, a.target)} / {a.target}
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
    setClaiming(q.id);
    try {
      const res: any = await apiClient.claimDailyQuest(q.id);
      toast.reward(`完成「${q.name}」+${res.goldGained} 金币`);
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
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
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
                    <span className="ach-count">{q.progress} / {q.target}</span>
                    <span className="ach-reward">💰 {q.reward.gold}</span>
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

// ============ 生涯统计面板 ============
const STAT_ROWS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'totalActions', label: '总动作次数', icon: '🔁' },
  { key: 'totalGathered', label: '累计采集', icon: '🌿' },
  { key: 'totalCrafted', label: '累计制作', icon: '🔨' },
  { key: 'totalKills', label: '累计击杀', icon: '⚔️' },
  { key: 'totalBossKills', label: '击杀 BOSS', icon: '👹' },
  { key: 'totalGoldEarned', label: '累计获得金币', icon: '💰' },
  { key: 'totalXpEarned', label: '累计获得经验', icon: '⭐' },
  { key: 'totalEnhancements', label: '累计强化', icon: '✨' },
  { key: 'totalTrades', label: '累计交易', icon: '🤝' },
  { key: 'highestCombatLevel', label: '最高战斗等级', icon: '📈' }
];

function formatPlaytime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} 小时 ${m} 分`;
  return `${m} 分`;
}

export function StatsPanel({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiClient.getStats();
        setStats(res.stats || {});
      } catch (e) {
        toast.error('统计加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  return (
    <PanelModal title="生涯统计" icon="📊" onClose={onClose}>
      {loading ? (
        <div className="prog-loading">加载中…</div>
      ) : !stats ? (
        <div className="prog-empty">暂无数据</div>
      ) : (
        <>
          <div className="stat-highlight">
            <span className="stat-highlight-icon">⏱️</span>
            <div>
              <div className="stat-highlight-label">累计在线时长</div>
              <div className="stat-highlight-value">{formatPlaytime(stats.playtimeSeconds || 0)}</div>
            </div>
          </div>
          <div className="stat-grid">
            {STAT_ROWS.map((r) => (
              <div key={r.key} className="stat-cell">
                <span className="stat-cell-icon">{r.icon}</span>
                <span className="stat-cell-label">{r.label}</span>
                <span className="stat-cell-value">{(stats[r.key] || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
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

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiClient.getSettings();
        setSettings(
          res.settings || {
            soundEnabled: true,
            animationsEnabled: true,
            compactMode: false,
            notificationsEnabled: true
          }
        );
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
      document.body.classList.toggle('compact-mode', next.compactMode);
      document.body.classList.toggle('no-animations', !next.animationsEnabled);
    } catch (e) {
      toast.error('保存失败');
      setSettings(settings); // 回滚
    }
  };

  const exportData = async () => {
    try {
      const state: any = await apiClient.get('/player/state');
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worklife-save-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('存档已导出');
    } catch (e) {
      toast.error('导出失败');
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
          <div className="settings-actions">
            <button className="settings-export-btn" onClick={exportData}>
              📤 导出存档（JSON）
            </button>
          </div>
        </>
      )}
    </PanelModal>
  );
}
