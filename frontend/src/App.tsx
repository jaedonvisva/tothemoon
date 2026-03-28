import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMoonshotWebSocket } from './hooks/useWebSocket'
import Clouds from './components/Clouds'
import Ocean from './components/Ocean'
import AircraftCarriers from './components/AircraftCarriers'
import Helicopter from './components/Helicopter'
import GameStats from './components/GameStats'
import PlayButton from './components/PlayButton'
import BottomInfoBar from './components/BottomInfoBar'
import './App.css'

const TERMINAL_STATUSES = new Set(['CLOSED_WIN', 'CLOSED_LOSS', 'LIQUIDATED'])

function App() {
  const { prices, positions, connected } = useMoonshotWebSocket()
  const [balance, setBalance] = useState<number>(100000)
  const previousStatusesRef = useRef<Map<string, string>>(new Map())

  const [asset, setAsset] = useState('BTC')
  const [direction, setDirection] = useState('LONG')
  const [leverage, setLeverage] = useState(2000)
  const [stake, setStake] = useState(500)
  const [duration, setDuration] = useState(15)

  const [activePositionId, setActivePositionId] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [endStatus, setEndStatus] = useState<'CLOSED_WIN' | 'CLOSED_LOSS' | 'LIQUIDATED' | null>(null)
  const flightStartRef = useRef<number>(0)

  const activePosition = activePositionId ? positions.get(activePositionId) : null
  const isFlying = activePosition != null &&
    (activePosition.status === 'OPEN' || activePosition.status === 'PENDING')

  const pnlPercent = activePosition?.pnl_percent ?? 0
  const timeRemaining = activePosition?.time_remaining ?? null

  // Track flight start for smooth time progress
  useEffect(() => {
    if (activePosition?.status === 'OPEN' && flightStartRef.current === 0) {
      flightStartRef.current = Date.now()
    }
  }, [activePosition?.status])

  // Compute time progress 0→1
  const timeProgress = (() => {
    if (!isFlying || flightStartRef.current === 0 || duration <= 0) return 0
    const elapsed = (Date.now() - flightStartRef.current) / 1000
    return Math.min(elapsed / duration, 1)
  })()

  const syncBalance = async () => {
    try {
      const response = await fetch('http://localhost:8000/balance')
      if (!response.ok) return
      const data = await response.json()
      if (typeof data.balance === 'number') {
        setBalance(data.balance)
      }
    } catch { /* silent */ }
  }

  useEffect(() => { void syncBalance() }, [])

  useEffect(() => {
    let shouldSync = false
    positions.forEach((position, id) => {
      const prev = previousStatusesRef.current.get(id)
      if (prev && prev !== position.status && TERMINAL_STATUSES.has(position.status)) {
        shouldSync = true
        if (id === activePositionId) {
          const pnl = position.pnl_dollars ?? 0
          const st = position.status as string
          setEndStatus(st as 'CLOSED_WIN' | 'CLOSED_LOSS' | 'LIQUIDATED')
          if (st === 'CLOSED_WIN') {
            setResultMessage(`WIN! +$${pnl.toFixed(2)}`)
          } else if (st === 'LIQUIDATED') {
            setResultMessage(`LIQUIDATED! -$${(position.stake ?? 0).toFixed(2)}`)
          } else {
            setResultMessage(`LOSS: $${pnl.toFixed(2)}`)
          }
          setTimeout(() => {
            setActivePositionId(null)
            setResultMessage(null)
            setEndStatus(null)
          }, 3000)
        }
      }
      previousStatusesRef.current.set(id, position.status)
    })
    if (shouldSync) void syncBalance()
  }, [positions, activePositionId])

  const handlePlay = async () => {
    try {
      const response = await fetch('http://localhost:8000/positions/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, direction, leverage, stake, duration }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Failed')
      }
      const data = await response.json()
      setBalance(data.balance)
      setActivePositionId(data.position.id)
      setResultMessage(null)
      setEndStatus(null)
      flightStartRef.current = 0
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to open position')
    }
  }

  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none"
      style={{
        background: 'linear-gradient(to bottom, #1e3a8a 0%, #1e40af 40%, #3b82f6 100%)',
      }}
    >
      <Clouds />
      <Ocean />
      <AircraftCarriers />

      <Helicopter
        isFlying={isFlying}
        pnlPercent={pnlPercent}
        betAmount={stake}
        timeProgress={timeProgress}
        endStatus={endStatus}
      />

      <GameStats
        asset={isFlying ? (activePosition?.asset ?? asset) : asset}
        direction={isFlying ? (activePosition?.direction ?? direction) : direction}
        multiplier={isFlying ? (activePosition?.leverage ?? leverage) : leverage}
        pnlPercent={pnlPercent}
        timeRemaining={timeRemaining}
        status={activePosition?.status ?? 'IDLE'}
      />

      {/* Play button – centered, 128px from bottom */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '128px' }}>
        <PlayButton disabled={isFlying} onClick={handlePlay} />
      </div>

      {/* Result overlay */}
      <AnimatePresence>
        {resultMessage && (
          <motion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <div className={`text-4xl font-bold px-8 py-4 rounded-xl shadow-2xl ${
              resultMessage.startsWith('WIN')
                ? 'bg-green-500/90 text-black'
                : 'bg-red-600/90 text-white'
            }`}>
              {resultMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomInfoBar
        balance={balance}
        stake={stake}
        asset={asset}
        direction={direction}
        leverage={leverage}
        duration={duration}
        onAssetChange={setAsset}
        onDirectionChange={setDirection}
        onLeverageChange={setLeverage}
        onStakeChange={setStake}
        onDurationChange={setDuration}
        isFlying={isFlying}
      />
    </div>
  )
}

export default App
