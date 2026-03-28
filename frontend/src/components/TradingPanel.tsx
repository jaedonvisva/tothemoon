import { useState } from 'react'

interface TradingPanelProps {
  onBalanceUpdate: (balance: number) => void
}

export default function TradingPanel({ onBalanceUpdate }: TradingPanelProps) {
  const [asset, setAsset] = useState('BTC')
  const [direction, setDirection] = useState('LONG')
  const [leverage, setLeverage] = useState(2000)
  const [stake, setStake] = useState(500)
  const [duration, setDuration] = useState(15)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('http://localhost:8000/positions/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset,
          direction,
          leverage,
          stake,
          duration,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to open position')
      }

      const data = await response.json()
      onBalanceUpdate(data.balance)
    } catch (error) {
      console.error('Error opening position:', error)
      alert(error instanceof Error ? error.message : 'Failed to open position')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h2 className="text-lg font-bold text-gray-300 mb-4">Open Position</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Asset</label>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="SOL">Solana (SOL)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Direction</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('LONG')}
              className={`py-2 px-4 rounded font-medium transition-colors ${
                direction === 'LONG'
                  ? 'bg-emerald-500 text-black'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              LONG
            </button>
            <button
              type="button"
              onClick={() => setDirection('SHORT')}
              className={`py-2 px-4 rounded font-medium transition-colors ${
                direction === 'SHORT'
                  ? 'bg-red-500 text-black'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              SHORT
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Leverage: {leverage}x
          </label>
          <input
            type="number"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            min="1"
            max="100000"
            step="0.1"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Stake Amount ($)
          </label>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            min="1"
            max="100000"
            step="0.01"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Duration (seconds)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min="5"
            max="300"
            step="5"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="pt-2">
          <div className="text-xs text-gray-500 mb-2">
            Stop Loss: {(-100 / leverage).toFixed(4)}%
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-gray-500 text-black font-bold py-3 px-4 rounded transition-colors"
          >
            {loading ? 'Opening Position...' : 'Open Position'}
          </button>
        </div>
      </form>
    </div>
  )
}
