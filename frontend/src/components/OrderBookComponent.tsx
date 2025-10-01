import React from 'react';
import { OrderBook, OrderBookEntry } from '../types/market';

interface OrderBookComponentProps {
  orderBook: OrderBook | null;
  title: string;
  highlight?: 'bids' | 'asks' | null;
  exchange?: 'mx' | 'lbank';
  tradingMode?: 'mx_buy_lbank_sell' | 'lbank_buy_mx_sell';
  isConnected?: boolean;
}

const OrderBookComponent: React.FC<OrderBookComponentProps> = ({
  orderBook,
  title,
  highlight = null,
  exchange,
  tradingMode,
  isConnected = false
}) => {
  const formatPrice = (price: number): string => {
    const precision = orderBook?.price_precision || 4;
    return price.toFixed(precision);
  };

  const formatQuantity = (quantity: number): string => {
    const precision = orderBook?.quantity_precision || 6;
    return quantity.toFixed(precision);
  };

  const renderOrderBookRow = (
    entry: OrderBookEntry,
    type: 'bid' | 'ask',
    index: number,
    totalCount: number
  ) => {
    // 根據交易所和交易模式決定高亮邏輯
    let shouldHighlight = false;
    
    if (exchange && tradingMode) {
      if (exchange === 'mx') {
        // MX交易所
        if (tradingMode === 'mx_buy_lbank_sell') {
          // MX買模式：高亮MX的ask最低價
          // asks原始: [低價...高價]，最低價是asks[0]
          // reverse後: [高價...低價]，最低價在最後，index = totalCount - 1
          shouldHighlight = type === 'ask' && index === totalCount - 1;
        } else {
          // LBank買模式：高亮MX的bid最高價
          // bids: [高價...低價]，最高價是bids[0]，index=0
          shouldHighlight = type === 'bid' && index === 0;
        }
      } else if (exchange === 'lbank') {
        // LBank交易所
        if (tradingMode === 'mx_buy_lbank_sell') {
          // MX買模式：高亮LBank的bid最高價
          // bids: [高價...低價]，最高價是bids[0]，index=0
          shouldHighlight = type === 'bid' && index === 0;
        } else {
          // LBank買模式：高亮LBank的ask最低價
          // asks原始: [低價...高價]，最低價是asks[0]
          // reverse後: [高價...低價]，最低價在最後，index = totalCount - 1
          shouldHighlight = type === 'ask' && index === totalCount - 1;
        }
      }
      
      // 調試信息
      if (shouldHighlight) {
        console.log(`高亮: ${exchange} ${type} index=${index} mode=${tradingMode}`);
      }
    } else {
      // 備用邏輯：使用原來的highlight參數
      shouldHighlight = highlight === (type === 'bid' ? 'bids' : 'asks') && index === 0;
    }
    
    const baseColor = type === 'bid' ? 'text-profit' : 'text-loss';
    const bgColor = shouldHighlight ? 
      (type === 'bid' ? 'bg-loss bg-opacity-20' : 'bg-profit bg-opacity-20') : '';

    return (
      <tr
        key={`${type}-${index}`}
        className={`${bgColor} hover:bg-white hover:bg-opacity-5 transition-colors`}
      >
        <td className={`px-3 py-1 number-font text-sm ${baseColor}`}>
          {formatPrice(entry.price)}
        </td>
        <td className="px-3 py-1 number-font text-sm text-white">
          {formatQuantity(entry.quantity)}
        </td>
      </tr>
    );
  };

  if (!orderBook) {
    return (
      <div className="bg-card-dark border border-border-dark rounded-lg p-4 h-full">
        <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-neutral mb-2">
              {isConnected ? '等待數據...' : '連接中...'}
            </div>
            {!isConnected && (
              <div className="w-4 h-4 border-2 border-neutral border-t-transparent rounded-full animate-spin mx-auto"></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-dark border border-border-dark rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-card-dark">
              <tr className="border-b border-border-dark">
                <th className="px-3 py-2 text-left text-sm font-medium text-neutral">
                  價格
                </th>
                <th className="px-3 py-2 text-left text-sm font-medium text-neutral">
                  數量
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 賣單 (asks) - 從低到高 */}
              {orderBook.asks.slice(0, 10).reverse().map((ask, index) => 
                renderOrderBookRow(ask, 'ask', index, Math.min(10, orderBook.asks.length))
              )}
              
              {/* 分隔線 */}
              <tr>
                <td colSpan={2} className="py-2">
                  <div className="border-t border-border-dark"></div>
                </td>
              </tr>
              
              {/* 買單 (bids) - 從高到低 */}
              {orderBook.bids.slice(0, 10).map((bid, index) => 
                renderOrderBookRow(bid, 'bid', index, Math.min(10, orderBook.bids.length))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 底部信息 */}
      <div className="mt-4 pt-3 border-t border-border-dark">
        <div className="text-xs text-neutral text-center">
          更新時間: {new Date(orderBook.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default OrderBookComponent;
