interface PriceDisplayProps {
  prices: Record<string, number>
}

export default function PriceDisplay({ prices }: PriceDisplayProps) {
  const priceData = [
    { asset: 'BTC', name: 'Bitcoin', color: 'from-orange-500 to-orange-600' },
    { asset: 'ETH', name: 'Ethereum', color: 'from-blue-500 to-blue-600' },
    { asset: 'SOL', name: 'Solana', color: 'from-purple-500 to-purple-600' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {priceData.map(({ asset, name, color }) => (
        <div
          key={asset}
          className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{name}</div>
              <div className="text-2xl font-bold text-gray-100 font-mono">
                {prices[asset] ? `$${prices[asset].toFixed(2)}` : '--'}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-lg`}>
              {asset}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
