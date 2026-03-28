import { motion } from 'framer-motion'

interface PlayButtonProps {
  disabled: boolean
  onClick: () => void
}

export default function PlayButton({ disabled, onClick }: PlayButtonProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse ring */}
      {!disabled && (
        <motion.div
          className="absolute w-36 h-36 rounded-full border-2 border-white/40"
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative w-32 h-32 rounded-full shadow-2xl transition-transform ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'
        }`}
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #1e3a8a 100%)',
          boxShadow: disabled ? 'none' : '0 0 40px rgba(59,130,246,0.4), 0 25px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div className="absolute inset-2 rounded-full border-2 border-white/30 flex items-center justify-center">
          {/* Play triangle */}
          <svg width="40" height="40" viewBox="0 0 40 40" className="ml-1">
            <polygon
              points="10,5 35,20 10,35"
              fill="white"
            />
          </svg>
        </div>
      </button>
    </div>
  )
}
