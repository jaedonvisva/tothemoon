interface HeaderProps {
  connected: boolean
  prices: Record<string, number>
}

export default function Header({ connected, prices }: HeaderProps) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
      {/* Left: Logo + time */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
          <span className="text-xl">🚀</span>
        </div>
        <div>
          <div className="text-sm font-bold uppercase tracking-wider text-white">Moonshot</div>
          <div className="text-xs text-white/70">{timeStr}</div>
        </div>
      </div>

      {/* Center: Live prices ticker */}
      <div className="flex items-center gap-6">
        {['BTC', 'ETH', 'SOL'].map((asset) => (
          <div key={asset} className="text-center">
            <span className="text-xs text-white/70 mr-1">{asset}</span>
            <span className="text-xs font-bold text-white">
              {prices[asset] ? `$${prices[asset].toFixed(2)}` : '--'}
            </span>
          </div>
        ))}
      </div>

      {/* Right: Connection status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-red-500'}`} />
        <span className="text-xs text-white/70">{connected ? 'LIVE' : 'OFFLINE'}</span>
      </div>
    </header>
  )
}
