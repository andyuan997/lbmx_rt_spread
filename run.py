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
    # 開發環境配置
    config = {
        "app": "app.main:app",
        "host": "0.0.0.0",
        "port": 8001,
        "reload": True,  # 開發模式下啟用自動重載
        "log_level": "info",
        "access_log": True,
    }
    
    print("🚀 啟動LBMX即時價差監控系統...")
    print(f"📍 服務地址: http://localhost:{config['port']}")
    print(f"📊 API文檔: http://localhost:{config['port']}/docs")
    print("=" * 50)
    
    try:
        uvicorn.run(**config)
    except KeyboardInterrupt:
        print("\n👋 服務已停止")
    except Exception as e:
        print(f"❌ 啟動失敗: {e}")
        sys.exit(1)
