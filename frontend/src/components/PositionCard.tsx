import { useEffect, useState, useRef } from 'react'

interface Position {
  id: string
  asset: string
  direction: string
  leverage: number
  stake: number
  duration: number
  entry_price?: number
  current_price?: number
  pnl_percent: number
  pnl_dollars: number
  stop_loss_percent: number
  status: string
  opened_at?: string
  closed_at?: string
  time_remaining?: number
}

interface PositionCardProps {
  position: Position
}

interface PnLPoint {
  time: number
  pnl: number
}

export default function PositionCard({ position }: PositionCardProps) {
  const [pnlHistory, setPnlHistory] = useState<PnLPoint[]>([])
  const startTimeRef = useRef<number>(Date.now())

  const toFiniteNumber = (value: unknown, fallback = 0) => {
    const num = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  useEffect(() => {
    if (position.status === 'OPEN') {
      setPnlHistory((prev) => [
        ...prev,
        { time: Date.now() - startTimeRef.current, pnl: position.pnl_percent },
      ])
    }
  }, [position.pnl_percent, position.status])

  const isPending = position.status === 'PENDING'
  const isOpen = position.status === 'OPEN'
  const safePnlPercent = toFiniteNumber(position.pnl_percent, 0)
  const safePnlDollars = toFiniteNumber(position.pnl_dollars, 0)
  const safeStake = toFiniteNumber(position.stake, 0)
  const safeLeverage = toFiniteNumber(position.leverage, 0)
  const safeStopLoss = toFiniteNumber(position.stop_loss_percent, -100)
  const isProfitable = safePnlPercent >= 0

  const renderGraph = () => {
    if (pnlHistory.length < 2) return null

    const width = 600
    const height = 150
    const padding = 30

    const maxPnl = Math.max(...pnlHistory.map((p) => toFiniteNumber(p.pnl, 0)), safeStopLoss, 1)
    const minPnl = Math.min(...pnlHistory.map((p) => toFiniteNumber(p.pnl, 0)), safeStopLoss, -1)
    const maxTimeRaw = Math.max(...pnlHistory.map((p) => toFiniteNumber(p.time, 0)))
    const maxTime = maxTimeRaw > 0 ? maxTimeRaw : 1

    const scaleX = (time: number) => padding + ((time / maxTime) * (width - 2 * padding))
    const scaleY = (pnl: number) => {
      const rangeRaw = maxPnl - minPnl
      const range = rangeRaw !== 0 ? rangeRaw : 1
      return height - padding - ((pnl - minPnl) / range) * (height - 2 * padding)
    }

    const points = pnlHistory.map((p) => `${scaleX(p.time)},${scaleY(p.pnl)}`).join(' ')
    const zeroY = scaleY(0)
    const stopLossY = scaleY(safeStopLoss)

    const areaPoints = `${scaleX(pnlHistory[0].time)},${height - padding} ${points} ${scaleX(pnlHistory[pnlHistory.length - 1].time)},${height - padding}`

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
        <defs>
          <linearGradient id={`gradient-${position.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isProfitable ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isProfitable ? '#10b981' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={padding}
          y1={stopLossY}
          x2={width - padding}
          y2={stopLossY}
          stroke="#f59e0b"
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.5"
        />

        <line
          x1={padding}
          y1={zeroY}
          x2={width - padding}
          y2={zeroY}
          stroke="#52525b"
          strokeWidth="1"
          opacity="0.5"
        />

        {pnlHistory.length > 1 && (
          <>
            <polyline
              points={areaPoints}
              fill={`url(#gradient-${position.id})`}
            />
            <polyline
              points={points}
              fill="none"
              stroke={isProfitable ? '#10b981' : '#ef4444'}
              strokeWidth="2"
            />
            <circle
              cx={scaleX(pnlHistory[pnlHistory.length - 1].time)}
              cy={scaleY(pnlHistory[pnlHistory.length - 1].pnl)}
              r="4"
              fill={isProfitable ? '#10b981' : '#ef4444'}
              className="animate-pulse"
            />
          </>
        )}

        <text x={padding} y={stopLossY - 5} fontSize="10" fill="#f59e0b" opacity="0.7">
          SL: {safeStopLoss.toFixed(2)}%
        </text>
      </svg>
    )
  }

  return (
    <div className={`bg-zinc-800 border-l-4 rounded-lg p-4 ${
      isPending ? 'border-orange-500' :
      isOpen ? (isProfitable ? 'border-emerald-500' : 'border-red-500') :
      'border-zinc-700'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold text-gray-100">
            {position.asset}
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            position.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {position.direction}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {safeLeverage}x
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            isPending ? 'bg-orange-500/20 text-orange-400' :
            isOpen ? 'bg-blue-500/20 text-blue-400' :
            'bg-zinc-700 text-zinc-400'
          }`}>
            {position.status}
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-2xl font-bold ${
            isProfitable ? 'text-emerald-500' : 'text-red-500'
          }`}>
            {safePnlPercent >= 0 ? '+' : ''}{safePnlPercent.toFixed(2)}%
          </div>
          <div className={`text-sm ${
            safePnlDollars >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {safePnlDollars >= 0 ? '+' : ''}${safePnlDollars.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-3 text-sm">
        <div>
          <div className="text-xs text-gray-500">Stake</div>
          <div className="font-mono text-gray-300">${safeStake.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Entry</div>
          <div className="font-mono text-gray-300">
            {position.entry_price != null && Number.isFinite(Number(position.entry_price))
              ? `$${Number(position.entry_price).toFixed(2)}`
              : '--'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Current</div>
          <div className="font-mono text-gray-300">
            {position.current_price != null && Number.isFinite(Number(position.current_price))
              ? `$${Number(position.current_price).toFixed(2)}`
              : '--'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Time Left</div>
          <div className="font-mono text-gray-300">
            {position.time_remaining != null && Number.isFinite(Number(position.time_remaining))
              ? `${Number(position.time_remaining).toFixed(1)}s`
              : '--'}
          </div>
        </div>
      </div>

      {isOpen && pnlHistory.length > 1 && (
        <div className="bg-zinc-900 rounded p-3">
          {renderGraph()}
        </div>
      )}

      {isPending && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded p-3 text-center">
          <div className="text-orange-400 text-sm font-medium">
            ⏳ Position opening in 3 seconds...
          </div>
        </div>
      )}
    </div>
  )
}
