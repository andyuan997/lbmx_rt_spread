import React from 'react';
import { TradingMode } from '../types/market';

interface TradingModeToggleProps {
  currentMode: TradingMode;
  onModeChange: (mode: TradingMode) => void;
}

const TradingModeToggle: React.FC<TradingModeToggleProps> = ({
  currentMode,
  onModeChange
}) => {
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

  const handleModeChange = (mode: TradingMode) => {
    if (mode !== currentMode) {
      onModeChange(mode);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-neutral mr-2">交易模式:</span>
      
      <div className="flex bg-bg-dark border border-border-dark rounded-lg p-1">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => handleModeChange(mode.value)}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${currentMode === mode.value
                ? 'bg-white bg-opacity-10 text-white border border-border-dark'
                : 'text-neutral hover:text-white hover:bg-white hover:bg-opacity-5'
              }
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
