#!/usr/bin/env python3
"""
LBMX即時價差監控系統啟動腳本
"""

import uvicorn
import sys
import os

# 添加應用目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # 獲取端口 (Fly.io 會設置 PORT 環境變量)
    port = int(os.environ.get("PORT", 8001))
    
    # 檢查是否為生產環境
    is_production = os.environ.get("ENVIRONMENT") == "production"
    
    # 配置
    config = {
        "app": "app.main:app",
        "host": "0.0.0.0",
        "port": port,
        "reload": not is_production,  # 生產環境不啟用自動重載
        "log_level": "info",
        "access_log": True,
    }
    
    print("🚀 啟動LBMX即時價差監控系統...")
    print(f"📍 服務地址: http://0.0.0.0:{port}")
    print(f"📊 API文檔: http://0.0.0.0:{port}/docs")
    print(f"🌍 環境: {'生產' if is_production else '開發'}")
    print("=" * 50)
    
    try:
        uvicorn.run(**config)
    except KeyboardInterrupt:
        print("\n👋 服務已停止")
    except Exception as e:
        print(f"❌ 啟動失敗: {e}")
        sys.exit(1)
