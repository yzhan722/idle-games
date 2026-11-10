import { useEffect, useMemo, useState } from "react";
import { GoldIcon, T1Art, T1ItemIcon } from "./T1Art";
import { enhancementStatMultiplier } from "../gameplay/enhancement";
import "./T1UiIcons.css";

export type InventoryRow = {
  itemId: string;
  count: number;
  name: string;
  tier: number;
  type: string;
  description?: string;
};

type PackItem = {
  id: string;
  type?: string;
  value?: number;
  toolFor?: string;
  toolSpeed?: number;
  abilityId?: string;
  atk?: number;
  mag?: number;
  def?: number;
  hp?: number;
  effect?: { hp?: number; mp?: number; buff?: { name?: string } };
};

type Props = {
  rows: InventoryRow[];
  gold: number;
  packItems: PackItem[] | undefined;
  equippedIds: Set<string>;
  enhancementLevels?: Record<string, number>;
  iconOf: (itemId: string) => string;
  onOpen: (row: InventoryRow) => void;
};

type GroupId = "equipment" | "tools" | "consumables" | "books" | "materials";
type SortId = "tier" | "count" | "value" | "name";

const GROUPS: Array<{ id: GroupId; title: string; iconId: string }> = [
  { id: "equipment", title: "装备", iconId: "nav-melee" },
  { id: "tools", title: "工具", iconId: "nav-logging" },
  { id: "consumables", title: "消耗品", iconId: "nav-cooking" },
  { id: "books", title: "技能书", iconId: "nav-magic" },
  { id: "materials", title: "材料", iconId: "nav-woodworking" },
];

export function groupOf(row: InventoryRow, pack: PackItem | undefined): GroupId {
  if (pack?.toolFor) return "tools";
  const t = pack?.type || row.type;
  if (t === "book") return "books";
  if (t === "weapon" || t === "armor" || t === "offhand" || t === "shield" || t === "accessory") return "equipment";
  if (t === "consumable" || t === "food") return "consumables";
  return "materials";
}

