import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

type EndStatus = 'CLOSED_WIN' | 'CLOSED_LOSS' | 'LIQUIDATED' | null

interface HelicopterProps {
  isFlying: boolean
  pnlPercent: number
  betAmount: number
  timeProgress: number
  endStatus: EndStatus
}

const START_LEFT = 12
const START_TOP = 58
const END_LEFT = 85

// Predetermined flight path - smooth arc
const FLIGHT_HEIGHT = 35  // Peak of the arc (lower = higher on screen)

export default function Helicopter({ isFlying, betAmount, timeProgress, endStatus }: HelicopterProps) {
  const isEnded = endStatus != null
  const isWin = endStatus === 'CLOSED_WIN'
  const isLiquidated = endStatus === 'LIQUIDATED'
  const isCrash = endStatus === 'CLOSED_LOSS'

  const [missilePos, setMissilePos] = useState({ x: START_LEFT, y: START_TOP })
  const [showMissile, setShowMissile] = useState(false)
  const [showExplosion, setShowExplosion] = useState(false)
  const [helicopterVisible, setHelicopterVisible] = useState(true)
  const [liquidationPos, setLiquidationPos] = useState<{ x: number; y: number } | null>(null)
  
  // Track current flight position in a ref (updates every render during flight)
  const currentPosRef = useRef({ x: START_LEFT, y: START_TOP })

  // Calculate helicopter position along predetermined arc
  let currentHeliX: number
  let currentHeliY: number
  
  if (!isFlying && !isEnded) {
    currentHeliX = START_LEFT
    currentHeliY = START_TOP
  } else {
    const t = Math.max(0, Math.min(timeProgress, 1))
    currentHeliX = START_LEFT + t * (END_LEFT - START_LEFT)
    const arcFactor = Math.sin(t * Math.PI)
    const arcOffset = arcFactor * FLIGHT_HEIGHT
    currentHeliY = START_TOP - arcOffset
  }

  // Update ref on every render during flight
  if (isFlying && !isEnded) {
    currentPosRef.current = { x: currentHeliX, y: currentHeliY }
  }

  // Capture position when liquidation occurs
  useEffect(() => {
    if (isLiquidated && !liquidationPos) {
      console.log('Liquidation detected! Capturing position:', currentPosRef.current)
      console.log('timeProgress at liquidation:', timeProgress)
      setLiquidationPos(currentPosRef.current)
      setShowMissile(true)
      setMissilePos({ x: END_LEFT, y: START_TOP })
    }
  }, [isLiquidated, liquidationPos, timeProgress])

  // Animate missile
  useEffect(() => {
    if (!showMissile || !liquidationPos) return

    const duration = 800
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)

      const startX = END_LEFT
      const startY = START_TOP
      const endX = liquidationPos.x
      const endY = liquidationPos.y

      const x = startX - t * (startX - endX)
      const y = startY + t * (endY - startY)

      setMissilePos({ x, y })

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        setShowExplosion(true)
        setHelicopterVisible(false)
        setTimeout(() => {
          setShowMissile(false)
          setTimeout(() => setShowExplosion(false), 1000)
        }, 100)
      }
    }

    requestAnimationFrame(animate)
  }, [showMissile, liquidationPos])

  // Add falling animation for plane after explosion
  const [fallingPlanePos, setFallingPlanePos] = useState({ x: 0, y: 0, rotation: 0 })
  const [showFallingPlane, setShowFallingPlane] = useState(false)

  useEffect(() => {
    if (showExplosion && !showFallingPlane && liquidationPos) {
      setFallingPlanePos({ x: liquidationPos.x, y: liquidationPos.y, rotation: 0 })
      setShowFallingPlane(true)

      const fallDuration = 1500
      const startTime = Date.now()

      const fall = () => {
        const elapsed = Date.now() - startTime
        const t = Math.min(elapsed / fallDuration, 1)

        const fallY = liquidationPos.y + t * 50 // Fall 50% down
        const rotation = t * 720 // Spin while falling

        setFallingPlanePos({ x: liquidationPos.x, y: fallY, rotation })

        if (t < 1) {
          requestAnimationFrame(fall)
        } else {
          setTimeout(() => setShowFallingPlane(false), 500)
        }
      }

      requestAnimationFrame(fall)
    }
  }, [showExplosion, showFallingPlane, liquidationPos])

  // Reset visibility when new flight starts
  useEffect(() => {
    if (isFlying && !isEnded) {
      setHelicopterVisible(true)
      setShowExplosion(false)
      setShowMissile(false)
      setShowFallingPlane(false)
      setLiquidationPos(null)
      currentPosRef.current = { x: START_LEFT, y: START_TOP }
    }
  }, [isFlying, isEnded])

  // Final rendering position - use frozen liquidation position if available
  let leftPct: number
  let topPct: number
  let rotation = 0

  if (!isFlying && !isEnded) {
    leftPct = START_LEFT
    topPct = START_TOP
  } else if (isEnded && isLiquidated && liquidationPos) {
    // Freeze at captured liquidation position
    leftPct = liquidationPos.x
    topPct = liquidationPos.y
    rotation = -30
  } else if (isEnded) {
    const t = Math.max(0, Math.min(timeProgress, 1))
    
    if (isWin) {
      leftPct = END_LEFT
      topPct = START_TOP
      rotation = 0
    } else if (isCrash) {
      leftPct = END_LEFT
      topPct = START_TOP + 25
      rotation = 45
    } else {
      leftPct = START_LEFT + t * (END_LEFT - START_LEFT)
      const arcFactor = Math.sin(t * Math.PI)
      const arcOffset = arcFactor * FLIGHT_HEIGHT
      topPct = START_TOP - arcOffset
      const slope = Math.cos(t * Math.PI)
      rotation = -slope * 15
    }
  } else {
    // In-flight: use current calculated position
    leftPct = currentHeliX
    topPct = currentHeliY
    const t = Math.max(0, Math.min(timeProgress, 1))
    const slope = Math.cos(t * Math.PI)
    rotation = -slope * 15
  }

  
  return (
    <>
      {/* Missile */}
      <AnimatePresence>
        {showMissile && (
          <motion.div
            className="absolute z-20"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              left: `${missilePos.x}%`,
              top: `${missilePos.y}%`,
              marginLeft: '-40px',
              marginTop: '-20px',
            }}
          >
            <img 
              src="/rocket.png" 
              alt="Rocket" 
              style={{ 
                width: '80px', 
                height: '40px',
                transform: 'scaleX(-1)'
              }} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explosion */}
      <AnimatePresence>
        {showExplosion && (
          <motion.div
            className="absolute z-30"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.5, 2], opacity: [1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              marginLeft: '-40px',
              marginTop: '-40px',
            }}
          >
            <svg width="80" height="80" viewBox="0 0 80 80">
              {/* Outer fire */}
              <circle cx="40" cy="40" r="35" fill="#dc2626" opacity="0.8" />
              {/* Middle fire */}
              <circle cx="40" cy="40" r="25" fill="#f97316" opacity="0.9" />
              {/* Inner fire */}
              <circle cx="40" cy="40" r="15" fill="#fbbf24" />
              {/* Sparks */}
              {[...Array(8)].map((_, i) => (
                <motion.line
                  key={i}
                  x1="40"
                  y1="40"
                  x2={40 + 30 * Math.cos((i * Math.PI) / 4)}
                  y2={40 + 30 * Math.sin((i * Math.PI) / 4)}
                  stroke="#fbbf24"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1, 0] }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                />
              ))}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Falling plane */}
      <AnimatePresence>
        {showFallingPlane && (
          <motion.div
            className="absolute z-10"
            animate={{
              left: `${fallingPlanePos.x}%`,
              top: `${fallingPlanePos.y}%`,
              rotate: fallingPlanePos.rotation,
            }}
            style={{ 
              marginLeft: '-40px', 
              marginTop: '-25px',
              transform: `rotate(${fallingPlanePos.rotation}deg) scaleX(-1)`
            }}
          >
            <img 
              src="/plane.png" 
              alt="Falling Plane" 
              style={{ 
                width: '80px', 
                height: '50px'
              }} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helicopter */}
      <AnimatePresence>
        {helicopterVisible && (
          <motion.div
            className="absolute z-10"
            animate={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              rotate: rotation,
            }}
            transition={{
              left: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
              top: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
              rotate: { duration: 0.4, ease: 'easeOut' },
            }}
            style={{ marginLeft: '-40px', marginTop: '-25px' }}
          >
            {/* Bet label */}
            {(isFlying || isEnded) && (
              <div
                className={`absolute -top-8 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${
                  isEnded ? (isWin ? 'bg-green-500' : 'bg-red-600') : 'bg-red-600'
                }`}
              >
                {betAmount.toFixed(2)} USD
              </div>
            )}

            <img 
              src="/plane.png" 
              alt="Plane" 
              style={{ 
                width: '80px', 
                height: '50px',
                transform: 'rotate(0deg) scaleX(-1)'
              }} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
