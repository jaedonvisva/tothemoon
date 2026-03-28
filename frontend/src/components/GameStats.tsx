interface GameStatsProps {
  asset: string
  direction: string
  multiplier: number
  pnlPercent: number
  timeRemaining: number | null
  status: string
}

export default function GameStats({ asset, direction, multiplier, pnlPercent, timeRemaining, status }: GameStatsProps) {
  const isActive = status === 'OPEN' || status === 'PENDING'
  const isProfitable = pnlPercent >= 0

  return (
    <div className="absolute top-32 left-1/2 -translate-x-1/2 flex gap-8 items-center pointer-events-none z-10">
      <div className="text-center">
        <div className="text-xs uppercase tracking-wider text-white/70 mb-1">Asset</div>
        <div className="text-xl font-bold text-white">{asset || '--'}</div>
      </div>

      <div className="text-center">
        <div className="text-xs uppercase tracking-wider text-white/70 mb-1">Direction</div>
        <div className={`text-xl font-bold ${direction === 'LONG' ? 'text-green-400' : direction === 'SHORT' ? 'text-red-400' : 'text-white'}`}>
          {direction || '--'}
        </div>
      </div>

      <div className="text-center">
        <div className="text-xs uppercase tracking-wider text-white/70 mb-1">Multiplier</div>
        <div className="text-xl font-bold text-yellow-400">{multiplier > 0 ? `${multiplier}x` : '--'}</div>
      </div>

      <div className="text-center">
        <div className="text-xs uppercase tracking-wider text-white/70 mb-1">P&L</div>
        <div className={`text-xl font-bold ${isActive ? (isProfitable ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
          {isActive ? `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%` : '--'}
        </div>
      </div>

      <div className="text-center">
        <div className="text-xs uppercase tracking-wider text-white/70 mb-1">Time</div>
        <div className="text-xl font-bold text-white">
          {timeRemaining != null ? `${timeRemaining.toFixed(1)}s` : '--'}
        </div>
      </div>
    </div>
  )
}
