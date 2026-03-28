# Moonshot Trading Backend

Backend API for gamified crypto trading with real-time Pyth Network price feeds. Implements position management with long/short trading, leverage, P&L calculation, and liquidation logic.

## Features

- ✅ Real-time price feeds from Pyth Network (BTC, ETH, SOL)
- ✅ Long/Short position management
- ✅ Configurable leverage (1500x - 10000x)
- ✅ Automatic liquidation on stop-loss
- ✅ Live P&L tracking
- ✅ Position duration (5-45 seconds)
- ✅ Virtual balance management
- ✅ Wallet-ready architecture

## Setup

### 1. Create and activate virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

## Running the Server

### Development Mode
```bash
source venv/bin/activate
python main.py
```

### Production Mode
```bash
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

### With Auto-reload
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

## API Endpoints

### Health & Status

#### `GET /`
Root endpoint showing API status and price feed connection.

**Response:**
```json
{
  "message": "Moonshot Trading API",
  "status": "online",
  "price_feed_connected": true
}
```

#### `GET /health`
Health check with active position count.

**Response:**
```json
{
  "status": "healthy",
  "price_feed_connected": true,
  "active_positions": 2
}
```

#### `GET /prices`
Get current real-time prices for all assets.

**Response:**
```json
{
  "prices": {
    "BTC": 66858.14,
    "ETH": 2022.47,
    "SOL": 83.48
  },
  "connected": true
}
```

### Balance Management

#### `GET /balance`
Get current virtual balance.

**Response:**
```json
{
  "balance": 1000.0,
  "wallet_address": null
}
```

#### `POST /balance/reset`
Reset balance to $1000 (for testing).

**Response:**
```json
{
  "balance": 1000.0,
  "wallet_address": null
}
```

### Position Management

#### `POST /positions/open`
Open a new trading position.

**Request Body:**
```json
{
  "asset": "BTC",
  "direction": "LONG",
  "leverage": 2000,
  "stake": 50,
  "duration": 30,
  "wallet_address": null
}
```

**Parameters:**
- `asset` (string, required): "BTC", "ETH", or "SOL"
- `direction` (string, required): "LONG" or "SHORT"
- `leverage` (float, required): Leverage multiplier (e.g., 1500, 2000, 5000)
- `stake` (float, required): Stake amount in virtual currency
- `duration` (int, required): Duration in seconds (5-45)
- `wallet_address` (string, optional): Wallet address for future integration

**Response:**
```json
{
  "position": {
    "id": "c2922cd6-a727-4c45-a501-acc9a66f3d82",
    "asset": "BTC",
    "direction": "LONG",
    "leverage": 2000,
    "stake": 50,
    "duration": 30,
    "entry_price": null,
    "current_price": null,
    "pnl_percent": 0.0,
    "pnl_dollars": 0.0,
    "stop_loss_percent": -0.05,
    "status": "PENDING",
    "opened_at": null,
    "closed_at": null,
    "time_remaining": null,
    "wallet_address": null
  },
  "balance": 950.0
}
```

#### `GET /positions/{position_id}`
Get details of a specific position with live P&L updates.

**Response:**
```json
{
  "id": "c2922cd6-a727-4c45-a501-acc9a66f3d82",
  "asset": "BTC",
  "direction": "LONG",
  "leverage": 2000,
  "stake": 50,
  "duration": 30,
  "entry_price": 66857.02,
  "current_price": 66865.50,
  "pnl_percent": 0.253,
  "pnl_dollars": 0.1265,
  "stop_loss_percent": -0.05,
  "status": "OPEN",
  "opened_at": "2026-03-28T17:11:34.437290",
  "closed_at": null,
  "time_remaining": 23.5,
  "wallet_address": null
}
```

#### `GET /positions`
Get all positions (active and historical).

**Response:**
```json
{
  "positions": [...],
  "total": 5
}
```

## Usage Examples

### Opening a Long Position
```bash
curl -X POST http://localhost:8000/positions/open \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "BTC",
    "direction": "LONG",
    "leverage": 2000,
    "stake": 50,
    "duration": 30
  }'
```

### Opening a Short Position
```bash
curl -X POST http://localhost:8000/positions/open \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "ETH",
    "direction": "SHORT",
    "leverage": 5000,
    "stake": 100,
    "duration": 20
  }'
```

### Checking Position Status
```bash
curl http://localhost:8000/positions/c2922cd6-a727-4c45-a501-acc9a66f3d82
```

### Getting Current Prices
```bash
curl http://localhost:8000/prices
```

## Position Lifecycle

### 1. PENDING (3 seconds)
- Position created immediately
- Stake deducted from balance
- Waiting for countdown to complete
- Entry price not yet locked

### 2. OPEN (duration seconds)
- Position opens at current market price
- Entry price locked
- Real-time P&L calculation begins
- Stop-loss monitoring active
- Time remaining counts down

### 3. Terminal States

**CLOSED_WIN**
- Position expired with positive P&L
- Balance credited: stake + profits

**CLOSED_LOSS**
- Position expired with negative P&L
- Balance credited: stake - losses

**LIQUIDATED**
- Stop-loss threshold reached
- All stake lost
- Position closed immediately

## P&L Calculation Formula

```
Price Change % = (currentPrice - entryPrice) / entryPrice × 100

