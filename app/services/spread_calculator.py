import logging
from datetime import datetime
from typing import Optional

from ..models.market_data import OrderBook, SpreadData

logger = logging.getLogger(__name__)

class SpreadCalculator:
    """價差計算服務"""
    
    def calculate_spread(
        self, 
        mx_orderbook: OrderBook, 
        lbank_orderbook: OrderBook, 
        mode: str
    ) -> Optional[SpreadData]:
        """
        計算價差
        
        Args:
            mx_orderbook: MX交易所訂單簿
            lbank_orderbook: LBank交易所訂單簿
            mode: 交易模式 ('mx_buy_lbank_sell' 或 'lbank_buy_mx_sell')
        
        Returns:
            SpreadData: 價差數據
        """
        try:
            if mode == "mx_buy_lbank_sell":
                return self._calculate_mx_buy_lbank_sell(mx_orderbook, lbank_orderbook)
            elif mode == "lbank_buy_mx_sell":
                return self._calculate_lbank_buy_mx_sell(mx_orderbook, lbank_orderbook)
            else:
                logger.error(f"不支援的交易模式: {mode}")
                return None
        except Exception as e:
            logger.error(f"計算價差失敗: {e}")
            return None
    
    def _calculate_mx_buy_lbank_sell(
        self, 
        mx_orderbook: OrderBook, 
        lbank_orderbook: OrderBook
    ) -> Optional[SpreadData]:
        """
        計算MX買入、LBank賣出的價差
        MX買入 = MX的ask（最低賣價）
        LBank賣出 = LBank的bid（最高買價）
        價差 = LBank的bid - MX的ask
        """
        if not mx_orderbook.asks or not lbank_orderbook.bids:
            return None
        
        # MX的ask最低價（我們在這裡買入）
        mx_lowest_ask = mx_orderbook.asks[0]
        buy_price = mx_lowest_ask.price
        
        # LBank的bid最高價（我們在這裡賣出）
        lbank_highest_bid = lbank_orderbook.bids[0]
        sell_price = lbank_highest_bid.price
        
        # 計算價差：LBank bid - MX ask
        spread = lbank_highest_bid.price - mx_lowest_ask.price
        spread_percentage = (spread / buy_price) * 100 if buy_price > 0 else 0
        
        # 可開最大數量（取較小者）
        max_quantity = min(mx_lowest_ask.quantity, lbank_highest_bid.quantity)
        
        return SpreadData(
            symbol=mx_orderbook.symbol,
            mode="mx_buy_lbank_sell",
            spread=spread,
            spread_percentage=spread_percentage,
            max_quantity=max_quantity,
            buy_price=buy_price,
            sell_price=sell_price,
            buy_exchange="Mexc",
            sell_exchange="LBank",
            timestamp=datetime.now()
        )
    
    def _calculate_lbank_buy_mx_sell(
        self, 
        mx_orderbook: OrderBook, 
        lbank_orderbook: OrderBook
    ) -> Optional[SpreadData]:
        """
        計算LBank買入、MX賣出的價差
        LBank買入 = LBank的ask（最低賣價）
        MX賣出 = MX的bid（最高買價）
        價差 = MX的bid - LBank的ask
        """
        if not lbank_orderbook.asks or not mx_orderbook.bids:
            return None
        
        # LBank的ask最低價（我們在這裡買入）
        lbank_lowest_ask = lbank_orderbook.asks[0]
        buy_price = lbank_lowest_ask.price
        
        # MX的bid最高價（我們在這裡賣出）
        mx_highest_bid = mx_orderbook.bids[0]
        sell_price = mx_highest_bid.price
        
        # 計算價差：MX bid - LBank ask
        spread = mx_highest_bid.price - lbank_lowest_ask.price
        spread_percentage = (spread / buy_price) * 100 if buy_price > 0 else 0
        
        # 可開最大數量（取較小者）
        max_quantity = min(lbank_lowest_ask.quantity, mx_highest_bid.quantity)
        
        return SpreadData(
            symbol=lbank_orderbook.symbol,
            mode="lbank_buy_mx_sell",
            spread=spread,
            spread_percentage=spread_percentage,
            max_quantity=max_quantity,
            buy_price=buy_price,
            sell_price=sell_price,
            buy_exchange="LBank",
            sell_exchange="Mexc",
            timestamp=datetime.now()
        )
    
    def calculate_profit_potential(
        self, 
        spread_data: SpreadData, 
        investment_amount: float
    ) -> dict:
        """
        計算潛在收益
        
        Args:
            spread_data: 價差數據
            investment_amount: 投資金額
        
        Returns:
            dict: 包含收益計算的字典
        """
        if spread_data.buy_price <= 0:
            return {"error": "無效的買入價格"}
        
        # 可購買數量
        max_tradeable_quantity = investment_amount / spread_data.buy_price
        
        # 實際可執行數量（受訂單簿深度限制）
        actual_quantity = min(max_tradeable_quantity, spread_data.max_quantity)
        
        # 實際投資金額
        actual_investment = actual_quantity * spread_data.buy_price
        
        # 潛在收益
        potential_profit = actual_quantity * spread_data.spread
        
        # 收益率
        profit_rate = (potential_profit / actual_investment) * 100 if actual_investment > 0 else 0
        
        return {
            "investment_amount": investment_amount,
            "actual_investment": actual_investment,
            "tradeable_quantity": actual_quantity,
            "potential_profit": potential_profit,
            "profit_rate": profit_rate,
            "spread_percentage": spread_data.spread_percentage
        }
