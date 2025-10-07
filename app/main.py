from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import json
import asyncio
import os
from typing import Dict, List, Optional
import logging

from .services.exchange_service import ExchangeService
from .services.spread_calculator import SpreadCalculator
from .models.market_data import MarketData, OrderBook, SpreadData

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LBMX即時價差監控系統", version="1.0.0")

# CORS設置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生產環境中應該限制為特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全域變數儲存服務實例
exchange_service = ExchangeService()
spread_calculator = SpreadCalculator()

# WebSocket連接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"新的WebSocket連接，目前連接數: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket連接斷開，目前連接數: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        if not self.active_connections:
            logger.debug(f"沒有WebSocket連接，跳過廣播")
            return
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"發送訊息失敗: {e}")
                disconnected.append(connection)
        
        # 移除斷開的連接
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    """應用啟動時初始化交易所連接"""
    try:
        await exchange_service.initialize()
        logger.info("交易所服務初始化完成")
        
        # 開始背景任務
        asyncio.create_task(market_data_stream())
        logger.info("市場數據流任務已啟動")
    except Exception as e:
        logger.error(f"啟動時發生錯誤: {e}")

async def market_data_stream():
    """背景任務：處理市場數據並廣播給客戶端"""
    last_data = {}  # 緩存上次的數據，避免重複廣播
    
    while True:
        try:
            # 獲取當前選中的交易對
            current_symbol = getattr(exchange_service, 'current_symbol', 'BTC/USDT')
            
            # 獲取兩個交易所的訂單簿
            mx_orderbook = await exchange_service.get_mx_orderbook(current_symbol)
            # 在自選模式下，LBank使用自選的幣種，否則使用當前幣種
            lbank_symbol = current_symbol
            if exchange_service.custom_mode and exchange_service.custom_lbank_symbol:
                lbank_symbol = exchange_service.custom_lbank_symbol
            lbank_orderbook = await exchange_service.get_lbank_orderbook(lbank_symbol)
            
            if mx_orderbook and lbank_orderbook:
                # 計算價差數據
                for mode in ['mx_buy_lbank_sell', 'lbank_buy_mx_sell']:
                    spread_data = spread_calculator.calculate_spread(
                        mx_orderbook, lbank_orderbook, mode
                    )
                    
                    if spread_data:
                        # 構建廣播數據
                        broadcast_data = {
                            'type': 'market_update',
                            'symbol': current_symbol,
                            'mode': mode,
                            'mx_orderbook': mx_orderbook.model_dump(),
                            'lbank_orderbook': lbank_orderbook.model_dump(),
                            'spread_data': spread_data.model_dump(),
                            'timestamp': spread_data.timestamp.isoformat()
                        }
                        
                        # 檢查數據是否有變化，避免重複廣播
                        data_key = f"{current_symbol}_{mode}"
                        data_hash = hash(json.dumps(broadcast_data, default=str, sort_keys=True))
                        
                        if last_data.get(data_key) != data_hash:
                            await manager.broadcast(json.dumps(broadcast_data, default=str))
                            last_data[data_key] = data_hash
                            logger.debug(f"廣播數據: {mode}, 價差={spread_data.spread:.6f}, 連接數={len(manager.active_connections)}")
                        else:
                            logger.debug(f"數據未變化，跳過廣播: {mode}")
                    else:
                        logger.warning(f"價差計算失敗: {mode}")
            else:
                logger.warning(f"訂單簿數據不完整: MX={bool(mx_orderbook)}, LBank={bool(lbank_orderbook)}")
            
            await asyncio.sleep(1)  # 每秒更新一次
            
        except Exception as e:
            logger.error(f"市場數據流錯誤: {e}")
            await asyncio.sleep(5)

@app.get("/api/symbols")
async def get_available_symbols():
    """獲取可用的交易對列表"""
    try:
        symbols = await exchange_service.get_common_symbols()
        return {"symbols": symbols, "status": "success"}
    except Exception as e:
        logger.error(f"獲取交易對列表失敗: {e}")
        return {"symbols": [], "status": "error", "message": str(e)}

class SymbolRequest(BaseModel):
    symbol: str

@app.post("/api/symbol")
async def set_current_symbol(request: SymbolRequest):
    """設置當前監控的交易對"""
    try:
        exchange_service.current_symbol = request.symbol
        logger.info(f"切換到交易對: {request.symbol}")
        return {"status": "success", "symbol": request.symbol}
    except Exception as e:
        logger.error(f"設置交易對失敗: {e}")
        return {"status": "error", "message": str(e)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket端點，用於即時數據推送"""
    await manager.connect(websocket)
    try:
        while True:
            # 保持連接活躍
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket錯誤: {e}")
        manager.disconnect(websocket)

@app.get("/api/health")
async def health_check():
    """健康檢查端點"""
    return {"status": "healthy", "service": "lbmx-spread-monitor"}

@app.get("/api/symbols/mx")
async def get_mx_symbols():
    """獲取MX交易所的幣種列表"""
    try:
        symbols = await exchange_service.get_mx_symbols()
        return {"symbols": symbols, "status": "success"}
    except Exception as e:
        logger.error(f"獲取MX幣種列表失敗: {e}")
        return {"symbols": [], "status": "error", "message": str(e)}

@app.get("/api/symbols/lbank")
async def get_lbank_symbols():
    """獲取LBank交易所的幣種列表"""
    try:
        symbols = await exchange_service.get_lbank_symbols()
        return {"symbols": symbols, "status": "success"}
    except Exception as e:
        logger.error(f"獲取LBank幣種列表失敗: {e}")
        return {"symbols": [], "status": "error", "message": str(e)}

class CustomSymbolRequest(BaseModel):
    mx_symbol: str
    lbank_symbol: str

@app.post("/api/symbol/custom")
async def set_custom_symbols(request: CustomSymbolRequest):
    """設置自選模式的交易對"""
    try:
        # 驗證幣種是否存在
        mx_symbols = await exchange_service.get_mx_symbols()
        lbank_symbols = await exchange_service.get_lbank_symbols()
        
        if request.mx_symbol not in mx_symbols:
            return {"status": "error", "message": f"MX交易所沒有 {request.mx_symbol} 幣種"}
        
        if request.lbank_symbol not in lbank_symbols:
            return {"status": "error", "message": f"LBank交易所沒有 {request.lbank_symbol} 幣種"}
        
        # 設置自選模式
        exchange_service.current_symbol = request.mx_symbol
        exchange_service.custom_mode = True
        exchange_service.custom_mx_symbol = request.mx_symbol
        exchange_service.custom_lbank_symbol = request.lbank_symbol
        
        logger.info(f"設置自選模式: MX={request.mx_symbol}, LBank={request.lbank_symbol}")
        return {
            "status": "success", 
            "mx_symbol": request.mx_symbol,
            "lbank_symbol": request.lbank_symbol
        }
    except Exception as e:
        logger.error(f"設置自選幣種失敗: {e}")
        return {"status": "error", "message": str(e)}

# 靜態文件服務 (用於 Fly.io 部署)
if os.path.exists("frontend/build"):
    app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static")
    
    @app.get("/")
    async def serve_frontend():
        """服務前端應用"""
        return FileResponse("frontend/build/index.html")
    
    @app.get("/{path:path}")
    async def serve_frontend_routes(path: str):
        """處理前端路由"""
        # 如果是 API 路由或 WebSocket，不處理
        if path.startswith("api/") or path.startswith("ws") or path.startswith("docs") or path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # 否則返回前端 index.html
        return FileResponse("frontend/build/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
