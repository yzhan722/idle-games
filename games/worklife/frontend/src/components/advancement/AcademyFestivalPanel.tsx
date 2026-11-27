import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import {
  ACADEMY_DEPARTMENTS,
  formatAcademyCountdown,
  formatAcademyStats,
  formatCourseDuration,
  getAcademyDepartmentTier,
  type AcademyBadgeDef,
  type AcademyCourseId,
  type AcademyDepartmentId,
  type AcademyDepartmentTierDef,
  type AcademyFestivalBonuses,
  type AcademyStats,
  type FestivalCommissionId,
  type FestivalCommissionKind,
  type FestivalSeasonDef,
  type FestivalSeasonId,
  type FestivalShopItemId,
  type FestivalShopItemKind,
} from '../../gameplay/academyFestival';
import { PanelModal } from './PanelModal';

/* ============================================================================
   冒险者学院进修课程 & 四季节庆活动日历 (WL-12)
   ============================================================================ */

interface AcademyCostItemView {
  itemId: string;
  name: string;
  qty: number;
  have: number;
}

interface AcademyGraduationPreview {
  department: AcademyDepartmentId;
  credits: number;
  departmentTierBefore: number;
  departmentTierAfter: number;
  badgeTierBefore: number;
  badgeTierAfter: number;
}

interface AcademyCourseView {
  id: AcademyCourseId;
  name: string;
  level: 'basic' | 'advanced';
  department: AcademyDepartmentId;
  departmentName: string;
  description: string;
  durationMinutes: number;
  goldCost: number;
  items: AcademyCostItemView[];
  credits: number;
  minBadgeTier: number;
  minBadgeName: string;
  completedCount: number;
  preview: AcademyGraduationPreview;
  canEnroll: boolean;
  blockReason: string | null;
}

interface AcademyDepartmentView {
  id: AcademyDepartmentId;
  name: string;
  passiveName: string;
  subtitle: string;
  description: string;
  credits: number;
  tier: AcademyDepartmentTierDef;
  next: AcademyDepartmentTierDef | null;
  progressPct: number;
  allTiers: readonly AcademyDepartmentTierDef[];
  festivalSeason: FestivalSeasonId;
  festivalSeasonName: string;
}

interface AcademyActiveCourseView {
  courseId: AcademyCourseId;
  startedAt: string;
  endsAt: string;
  name: string;
  level: 'basic' | 'advanced';
  department: AcademyDepartmentId;
  departmentName: string;
  credits: number;
  durationMinutes: number;
  remainingMs: number;
  progressPct: number;
  finished: boolean;
  preview: AcademyGraduationPreview;
}

interface FestivalCommissionView {
  id: FestivalCommissionId;
  name: string;
  description: string;
  kind: FestivalCommissionKind;
  items: AcademyCostItemView[];
  actionPrefix: string | null;
  target: number;
  maxClaims: number;
  claims: number;
  tokens: number;
  gold: number;
  seasonCount: number;
  progress: number;
  required: number;
  canClaim: boolean;
  blockReason: string | null;
}

interface FestivalShopItemView {
  id: FestivalShopItemId;
  name: string;
  description: string;
  kind: FestivalShopItemKind;
  iconKind: 'item' | 'skills' | 'ui';
  iconId: string;
  cost: number;
  limit: number;
  purchased: number;
  gold: number;
  items: Array<{ itemId: string; name: string; qty: number }>;
  credits: number;
  department: AcademyDepartmentId | null;
  departmentName: string | null;
  owned: boolean;
  canBuy: boolean;
  blockReason: string | null;
}

