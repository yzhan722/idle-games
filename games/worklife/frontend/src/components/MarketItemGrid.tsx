import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/api";
import { T1ItemIcon } from "./T1Art";

type MarketItem = { id: string; name: string; type?: string; tier?: number; value?: number };
export type MarketQuote = { ask?: number; askQty: number; bid?: number; bidQty: number };

type Props = {
  groups: Array<{ id: string; title: string; emoji: string; items: MarketItem[] }>;
  inventory: Record<string, number>;
  iconOf: (itemId: string) => string;
  onPick: (itemId: string) => void;
  /** Re-fetch key: bumps after the player's own orders change. */
  refreshKey?: string | number;
};

/** MWI tile footer: live market first, shop value as the fallback. */
function priceLine(quote: MarketQuote | undefined, shopValue: number | undefined) {
  if (quote && (quote.ask != null || quote.bid != null)) {
    return (
      <span className="inv-tile-value market-quote">
        {quote.ask != null ? <em className="quote-ask" title={`最低卖价 · ${quote.askQty} 个在售`}>卖 {quote.ask}</em> : <em className="quote-none">无卖单</em>}
        {" · "}
        {quote.bid != null ? <em className="quote-bid" title={`最高收购 · 收 ${quote.bidQty} 个`}>收 {quote.bid}</em> : <em className="quote-none">无收购</em>}
      </span>
    );
  }
  return shopValue ? <span className="inv-tile-value">店价 {shopValue}</span> : null;
}

/**
 * MWI market entry: every tradeable item as a tile, grouped, with a search box and a chip per
 * category. Owned counts are shown on the tile so "what can I sell" is answered at a glance.
 */
export function MarketItemGrid(props: Props) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  useEffect(() => {
    let cancelled = false;
    apiClient.clearCache();
    apiClient
      .getMarketSummary()
      .then((s: Record<string, MarketQuote>) => {
        if (!cancelled) setQuotes(s || {});
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [props.refreshKey]);
  const q = search.trim().toLowerCase();
  const groups = useMemo(
    () =>
      props.groups
        .map((g) => ({ ...g, items: g.items.filter((i) => !q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)) }))
        .filter((g) => g.items.length > 0 && (group === "all" || group === g.id)),
    [props.groups, q, group]
  );
  const owned = useMemo(() => {
    const ids = new Set(Object.keys(props.inventory).filter((k) => k !== "gold" && (props.inventory[k] || 0) > 0));
    const seen = new Set<string>();
    return props.groups
      .flatMap((g) => g.items)
      .filter((i) => {
        if (!ids.has(i.id) || seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
  }, [props.groups, props.inventory]);

  return (
    <div className="market-grid-page">
      <div className="inventory-page-tools">
        <input
          type="search"
          className="search-input inv-search"
          placeholder="搜索物品…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="搜索市场物品"
        />
        <div className="inv-group-chips" role="tablist" aria-label="市场分类">
          <button type="button" role="tab" aria-selected={group === "all"} className={`qty-chip${group === "all" ? " active" : ""}`} onClick={() => setGroup("all")}>
            全部
          </button>
          {props.groups.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={group === g.id} className={`qty-chip${group === g.id ? " active" : ""}`} onClick={() => setGroup(g.id)}>
              {g.emoji} {g.title} {g.items.length}
            </button>
          ))}
        </div>
      </div>
      {owned.length > 0 && !q && group === "all" && (
        <section className="inv-group" aria-label="我能卖的">
          <h3 className="inv-group-title">🎒 我能卖的 <small>{owned.length}</small></h3>
          <div className="inv-grid market-grid">
            {owned.map((i) => (
              <button type="button" className="inv-tile" key={`own-${i.id}`} data-item-id={i.id} onClick={() => props.onPick(i.id)}>
                <span className="inv-tile-icon"><T1ItemIcon itemId={i.id} fallback={props.iconOf(i.id)} alt="" /></span>
                <span className="inv-tile-count">×{props.inventory[i.id]}</span>
                <span className="inv-tile-name">{i.name}</span>
                <span className="inv-tile-meta">{priceLine(quotes[i.id], i.value)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {groups.length === 0 && <div className="inventory-empty inv-page-empty"><div className="empty-icon">📭</div><p>没有匹配的物品</p></div>}
      {groups.map((g) => (
        <section className="inv-group" key={g.id} aria-label={g.title}>
          <h3 className="inv-group-title">{g.emoji} {g.title} <small>{g.items.length}</small></h3>
          <div className="inv-grid market-grid">
            {g.items.map((i) => (
              <button type="button" className="inv-tile" key={i.id} data-item-id={i.id} onClick={() => props.onPick(i.id)}>
                <span className="inv-tile-icon"><T1ItemIcon itemId={i.id} fallback={props.iconOf(i.id)} alt="" /></span>
                {(props.inventory[i.id] || 0) > 0 && <span className="inv-tile-count">×{props.inventory[i.id]}</span>}
                <span className="inv-tile-name">{i.name}</span>
                <span className="inv-tile-meta">{priceLine(quotes[i.id], i.value)}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
