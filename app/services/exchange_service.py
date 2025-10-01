import aiohttp
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Set

from ..models.market_data import OrderBook, OrderBookEntry, Symbol

logger = logging.getLogger(__name__)

class ExchangeService:
    """交易所服務，處理MX和LBank的API請求"""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.current_symbol: str = "BTC/USDT"
        self.mx_symbols: Set[str] = set()
        self.lbank_symbols: Set[str] = set()
        self.symbol_precision: Dict[str, Dict[str, int]] = {}  # 存儲精度信息
        
        # API端點
        self.mx_base_url = "https://api.mexc.com"
        self.lbank_base_url = "https://api.lbank.info"
    
    async def initialize(self):
        """初始化服務"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10)
        )
        
        # 獲取交易對列表
        await self._load_exchange_symbols()
        logger.info("交易所服務初始化完成")
    
    async def close(self):
        """關閉服務"""
        if self.session:
            await self.session.close()
    
    async def _load_exchange_symbols(self):
        """載入兩個交易所的交易對列表"""
        try:
            # 同時獲取兩個交易所的交易對
            mx_task = self._get_mx_symbols()
            lbank_task = self._get_lbank_symbols()
            
            mx_symbols, lbank_symbols = await asyncio.gather(
                mx_task, lbank_task, return_exceptions=True
            )
            
            if isinstance(mx_symbols, Exception):
                logger.error(f"獲取MX交易對失敗: {mx_symbols}")
                mx_symbols = set()
            
            if isinstance(lbank_symbols, Exception):
                logger.error(f"獲取LBank交易對失敗: {lbank_symbols}")
                lbank_symbols = set()
            
            self.mx_symbols = mx_symbols
            self.lbank_symbols = lbank_symbols
            
            common_count = len(self.mx_symbols & self.lbank_symbols)
            logger.info(f"MX交易對數量: {len(self.mx_symbols)}, LBank交易對數量: {len(self.lbank_symbols)}, 共同交易對: {common_count}")
            
        except Exception as e:
            logger.error(f"載入交易對列表失敗: {e}")
    
    async def _get_mx_symbols(self) -> Set[str]:
        """獲取MX交易所的交易對列表"""
        try:
            url = f"{self.mx_base_url}/api/v3/exchangeInfo"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    symbols = set()
                    
                    for symbol_info in data.get('symbols', []):
                        # MX API中狀態為"1"表示可交易
                        if symbol_info.get('status') == '1':
                            symbol = symbol_info.get('symbol', '')
                            # 轉換格式：BTCUSDT -> BTC/USDT
                            if symbol.endswith('USDT'):
                                base = symbol[:-4]
                                formatted_symbol = f"{base}/USDT"
                                symbols.add(formatted_symbol)
                                
                                # 保存精度信息
                                self.symbol_precision[formatted_symbol] = {
                                    'price_precision': symbol_info.get('quotePrecision', 4),
                                    'quantity_precision': symbol_info.get('baseAssetPrecision', 6)
                                }
                    
                    return symbols
                else:
                    logger.error(f"MX API請求失敗: {response.status}")
                    return set()
        except Exception as e:
            logger.error(f"獲取MX交易對失敗: {e}")
            return set()
    
    async def _get_lbank_symbols(self) -> Set[str]:
        """獲取LBank交易所的交易對列表"""
        try:
            url = f"{self.lbank_base_url}/v1/currencyPairs.do"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    symbols = set()
                    
                    # LBank API直接返回數組
                    symbol_list = data if isinstance(data, list) else data.get('data', [])
                    
                    for symbol in symbol_list:
                        # LBank格式：btc_usdt -> BTC/USDT
                        if '_usdt' in symbol.lower():
                            parts = symbol.upper().split('_')
                            if len(parts) == 2:
                                formatted_symbol = f"{parts[0]}/{parts[1]}"
                                symbols.add(formatted_symbol)
                    
                    return symbols
                else:
                    logger.error(f"LBank API請求失敗: {response.status}")
                    return set()
        except Exception as e:
            logger.error(f"獲取LBank交易對失敗: {e}")
            return set()
    
    async def get_common_symbols(self) -> List[str]:
        """獲取兩個交易所共同的交易對"""
        if not self.mx_symbols or not self.lbank_symbols:
            await self._load_exchange_symbols()
        
        common_symbols = sorted(list(self.mx_symbols & self.lbank_symbols))
        return common_symbols
    
    def _calculate_precision(self, price_str: str) -> int:
        """從價格字符串計算實際精度"""
        try:
            # 移除尾部的0
            price_str = price_str.rstrip('0').rstrip('.')
            if '.' in price_str:
                return len(price_str.split('.')[1])
            return 0
        except:
            return 4  # 默認4位
    
    async def get_mx_orderbook(self, symbol: str) -> Optional[OrderBook]:
        """獲取MX交易所的訂單簿"""
        try:
            # 轉換格式：BTC/USDT -> BTCUSDT
            mx_symbol = symbol.replace('/', '')
            url = f"{self.mx_base_url}/api/v3/depth"
            params = {'symbol': mx_symbol, 'limit': 20}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # 解析買單和賣單
                    bids = [
                        OrderBookEntry(price=float(bid[0]), quantity=float(bid[1]))
                        for bid in data.get('bids', [])
                    ]
                    asks = [
                        OrderBookEntry(price=float(ask[0]), quantity=float(ask[1]))
                        for ask in data.get('asks', [])
                    ]
                    
                    # 從實際數據計算精度
                    price_precision = 4  # 默認
                    quantity_precision = 6  # 默認
                    
                    if data.get('asks') and len(data['asks']) > 0:
                        # 取第一個ask的價格字符串來計算精度
                        price_precision = self._calculate_precision(data['asks'][0][0])
                    if data.get('bids') and len(data['bids']) > 0:
                        # 取第一個bid的數量字符串來計算精度
                        quantity_precision = self._calculate_precision(data['bids'][0][1])
                    
                    # 至少保持4位小數
                    price_precision = max(price_precision, 4)
                    
                    return OrderBook(
                        exchange="MX",
                        symbol=symbol,
                        bids=bids,
                        asks=asks,
                        timestamp=datetime.now(),
                        price_precision=price_precision,
                        quantity_precision=quantity_precision
                    )
                else:
                    logger.error(f"MX訂單簿API請求失敗: {response.status}")
                    return None
        except Exception as e:
            logger.error(f"獲取MX訂單簿失敗: {e}")
            return None
    
    async def get_lbank_orderbook(self, symbol: str) -> Optional[OrderBook]:
        """獲取LBank交易所的訂單簿"""
        try:
            # 轉換格式：BTC/USDT -> btc_usdt
            lbank_symbol = symbol.lower().replace('/', '_')
            url = f"{self.lbank_base_url}/v1/depth.do"
            params = {'symbol': lbank_symbol, 'size': 20}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # LBank API可能直接返回訂單簿數據或包含result字段
                    if 'result' in data and data.get('result') != 'true':
                        logger.error(f"LBank API返回錯誤: {data}")
                        return None
                    
                    # 解析買單和賣單 - 處理不同的響應格式
                    if 'data' in data:
                        # 格式1: {"result": "true", "data": {"bids": [...], "asks": [...]}}
                        order_data = data['data']
                    else:
                        # 格式2: {"bids": [...], "asks": [...]}
                        order_data = data
                    
                    bids = [
                        OrderBookEntry(price=float(bid[0]), quantity=float(bid[1]))
                        for bid in order_data.get('bids', [])
                    ]
                    asks = [
                        OrderBookEntry(price=float(ask[0]), quantity=float(ask[1]))
                        for ask in order_data.get('asks', [])
                    ]
                    
                    # 從實際數據計算精度
                    price_precision = 4  # 默認
                    quantity_precision = 6  # 默認
                    
                    if order_data.get('asks') and len(order_data['asks']) > 0:
                        # 取第一個ask的價格字符串來計算精度
                        price_precision = self._calculate_precision(str(order_data['asks'][0][0]))
                    if order_data.get('bids') and len(order_data['bids']) > 0:
                        # 取第一個bid的數量字符串來計算精度
                        quantity_precision = self._calculate_precision(str(order_data['bids'][0][1]))
                    
                    # 至少保持4位小數
                    price_precision = max(price_precision, 4)
                    
                    return OrderBook(
                        exchange="LBank",
                        symbol=symbol,
                        bids=bids,
                        asks=asks,
                        timestamp=datetime.now(),
                        price_precision=price_precision,
                        quantity_precision=quantity_precision
                    )
                else:
                    logger.error(f"LBank訂單簿API請求失敗: {response.status}")
                    return None
        except Exception as e:
            logger.error(f"獲取LBank訂單簿失敗: {e}")
            return None