interface AcademyFestivalInfo {
  nowMs: number;
  bonuses: AcademyFestivalBonuses;
  academy: {
    slots: number;
    totalCredits: number;
    badge: {
      current: AcademyBadgeDef;
      next: AcademyBadgeDef | null;
      progressPct: number;
      allBadges: readonly AcademyBadgeDef[];
    };
    departments: AcademyDepartmentView[];
    activeCourse: AcademyActiveCourseView | null;
    courses: AcademyCourseView[];
    totalEnrollments: number;
    totalGraduations: number;
    lastGraduation: {
      courseId: AcademyCourseId;
      courseName: string;
      department: AcademyDepartmentId;
      departmentName: string;
      credits: number;
      at: string;
      departmentTier: number;
      badgeTier: number;
      badgeName: string;
    } | null;
  };
  festival: {
    seasonKey: string;
    seasonIndex: number;
    year: number;
    season: FestivalSeasonDef;
    startsAtMs: number;
    endsAtMs: number;
    nextSeason: { id: FestivalSeasonId; name: string; shortName: string; months: string };
    calendar: Array<{
      id: FestivalSeasonId;
      name: string;
      shortName: string;
      months: string;
      subtitle: string;
      current: boolean;
      keepsakeName: string;
      keepsakeStats: AcademyStats;
      keepsakeOwned: boolean;
    }>;
    tokens: number;
    tokenCap: number;
    tokenGoldRate: number;
    commissions: FestivalCommissionView[];
    shop: FestivalShopItemView[];
    keepsakes: FestivalSeasonId[];
    fullCycle: boolean;
    fullCycleStats: AcademyStats;
    totalTokensEarned: number;
    totalClaims: number;
    lastRollover: {
      seasonKey: string;
      seasonName: string;
      claims: number;
      tokensConverted: number;
      goldConverted: number;
    } | null;
  };
}

const ACADEMY_LEVEL_LABEL: Record<'basic' | 'advanced', string> = { basic: '基础课', advanced: '进阶课' };

const FESTIVAL_KIND_LABEL: Record<FestivalCommissionKind, string> = {
  deliver: '交付成品',
  actions: '本季行动',
  kills: '本季击杀',
};

const FESTIVAL_ACTION_LABEL: Record<string, string> = {
  act_plant_: '种植行动',
  act_fish_: '钓鱼行动',
  act_raise_: '畜牧养殖行动',
};

function academyDeptTierTitle(dept: AcademyDepartmentId, tier: number): string {
  const def = ACADEMY_DEPARTMENTS.find((d) => d.id === dept);
  return def?.tiers.find((t) => t.tier === tier)?.title || '';
}

function academyPreviewText(p: AcademyGraduationPreview, deptName: string, credits: number): string {
  const after = getAcademyDepartmentTier(p.department, credits + p.credits);
  if (p.departmentTierAfter > p.departmentTierBefore) {
    return p.departmentTierBefore === 0
      ? `结业后点亮${deptName}「${after.current.title}」`
      : `结业后「${academyDeptTierTitle(p.department, p.departmentTierBefore)}」晋升「${after.current.title}」`;
  }
  return after.next
    ? `结业后${deptName} ${credits} → ${credits + p.credits} 学分（「${after.next.title}」需 ${after.next.minCredits}）`
    : `结业后${deptName} ${credits} → ${credits + p.credits} 学分（已满阶）`;
}

function FestivalShopIcon({ item, className }: { item: FestivalShopItemView; className: string }) {
  if (item.iconKind === 'item') return <T1ItemIcon itemId={item.iconId} className={className} fallback="" alt={item.name} />;
  if (item.iconKind === 'ui') return <T1Art kind="ui" id={item.iconId} className={className} fallback="" alt={item.name} />;
  return <T1Art kind="skills" id={item.iconId} className={className} fallback="" alt={item.name} />;
}

