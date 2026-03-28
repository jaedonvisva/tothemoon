# Product Requirements Document: Moonshot

## Executive Summary

**Moonshot** is a gamified crypto trading application that combines slot machine mechanics with real-time perpetual futures trading. Users stake virtual currency to "spin" for random trading parameters (asset, direction, leverage multiplier, duration) and then track their position's performance against live market prices from Pyth Network.

---

## Product Vision

Transform crypto derivatives trading into an engaging, game-like experience that helps users understand leverage, P&L dynamics, and market volatility in a risk-free environment using real market data.

---

## Core Features

### 1. Slot Machine Trading Mechanic

#### 1.1 Spin System
- **Stake Selection**: Users choose from preset amounts ($5, $10, $25, $50, $100) or enter custom values
- **Random Generation**: Each spin randomly determines:
  - **Asset**: BTC, ETH, or SOL
  - **Direction**: LONG or SHORT
  - **Multiplier**: 1500x, 2000x, 2500x, 5000x, or 10000x leverage
  - **Duration**: 5-45 seconds (5s increments)
- **Sequential Reveal**: Results reveal in stages with animated slot machine reels
- **Countdown Entry**: 3-second countdown before position opens at real market price

#### 1.2 Balance Management
- Starting balance: $1,000 virtual currency
- Stake deducted immediately on spin
- Winnings/losses applied at position close
- Insufficient balance prevents new spins

### 2. Real-Time Price Feed Integration

#### 2.1 Pyth Network Integration
**Critical Feature**: Live perpetual futures pricing via Pyth Network's Hermes WebSocket API

