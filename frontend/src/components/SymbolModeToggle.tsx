import React, { useState, useCallback } from 'react';
import { SymbolMode } from '../types/market';

interface SymbolModeToggleProps {
  mode: SymbolMode;
  onModeChange: (mode: SymbolMode) => void;
}

const SymbolModeToggle: React.FC<SymbolModeToggleProps> = ({ mode, onModeChange }) => {
  const [isChanging, setIsChanging] = useState(false);

  const handleModeChange = useCallback((newMode: SymbolMode) => {
    if (mode === newMode || isChanging) return;
    
    setIsChanging(true);
    
    // 添加小延遲讓UI更新
    setTimeout(() => {
      onModeChange(newMode);
      setTimeout(() => setIsChanging(false), 100);
    }, 50);
  }, [mode, onModeChange, isChanging]);

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-neutral mr-2">幣種模式:</span>
      <div className="flex bg-bg-dark border border-border-dark rounded-lg p-1">
        <button
          onClick={() => handleModeChange('common')}
          disabled={isChanging}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${mode === 'common'
              ? 'bg-white bg-opacity-10 text-white border border-border-dark'
              : 'text-neutral hover:text-white hover:bg-white hover:bg-opacity-5'
            }
            ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title="同名模式：選擇兩個交易所都有的相同幣種"
          aria-label="同名模式"
        >
          同名模式
        </button>
        <button
          onClick={() => handleModeChange('custom')}
          disabled={isChanging}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${mode === 'custom'
              ? 'bg-white bg-opacity-10 text-white border border-border-dark'
              : 'text-neutral hover:text-white hover:bg-white hover:bg-opacity-5'
            }
            ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title="自選模式：手動選擇兩個交易所的不同幣種"
          aria-label="自選模式"
        >
          自選模式
        </button>
      </div>
    </div>
  );
};

export default SymbolModeToggle;