Directional P&L = {
  LONG:  priceChange%
  SHORT: -priceChange%
}

Leveraged P&L = directionalP&L × leverage

Stop Loss = -100 / leverage

Examples:
- 2000x leverage → -0.05% stop loss
- 5000x leverage → -0.02% stop loss
- 10000x leverage → -0.01% stop loss

Final P&L = min(leveraged_pnl, 1000%) or max(leveraged_pnl, stop_loss)
```

## Position Status Flow

```
User Opens Position
       ↓
   PENDING (3s countdown)
       ↓
   Entry at Market Price
       ↓
      OPEN
       ↓
   [During Duration]
   ├── P&L Tracking
   ├── Stop-Loss Check
   └── Time Remaining
       ↓
   [Conditions]
   ├── Hit Stop Loss → LIQUIDATED
   ├── Time Expired + Profit → CLOSED_WIN
   └── Time Expired + Loss → CLOSED_LOSS
```

## Architecture

### Components

- **`main.py`** - FastAPI application with REST endpoints
- **`models.py`** - Dataclass models for requests/responses
- **`position_manager.py`** - Position lifecycle and P&L logic
- **`price_service.py`** - Pyth Network WebSocket integration
- **`price_feed.py`** - Standalone price monitoring script

### Technology Stack

- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **WebSockets** - Real-time Pyth Network connection
- **Asyncio** - Concurrent position tracking
- **Dataclasses** - Type-safe models

### Price Feed Integration

**Pyth Network Hermes WebSocket**
- URL: `wss://hermes.pyth.network/ws`
- Update frequency: ~100-400ms
- Assets: BTC, ETH, SOL perpetual futures
- Auto-reconnect: 3-second delay

**Price Calculation:**
```python
actual_price = raw_price × 10^exponent
# Example: price="67284.5", expo=-2 → $672.845
```

## Wallet Integration (Future)

The architecture is designed for easy wallet integration:

### Ready Features
- `wallet_address` field in all models
- Isolated balance management
- Clean separation of concerns
- Position data structure supports on-chain

### Integration Steps
1. Create `wallet_service.py` for blockchain operations
2. Add signature verification in position opening
3. Replace virtual balance with on-chain reads
4. Implement smart contract integration
5. Add transaction signing flow

### Suggested Implementation
```python
# wallet_service.py
class WalletService:
    async def verify_signature(address, signature, message):
        """Verify wallet signature"""
        pass
    
    async def get_balance(address):
        """Read balance from blockchain"""
        pass
    
    async def settle_position(position_id, amount):
        """Execute on-chain settlement"""
        pass
```

## Testing

### Manual Testing with cURL

**Test Price Feed:**
```bash
curl http://localhost:8000/prices
```

**Test Position Flow:**
```bash
# 1. Check initial balance
curl http://localhost:8000/balance

# 2. Open position
RESPONSE=$(curl -s -X POST http://localhost:8000/positions/open \
  -H "Content-Type: application/json" \
  -d '{"asset":"BTC","direction":"LONG","leverage":2000,"stake":50,"duration":10}')

# 3. Extract position ID
POSITION_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

# 4. Wait and check status
sleep 5 && curl http://localhost:8000/positions/$POSITION_ID

# 5. Check updated balance
curl http://localhost:8000/balance
```

### Frontend Integration Example

```javascript
// Open a position
const response = await fetch('http://localhost:8000/positions/open', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    asset: 'BTC',
    direction: 'LONG',
    leverage: 2000,
    stake: 50,
    duration: 30
  })
});

const { position, balance } = await response.json();

// Poll position status
const interval = setInterval(async () => {
  const status = await fetch(`http://localhost:8000/positions/${position.id}`);
  const data = await status.json();
  
  console.log(`P&L: ${data.pnl_percent}%`, `Time: ${data.time_remaining}s`);
  
  if (data.status !== 'OPEN' && data.status !== 'PENDING') {
    clearInterval(interval);
    console.log(`Final status: ${data.status}`);
  }
}, 100);
```

## Troubleshooting

### Price Feed Connection Issues
```bash
# Check if WebSocket is connected
curl http://localhost:8000/health

# If disconnected, restart server
# The service will auto-reconnect every 3 seconds
```

### Port Already in Use
```bash
# Find process using port 8000
lsof -ti:8000

# Kill process
kill -9 $(lsof -ti:8000)

# Or use different port
uvicorn main:app --port 8001
```

### Virtual Environment Issues
```bash
# Recreate venv
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Development

### Adding New Assets
1. Add feed ID to `price_service.py` PRICE_FEEDS dict
2. Add enum value to `models.py` AssetType
3. Restart server

### Modifying Leverage Limits
Update validation in `main.py` open_position endpoint or add field constraints in `models.py`.

### Adjusting Duration Range
Modify duration validation in the frontend or add validation in `main.py`.

## API Documentation

Interactive Swagger UI available at: `http://localhost:8000/docs`  
ReDoc documentation at: `http://localhost:8000/redoc`
