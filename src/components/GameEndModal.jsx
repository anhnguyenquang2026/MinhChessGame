export default function GameEndModal({ result, status, onPlayAgain, onReview }) {
  if (!result) return null

  const emoji = status === 'checkmate' ? '♟' : status === 'stalemate' ? '½' : status === 'resign' ? '🏳' : status === 'timeout' ? '⏱' : '='

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.65)' }}
    >
      <div
        className="rounded-xl p-8 flex flex-col items-center gap-6 shadow-2xl"
        style={{ background: 'var(--color-panel)', minWidth: 300 }}
      >
        <div className="text-5xl">{emoji}</div>
        <div className="text-xl font-semibold text-center" style={{ color: '#e2e8f0' }}>{result}</div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Play Again
          </button>
          <button
            onClick={onReview}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: '#2d3748', color: '#a0aec0' }}
          >
            Review
          </button>
        </div>
      </div>
    </div>
  )
}