export function formatGold(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

function quickStatLine(pack: PackItem | undefined, enh = 0): string {
  if (!pack) return "";
  const mult = enhancementStatMultiplier(enh, pack);
  if (pack.toolSpeed) return `速度 +${Math.round(Number(pack.toolSpeed) * mult * 100)}%`;
  const parts: string[] = [];
  if (pack.atk) parts.push(`攻+${Math.round(pack.atk * mult)}`);
  if (pack.mag) parts.push(`魔+${Math.round(pack.mag * mult)}`);
  if (pack.def) parts.push(`防+${Math.round(pack.def * mult)}`);
  if (pack.hp) parts.push(`血+${Math.round(pack.hp * mult)}`);
  if (parts.length) return parts.slice(0, 2).join(" ");
  if (pack.effect?.hp) return `回血 +${pack.effect.hp}`;
  if (pack.effect?.mp) return `回蓝 +${pack.effect.mp}`;
  if (pack.effect?.buff?.name) return pack.effect.buff.name;
  return "";
}

/**
 * MWI-style bag: one page, grouped by what the item is for, every tile shows icon / name / count,
 * the header shows gold and the shop value of everything you carry. Actions live in the item modal.
 */
export function InventoryPage(props: Props) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<GroupId | "all">("all");
  const [sortBy, setSortBy] = useState<SortId>("tier");
  const packById = useMemo(() => new Map((props.packItems || []).map((p) => [p.id, p])), [props.packItems]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return props.rows
      .filter((r) => r.count > 0)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.itemId.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === "count") return b.count - a.count || b.tier - a.tier;
        if (sortBy === "value") {
          const va = a.count * Number(packById.get(a.itemId)?.value || 0);
          const vb = b.count * Number(packById.get(b.itemId)?.value || 0);
          return vb - va || b.tier - a.tier;
        }
        if (sortBy === "name") return a.name.localeCompare(b.name, "zh-CN");
        return b.tier - a.tier || a.name.localeCompare(b.name, "zh-CN");
      });
  }, [props.rows, search, sortBy, packById]);

  const unfilteredCounts = useMemo(() => {
    const out = new Map<GroupId, number>();
    for (const r of props.rows) {
      if (r.count <= 0) continue;
      const g = groupOf(r, packById.get(r.itemId));
      out.set(g, (out.get(g) || 0) + 1);
    }
    return out;
  }, [props.rows, packById]);

  useEffect(() => {
    if (group !== "all" && (unfilteredCounts.get(group) || 0) === 0) {
      setGroup("all");
    }
  }, [group, unfilteredCounts]);

  const grouped = useMemo(() => {
    const out = new Map<GroupId, InventoryRow[]>();
    for (const r of rows) {
      const g = groupOf(r, packById.get(r.itemId));
      if (!out.has(g)) out.set(g, []);
      out.get(g)!.push(r);
    }
    return out;
  }, [rows, packById]);

  const totalValue = props.rows.reduce((sum, r) => sum + r.count * Number(packById.get(r.itemId)?.value || 0), 0);
  const kinds = props.rows.filter((r) => r.count > 0).length;
  const visibleGroups = GROUPS.filter((g) => (group === "all" || group === g.id) && (grouped.get(g.id)?.length || 0) > 0);

  return (
    <div className="inventory-page skill-page" data-skill-page="inventory">
      <div className="page-header">
        <h2 className="section-title">背包</h2>
        <div className="page-info"><p>没有格数上限。点物品查看详情、属性对比、装备、使用或阅读。</p></div>
      </div>
      <div className="inventory-page-summary">
        <span className="inv-sum" title="金币"><GoldIcon /> <strong>{formatGold(props.gold)}</strong> 金币</span>
        <span className="inv-sum" title="物品种类"><T1Art kind="ui" id="nav-inventory" fallback="" alt="" /> <strong>{kinds}</strong> 种物品</span>
        <span className="inv-sum" title="按商店售价估算"><GoldIcon /> 商店估值 <strong>{formatGold(totalValue)}</strong></span>
      </div>
      <div className="inventory-page-tools">
        <input
          type="search"
          className="search-input inv-search"
          placeholder="搜索物品…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="搜索物品"
        />
        <div className="inv-group-chips" role="tablist" aria-label="分类">
          <button type="button" role="tab" aria-selected={group === "all"} className={`qty-chip${group === "all" ? " active" : ""}`} onClick={() => setGroup("all")}>
            全部
          </button>
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              className={`qty-chip${group === g.id ? " active" : ""}`}
              onClick={() => setGroup(g.id)}
              disabled={(unfilteredCounts.get(g.id) || 0) === 0 && group !== g.id}
            >
              <T1Art kind="ui" id={g.iconId} fallback="" alt="" /> {g.title} {search.trim() ? (grouped.get(g.id)?.length || 0) : (unfilteredCounts.get(g.id) || 0)}
            </button>
          ))}
        </div>
        <div className="inv-sort-chips" aria-label="排序">
          {([
            ["tier", "按品阶"],
            ["count", "按数量"],
            ["value", "按总价"],
            ["name", "按名称"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`qty-chip inv-sort-chip${sortBy === id ? " active" : ""}`}
              onClick={() => setSortBy(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {visibleGroups.length === 0 && (
        <div className="inventory-empty inv-page-empty">
          <div className="empty-icon"><T1Art kind="ui" id="nav-inventory" fallback="" alt="" /></div>
          <p>{search ? "没有匹配的物品" : kinds > 0 ? "该分类下暂无物品" : "背包还是空的。去砍第一棵小白杨。"}</p>
        </div>
      )}
      {visibleGroups.map((g) => (
        <section className="inv-group" key={g.id} aria-label={g.title}>
          <h3 className="inv-group-title">
            <T1Art kind="ui" id={g.iconId} fallback="" alt="" /> {g.title} <small>{grouped.get(g.id)!.length}</small>
          </h3>
          <div className="inv-grid">
            {grouped.get(g.id)!.map((r) => {
              const pack = packById.get(r.itemId);
              const equipped = props.equippedIds.has(r.itemId);
              const enh = Number(props.enhancementLevels?.[r.itemId] || 0);
              const statHint = quickStatLine(pack, enh);
              return (
                <button
                  type="button"
                  className={`inv-tile${equipped ? " equipped" : ""}`}
                  key={r.itemId}
                  data-tier={r.tier}
                  data-item-id={r.itemId}
                  title={r.description || r.name}
                  onClick={() => props.onOpen(r)}
                >
                  <span className="inv-tile-icon">
                    <T1ItemIcon itemId={r.itemId} fallback={props.iconOf(r.itemId)} alt="" />
                  </span>
                  <span className="inv-tile-count">×{r.count}</span>
                  <span className="inv-tile-name">
                    {r.name}
                    {enh > 0 ? <em className="inv-tile-enh"> +{enh}</em> : null}
                  </span>
                  {statHint && <span className="inv-tile-stat-hint">{statHint}</span>}
                  <span className="inv-tile-meta">
                    {equipped ? <em className="inv-tile-tag">已装备</em> : null}
                    {pack?.value ? <span className="inv-tile-value">{formatGold(Number(pack.value))} 金</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
