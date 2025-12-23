# Quick Test Commands for Different Instrument Types

## Individual Tests

### 1. Stocks
```bash
curl -X POST "http://localhost:8000/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL", "MSFT", "GOOGL"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

### 2. ETFs
```bash
curl -X POST "http://localhost:8000/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["SPY", "TLT", "QQQ"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

### 3. Indices (use ^ prefix)
```bash
curl -X POST "http://localhost:8000/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["^GSPC", "^DJI", "^IXIC"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

### 4. FX Pairs (use =X suffix)
```bash
curl -X POST "http://localhost:8000/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["EURUSD=X", "GBPUSD=X", "JPYUSD=X"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

### 5. Crypto (use -USD suffix)
```bash
curl -X POST "http://localhost:8000/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["BTC-USD", "ETH-USD", "SOL-USD"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

### 6. Futures (use =F suffix)
```bash
curl -X POST "http://localhost:8000/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["CL=F", "GC=F", "NG=F", "SI=F"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

### 7. Bond ETFs (Rates Proxies)
```bash
curl -X POST "http://localhost:8000/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["TLT", "IEF", "SHY", "HYG"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

## Multi-Asset Portfolio Tests

### Mixed Portfolio (Stocks + Bonds + Crypto)
```bash
curl -X POST "http://localhost:8000/api/risk/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "AAPL", "weight": 0.3},
      {"symbol": "TLT", "weight": 0.4},
      {"symbol": "BTC-USD", "weight": 0.3}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01",
    "benchmark": "SPY"
  }'
```

### Commodities Portfolio (Futures)
```bash
curl -X POST "http://localhost:8000/api/risk/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "CL=F", "weight": 0.5},
      {"symbol": "GC=F", "weight": 0.3},
      {"symbol": "NG=F", "weight": 0.2}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

### FX Portfolio
```bash
curl -X POST "http://localhost:8000/api/risk/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "EURUSD=X", "weight": 0.4},
      {"symbol": "GBPUSD=X", "weight": 0.3},
      {"symbol": "JPYUSD=X", "weight": 0.3}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

## Common Futures Symbols

- **CL=F** - Crude Oil (WTI)
- **GC=F** - Gold
- **SI=F** - Silver
- **NG=F** - Natural Gas
- **HG=F** - Copper
- **ZC=F** - Corn
- **ZS=F** - Soybeans
- **ZB=F** - 30-Year Treasury Bond
- **ZN=F** - 10-Year Treasury Note
- **ES=F** - E-mini S&P 500
- **NQ=F** - E-mini NASDAQ-100

## Common FX Pairs

- **EURUSD=X** - Euro/US Dollar
- **GBPUSD=X** - British Pound/US Dollar
- **JPYUSD=X** - Japanese Yen/US Dollar
- **AUDUSD=X** - Australian Dollar/US Dollar
- **CADUSD=X** - Canadian Dollar/US Dollar
- **CHFUSD=X** - Swiss Franc/US Dollar

## Common Crypto

- **BTC-USD** - Bitcoin
- **ETH-USD** - Ethereum
- **SOL-USD** - Solana
- **ADA-USD** - Cardano
- **DOGE-USD** - Dogecoin
- **XRP-USD** - Ripple

