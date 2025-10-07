export interface OrderBookEntry {
  price: number;
  quantity: number;
}

export interface OrderBook {
  exchange: string;
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: string;
  price_precision: number;
  quantity_precision: number;
}

export interface SpreadData {
  symbol: string;
  mode: string;
  spread: number;
  spread_percentage: number;
  max_quantity: number;
  buy_price: number;
  sell_price: number;
  buy_exchange: string;
  sell_exchange: string;
  timestamp: string;
  color: string;
}

export interface MarketUpdate {
  type: string;
  symbol: string;
  mode: string;
  mx_orderbook: OrderBook;
  lbank_orderbook: OrderBook;
  spread_data: SpreadData;
  timestamp: string;
}

export interface ChartDataPoint {
  timestamp: number;
  spread: number;
  spread_percentage: number;
  time: string;
}

export type TradingMode = 'mx_buy_lbank_sell' | 'lbank_buy_mx_sell';

export type SymbolMode = 'common' | 'custom';

export interface CustomSymbolRequest {
  mx_symbol: string;
  lbank_symbol: string;
}