**Technical Specifications**:
- **Protocol**: WebSocket (wss://hermes.pyth.network/ws)
- **Price Feeds**:
  - Bitcoin (BTC): `e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`
  - Ethereum (ETH): `ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`
  - Solana (SOL): `ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d`

**Implementation Details**:
```javascript
// Connection Management
- Establish WebSocket connection on app load
- Subscribe to all three price feeds simultaneously
- Maintain persistent connection with auto-reconnect (3s delay)
- Handle connection states: connecting, connected, disconnected

// Price Updates
- Receive real-time price_update messages
- Parse price data: price * 10^expo for actual value
- Update UI immediately on each tick
- Store prices in ref for stable access across renders
```

**Price Calculation**:
- Raw price format: `{price: string, expo: number}`
- Actual price: `price × 10^expo`
- Example: price="67284.5", expo=-2 → $672.845

**Connection States**:
- **Connected**: Green indicator, live prices used
- **Disconnected**: Amber indicator, simulation mode offered
- **Reconnecting**: Automatic retry with exponential backoff

#### 2.2 Fallback Mechanism
- **Simulation Mode**: If WebSocket fails, use mock price movements
- **User Consent**: Explicit confirmation before entering simulation
- **Visual Indicator**: Badge displays "PYTH FEED" vs "SIMULATION"

### 3. Position Tracking & P&L

#### 3.1 Entry Execution
- Position opens at exact market price when countdown reaches 0
- Entry price locked and displayed
- Real-time current price updates via WebSocket

#### 3.2 P&L Calculation
```
Price Change % = (currentPrice - entryPrice) / entryPrice
Directional P&L = priceChange% × (direction === 'LONG' ? 1 : -1)
Leveraged P&L = directionalP&L × multiplier
Final P&L = leveragedP&L (capped between stopLoss and +1000%)
```

#### 3.3 Stop Loss (Liquidation)
- Calculated based on multiplier: `SL = -1 / multiplier`
- Examples:
  - 2000x → -0.05% liquidation
  - 5000x → -0.02% liquidation
- Position auto-closes if P&L hits stop loss
- All stake lost on liquidation

#### 3.4 Position States
- **PENDING**: During countdown, no position yet
- **OPEN**: Active position tracking real prices
- **CLOSED_WIN**: Expired with positive P&L
- **CLOSED_LOSS**: Expired with negative P&L (not liquidated)
- **LIQUIDATED**: Hit stop loss threshold

### 4. Live Price Chart

#### 4.1 Chart Features
- Real-time SVG line chart showing P&L history
- Dynamic Y-axis scaling to include stop loss and current P&L
- Color-coded: Green (profit) / Red (loss)
- Key level indicators:
  - Break-even line (0%)
  - Stop loss threshold line (red dashed)
- Animated pulse on current price point
- Gradient fill under price line

#### 4.2 Chart Updates
- New data point every price update (~100ms intervals)
- Smooth polyline rendering
- Maintains full history for duration of trade

### 5. User Interface

#### 5.1 Main Dashboard Components
- **Balance Display**: Current virtual balance with trophy icon
- **Connection Status**: Live indicator for Pyth WebSocket
- **Slot Machine Reels**: 4 reels (Asset, Direction, Multiplier, Duration)
- **Price Chart**: Real-time P&L graph during active positions
- **Stake Selector**: Quick select buttons + custom input
- **Pull Button**: Primary action with chrome styling

#### 5.2 Trade Information Panel
Displays during active positions:
- Asset name and current price
- Entry price (locked)
- Direction (LONG/SHORT with icons)
- Leverage multiplier
- Current P&L ($ and %)
- Time remaining (countdown)
- Stop loss level

#### 5.3 Result Modal
Shows at position close:
- Final outcome: WIN/LOSS/LIQUIDATED
- Final balance amount
- P&L in dollars
- "Play Again" CTA
- "View Graph" option

#### 5.4 History Panel
- Sliding drawer from right
- List of all completed trades
- Each entry shows: asset, direction, P&L, timestamp
- Color-coded by outcome
- Win rate statistics

### 6. Visual Design

#### 6.1 Design System
- **Theme**: Dark mode with metallic/chrome accents
- **Color Palette**:
  - Background: Deep blacks (#000, #09090b, #18181b)
  - Metals: Zinc grays (#27272a, #3f3f46, #52525b)
  - Profit: Emerald (#10b981)
  - Loss: Rose/Red (#f43f5e)
  - Accents: Orange (BTC), Blue (ETH), Purple (SOL)
- **Typography**: Monospace fonts for numbers, bold sans-serif for UI
- **Effects**: Glow effects, inset shadows, metallic bevels

#### 6.2 Animation & Interaction
- **Framer Motion**: Page transitions, modals, reveals
- **Haptic Feedback**: Vibration on mobile devices
- **Slot Animations**: Continuous vertical scrolling during spin
- **Staggered Reveals**: Sequential timing for slot results
- **Button States**: Active scaling, hover glows, disabled opacity

---

## Technical Architecture

### Technology Stack
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.3.1
- **Styling**: TailwindCSS 4.1.18
- **Animation**: Framer Motion 12.33.0
- **Icons**: Lucide React 0.563.0
- **Price Data**: Pyth Network (@pythnetwork/price-service-client)

### State Management
- React hooks (useState, useEffect, useRef, useCallback)
- Custom hook: `usePythPrice()` for WebSocket management
- Refs for stable price access and WebSocket instance

### Data Flow
```
User Action (Spin) 
  → Random Parameters Generated 
  → Countdown (3s) 
  → Get Real Price from Pyth 
  → Open Position 
  → Subscribe to Price Updates 
  → Calculate P&L on Each Tick 
  → Check Stop Loss / Expiry 
  → Close Position 
  → Update Balance
```

### Performance Optimizations
- Price refs to prevent unnecessary re-renders
- Memoized callbacks for stable function references
- Efficient SVG chart rendering
- Debounced price updates for UI

---

## User Stories

### Core Gameplay
1. **As a user**, I want to select my stake amount so I can control my risk
2. **As a user**, I want to see real crypto prices so the game feels authentic
3. **As a user**, I want random trading parameters so each spin is unpredictable
4. **As a user**, I want to see my P&L update in real-time so I can track performance
5. **As a user**, I want a visual chart so I can understand price movement

### Information & Feedback
6. **As a user**, I want to know if I'm using real or simulated prices
7. **As a user**, I want to see my trading history so I can review past performance
8. **As a user**, I want clear win/loss notifications so I understand outcomes
9. **As a user**, I want to see connection status so I know the data source

### Risk Management
10. **As a user**, I want stop-loss protection so I understand liquidation risk
11. **As a user**, I want to see leverage multipliers so I understand amplified returns

---

## Success Metrics

### Engagement
- Average trades per session
- Session duration
- Return user rate

### Technical Performance
- WebSocket uptime (target: >99%)
- Price update latency (target: <100ms)
- UI frame rate (target: 60fps)

### User Experience
- Win rate distribution
- Average P&L per trade
- Simulation mode usage rate

---

## Future Enhancements

### Phase 2 Features
- Additional crypto assets (AVAX, DOGE, ARB, etc.)
- Manual trading mode (user selects all parameters)
- Leaderboards and social features
- Achievement system
- Customizable strategies/presets

### Technical Improvements
- Historical price data replay
- Advanced charting (candlesticks, indicators)
- Multiple simultaneous positions
- WebSocket connection pooling
- Progressive Web App (PWA) support

### Monetization (Optional)
- Premium features (higher multipliers, more assets)
- Cosmetic customizations
- Tournament entry fees (with prizes)

---

## Technical Dependencies

### External Services
- **Pyth Network Hermes**: Real-time price feeds for crypto perpetuals
  - Service: wss://hermes.pyth.network/ws
  - Free tier: Unlimited WebSocket connections
  - Documentation: https://docs.pyth.network/price-feeds

### API Rate Limits
- Pyth WebSocket: No rate limits (streaming)
- Reconnection throttle: 3 seconds between attempts

---

## Security & Compliance

### Data Privacy
- No personal data collection
- No authentication required
- Client-side only (no backend)
- No real money involved

### Risk Disclosures
- Virtual currency only
- Educational/entertainment purpose
- Not financial advice
- Real market data used for simulation

---

## Deployment Requirements

### Browser Support
- Modern browsers with WebSocket support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Hosting
- Static site hosting (Vercel, Netlify, etc.)
- No server-side requirements
- No database needed

### Environment
- Production build via Vite
- Asset optimization enabled
- Code splitting for performance

---

## Appendix

### Pyth Network Price Feed Details

**Feed Type**: Crypto Perpetual Futures

**Update Frequency**: ~100-400ms (market dependent)

**Price Confidence**: Included in feed but not currently used

**Alternative Providers**: 
- Switchboard (Solana)
- Chainlink (EVM chains)
- DIA (multi-chain)

**Backup Strategy**: Simulation mode with realistic volatility modeling

### Volatility Parameters
- BTC: 15% annual volatility
- ETH: 25% annual volatility  
- SOL: 45% annual volatility

Used for simulation mode price generation when WebSocket unavailable.
