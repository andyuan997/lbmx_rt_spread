import React from 'react';
import { SpreadData } from '../types/market';

interface SpreadDisplayProps {
  spreadData: SpreadData | null;
  mxOrderBook?: any;
  lbankOrderBook?: any;
}

const SpreadDisplay: React.FC<SpreadDisplayProps> = ({ spreadData, mxOrderBook, lbankOrderBook }) => {
  if (!spreadData) {
    return (
      <div className="bg-card-dark border border-border-dark rounded-lg p-4">
        <div className="text-center">
          <div className="text-neutral text-sm mb-2">即時價差</div>
          <div className="text-2xl font-bold text-neutral">--</div>
          <div className="text-sm text-neutral mt-1">等待數據...</div>
        </div>
      </div>
    );
  }

  const getColorClass = (value: number) => {
    if (value > 0) return 'text-profit';
    if (value < 0) return 'text-loss';
    return 'text-neutral';
  };

  const formatNumber = (value: number, decimals?: number) => {
    // 如果沒有指定精度，使用訂單簿的精度
    if (decimals === undefined) {
      const pricePrecision = mxOrderBook?.price_precision || lbankOrderBook?.price_precision || 4;
      return value.toFixed(pricePrecision);
    }
    return value.toFixed(decimals);
  };

  return (
    <div className="bg-card-dark border border-border-dark rounded-lg p-4 min-w-[300px]">
      {/* 主要價差顯示 */}
      <div className="text-center mb-4">
        <div className="text-neutral text-sm mb-1">即時價差</div>
        <div className={`text-3xl font-bold number-font ${getColorClass(spreadData.spread)}`}>
          {formatNumber(spreadData.spread)}
        </div>
        <div className={`text-lg number-font ${getColorClass(spreadData.spread_percentage)}`}>
          {formatNumber(spreadData.spread_percentage, 3)}%
        </div>
      </div>

      {/* 詳細信息 */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-neutral mb-1">買入價格</div>
          <div className="number-font text-white">
            {formatNumber(spreadData.buy_price, 4)}
          </div>
          <div className="text-xs text-neutral mt-1">
            {spreadData.buy_exchange}
          </div>
        </div>
        
        <div>
          <div className="text-neutral mb-1">賣出價格</div>
          <div className="number-font text-white">
            {formatNumber(spreadData.sell_price, 4)}
          </div>
          <div className="text-xs text-neutral mt-1">
            {spreadData.sell_exchange}
          </div>
        </div>
      </div>

      {/* 可開數量 */}
      <div className="mt-4 pt-3 border-t border-border-dark">
        <div className="flex justify-between items-center">
          <span className="text-neutral text-sm">可開數量:</span>
          <span className="number-font text-white">
            {formatNumber(spreadData.max_quantity, 6)}
          </span>
        </div>
      </div>

      {/* 更新時間 */}
      <div className="mt-2 text-xs text-neutral text-center">
        更新: {new Date(spreadData.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default SpreadDisplay;
