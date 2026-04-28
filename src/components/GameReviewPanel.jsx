import { useRef, useEffect } from 'react'

const CLASSIFICATION_COLORS = {
  Best: '#68d391',
  Good: '#68d391',
  Inaccuracy: '#F6E05E',
  Mistake: '#ED8936',
  Blunder: '#fc8181',
}

function MoveCell({ result, moveIndex, reviewIndex }) {
  if (!result) return <span className="flex-1" />
  const isActive = reviewIndex === moveIndex + 1
  const color = CLASSIFICATION_COLORS[result.classification] ?? '#e2e8f0'
  return (
    <span
      className="flex-1 px-1 rounded cursor-default"
      style={{
        color,
        background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
        fontSize: 13,
      }}
    >
      {result.san}
    </span>
  )
}

export default function GameReviewPanel({ positions, results, reviewIndex, analysisProgress, onPrev, onNext, onExit }) {
  const moveListRef = useRef(null)
  const totalMoves = positions.length - 1
  const isAnalyzing = analysisProgress < positions.length

  // Auto-scroll move list to active row
  useEffect(() => {
    if (moveListRef.current) {
      const active = moveListRef.current.querySelector('[data-active="true"]')
      active?.scrollIntoView({ block: 'nearest' })
    }
  }, [reviewIndex])

  // Pair up results: white + black per row
  const pairs = []
  for (let i = 0; i < totalMoves; i += 2) {
    pairs.push({
      n: Math.floor(i / 2) + 1,
      wResult: results[i],
      bResult: results[i + 1],
      wIndex: i,
      bIndex: i + 1,
    })
  }

  // Annotation for the move that just arrived at reviewIndex
  const currentResult = reviewIndex > 0 ? results[reviewIndex - 1] : null

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header + progress */}
      <div className="rounded-lg p-3" style={{ background: 'var(--color-panel)' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
            Game Review
          </div>
          <button
            onClick={onExit}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ background: '#2d3748', color: '#a0aec0' }}
          >
            Exit Review
          </button>
        </div>
        {isAnalyzing && (
          <div className="mt-2">
            <div className="text-xs mb-1" style={{ color: '#a0aec0' }}>
              Analyzing… {analysisProgress} / {positions.length}
            </div>
            <div style={{ height: 4, background: '#2d3748', borderRadius: 2 }}>
              <div
                style={{
                  height: '100%',
                  width: `${(analysisProgress / positions.length) * 100}%`,
                  background: 'var(--color-primary)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Annotated move list */}
      <div className="rounded-lg p-3" style={{ background: 'var(--color-panel)', minHeight: 160 }}>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-accent)' }}>Moves</div>
        <div ref={moveListRef} className="overflow-y-auto" style={{ maxHeight: 200 }}>
          {pairs.length === 0 && <div style={{ color: '#4a5568', fontSize: 13 }}>No moves</div>}
          {pairs.map(({ n, wResult, bResult, wIndex, bIndex }) => (
            <div
              key={n}
              className="flex gap-1 py-0.5"
              data-active={reviewIndex === wIndex + 1 || reviewIndex === bIndex + 1 ? 'true' : undefined}
            >
              <span style={{ color: '#4a5568', minWidth: 22, fontSize: 13 }}>{n}.</span>
              <MoveCell result={wResult} moveIndex={wIndex} reviewIndex={reviewIndex} />
              <MoveCell result={bResult} moveIndex={bIndex} reviewIndex={reviewIndex} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="rounded-lg p-3" style={{ background: 'var(--color-panel)' }}>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onPrev}
            disabled={reviewIndex === 0}
            className="flex-1 py-1.5 rounded text-sm transition-colors"
            style={{
              background: '#2d3748',
              color: reviewIndex === 0 ? '#4a5568' : '#a0aec0',
              cursor: reviewIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Prev
          </button>
          <span className="text-xs text-center" style={{ color: '#a0aec0', minWidth: 60 }}>
            {reviewIndex} / {totalMoves}
          </span>
          <button
            onClick={onNext}
            disabled={reviewIndex >= totalMoves}
            className="flex-1 py-1.5 rounded text-sm transition-colors"
            style={{
              background: '#2d3748',
              color: reviewIndex >= totalMoves ? '#4a5568' : '#a0aec0',
              cursor: reviewIndex >= totalMoves ? 'not-allowed' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>

        {/* Per-move annotation */}
        {currentResult ? (
          <div
            className="text-xs p-2 rounded"
            style={{
              background: '#1a2035',
              color: CLASSIFICATION_COLORS[currentResult.classification] ?? '#a0aec0',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 700 }}>{currentResult.classification}</span>
            {currentResult.cpLoss > 0 && (
              <span style={{ color: '#718096' }}> — lost {currentResult.cpLoss}cp</span>
            )}
            {currentResult.bestMove && (
              <div style={{ color: '#68d391', marginTop: 2 }}>
                Best: {currentResult.bestMove}
              </div>
            )}
          </div>
        ) : reviewIndex === 0 ? (
          <div className="text-xs p-2" style={{ color: '#4a5568' }}>Starting position</div>
        ) : (
          <div className="text-xs p-2" style={{ color: '#4a5568' }}>Analyzing…</div>
        )}
      </div>
    </div>
  )
}
