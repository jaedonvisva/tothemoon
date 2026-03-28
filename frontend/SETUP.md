# Moonshot Trading Frontend

A real-time crypto trading interface with live P&L tracking and WebSocket integration.

## Features

### 🎯 Live Trading Interface
- **Position Entry Panel**: Input asset, direction (LONG/SHORT), leverage, stake, and duration
- **Live Price Feed**: Real-time BTC, ETH, SOL prices via WebSocket
- **Connection Status**: Visual indicator showing WebSocket connection state
- **Balance Tracking**: Live balance updates as positions open/close

### 📊 Live P&L Graphs
- **Real-time SVG Charts**: Auto-updating P&L graphs for active positions
- **Stop-Loss Visualization**: Red dashed line showing liquidation threshold
- **Break-Even Line**: Reference line at 0% P&L
- **Color-Coded**: Green for profit, red for loss
- **Animated**: Pulsing indicator on current price point

### 📈 Position Tracking
- **Active Positions**: Full detail cards with live updates
- **Status Indicators**: PENDING → OPEN → CLOSED/LIQUIDATED
- **Real-time Metrics**: Entry price, current price, P&L %, P&L $, time remaining
- **History Panel**: Recently closed positions with outcomes

## Getting Started

### Prerequisites
- Node.js 18+
- Backend running on `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build

```bash
npm run build
```

## Architecture

### Components

**`App.tsx`**
- Main application container
- WebSocket connection management
- Position and balance state
- Layout and routing

**`TradingPanel.tsx`**
- Position entry form
- Input validation
- API integration for opening positions
- Stop-loss calculation display

**`PositionCard.tsx`**
- Live position display
- Real-time P&L graph rendering
- Status-based styling
- Time remaining countdown

**`PriceDisplay.tsx`**
- Live price cards for BTC, ETH, SOL
- Color-coded by asset
- Updates via WebSocket

### Hooks

**`useWebSocket.ts`**
- Manages WebSocket connection to backend
- Auto-reconnect on disconnect (3s delay)
- Parses price_update and position_update messages
- Returns: `{ prices, positions, connected, error }`

## WebSocket Integration

### Connection
```typescript
const { prices, positions, connected } = useMoonshotWebSocket()
```

### Messages Received

**Price Updates** (~100ms)
```json
{
  "type": "price_update",
  "data": {
    "asset": "BTC",
    "price": 66850.25
  }
}
```

**Position Updates** (on change)
```json
{
  "type": "position_update",
  "data": {
    "id": "uuid",
    "status": "OPEN",
    "pnl_percent": 0.5,
    "time_remaining": 25.0,
    ...
  }
}
```

## Usage Flow

1. **Connect**: WebSocket auto-connects on load
2. **View Prices**: Live BTC/ETH/SOL prices update automatically
3. **Open Position**: 
   - Select asset, direction, leverage, stake, duration
   - Click "Open Position"
   - Position enters PENDING state (3s countdown)
4. **Track Position**:
   - Position opens at market price
   - Live P&L graph displays
   - Real-time updates every ~100ms
   - Time remaining counts down
5. **Position Closes**:
   - Auto-closes at expiration or liquidation
   - Final P&L shown
   - Balance updated
   - Moves to history

## Styling

- **Framework**: TailwindCSS 4.2
- **Theme**: Dark mode (black/zinc palette)
- **Colors**:
  - Profit: Emerald (#10b981)
  - Loss: Red (#ef4444)
  - Pending: Orange (#f59e0b)
  - Active: Blue (#3b82f6)
- **Effects**: Glow on connection indicator, pulse on graph point

## Tech Stack

- React 19.2
- TypeScript 5.9
- Vite 8.0
- TailwindCSS 4.2
- Framer Motion 12.38 (ready for animations)

## Development Notes

### Adding New Features

**New Asset**:
1. Backend adds to `AssetType` enum
2. Frontend updates `PriceDisplay.tsx` priceData array

**Chart Customization**:
- Edit `PositionCard.tsx` renderGraph() function
- Adjust SVG dimensions, colors, scaling

**Custom Styling**:
- Modify `tailwind.config.js` for theme extensions
- Update component className props

### Troubleshooting

**WebSocket not connecting**:
- Check backend is running on port 8000
- Verify CORS is enabled in backend
- Check browser console for errors

**Prices not updating**:
- Verify Pyth Network connection in backend
- Check WebSocket message format
- Open debug.html for raw message inspection

**Position not opening**:
- Check balance is sufficient
- Verify backend API is responding
- Check network tab for POST errors

## API Endpoints Used

- `POST /positions/open` - Create new position
- `GET /balance` - Fetch current balance
- `WS /ws` - WebSocket for live updates

## Next Steps

- [ ] Add position close button (manual exit)
- [ ] Multiple simultaneous positions
- [ ] Historical chart playback
- [ ] Win/loss statistics dashboard
- [ ] Mobile responsive optimizations
- [ ] Wallet integration UI
