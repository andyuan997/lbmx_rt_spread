import React, { useState, useCallback } from 'react';
import { TradingMode } from '../types/market';

interface TradingModeToggleProps {
  currentMode: TradingMode;
  onModeChange: (mode: TradingMode) => void;
}

const TradingModeToggle: React.FC<TradingModeToggleProps> = ({
  currentMode,
  onModeChange
}) => {
  const [isChanging, setIsChanging] = useState(false);
  
  const modes = [
    {
      value: 'mx_buy_lbank_sell' as TradingMode,
      label: 'MX買 → LBank賣',
      description: 'MX買入，LBank賣出'
    },
    {
      value: 'lbank_buy_mx_sell' as TradingMode,
      label: 'LBank買 → MX賣',
      description: 'LBank買入，MX賣出'
    }
  ];

  const handleModeChange = useCallback(async (mode: TradingMode) => {
    if (mode === currentMode || isChanging) return;
    
    setIsChanging(true);
    
    try {
      // 添加小延遲，讓 UI 更平滑
      await new Promise(resolve => setTimeout(resolve, 100));
      onModeChange(mode);
    } finally {
      // 延遲重置狀態，避免快速點擊
      setTimeout(() => setIsChanging(false), 300);
    }
  }, [currentMode, onModeChange, isChanging]);

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-neutral mr-2">交易模式:</span>
      
      <div className="flex bg-bg-dark border border-border-dark rounded-lg p-1">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => handleModeChange(mode.value)}
            disabled={isChanging}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${currentMode === mode.value
                ? 'bg-white bg-opacity-10 text-white border border-border-dark'
                : 'text-neutral hover:text-white hover:bg-white hover:bg-opacity-5'
              }
              ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={mode.description}
            aria-label={mode.description}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TradingModeToggle;
