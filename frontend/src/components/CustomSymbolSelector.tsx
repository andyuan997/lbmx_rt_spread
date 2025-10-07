import React, { useState, useEffect, useRef } from 'react';
import { CustomSymbolRequest } from '../types/market';

interface CustomSymbolSelectorProps {
  onSymbolsChange: (request: CustomSymbolRequest) => void;
  disabled?: boolean;
}

const CustomSymbolSelector: React.FC<CustomSymbolSelectorProps> = ({ 
  onSymbolsChange, 
  disabled = false 
}) => {
  const [mxSymbols, setMxSymbols] = useState<string[]>([]);
  const [lbankSymbols, setLbankSymbols] = useState<string[]>([]);
  const [selectedMxSymbol, setSelectedMxSymbol] = useState<string>('');
  const [selectedLbankSymbol, setSelectedLbankSymbol] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // 下拉菜單狀態
  const [mxDropdownOpen, setMxDropdownOpen] = useState(false);
  const [lbankDropdownOpen, setLbankDropdownOpen] = useState(false);
  const [mxSearchTerm, setMxSearchTerm] = useState('');
  const [lbankSearchTerm, setLbankSearchTerm] = useState('');
  
  const mxDropdownRef = useRef<HTMLDivElement>(null);
  const lbankDropdownRef = useRef<HTMLDivElement>(null);
  const mxInputRef = useRef<HTMLInputElement>(null);
  const lbankInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSymbols();
  }, []);

  const loadSymbols = async () => {
    try {
      setLoading(true);
      setError('');

      const [mxResponse, lbankResponse] = await Promise.all([
        fetch('/api/symbols/mx'),
        fetch('/api/symbols/lbank')
      ]);

      const mxData = await mxResponse.json();
      const lbankData = await lbankResponse.json();

      if (mxData.status === 'success' && lbankData.status === 'success') {
        setMxSymbols(mxData.symbols);
        setLbankSymbols(lbankData.symbols);
        
        // 設置默認值
        if (mxData.symbols.length > 0) {
          setSelectedMxSymbol(mxData.symbols[0]);
        }
        if (lbankData.symbols.length > 0) {
          setSelectedLbankSymbol(lbankData.symbols[0]);
        }
      } else {
        setError('載入幣種列表失敗');
      }
    } catch (err) {
      setError('載入幣種列表時發生錯誤');
      console.error('載入幣種列表失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMxSymbol && selectedLbankSymbol) {
      // 添加防抖機制，避免重複調用
      const timer = setTimeout(() => {
        onSymbolsChange({
          mx_symbol: selectedMxSymbol,
          lbank_symbol: selectedLbankSymbol
        });
      }, 300); // 300ms 防抖
      
      return () => clearTimeout(timer);
    }
  }, [selectedMxSymbol, selectedLbankSymbol, onSymbolsChange]);

  // 過濾符號列表
  const filteredMxSymbols = mxSymbols.filter(symbol =>
    symbol.toLowerCase().includes(mxSearchTerm.toLowerCase())
  );
  
  const filteredLbankSymbols = lbankSymbols.filter(symbol =>
    symbol.toLowerCase().includes(lbankSearchTerm.toLowerCase())
  );

  // 處理符號選擇
  const handleMxSymbolSelect = (symbol: string) => {
    setSelectedMxSymbol(symbol);
    setMxDropdownOpen(false);
    setMxSearchTerm('');
  };

  const handleLbankSymbolSelect = (symbol: string) => {
    setSelectedLbankSymbol(symbol);
    setLbankDropdownOpen(false);
    setLbankSearchTerm('');
  };

  // 處理輸入框點擊
  const handleMxInputClick = () => {
    if (!disabled) {
      setMxDropdownOpen(true);
      setMxSearchTerm('');
    }
  };

  const handleLbankInputClick = () => {
    if (!disabled) {
      setLbankDropdownOpen(true);
      setLbankSearchTerm('');
    }
  };

  // 處理鍵盤事件
  const handleKeyDown = (event: React.KeyboardEvent, symbols: string[], searchTerm: string, onSelect: (symbol: string) => void) => {
    if (event.key === 'Escape') {
      setMxDropdownOpen(false);
      setLbankDropdownOpen(false);
      setMxSearchTerm('');
      setLbankSearchTerm('');
    } else if (event.key === 'Enter' && symbols.length > 0) {
      onSelect(symbols[0]);
    }
  };

  // 點擊外部關閉下拉菜單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mxDropdownRef.current && !mxDropdownRef.current.contains(event.target as Node)) {
        setMxDropdownOpen(false);
        setMxSearchTerm('');
      }
      if (lbankDropdownRef.current && !lbankDropdownRef.current.contains(event.target as Node)) {
        setLbankDropdownOpen(false);
        setLbankSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 當下拉菜單打開時聚焦輸入框
  useEffect(() => {
    if (mxDropdownOpen && mxInputRef.current) {
      mxInputRef.current.focus();
    }
  }, [mxDropdownOpen]);

  useEffect(() => {
    if (lbankDropdownOpen && lbankInputRef.current) {
      lbankInputRef.current.focus();
    }
  }, [lbankDropdownOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <span className="ml-2 text-neutral">載入幣種列表中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-dark border border-border-dark rounded-lg p-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadSymbols}
          className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
        >
          重試
        </button>
      </div>
    );
  }

  const renderDropdown = (
    symbols: string[],
    filteredSymbols: string[],
    selectedSymbol: string,
    searchTerm: string,
    setSearchTerm: (term: string) => void,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    onSelect: (symbol: string) => void,
    dropdownRef: React.RefObject<HTMLDivElement>,
    inputRef: React.RefObject<HTMLInputElement>,
    placeholder: string,
    label: string
  ) => (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-neutral mb-2">
        {label}
      </label>
      
      {/* 顯示當前選中的符號 */}
      <div
        className={`flex items-center space-x-2 bg-card-dark border border-border-dark rounded-lg px-4 py-2 cursor-pointer hover:border-gray-500 transition-colors min-w-[160px] ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => {
          if (label === 'Mexc交易所') {
            handleMxInputClick();
          } else {
            handleLbankInputClick();
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={`選擇${label}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (label === 'Mexc交易所') {
              handleMxInputClick();
            } else {
              handleLbankInputClick();
            }
          }
        }}
      >
        <span className="text-white font-medium number-font">{selectedSymbol}</span>
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
              placeholder={`搜尋${label}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, filteredSymbols, searchTerm, onSelect)}
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
                    symbol === selectedSymbol ? 'bg-white bg-opacity-10' : ''
                  }`}
                  onClick={() => onSelect(symbol)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelect(symbol);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white number-font">{symbol}</span>
                    {symbol === selectedSymbol && (
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

  return (
    <div className="flex items-center space-x-4">
      {renderDropdown(
        mxSymbols,
        filteredMxSymbols,
        selectedMxSymbol,
        mxSearchTerm,
        setMxSearchTerm,
        mxDropdownOpen,
        setMxDropdownOpen,
        handleMxSymbolSelect,
        mxDropdownRef,
        mxInputRef,
        '搜尋Mexc交易對...',
        'Mexc交易所'
      )}
      
      {renderDropdown(
        lbankSymbols,
        filteredLbankSymbols,
        selectedLbankSymbol,
        lbankSearchTerm,
        setLbankSearchTerm,
        lbankDropdownOpen,
        setLbankDropdownOpen,
        handleLbankSymbolSelect,
        lbankDropdownRef,
        lbankInputRef,
        '搜尋LBank交易對...',
        'LBank交易所'
      )}
    </div>
  );
};

export default CustomSymbolSelector;
