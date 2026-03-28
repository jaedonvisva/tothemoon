export default function AircraftCarriers() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Left carrier */}
      <svg className="absolute" style={{ left: '5%', bottom: '30%' }} width="160" height="60" viewBox="0 0 160 60">
        <rect x="10" y="20" width="140" height="15" rx="2" fill="#374151" />
        <rect x="20" y="35" width="120" height="10" rx="1" fill="#1f2937" />
        <rect x="100" y="8" width="20" height="12" rx="1" fill="#4b5563" />
        <rect x="108" y="2" width="4" height="8" fill="#6b7280" />
        <rect x="105" y="0" width="10" height="2" fill="#6b7280" />
      </svg>

      {/* Right carrier */}
      <svg className="absolute" style={{ right: '5%', bottom: '30%' }} width="180" height="65" viewBox="0 0 180 65">
        <rect x="10" y="22" width="160" height="16" rx="2" fill="#374151" />
        <rect x="25" y="38" width="130" height="12" rx="1" fill="#1f2937" />
        <rect x="120" y="8" width="25" height="14" rx="1" fill="#4b5563" />
        <rect x="130" y="2" width="5" height="8" fill="#6b7280" />
        <rect x="126" y="0" width="12" height="2" fill="#6b7280" />
      </svg>
    </div>
  )
}
