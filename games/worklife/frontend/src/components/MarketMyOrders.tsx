import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../services/api";
import { useToast } from "./Toast";

type Order = { id: string; itemId: string; quantity: number; price: number; type: "sell" | "buy"; createdAt: string };

type Props = {
  nameOf: (itemId: string) => string;
  onChanged: () => void;
};

/** MWI 我的挂单: what you have on the market right now, with cancel (refunds gold / items). */
export function MarketMyOrders(props: Props) {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      apiClient.clearCache();
      const list: Order[] = await apiClient.getMyTradingOrders();
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (o: Order) => {
    setBusy(o.id);
    try {
      apiClient.clearCache();
      await apiClient.cancelTradingOrder(o.id);
      toast.success(o.type === "sell" ? `已撤回出售单，${props.nameOf(o.itemId)} ×${o.quantity} 退回背包` : `已撤回收购单，退回 ${o.price * o.quantity} 金币`);
      await load();
      props.onChanged();
    } catch (e: any) {
      toast.error(e?.message || "撤单失败");
    } finally {
      setBusy(null);
    }
  };

  if (!orders || orders.length === 0) return null;
  return (
    <section className="market-my-orders" aria-label="我的挂单">
      <h3 className="inv-group-title">我的挂单 <small>{orders.length}</small></h3>
      <div className="market-my-orders-list">
        {orders.map((o) => (
          <div className={`market-order-row ${o.type}`} key={o.id} data-order-id={o.id}>
            <span className={`market-order-type ${o.type}`}>{o.type === "sell" ? "出售" : "收购"}</span>
            <span className="market-order-item">{props.nameOf(o.itemId)} ×{o.quantity}</span>
            <span className="market-order-price">{o.price} 金 / 个</span>
            <button type="button" className="qty-chip" disabled={busy === o.id} onClick={() => cancel(o)}>
              撤回
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
