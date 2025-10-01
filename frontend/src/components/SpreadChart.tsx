import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ChartDataPoint, TradingMode } from '../types/market';

interface SpreadChartProps {
  data: ChartDataPoint[];
  tradingMode: TradingMode;
}

const SpreadChart: React.FC<SpreadChartProps> = ({ data, tradingMode }) => {
  // 自定義Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card-dark border border-border-dark rounded-lg p-3 shadow-lg">
          <p className="text-sm text-neutral mb-1">時間: {data.time}</p>
          <p className="text-sm">
            價差: <span className={`number-font ${data.spread >= 0 ? 'text-profit' : 'text-loss'}`}>
              {data.spread.toFixed(6)}
            </span>
          </p>
          <p className="text-sm">
            百分比: <span className={`number-font ${data.spread >= 0 ? 'text-profit' : 'text-loss'}`}>
              {data.spread_percentage.toFixed(3)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // 獲取線條顏色
  const getLineColor = (value: number) => {
    if (value > 0) return '#00ff88';
    if (value < 0) return '#ff4757';
    return '#9ca3af';
  };

  // 計算Y軸範圍
  const getYAxisDomain = () => {
    if (data.length === 0) return [-0.001, 0.001];
    
    const spreads = data.map(d => d.spread);
    const min = Math.min(...spreads);
    const max = Math.max(...spreads);
    const range = max - min;
    const padding = range * 0.1 || 0.001;
    
    return [min - padding, max + padding];
  };

  const getModeDisplayName = (mode: TradingMode) => {
    return mode === 'mx_buy_lbank_sell' ? 'MX買入 → LBank賣出' : 'LBank買入 → MX賣出';
  };

  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">即時價差圖表</h3>
          <p className="text-sm text-neutral">當前模式: {getModeDisplayName(tradingMode)}</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-neutral">等待數據...</div>
        </div>
      </div>
    );
  }

  const latestSpread = data[data.length - 1]?.spread || 0;
  const lineColor = getLineColor(latestSpread);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">即時價差圖表</h3>
        <p className="text-sm text-neutral">當前模式: {getModeDisplayName(tradingMode)}</p>
      </div>
      
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#404040" 
              strokeOpacity={0.3}
            />
            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              fontSize={12}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              domain={getYAxisDomain()}
              tickFormatter={(value) => value.toFixed(6)}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* 零軸參考線 */}
            <ReferenceLine 
              y={0} 
              stroke="#9ca3af" 
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            />
            
            <Line
              type="monotone"
              dataKey="spread"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ fill: lineColor, strokeWidth: 0, r: 2 }}
              activeDot={{ r: 4, stroke: lineColor, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* 圖表底部統計信息 */}
      <div className="mt-4 pt-3 border-t border-border-dark">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-neutral">歷史點數</div>
            <div className="text-sm number-font">{data.length}</div>
            <div className="text-xs text-neutral">({Math.floor(data.length/60)}:{(data.length%60).toString().padStart(2,'0')})</div>
          </div>
          <div>
            <div className="text-xs text-neutral">最新價差</div>
            <div className={`text-sm number-font ${latestSpread >= 0 ? 'text-profit' : 'text-loss'}`}>
              {latestSpread.toFixed(6)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral">百分比</div>
            <div className={`text-sm number-font ${latestSpread >= 0 ? 'text-profit' : 'text-loss'}`}>
              {data[data.length - 1]?.spread_percentage.toFixed(3)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpreadChart;
