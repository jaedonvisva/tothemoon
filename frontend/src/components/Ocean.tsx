export default function Ocean() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[30%] pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(30,64,175,0.0) 0%, rgba(30,64,175,0.5) 40%, #0f172a 100%)',
        }}
      />
      <svg className="absolute bottom-0 left-0 right-0 w-full h-16" viewBox="0 0 1200 60" preserveAspectRatio="none">
        <path
          d="M0,30 Q150,10 300,30 Q450,50 600,30 Q750,10 900,30 Q1050,50 1200,30 L1200,60 L0,60 Z"
          fill="rgba(30,64,175,0.3)"
        />
        <path
          d="M0,35 Q200,20 400,35 Q600,50 800,35 Q1000,20 1200,35 L1200,60 L0,60 Z"
          fill="rgba(15,23,42,0.5)"
        />
      </svg>
    </div>
  )
}
