export interface TradingOrder {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  price: number;
  type: 'sell' | 'buy';
  createdAt: string;
  username?: string;
}

export interface TradingItem {
  id: string;
  name: string;
  tier: number;
  type: string;
  icon?: string;
}

export interface CreateOrderData {
  itemId: string;
  quantity: number;
  price: number;
  type: 'sell' | 'buy';
}

export interface PurchaseOrderData {
  orderId: string;
  quantity: number;
}
