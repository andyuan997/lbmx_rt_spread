import React, { useState, useEffect, useCallback } from 'react';
import { MarketUpdate, TradingMode, ChartDataPoint, OrderBook, SpreadData } from './types/market';
import SymbolSearch from './components/SymbolSearch';
import OrderBookComponent from './components/OrderBookComponent';
import SpreadChart from './components/SpreadChart';
import TradingModeToggle from './components/TradingModeToggle';
import SpreadDisplay from './components/SpreadDisplay';
import ConnectionStatus from './components/ConnectionStatus';

const App: React.FC = () => {
  // 狀態管理
  const [currentSymbol, setCurrentSymbol] = useState<string>('BTC/USDT');
  const [tradingMode, setTradingMode] = useState<TradingMode>('mx_buy_lbank_sell');
  const [mxOrderBook, setMxOrderBook] = useState<OrderBook | null>(null);
  const [lbankOrderBook, setLbankOrderBook] = useState<OrderBook | null>(null);
  const [spreadData, setSpreadData] = useState<SpreadData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  
  // WebSocket連接
  const [ws, setWs] = useState<WebSocket | null>(null);

  // WebSocket連接管理
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // 開發環境使用8000端口，生產環境使用當前host
    const host = process.env.NODE_ENV === 'development' ? 'localhost:8001' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket連接已建立:', wsUrl);
      setIsConnected(true);
      setIsInitializing(false);
    };
    
    websocket.onmessage = (event) => {
      try {
        const data: MarketUpdate = JSON.parse(event.data);
        console.log('收到WebSocket數據:', data.type, data.symbol, data.mode);
        
        if (data.type === 'market_update' && data.symbol === currentSymbol) {
          // 更新訂單簿數據
          setMxOrderBook(data.mx_orderbook);
          setLbankOrderBook(data.lbank_orderbook);
          
          // 只更新當前模式的價差數據
          if (data.mode === tradingMode) {
            setSpreadData(data.spread_data);
            
            // 更新圖表數據 - 避免重複添加相同時間戳的數據
            const newDataPoint: ChartDataPoint = {
              timestamp: Date.now(),
              spread: data.spread_data.spread,
              spread_percentage: data.spread_data.spread_percentage,
              time: new Date().toLocaleTimeString()
            };
            
            setChartData(prev => {
              // 檢查是否是相同時間戳的數據，避免重複添加
              const lastPoint = prev[prev.length - 1];
              if (lastPoint && Math.abs(newDataPoint.timestamp - lastPoint.timestamp) < 500) {
                // 如果時間差小於500ms，更新最後一個點而不是添加新點
                const updated = [...prev];
                updated[updated.length - 1] = newDataPoint;
                return updated;
              } else {
                // 添加新數據點
                const newData = [...prev, newDataPoint];
                // 保持最近300個數據點（5分鐘）
                return newData.slice(-300);
              }
            });
          }
        }
      } catch (error) {
        console.error('處理WebSocket訊息時發生錯誤:', error);
      }
    };
    
    websocket.onclose = () => {
      console.log('WebSocket連接已斷開');
      setIsConnected(false);
      setIsInitializing(false);
      
      // 自動重連
      setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket錯誤:', error);
      console.error('嘗試連接的URL:', wsUrl);
      setIsConnected(false);
      setIsInitializing(false);
    };
    
    setWs(websocket);
  }, [currentSymbol, tradingMode]);

  // 載入可用交易對
  const loadAvailableSymbols = async () => {
    try {
        const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8001' : '';
      const response = await fetch(`${apiUrl}/api/symbols`);
      const data = await response.json();
      if (data.status === 'success') {
        setAvailableSymbols(data.symbols);
      }
    } catch (error) {
      console.error('載入交易對列表失敗:', error);
    }
  };

  // 切換交易對
  const handleSymbolChange = async (symbol: string) => {
    try {
        const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8001' : '';
      const response = await fetch(`${apiUrl}/api/symbol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol }),
      });
      
      if (response.ok) {
        setCurrentSymbol(symbol);
        // 清空圖表數據
        setChartData([]);
      }
    } catch (error) {
      console.error('切換交易對失敗:', error);
    }
  };

  // 切換交易模式
  const handleModeChange = (mode: TradingMode) => {
    setTradingMode(mode);
    // 清空圖表數據，因為不同模式的價差不同
    setChartData([]);
  };

  // 初始化
  useEffect(() => {
    console.log('初始化應用程序...');
    loadAvailableSymbols();
    connectWebSocket();
    
    return () => {
      if (ws) {
        console.log('關閉WebSocket連接');
        ws.close();
      }
    };
  }, []);

  // 當交易對或模式改變時重新連接
  useEffect(() => {
    if (ws) {
      ws.close();
    }
    connectWebSocket();
  }, [currentSymbol, tradingMode]);

  return (
    <div className="min-h-screen bg-bg-dark text-white p-4">
      {/* 頂部工具欄 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">LBMX即時價差監控</h1>
          <ConnectionStatus isConnected={isConnected} />
        </div>
        
        <div className="flex items-center space-x-4">
          <SymbolSearch
            symbols={availableSymbols}
            currentSymbol={currentSymbol}
            onSymbolChange={handleSymbolChange}
          />
        </div>
      </div>

      {/* 主要內容區域 */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
        {/* 左側：Mexc訂單簿 */}
        <div className="col-span-3">
        <OrderBookComponent
          orderBook={mxOrderBook}
          title="Mexc交易所"
          exchange="mx"
          tradingMode={tradingMode}
          isConnected={isConnected}
        />
        </div>

        {/* 中間：價差圖表 */}
        <div className="col-span-6 flex flex-col">
          {/* 圖表頂部信息 */}
          <div className="flex justify-between items-center mb-4">
            <SpreadDisplay 
              spreadData={spreadData} 
              mxOrderBook={mxOrderBook}
              lbankOrderBook={lbankOrderBook}
            />
            <TradingModeToggle
              currentMode={tradingMode}
              onModeChange={handleModeChange}
            />
          </div>
          
          {/* 價差線圖 */}
          <div className="flex-1 bg-card-dark border border-border-dark rounded-lg p-4">
            <SpreadChart data={chartData} tradingMode={tradingMode} />
          </div>
        </div>

        {/* 右側：LBank訂單簿 */}
        <div className="col-span-3">
        <OrderBookComponent
          orderBook={lbankOrderBook}
          title="LBank交易所"
          exchange="lbank"
          tradingMode={tradingMode}
          isConnected={isConnected}
        />
        </div>
      </div>
    </div>
  );
};

export default App;