export function AcademyFestivalPanel({ onClose, onChange }: { onClose: () => void; onChange?: () => void }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<AcademyFestivalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'academy' | 'festival' | 'shop'>('academy');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // 服务器时钟偏移：倒计时按「服务器 nowMs + 本地流逝」推算，每 30 秒刷新一次
  const [clientAnchor, setClientAnchor] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getAcademyFestival();
      setInfo(res);
      setClientAnchor(Date.now());
      return res as AcademyFestivalInfo;
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载冒险者学院与四季节庆失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const applyInfo = (res: any) => {
    if (res?.academy) {
      setInfo(res.academy);
      setClientAnchor(Date.now());
    }
  };

  const handleEnroll = async (course: AcademyCourseView) => {
    setBusyKey(`enroll:${course.id}`);
    try {
      const res: any = await apiClient.enrollAcademyCourse({ courseId: course.id });
      if (res?.academy) applyInfo(res);
      else await load();
      toastRef.current.success(`已报名「${course.name}」，${formatCourseDuration(course.durationMinutes)}后结业可得 ${course.credits} 学分`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '报名学院课程失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleGraduate = async () => {
    setBusyKey('graduate');
    const before = info?.academy.totalGraduations ?? 0;
    const res = await load();
    setBusyKey(null);
    if (res && res.academy.totalGraduations > before && res.academy.lastGraduation) {
      toastRef.current.success(
        `「${res.academy.lastGraduation.courseName}」结业：${res.academy.lastGraduation.departmentName} +${res.academy.lastGraduation.credits} 学分`
      );
      onChange?.();
    }
  };

  const handleClaim = async (c: FestivalCommissionView) => {
    setBusyKey(`claim:${c.id}`);
    try {
      const res: any = await apiClient.claimFestivalCommission({ commissionId: c.id });
      if (res?.academy) applyInfo(res);
      else await load();
      toastRef.current.success(`委托「${c.name}」完成：+${c.tokens} ${info?.festival.season.tokenName ?? '节庆代币'} · +${c.gold} 金币`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '完成节庆委托失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleBuy = async (item: FestivalShopItemView) => {
    setBusyKey(`buy:${item.id}`);
    try {
      const res: any = await apiClient.buyFestivalShopItem({ itemId: item.id });
      if (res?.academy) applyInfo(res);
      else await load();
      toastRef.current.success(`节庆商店兑换「${item.name}」`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '节庆商店兑换失败');
    } finally {
      setBusyKey(null);
    }
  };

  const serverNow = info ? info.nowMs + Math.max(0, tick - clientAnchor) : 0;
  const active = info?.academy.activeCourse ?? null;
  const activeRemaining = active ? Math.max(0, Date.parse(active.endsAt) - serverNow) : 0;
  const activePct = active
    ? Math.min(100, Math.max(0, Math.floor(((serverNow - Date.parse(active.startedAt)) / Math.max(1, active.durationMinutes * 60_000)) * 100)))
    : 0;
  const activeDone = Boolean(active) && activeRemaining <= 0;
  const bonusChips = info ? formatAcademyStats(info.bonuses) : [];
  const seasonLeft = info ? Math.max(0, info.festival.endsAtMs - serverNow) : 0;
  const deptCredits = (id: AcademyDepartmentId) => info?.academy.departments.find((d) => d.id === id)?.credits ?? 0;
  const claimableCount = info ? info.festival.commissions.filter((c) => c.canClaim).length : 0;
  const seasonClaims = info ? info.festival.commissions.reduce((s, c) => s + c.claims, 0) : 0;

  return (
    <PanelModal
      title="冒险者学院与四季节庆"
      icon={<T1Art kind="skills" id="academy_crest" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在翻开学院课表与节庆日历…</div>
      ) : !info ? (
        <div className="prog-empty">暂无冒险者学院数据</div>
      ) : (
        <div className="af-panel-root" data-testid="academy-festival-panel">
          <div className="hw-hero-card af-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem af-hero-emblem">
                <T1Art kind="skills" id="academy_crest" className="hw-hero-core-icon" fallback="" alt="冒险者学院院徽" />
              </div>
              <div className="hw-hero-copy af-hero-copy">
                <div className="ac-hero-title-row">
                  <span className="hw-hero-title" data-testid="academy-badge-name">
                    冒险者学院 · {info.academy.badge.current.name}
                  </span>
                  <span className="qm-equipped-pill" title="学分、徽章与纪念章转生永久保留">转生保留</span>
                </div>
                <div className="ct-rep-progress-meta af-progress-meta">
                  <span>
                    四系学分合计 <strong data-testid="academy-total-credits">{info.academy.totalCredits}</strong>
                    {info.academy.badge.next
                      ? ` · 下一枚「${info.academy.badge.next.name}」需 ${info.academy.badge.next.minCredits} 学分`
                      : ' · 已获最高学院徽章'}
                  </span>
                  <span className="af-season-line">
                    {info.festival.year} {info.festival.season.name}（{info.festival.season.months}）· 距翻季 {formatAcademyCountdown(seasonLeft)}
                  </span>
                </div>
                <div className="ct-rep-bar af-progress-bar">
                  <div className="ct-rep-bar-fill af-bar-fill" style={{ width: `${info.academy.badge.progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="ac-wallet-badges af-wallet-row">
              <span className="ac-wallet-badge af-course-badge">
                <T1Art kind="skills" id="course_scroll" className="ac-badge-icon" fallback="" alt="" />
                {active ? (
                  <>
                    进修中：<strong data-testid="academy-active-name">{active.name}</strong>
                  </>
                ) : (
                  <>
                    进修席位：<strong data-testid="academy-active-name">空闲</strong>
                  </>
                )}
              </span>
              <span className="ac-wallet-badge af-grad-badge">
                <T1Art kind="skills" id="graduation_cap" className="ac-badge-icon" fallback="" alt="" />
                结业：<strong data-testid="academy-graduations">{info.academy.totalGraduations}</strong> 次
              </span>
              <span className="ac-wallet-badge af-token-badge">
                <T1Art kind="skills" id="festival_shop_tent" className="ac-badge-icon" fallback="" alt="" />
                {info.festival.season.tokenName}：<strong data-testid="festival-tokens">{info.festival.tokens}</strong>
              </span>
              <span className="ac-wallet-badge af-keepsake-badge">
                <T1Art kind="skills" id="festival_calendar" className="ac-badge-icon" fallback="" alt="" />
                纪念章：<strong data-testid="festival-keepsake-count">{info.festival.keepsakes.length} / 4</strong>
              </span>
            </div>

            <div className="hw-bonus-strip" data-testid="academy-bonuses">
              {bonusChips.length === 0 ? (
                <span className="af-chip muted">尚无永久加成 —— 修满 8 学分即可点亮第一条跨职业被动</span>
              ) : (
                bonusChips.map((c) => (
                  <span key={c} className="af-chip">
                    {c}
                  </span>
                ))
              )}
              {info.festival.fullCycle && <span className="af-chip title">四季圆满</span>}
            </div>
          </div>

          <div className="prog-filter-bar af-tab-bar">
            <button
              type="button"
              data-testid="academy-tab-courses"
              className={`prog-filter-btn ${tab === 'academy' ? 'active' : ''}`}
              onClick={() => setTab('academy')}
            >
              学院进修
            </button>
            <button
              type="button"
              data-testid="academy-tab-festival"
              className={`prog-filter-btn ${tab === 'festival' ? 'active' : ''}`}
              onClick={() => setTab('festival')}
            >
              {info.festival.season.shortName}委托{claimableCount > 0 ? `（可领 ${claimableCount}）` : ''}
            </button>
            <button
              type="button"
              data-testid="academy-tab-shop"
              className={`prog-filter-btn ${tab === 'shop' ? 'active' : ''}`}
              onClick={() => setTab('shop')}
            >
              节庆商店
            </button>
          </div>

          {tab === 'academy' && (
            <div className="af-academy-view">
              <div className={`af-active-card ${active ? 'busy' : 'idle'}`} data-testid="academy-active-course">
                <div className="af-active-icon-frame">
                  <T1Art kind="skills" id="course_scroll" className="af-active-icon" fallback="" alt="学院进修课程卷轴" />
                </div>
                <div className="af-active-copy">
                  {active ? (
                    <>
                      <div className="af-active-title">
                        正在进修「{active.name}」
                        <span className={`af-dept-tag dept-${active.department}`}>{active.departmentName}</span>
                        <span className="af-level-tag">{ACADEMY_LEVEL_LABEL[active.level]}</span>
                      </div>
                      <div className="ct-rep-bar af-course-bar">
                        <div
                          className="ct-rep-bar-fill af-course-fill"
                          style={{ width: `${activeDone ? 100 : activePct}%` }}
                        />
                      </div>
                      <div className="af-active-meta">
                        {activeDone
                          ? `课程已到点，结业即得 ${active.credits} 学分`
                          : `还剩 ${formatAcademyCountdown(activeRemaining)} · 结业可得 ${active.credits} 学分`}
                        {' · '}
                        {academyPreviewText(active.preview, active.departmentName, deptCredits(active.department))}
                      </div>
                      {activeDone && (
                        <button
                          type="button"
                          data-testid="academy-graduate-btn"
                          className="prog-claim-btn af-action-btn af-primary-btn"
                          disabled={Boolean(busyKey)}
                          onClick={handleGraduate}
                        >
                          {busyKey === 'graduate' ? '结业中…' : '结业领取学分'}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="af-active-title">进修席位空闲</div>
                      <div className="af-active-meta">
                        从下方课程目录选择一门报名（同一时间只能修读 {info.academy.slots} 门）。课程到点后打开本面板即结业，学分计入所属学系。
                      </div>
                    </>
                  )}
                </div>
              </div>

              {info.academy.lastGraduation && (
                <div className="af-grad-line" data-testid="academy-last-graduation">
                  <T1Art kind="skills" id="graduation_cap" className="af-grad-icon" fallback="" alt="" />
                  <span>
                    上次结业：「{info.academy.lastGraduation.courseName}」· {info.academy.lastGraduation.departmentName} +
                    {info.academy.lastGraduation.credits} 学分 · 当时徽章「{info.academy.lastGraduation.badgeName}」
                  </span>
                </div>
              )}

              <div className="ac-rack-title">课程目录（报名消耗金币 + 生活职业成品，结业学分计入所属学系）</div>
              <div className="af-course-grid">
                {info.academy.courses.map((c) => (
                  <div
                    key={c.id}
                    data-testid={`academy-course-${c.id}`}
                    className={`af-course-card dept-${c.department} ${c.canEnroll ? 'ready' : 'blocked'} ${active?.courseId === c.id ? 'current' : ''}`}
                  >
                    <div className="af-course-head">
                      <div className="af-course-icon-frame">
                        <T1Art kind="skills" id="course_scroll" className="af-course-icon" fallback="" alt="" />
                      </div>
                      <div className="af-course-title-col">
                        <div className="af-course-name-row">
                          <strong>{c.name}</strong>
                          <span className={`af-dept-tag dept-${c.department}`}>{c.departmentName}</span>
                          <span className="af-level-tag">{ACADEMY_LEVEL_LABEL[c.level]}</span>
                        </div>
                        <span className="af-course-sub">
                          {formatCourseDuration(c.durationMinutes)} · +{c.credits} 学分
                          {c.completedCount > 0 ? ` · 已结业 ×${c.completedCount}` : ''}
                          {info.academy.badge.current.tier < c.minBadgeTier ? ` · 需「${c.minBadgeName}」` : ''}
                        </span>
                      </div>
                    </div>
                    <p className="af-course-desc">{c.description}</p>
                    <div className="sf-cost-row">
                      {c.items.map((it) => (
                        <span key={it.itemId} className={`sf-cost-chip ${it.have >= it.qty ? 'ok' : 'short'}`}>
                          <T1ItemIcon itemId={it.itemId} className="ac-badge-icon" fallback="" alt="" />
                          {it.name} {it.have}/{it.qty}
                        </span>
                      ))}
                      <span className="sf-cost-chip ok">
                        <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                        {c.goldCost} 金币
                      </span>
                    </div>
                    <div className="af-course-preview">{academyPreviewText(c.preview, c.departmentName, deptCredits(c.department))}</div>
                    <button
                      type="button"
                      data-testid={`academy-enroll-${c.id}`}
                      className="prog-claim-btn af-action-btn af-primary-btn"
                      disabled={!c.canEnroll || Boolean(busyKey)}
                      onClick={() => handleEnroll(c)}
                    >
                      {busyKey === `enroll:${c.id}`
                        ? '报名中…'
                        : active?.courseId === c.id
                        ? '进修中'
                        : c.canEnroll
                        ? '报名进修'
                        : c.blockReason || '暂不可报名'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="ac-rack-title">四系跨职业永久被动（学分达标即生效，转生保留）</div>
              <div className="af-dept-grid">
                {info.academy.departments.map((d) => {
                  const cur = formatAcademyStats(d.tier.stats);
                  const nextStats = d.next ? formatAcademyStats(d.next.stats) : [];
                  return (
                    <div key={d.id} data-testid={`academy-dept-${d.id}`} className={`af-dept-card dept-${d.id} tier-${d.tier.tier}`}>
                      <div className="af-dept-head">
                        <strong>{d.name}</strong>
                        <span className="af-dept-tier">{d.tier.title}</span>
                      </div>
                      <div className="af-dept-sub">
                        「{d.passiveName}」· {d.subtitle}
                      </div>
                      <div className="ct-rep-bar af-dept-bar">
                        <div className="ct-rep-bar-fill af-dept-fill" style={{ width: `${d.progressPct}%` }} />
                      </div>
                      <div className="af-dept-meta">
                        学分 <strong>{d.credits}</strong>
                        {d.next ? ` / ${d.next.minCredits}（下一阶「${d.next.title}」）` : '（已满阶）'}
                      </div>
                      <div className="af-dept-stats">
                        {cur.length > 0 ? `当前：${cur.join(' · ')}` : '当前：未点亮'}
                        {nextStats.length > 0 ? ` ｜ 下一阶：${nextStats.join(' · ')}` : ''}
                      </div>
                      <div className="af-dept-note">{d.festivalSeasonName}商店限定：本系进修推荐信 +3 学分</div>
                    </div>
                  );
                })}
              </div>

              <div className="ac-rack-title">学院徽章（四系学分合计晋阶）</div>
              <div className="af-badge-row" data-testid="academy-badges">
                {info.academy.badge.allBadges
                  .filter((b) => b.tier > 0)
                  .map((b) => (
                    <div
                      key={b.tier}
                      className={`af-badge-slot tier-${b.tier} ${info.academy.badge.current.tier >= b.tier ? 'owned' : 'locked'}`}
                    >
                      <T1Art kind="skills" id={b.iconId} className="af-badge-icon" fallback="" alt={b.name} />
                      <strong>{b.name}</strong>
                      <span className="af-badge-req">学分 {b.minCredits}</span>
                      <span className="af-badge-stats">{formatAcademyStats(b.stats).join(' · ')}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {tab === 'festival' && (
            <div className="af-festival-view">
              <div className={`af-season-card season-${info.festival.season.id}`} data-testid="festival-season-card">
                <div className="af-season-emblem">
                  <T1Art kind="skills" id="festival_calendar" className="af-season-icon" fallback="" alt="四季节庆活动日历" />
                </div>
                <div className="af-season-copy">
                  <div className="af-season-title" data-testid="festival-season-name">
                    {info.festival.year} {info.festival.season.name}
                    <span className="af-season-months">{info.festival.season.months} · {info.festival.season.subtitle}</span>
                  </div>
                  <p className="af-season-desc">{info.festival.season.description}</p>
                  <div className="af-season-meta">
                    距翻季 {formatAcademyCountdown(seasonLeft)} · 下一季「{info.festival.nextSeason.name}」（{info.festival.nextSeason.months}）·
                    本季代币「{info.festival.season.tokenName}」翻季时 1 枚折 {info.festival.tokenGoldRate} 金币
                  </div>
                </div>
              </div>

              <div className="af-calendar-strip" data-testid="festival-calendar">
                {info.festival.calendar.map((s) => (
                  <div key={s.id} className={`af-calendar-cell season-${s.id} ${s.current ? 'current' : ''}`}>
                    <strong>{s.name}</strong>
                    <span className="af-calendar-months">{s.months}</span>
                    <span className={`af-calendar-keep ${s.keepsakeOwned ? 'owned' : ''}`}>
                      {s.keepsakeOwned ? '纪念章已收藏' : s.current ? '本季可兑纪念章' : '纪念章未收藏'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="af-commission-head">
                <T1Art kind="skills" id="festival_harvest_basket" className="af-basket-icon" fallback="" alt="节庆限定委托" />
                <div>
                  <div className="ac-rack-title">{info.festival.season.name}限定委托</div>
                  <div className="ac-rack-sub">
                    交付真实成品或完成本季真实行动 / 击杀，每份委托每季限 3 次；本季已完成 {seasonClaims} 次 · 生涯累计获得节庆代币 {info.festival.totalTokensEarned} 枚。
                  </div>
                </div>
              </div>
              <div className="af-commission-list">
                {info.festival.commissions.map((c) => (
                  <div
                    key={c.id}
                    data-testid={`festival-commission-${c.id}`}
                    className={`af-commission-card kind-${c.kind} ${c.canClaim ? 'ready' : ''} ${c.claims >= c.maxClaims ? 'done' : ''}`}
                  >
                    <div className="af-commission-top">
                      <div className="af-commission-title">
                        <strong>{c.name}</strong>
                        <span className={`af-kind-tag kind-${c.kind}`}>{FESTIVAL_KIND_LABEL[c.kind]}</span>
                      </div>
                      <span className="af-claim-pips" aria-label={`已完成 ${c.claims}/${c.maxClaims}`}>
                        {Array.from({ length: c.maxClaims }, (_, i) => (
                          <span key={i} className={`af-pip ${i < c.claims ? 'on' : ''}`} />
                        ))}
                      </span>
                    </div>
                    <p className="af-commission-desc">{c.description}</p>
                    {c.kind === 'deliver' ? (
                      <div className="sf-cost-row">
                        {c.items.map((it) => (
                          <span key={it.itemId} className={`sf-cost-chip ${it.have >= it.qty ? 'ok' : 'short'}`}>
                            <T1ItemIcon itemId={it.itemId} className="ac-badge-icon" fallback="" alt="" />
                            {it.name} {it.have}/{it.qty}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="af-count-block">
                        <div className="ct-rep-bar af-count-bar">
                          <div
                            className="ct-rep-bar-fill af-count-fill"
                            style={{ width: `${c.target > 0 ? Math.round((c.progress / c.target) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="af-count-meta">
                          本季{c.kind === 'kills' ? '击杀' : FESTIVAL_ACTION_LABEL[c.actionPrefix || ''] || '行动'} {c.seasonCount} 次
                          {c.claims < c.maxClaims ? ` · 第 ${c.claims + 1} 次需累计 ${c.required}` : ' · 本季已领满'}
                        </span>
                      </div>
                    )}
                    <div className="af-commission-foot">
                      <span className="af-reward">
                        +{c.tokens} {info.festival.season.tokenName} · +{c.gold} 金币
                      </span>
                      <button
                        type="button"
                        data-testid={`festival-claim-${c.id}`}
                        className="prog-claim-btn af-action-btn af-festival-btn"
                        disabled={!c.canClaim || Boolean(busyKey)}
                        onClick={() => handleClaim(c)}
                      >
                        {busyKey === `claim:${c.id}`
                          ? '提交中…'
                          : c.canClaim
                          ? c.kind === 'deliver'
                            ? '交付委托'
                            : '领取奖励'
                          : c.blockReason || '暂不可领取'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {info.festival.lastRollover && (
                <div className="af-rollover-line" data-testid="festival-last-rollover">
                  上一季（{info.festival.lastRollover.seasonName}）完成委托 {info.festival.lastRollover.claims} 次，剩余{' '}
                  {info.festival.lastRollover.tokensConverted} 枚代币折算 {info.festival.lastRollover.goldConverted} 金币。
                </div>
              )}
            </div>
          )}

          {tab === 'shop' && (
            <div className="af-shop-view">
              <div className={`af-shop-hero season-${info.festival.season.id}`} data-testid="festival-shop-hero">
                <div className="af-shop-emblem">
                  <T1Art kind="skills" id="festival_shop_tent" className="af-shop-icon" fallback="" alt="节庆商店帐篷" />
                </div>
                <div className="af-shop-copy">
                  <div className="af-season-title">
                    {info.festival.season.name}商店
                    <span className="af-season-months">持有「{info.festival.season.tokenName}」{info.festival.tokens} 枚</span>
                  </div>
                  <div className="af-season-meta">
                    商品每季限购，翻季后换上新一季的礼包与纪念章；进修推荐信直接为学院学系增加学分，纪念章转生永久保留。
                  </div>
                </div>
              </div>

              <div className="af-shop-grid">
                {info.festival.shop.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`festival-shop-${item.id}`}
                    className={`af-shop-card kind-${item.kind} ${item.canBuy ? 'ready' : 'blocked'}`}
                  >
                    <div className="af-shop-head">
                      <div className="af-shop-icon-frame">
                        <FestivalShopIcon item={item} className="af-shop-item-icon" />
                      </div>
                      <div className="af-shop-title-col">
                        <strong>{item.name}</strong>
                        <span className="af-shop-sub">
                          {item.cost} 枚 · 本季 {item.purchased}/{item.limit}
                        </span>
                      </div>
                    </div>
                    <p className="af-shop-desc">{item.description}</p>
                    {item.items.length > 0 && (
                      <div className="sf-cost-row">
                        {item.items.map((it) => (
                          <span key={it.itemId} className="sf-cost-chip ok">
                            <T1ItemIcon itemId={it.itemId} className="ac-badge-icon" fallback="" alt="" />
                            {it.name} ×{it.qty}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.kind === 'gold' && <div className="af-shop-grant">获得 {item.gold} 金币</div>}
                    {item.kind === 'credits' && (
                      <div className="af-shop-grant">
                        {item.departmentName} +{item.credits} 学分
                      </div>
                    )}
                    <button
                      type="button"
                      data-testid={`festival-buy-${item.id}`}
                      className="prog-claim-btn af-action-btn af-festival-btn"
                      disabled={!item.canBuy || Boolean(busyKey)}
                      onClick={() => handleBuy(item)}
                    >
                      {busyKey === `buy:${item.id}` ? '兑换中…' : item.canBuy ? '兑换' : item.blockReason || '暂不可兑换'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="ac-rack-title">四季纪念章（转生永久保留，收齐四季额外获得「四季圆满」）</div>
              <div className="af-keepsake-row" data-testid="festival-keepsakes">
                {info.festival.calendar.map((s) => (
                  <div key={s.id} className={`af-keepsake-slot season-${s.id} ${s.keepsakeOwned ? 'owned' : 'locked'}`}>
                    <T1Art kind="skills" id="festival_calendar" className="af-keepsake-icon" fallback="" alt="" />
                    <strong>{s.keepsakeName}</strong>
                    <span>{formatAcademyStats(s.keepsakeStats).join(' · ')}</span>
                    <span className="af-keepsake-state">{s.keepsakeOwned ? '已收藏' : `${s.name}限定兑换`}</span>
                  </div>
                ))}
              </div>
              <div className="af-fullcycle-line">
                四季圆满：{formatAcademyStats(info.festival.fullCycleStats).join(' · ')}
                {info.festival.fullCycle ? '（已生效）' : `（已收藏 ${info.festival.keepsakes.length} / 4）`}
              </div>
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}
