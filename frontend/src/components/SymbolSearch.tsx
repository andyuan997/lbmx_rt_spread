import React, { useState, useRef, useEffect } from 'react';

interface SymbolSearchProps {
  symbols: string[];
  currentSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

const SymbolSearch: React.FC<SymbolSearchProps> = ({
  symbols,
  currentSymbol,
  onSymbolChange
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 過濾符號列表
  const filteredSymbols = symbols.filter(symbol =>
    symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 處理符號選擇
  const handleSymbolSelect = (symbol: string) => {
    onSymbolChange(symbol);
    setIsOpen(false);
    setSearchTerm('');
  };

  // 處理輸入框點擊
  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
  };

  // 處理鍵盤事件
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (event.key === 'Enter' && filteredSymbols.length > 0) {
      handleSymbolSelect(filteredSymbols[0]);
    }
  };

  // 點擊外部關閉下拉菜單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 當下拉菜單打開時聚焦輸入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 顯示當前選中的符號 */}
      <div
        className="flex items-center space-x-2 bg-card-dark border border-border-dark rounded-lg px-4 py-2 cursor-pointer hover:border-gray-500 transition-colors min-w-[160px]"
        onClick={handleInputClick}
        tabIndex={0}
        role="button"
        aria-label="選擇交易對"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleInputClick();
          }
        }}
      >
        <span className="text-white font-medium number-font">{currentSymbol}</span>
        <svg
          className={`w-4 h-4 text-neutral transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* 下拉菜單 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card-dark border border-border-dark rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          {/* 搜尋輸入框 */}
          <div className="p-3 border-b border-border-dark">
            <input
              ref={inputRef}
              type="text"
              placeholder="搜尋交易對..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-bg-dark border border-border-dark rounded px-3 py-2 text-white placeholder-neutral focus:outline-none focus:border-gray-500 text-sm"
            />
          </div>

          {/* 符號列表 */}
          <div className="max-h-60 overflow-y-auto">
            {filteredSymbols.length > 0 ? (
              filteredSymbols.map((symbol) => (
                <div
                  key={symbol}
                  className={`px-4 py-3 cursor-pointer hover:bg-white hover:bg-opacity-5 transition-colors ${
                    symbol === currentSymbol ? 'bg-white bg-opacity-10' : ''
                  }`}
                  onClick={() => handleSymbolSelect(symbol)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSymbolSelect(symbol);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white number-font">{symbol}</span>
                    {symbol === currentSymbol && (
                      <svg className="w-4 h-4 text-profit" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-neutral">
                {searchTerm ? '未找到匹配的交易對' : '載入中...'}
              </div>
            )}
          </div>

          {/* 底部信息 */}
          {filteredSymbols.length > 0 && (
            <div className="px-4 py-2 border-t border-border-dark bg-bg-dark">
              <div className="text-xs text-neutral">
                顯示 {filteredSymbols.length} / {symbols.length} 個交易對
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SymbolSearch;
