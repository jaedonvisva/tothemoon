import { motion } from 'framer-motion'

export default function Clouds() {
  const cloudGroups = [
    { x: '10%', y: '15%', scale: 1, duration: 12 },
    { x: '60%', y: '8%', scale: 0.8, duration: 10 },
    { x: '35%', y: '25%', scale: 0.6, duration: 8 },
    { x: '80%', y: '18%', scale: 0.7, duration: 11 },
    { x: '20%', y: '35%', scale: 0.5, duration: 9 },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {cloudGroups.map((cloud, i) => (
        <motion.svg
          key={i}
          className="absolute"
          style={{ left: cloud.x, top: cloud.y, transform: `scale(${cloud.scale})` }}
          width="120"
          height="50"
          viewBox="0 0 120 50"
          animate={{ x: [0, 30, 0] }}
          transition={{
            duration: cloud.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <ellipse cx="60" cy="30" rx="40" ry="20" fill="rgba(255,255,255,0.3)" />
          <ellipse cx="40" cy="35" rx="30" ry="15" fill="rgba(255,255,255,0.25)" />
          <ellipse cx="80" cy="35" rx="25" ry="12" fill="rgba(255,255,255,0.2)" />
        </motion.svg>
      ))}
    </div>
  )
}
