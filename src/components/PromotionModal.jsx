const PIECES = [
  { code: 'q', label: 'Queen',  symbol: { w: '♛', b: '♛' }, wSym: '♕', bSym: '♛' },
  { code: 'r', label: 'Rook',   wSym: '♖', bSym: '♜' },
  { code: 'b', label: 'Bishop', wSym: '♗', bSym: '♝' },
  { code: 'n', label: 'Knight', wSym: '♘', bSym: '♞' },
]

export default function PromotionModal({ color, onSelect }) {
  if (!color) return null
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.72)' }}
    >
      <div
        className="rounded-xl p-6 flex flex-col items-center gap-4 shadow-2xl"
        style={{ background: 'var(--color-panel)', minWidth: 280 }}
      >
        <div className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
          Promote Pawn
        </div>
        <div className="flex gap-3">
          {PIECES.map(({ code, label, wSym, bSym }) => (
            <button
              key={code}
              onClick={() => onSelect(code)}
              title={label}
              className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors"
              style={{
                background: '#2d3748',
                color: '#e2e8f0',
                fontSize: 36,
                lineHeight: 1,
                border: '2px solid transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#374151' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#2d3748' }}
            >
              <span>{color === 'w' ? wSym : bSym}</span>
              <span style={{ fontSize: 10, color: '#a0aec0' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
