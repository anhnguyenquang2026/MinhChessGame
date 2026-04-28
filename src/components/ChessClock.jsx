/**
 * ChessClock component
 *
 * Shows two player clocks (White / Black). The active clock glows;
 * clocks below 10 seconds pulse red.
 */
export default function ChessClock({ whiteTime, blackTime, activeTurn, running, orientation }) {
  if (whiteTime === null) return null  // no-clock mode

  const fmt = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const clockCard = (label, time, color) => {
    const isActive = running && activeTurn === color
    const isLow = time !== null && time <= 10

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: 8,
          background: isActive ? 'rgba(104,211,145,0.12)' : '#1a2035',
          border: isActive
            ? '1px solid rgba(104,211,145,0.45)'
            : '1px solid rgba(255,255,255,0.06)',
          transition: 'all 0.25s ease',
        }}
      >
        <span style={{ fontSize: 12, color: '#a0aec0', fontWeight: 500 }}>{label}</span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
            color: isLow && isActive ? '#fc8181' : isActive ? '#68d391' : '#e2e8f0',
            animation: isLow && isActive ? 'pulse 0.8s ease-in-out infinite' : 'none',
          }}
        >
          {fmt(time)}
        </span>
      </div>
    )
  }

  // When orientation is black, show Black clock on top (closer to that player)
  const topColor    = orientation === 'black' ? 'b' : 'w'
  const bottomColor = orientation === 'black' ? 'w' : 'b'
  const topLabel    = topColor === 'w' ? 'White' : 'Black'
  const bottomLabel = bottomColor === 'w' ? 'White' : 'Black'
  const topTime     = topColor === 'w' ? whiteTime : blackTime
  const bottomTime  = bottomColor === 'w' ? whiteTime : blackTime

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>
      <div
        style={{
          borderRadius: 10,
          padding: 10,
          background: 'var(--color-panel)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--color-accent)',
            marginBottom: 2,
          }}
        >
          Clock
        </div>
        {clockCard(topLabel, topTime, topColor)}
        {clockCard(bottomLabel, bottomTime, bottomColor)}
      </div>
    </>
  )
}
