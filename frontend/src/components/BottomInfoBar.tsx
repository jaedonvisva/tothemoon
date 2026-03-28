interface BottomInfoBarProps {
  balance: number
  stake: number
  asset: string
  direction: string
  leverage: number
  duration: number
  onAssetChange: (asset: string) => void
  onDirectionChange: (dir: string) => void
  onLeverageChange: (lev: number) => void
  onStakeChange: (stake: number) => void
  onDurationChange: (dur: number) => void
  isFlying: boolean
}

export default function BottomInfoBar({
  balance, stake, asset, direction, leverage, duration,
  onAssetChange, onDirectionChange, onLeverageChange, onStakeChange, onDurationChange,
  isFlying,
}: BottomInfoBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 bg-black/30 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Balance */}
        <div className="text-center min-w-[100px]">
          <div className="text-xs uppercase text-white/70 tracking-wider">Balance</div>
          <div className="text-lg font-bold text-white">${balance.toFixed(2)}</div>
        </div>

        {/* Trade config */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <select
            value={asset}
            onChange={(e) => onAssetChange(e.target.value)}
            disabled={isFlying}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded border-0 outline-none disabled:opacity-50"
          >
            <option value="BTC" className="bg-gray-900">BTC</option>
            <option value="ETH" className="bg-gray-900">ETH</option>
            <option value="SOL" className="bg-gray-900">SOL</option>
          </select>

          <div className="flex rounded overflow-hidden">
            <button
              type="button"
              onClick={() => onDirectionChange('LONG')}
              disabled={isFlying}
              className={`text-xs font-bold px-3 py-2 transition-colors disabled:opacity-50 ${
                direction === 'LONG' ? 'bg-green-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              LONG
            </button>
            <button
              type="button"
              onClick={() => onDirectionChange('SHORT')}
              disabled={isFlying}
              className={`text-xs font-bold px-3 py-2 transition-colors disabled:opacity-50 ${
                direction === 'SHORT' ? 'bg-red-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              SHORT
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-white/70">Lev:</span>
            <input
              type="number"
              value={leverage}
              onChange={(e) => onLeverageChange(Number(e.target.value))}
              disabled={isFlying}
              className="bg-white/10 text-white text-xs font-bold w-20 px-2 py-2 rounded border-0 outline-none disabled:opacity-50"
              min="1"
              max="100000"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-white/70">Stake:</span>
            <input
              type="number"
              value={stake}
              onChange={(e) => onStakeChange(Number(e.target.value))}
              disabled={isFlying}
              className="bg-white/10 text-white text-xs font-bold w-20 px-2 py-2 rounded border-0 outline-none disabled:opacity-50"
              min="1"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-white/70">Time:</span>
            <input
              type="number"
              value={duration}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              disabled={isFlying}
              className="bg-white/10 text-white text-xs font-bold w-16 px-2 py-2 rounded border-0 outline-none disabled:opacity-50"
              min="5"
              step="5"
            />
          </div>
        </div>

        {/* Total Bet */}
        <div className="text-center min-w-[100px]">
          <div className="text-xs uppercase text-white/70 tracking-wider">Total Bet</div>
          <div className="text-lg font-bold text-yellow-400">${stake.toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}
