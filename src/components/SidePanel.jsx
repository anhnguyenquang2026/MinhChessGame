import { useEffect, useRef } from 'react'
import ChessClock from './ChessClock'

const PRESETS = [
  { label: 'Easy', elo: 1200 },
  { label: 'Medium', elo: 1600 },
  { label: 'Hard', elo: 2000 },
]

const TIME_PRESETS = [
  { label: '∞', minutes: null },
  { label: '3+0', minutes: 3 },
  { label: '5+0', minutes: 5 },
  { label: '10+0', minutes: 10 },
]

export default function SidePanel({
  mode, elo, history, status, roomUrl, onlineConnected, onlineRole, onlineError,
  onSetMode, onSetElo, onNewGame, onUndo, onFlip, onResign,
  timeControl, onSetTimeControl,
  whiteTime, blackTime, orientation,
}) {
  const moveListRef = useRef(null)

  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight
    }
  }, [history])

  const pairs = []
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({ n: Math.floor(i / 2) + 1, w: history[i]?.san, b: history[i + 1]?.san })
  }

  return (
    <div className="flex flex-col gap-3 md:gap-4 w-full">
      {/* Mode toggle */}
      <div className="rounded-lg p-3" style={{ background: 'var(--color-panel)' }}>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-accent)' }}>Mode</div>
        <div className="flex gap-2">
          {[['vsAI', 'vs AI'], ['2p', '2 Player'], ['online', 'Online']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => onSetMode(m)}
              className="flex-1 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                background: mode === m ? 'var(--color-primary)' : '#2d3748',
                color: mode === m ? '#fff' : '#a0aec0',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Online status panel */}
      {mode === 'online' && (
        <div className="rounded-lg p-3" style={{ background: 'var(--color-panel)' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-accent)' }}>Online Play</div>
          {onlineError && (
            <div className="text-xs" style={{ color: '#fc8181' }}>Connection error. Try again.</div>
          )}
          {!onlineError && !onlineConnected && !roomUrl && (
            <div className="text-xs" style={{ color: '#a0aec0' }}>Setting up connection...</div>
          )}
          {!onlineError && !onlineConnected && roomUrl && onlineRole === 'host' && (
            <>
              <div className="text-xs mb-2" style={{ color: '#a0aec0' }}>Share with your opponent:</div>
              <div
                className="text-xs p-2 rounded break-all cursor-pointer select-all"
                style={{ background: '#2d3748', color: '#68d391' }}
                onClick={() => navigator.clipboard?.writeText(roomUrl)}
                title="Click to copy"
              >
                {roomUrl}
              </div>
              <div className="text-xs mt-1 text-center" style={{ color: '#4a5568' }}>Waiting... (click to copy link)</div>
            </>
          )}
          {!onlineError && !onlineConnected && onlineRole === 'guest' && (
            <div className="text-xs" style={{ color: '#a0aec0' }}>Joining game...</div>
          )}
          {onlineConnected && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#68d391' }} />
              <div className="text-xs" style={{ color: '#68d391' }}>
                Connected — you play {onlineRole === 'host' ? 'White' : 'Black'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Difficulty — only in vsAI mode */}
      {mode === 'vsAI' && (
        <div className="rounded-lg p-3" style={{ background: 'var(--color-panel)' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-accent)' }}>Difficulty</div>
          <div className="flex gap-2 mb-3">
            {PRESETS.map(p => (
              <button
                key={p.elo}
                onClick={() => onSetElo(p.elo)}
                className="flex-1 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  background: elo === p.elo ? 'var(--color-primary)' : '#2d3748',
                  color: elo === p.elo ? '#fff' : '#a0aec0',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={1200}
            max={2000}
            step={50}
            value={elo}
            onChange={e => onSetElo(Number(e.target.value))}
            className="w-full accent-green-600"
          />
          <div className="text-xs text-center mt-1" style={{ color: '#a0aec0' }}>ELO {elo}</div>
        </div>
      )}

      {/* Time Control */}
      <div className="rounded-lg p-3" style={{ background: 'var(--color-panel)' }}>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-accent)' }}>Time Control</div>
        <div className="flex gap-1 mb-2">
          {TIME_PRESETS.map(({ label, minutes }) => (
            <button
              key={label}
              onClick={() => onSetTimeControl({ minutes, increment: timeControl.increment })}
              className="flex-1 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: timeControl.minutes === minutes ? 'var(--color-primary)' : '#2d3748',
                color: timeControl.minutes === minutes ? '#fff' : '#a0aec0',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {timeControl.minutes !== null && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs" style={{ color: '#a0aec0' }}>Increment</span>
              <button
                onClick={() => onSetTimeControl({ ...timeControl, increment: Math.max(0, timeControl.increment - 1) })}
                className="px-2 py-0.5 rounded text-sm font-bold"
                style={{ background: '#2d3748', color: '#a0aec0' }}
              >−</button>
              <span className="text-xs text-center font-mono" style={{ color: '#e2e8f0', minWidth: 28 }}>
                {timeControl.increment}s
              </span>
              <button
                onClick={() => onSetTimeControl({ ...timeControl, increment: Math.min(10, timeControl.increment + 1) })}
                className="px-2 py-0.5 rounded text-sm font-bold"
                style={{ background: '#2d3748', color: '#a0aec0' }}
              >+</button>
            </div>
            <ChessClock
              whiteTime={whiteTime}
              blackTime={blackTime}
              activeTurn={status === 'playing' ? (history.length % 2 === 0 ? 'w' : 'b') : null}
              running={status === 'playing'}
              orientation={orientation}
            />
          </>
        )}
      </div>

      {/* Move list */}
      <div className="rounded-lg p-3 flex-1 flex flex-col" style={{ background: 'var(--color-panel)', minHeight: 160 }}>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-accent)' }}>Moves</div>
        <div ref={moveListRef} className="overflow-y-auto flex-1 text-sm" style={{ maxHeight: 160 }}>
          {pairs.length === 0 && <div style={{ color: '#4a5568' }}>No moves yet</div>}
          {pairs.map(({ n, w, b }) => (
            <div key={n} className="flex gap-2 py-0.5">
              <span style={{ color: '#4a5568', minWidth: 24 }}>{n}.</span>
              <span className="flex-1" style={{ color: '#e2e8f0' }}>{w}</span>
              <span className="flex-1" style={{ color: '#a0aec0' }}>{b ?? ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-lg p-3" style={{ background: 'var(--color-panel)' }}>
        <div className="flex flex-col gap-2">
          <button
            onClick={onNewGame}
            className="w-full py-2 rounded text-sm font-semibold transition-colors"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            ⊕ New Game
          </button>
          {status === 'playing' && (
            <button
              onClick={onResign}
              className="w-full py-2 rounded text-sm font-semibold transition-colors"
              style={{
                background: 'rgba(229,62,62,0.15)',
                color: '#fc8181',
                border: '1px solid rgba(229,62,62,0.35)',
              }}
            >
              🏳 Resign
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={onUndo}
              disabled={mode === 'online'}
              className="flex-1 py-1.5 rounded text-sm transition-colors"
              style={{
                background: '#2d3748',
                color: mode === 'online' ? '#4a5568' : '#a0aec0',
                cursor: mode === 'online' ? 'not-allowed' : 'pointer',
              }}
            >
              ↩ Undo
            </button>
            <button
              onClick={onFlip}
              className="flex-1 py-1.5 rounded text-sm transition-colors"
              style={{ background: '#2d3748', color: '#a0aec0' }}
            >
              ⇅ Flip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

