from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class OrderBookEntry(BaseModel):
    """訂單簿條目"""
    price: float
    quantity: float

class OrderBook(BaseModel):
    """訂單簿數據模型"""
    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})
    
    exchange: str
    symbol: str
    bids: List[OrderBookEntry]  # 買單 (從高到低排序)
    asks: List[OrderBookEntry]  # 賣單 (從低到高排序)
    timestamp: datetime
    price_precision: int = 4  # 價格精度（小數位數）
    quantity_precision: int = 6  # 數量精度（小數位數）

class SpreadData(BaseModel):
    """價差數據模型"""
    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})
    
    symbol: str
    mode: str  # 'mx_buy_lbank_sell' 或 'lbank_buy_mx_sell'
    spread: float  # 價差
    spread_percentage: float  # 價差百分比
    max_quantity: float  # 可開最大數量
    buy_price: float  # 買入價格
    sell_price: float  # 賣出價格
    buy_exchange: str  # 買入交易所
    sell_exchange: str  # 賣出交易所
    timestamp: datetime
    
    @property
    def color(self) -> str:
        """根據價差返回顏色"""
        if self.spread > 0:
            return "green"
        elif self.spread < 0:
            return "red"
        else:
            return "gray"

class MarketData(BaseModel):
    """完整市場數據"""
    mx_orderbook: Optional[OrderBook] = None
    lbank_orderbook: Optional[OrderBook] = None
    spread_data: Optional[SpreadData] = None
    timestamp: datetime

class ExchangeInfo(BaseModel):
    """交易所信息"""
    exchange_name: str
    symbols: List[str]
    status: str

class Symbol(BaseModel):
    """交易對信息"""
    symbol: str
    base_asset: str
    quote_asset: str
    is_active: bool
    min_quantity: float
    max_quantity: float
    price_precision: int
    quantity_precision: int
