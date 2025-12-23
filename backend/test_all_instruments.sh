#!/bin/bash
# Test script for various instrument types
# Usage: ./test_all_instruments.sh

BASE_URL="http://localhost:8000"

echo "=========================================="
echo "Testing Universal Instrument Support"
echo "=========================================="
echo ""

# Test 1: Stocks
echo "1. Testing STOCKS (AAPL, MSFT, GOOGL)..."
curl -s -X POST "$BASE_URL/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL", "MSFT", "GOOGL"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }' | python3 -m json.tool | head -20
echo ""

# Test 2: ETFs
echo "2. Testing ETFs (SPY, TLT, QQQ)..."
curl -s -X POST "$BASE_URL/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["SPY", "TLT", "QQQ"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }' | python3 -m json.tool | head -20
echo ""

# Test 3: Indices
echo "3. Testing INDICES (^GSPC, ^DJI)..."
curl -s -X POST "$BASE_URL/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["^GSPC", "^DJI"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }' | python3 -m json.tool | head -20
echo ""

# Test 4: FX Pairs
echo "4. Testing FX PAIRS (EURUSD=X, GBPUSD=X)..."
curl -s -X POST "$BASE_URL/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["EURUSD=X", "GBPUSD=X"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }' | python3 -m json.tool | head -20
echo ""

# Test 5: Crypto
echo "5. Testing CRYPTO (BTC-USD, ETH-USD)..."
curl -s -X POST "$BASE_URL/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["BTC-USD", "ETH-USD"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }' | python3 -m json.tool | head -20
echo ""

# Test 6: Futures
echo "6. Testing FUTURES (CL=F, GC=F, NG=F)..."
curl -s -X POST "$BASE_URL/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["CL=F", "GC=F", "NG=F"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }' | python3 -m json.tool | head -20
echo ""

# Test 7: Bond ETFs (Rates Proxies)
echo "7. Testing BOND ETFs / RATES PROXIES (TLT, IEF, SHY)..."
curl -s -X POST "$BASE_URL/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["TLT", "IEF", "SHY"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }' | python3 -m json.tool | head -20
echo ""

# Test 8: Mixed Portfolio (Multi-Asset)
echo "8. Testing MIXED PORTFOLIO (Stocks + Bonds + Crypto)..."
curl -s -X POST "$BASE_URL/api/risk/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "AAPL", "weight": 0.3},
      {"symbol": "TLT", "weight": 0.4},
      {"symbol": "BTC-USD", "weight": 0.3}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01",
    "benchmark": "SPY",
    "rolling_windows": [30, 90, 252]
  }' | python3 -m json.tool | head -30
echo ""

# Test 9: Futures Portfolio
echo "9. Testing FUTURES PORTFOLIO (Oil + Gold)..."
curl -s -X POST "$BASE_URL/api/risk/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "CL=F", "weight": 0.6},
      {"symbol": "GC=F", "weight": 0.4}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01",
    "benchmark": "SPY",
    "rolling_windows": [30, 90]
  }' | python3 -m json.tool | head -30
echo ""

# Test 10: FX Portfolio
echo "10. Testing FX PORTFOLIO (EUR/USD + GBP/USD)..."
curl -s -X POST "$BASE_URL/api/risk/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "EURUSD=X", "weight": 0.5},
      {"symbol": "GBPUSD=X", "weight": 0.5}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01",
    "rolling_windows": [30, 90]
  }' | python3 -m json.tool | head -30
echo ""

echo "=========================================="
echo "Testing Complete!"
echo "=========================================="

