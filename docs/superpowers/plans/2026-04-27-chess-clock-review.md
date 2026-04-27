# Chess Clock + Game Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add chess clock with time controls (3+0, 5+0, 10+0 + 0–10s increment) and a post-game review mode with Stockfish-powered move annotations (best/inaccuracy/mistake/blunder).

**Architecture:** Clock state lives in App.jsx via `useChessClock`; review state (positions, scores, index) also lives in App.jsx and runs a sequential async Stockfish evaluation loop after the user clicks Review. A new `GameReviewPanel` component replaces the normal SidePanel content during review. Board gains pass-through `arrows` and `extraSquareStyles` props for review highlights.

**Tech Stack:** React 19, Vite, chess.js, react-chessboard v5, Stockfish WASM Web Worker, Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/hooks/useChessGame.js` | Modify | Add `flagged(winner)` → status `'timeout'` |
| `src/hooks/useChessClock.js` | Modify | Add `increment` param + `addIncrement(color)` method |
| `src/hooks/useStockfish.js` | Modify | Add `evaluate(fen)` → `{ score, bestMove }` |
| `src/components/GameEndModal.jsx` | Modify | Add `'timeout'` to emoji map |
| `src/components/Board.jsx` | Modify | Accept `arrows`, `extraSquareStyles`, `readOnly` props |
| `src/components/SidePanel.jsx` | Modify | Add Time Control section + ChessClock render |
| `src/components/GameReviewPanel.jsx` | Create | Annotated move list, progress bar, nav, annotation box |
| `src/App.jsx` | Modify | Wire clock + review mode + analysis loop |
| `tests/useChessGame.test.js` | Modify | Add `flagged` tests |
| `tests/useChessClock.test.js` | Create | Increment + addIncrement + tick + timeout tests |

---

## Task 1: Add `flagged()` to `useChessGame` and update `GameEndModal`

**Files:**
- Modify: `src/hooks/useChessGame.js`
- Modify: `src/components/GameEndModal.jsx`
- Modify: `tests/useChessGame.test.js`

- [ ] **Step 1: Add failing tests for `flagged`**

Append to `tests/useChessGame.test.js` inside the `describe` block (before the closing `})`):

```js
  test('flagged sets status to timeout with correct result', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => { result.current.flagged('White') })
    expect(result.current.status).toBe('timeout')
    expect(result.current.result).toBe('White wins on time')
  })

  test('flagged with Black winner', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => { result.current.flagged('Black') })
    expect(result.current.status).toBe('timeout')
    expect(result.current.result).toBe('Black wins on time')
  })

  test('newGame clears timeout status', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => { result.current.flagged('White') })
    act(() => { result.current.newGame() })
    expect(result.current.status).toBe('playing')
    expect(result.current.result).toBeNull()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/useChessGame.test.js
```

Expected: FAIL — `result.current.flagged is not a function`

- [ ] **Step 3: Add `flagged` to `useChessGame.js`**

In `src/hooks/useChessGame.js`, add after the `resign` callback:

```js
  const flagged = useCallback((winner) => {
    setStatus('timeout')
    setResult(`${winner} wins on time`)
  }, [])
```

Add `flagged` to the return object:

```js
  return {
    fen,
    history,
    status,
    result,
    orientation,
    mode,
    turn: chess.turn(),
    inCheck: chess.inCheck(),
    chess,
    getMoves,
    makeMove,
    applyMove,
    undo,
    newGame,
    flipBoard,
    setMode,
    resign,
    flagged,
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/useChessGame.test.js
```

Expected: all PASS

- [ ] **Step 5: Update `GameEndModal` emoji map for timeout**

In `src/components/GameEndModal.jsx`, replace line 4:

```js
  const emoji = status === 'checkmate' ? '♟' : status === 'stalemate' ? '½' : status === 'resign' ? '🏳' : status === 'timeout' ? '⏱' : '='
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useChessGame.js src/components/GameEndModal.jsx tests/useChessGame.test.js
git commit -m "feat: add flagged() for timeout game-over and update GameEndModal"
```

---

## Task 2: Add increment support to `useChessClock`

**Files:**
- Modify: `src/hooks/useChessClock.js`
- Create: `tests/useChessClock.test.js`

- [ ] **Step 1: Create failing tests**

Create `tests/useChessClock.test.js`:

```js
import { renderHook, act } from '@testing-library/react'
import { useChessClock } from '../src/hooks/useChessClock'

describe('useChessClock', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  test('initialises with correct times', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: 180, increment: 0, activeTurn: 'w', running: false, onTimeout })
    )
    expect(result.current.whiteTime).toBe(180)
    expect(result.current.blackTime).toBe(180)
  })

  test('addIncrement adds seconds to white', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: 180, increment: 5, activeTurn: 'w', running: false, onTimeout })
    )
    act(() => { result.current.addIncrement('w') })
    expect(result.current.whiteTime).toBe(185)
  })

  test('addIncrement adds seconds to black', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: 180, increment: 3, activeTurn: 'b', running: false, onTimeout })
    )
    act(() => { result.current.addIncrement('b') })
    expect(result.current.blackTime).toBe(183)
  })

  test('addIncrement clamps to 600s', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: 599, increment: 5, activeTurn: 'w', running: false, onTimeout })
    )
    act(() => { result.current.addIncrement('w') })
    expect(result.current.whiteTime).toBe(600)
  })

  test('addIncrement does nothing when increment is 0', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: 180, increment: 0, activeTurn: 'w', running: false, onTimeout })
    )
    act(() => { result.current.addIncrement('w') })
    expect(result.current.whiteTime).toBe(180)
  })

  test('ticks white clock down when running', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: 10, increment: 0, activeTurn: 'w', running: true, onTimeout })
    )
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.whiteTime).toBe(7)
    expect(result.current.blackTime).toBe(10)
  })

  test('calls onTimeout with "w" when white runs out', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: 2, increment: 0, activeTurn: 'w', running: true, onTimeout })
    )
    act(() => { vi.advanceTimersByTime(3000) })
    expect(onTimeout).toHaveBeenCalledWith('w')
    expect(result.current.whiteTime).toBe(0)
  })

  test('reset restores initial times', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: 60, increment: 0, activeTurn: 'w', running: false, onTimeout })
    )
    act(() => { result.current.addIncrement('w') })
    act(() => { result.current.reset() })
    expect(result.current.whiteTime).toBe(60)
    expect(result.current.blackTime).toBe(60)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/useChessClock.test.js
```

Expected: FAIL — `addIncrement is not a function` (the other existing tests may partially pass)

- [ ] **Step 3: Update `useChessClock.js` with `increment` param and `addIncrement`**

Replace the entire content of `src/hooks/useChessClock.js`:

```js
import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useChessClock
 *
 * @param {number|null} initialSeconds  – null means "no clock / unlimited"
 * @param {number}      increment       – seconds added after each move (default 0)
 * @param {'w'|'b'}     activeTurn      – whose clock should tick
 * @param {boolean}     running         – true while game is 'playing'
 * @param {function}    onTimeout       – called with 'w' or 'b' when a player flags
 */
export function useChessClock({ initialSeconds, increment = 0, activeTurn, running, onTimeout }) {
  const [whiteTime, setWhiteTime] = useState(initialSeconds)
  const [blackTime, setBlackTime] = useState(initialSeconds)

  // Keep refs so the interval closure always sees fresh values
  const whiteRef = useRef(initialSeconds)
  const blackRef = useRef(initialSeconds)
  const timedOutRef = useRef(false)
  const intervalRef = useRef(null)

  // Reset clocks whenever initialSeconds changes (new time control selected)
  useEffect(() => {
    whiteRef.current = initialSeconds
    blackRef.current = initialSeconds
    timedOutRef.current = false
    setWhiteTime(initialSeconds)
    setBlackTime(initialSeconds)
  }, [initialSeconds])

  // Reset when game restarts (running flips from false → true)
  const prevRunning = useRef(running)
  useEffect(() => {
    if (!prevRunning.current && running) {
      whiteRef.current = initialSeconds
      blackRef.current = initialSeconds
      timedOutRef.current = false
      setWhiteTime(initialSeconds)
      setBlackTime(initialSeconds)
    }
    prevRunning.current = running
  }, [running, initialSeconds])

  useEffect(() => {
    // No clock mode
    if (initialSeconds === null) return
    // Game not running
    if (!running) {
      clearInterval(intervalRef.current)
      return
    }

    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (timedOutRef.current) return

      if (activeTurn === 'w') {
        whiteRef.current = Math.max(0, whiteRef.current - 1)
        setWhiteTime(whiteRef.current)
        if (whiteRef.current === 0) {
          timedOutRef.current = true
          clearInterval(intervalRef.current)
          onTimeout('w')
        }
      } else {
        blackRef.current = Math.max(0, blackRef.current - 1)
        setBlackTime(blackRef.current)
        if (blackRef.current === 0) {
          timedOutRef.current = true
          clearInterval(intervalRef.current)
          onTimeout('b')
        }
      }
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [initialSeconds, activeTurn, running, onTimeout])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    timedOutRef.current = false
    whiteRef.current = initialSeconds
    blackRef.current = initialSeconds
    setWhiteTime(initialSeconds)
    setBlackTime(initialSeconds)
  }, [initialSeconds])

  const addIncrement = useCallback((color) => {
    if (!increment) return
    if (color === 'w') {
      whiteRef.current = Math.min(600, whiteRef.current + increment)
      setWhiteTime(whiteRef.current)
    } else {
      blackRef.current = Math.min(600, blackRef.current + increment)
      setBlackTime(blackRef.current)
    }
  }, [increment])

  return { whiteTime, blackTime, reset, addIncrement }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/useChessClock.test.js
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useChessClock.js tests/useChessClock.test.js
git commit -m "feat: add increment support and addIncrement() to useChessClock"
```

---

## Task 3: Add `evaluate(fen)` to `useStockfish`

**Files:**
- Modify: `src/hooks/useStockfish.js`

Note: The Stockfish worker cannot be unit-tested in jsdom (no WebWorker). Verification is done via manual smoke test in the browser (Task 7 integration).

- [ ] **Step 1: Replace `src/hooks/useStockfish.js`**

```js
import { useEffect, useRef, useState, useCallback } from 'react'

function eloToSkillLevel(elo) {
  const clamped = Math.max(1200, Math.min(2000, elo))
  return Math.round(((clamped - 1200) / 800) * 15) + 5
}

export function useStockfish() {
  const workerRef = useRef(null)
  const resolverRef = useRef(null)
  const evalResolverRef = useRef(null)
  const pendingScoreRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const worker = new Worker('/stockfish.js')
    workerRef.current = worker

    worker.onmessage = ({ data }) => {
      if (data === 'uciok') {
        worker.postMessage('isready')
        return
      }
      if (data === 'readyok') {
        setReady(true)
        return
      }
      // Capture centipawn score from info lines (used by evaluate())
      if (typeof data === 'string' && data.startsWith('info')) {
        const cpMatch = data.match(/score cp (-?\d+)/)
        if (cpMatch) {
          pendingScoreRef.current = parseInt(cpMatch[1], 10)
        }
        const mateMatch = data.match(/score mate (-?\d+)/)
        if (mateMatch) {
          pendingScoreRef.current = parseInt(mateMatch[1], 10) > 0 ? 10000 : -10000
        }
      }
      if (typeof data === 'string' && data.startsWith('bestmove')) {
        const move = data.split(' ')[1]
        if (evalResolverRef.current) {
          // Resolve evaluate() call
          evalResolverRef.current({ bestMove: move === '(none)' ? null : move, score: pendingScoreRef.current ?? 0 })
          evalResolverRef.current = null
          pendingScoreRef.current = null
        } else {
          // Resolve getBestMove() call
          resolverRef.current?.(move)
          resolverRef.current = null
        }
      }
    }

    worker.postMessage('uci')

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const getBestMove = useCallback((fen, elo) => {
    return new Promise((resolve) => {
      const worker = workerRef.current
      if (!worker) { resolve(null); return }

      if (resolverRef.current) {
        worker.postMessage('stop')
        resolverRef.current(null)
      }

      resolverRef.current = resolve
      const skillLevel = eloToSkillLevel(elo)

      worker.postMessage(`setoption name UCI_LimitStrength value true`)
      worker.postMessage(`setoption name UCI_Elo value ${elo}`)
      worker.postMessage(`setoption name Skill Level value ${skillLevel}`)
      worker.postMessage(`position fen ${fen}`)
      worker.postMessage(`go movetime 1000`)
    })
  }, [])

  /**
   * evaluate(fen) — full-strength position evaluation
   * Returns { score: number, bestMove: string|null }
   * Score is from the SIDE-TO-MOVE perspective (positive = side to move is winning).
   * Caller normalises to White's perspective by flipping sign when it's Black to move.
   */
  const evaluate = useCallback((fen) => {
    return new Promise((resolve) => {
      const worker = workerRef.current
      if (!worker) { resolve({ score: 0, bestMove: null }); return }

      // Cancel any pending getBestMove
      if (resolverRef.current) {
        worker.postMessage('stop')
        resolverRef.current(null)
        resolverRef.current = null
      }

      evalResolverRef.current = resolve
      pendingScoreRef.current = null

      worker.postMessage('setoption name UCI_LimitStrength value false')
      worker.postMessage(`position fen ${fen}`)
      worker.postMessage('go movetime 500')
    })
  }, [])

  const stop = useCallback(() => {
    workerRef.current?.postMessage('stop')
    resolverRef.current?.(null)
    resolverRef.current = null
    evalResolverRef.current?.({ score: 0, bestMove: null })
    evalResolverRef.current = null
  }, [])

  return { ready, getBestMove, evaluate, stop }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useStockfish.js
git commit -m "feat: add evaluate() to useStockfish for position scoring"
```

---

## Task 4: Time control UI in SidePanel + clock wiring in App.jsx

**Files:**
- Modify: `src/components/SidePanel.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Update `SidePanel.jsx`**

Replace the entire content of `src/components/SidePanel.jsx`:

```jsx
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
```

- [ ] **Step 2: Wire clock in `App.jsx`**

At the top of `App.jsx`, add the import:

```js
import { useChessClock } from './hooks/useChessClock'
```

After the `const DEFAULT_ELO = 1200` line, add nothing — the state goes inside the component.

Inside the `App()` function, after the `useChessGame` destructuring, add:

```js
  const [timeControl, setTimeControl] = useState({ minutes: null, increment: 0 })

  const handleSetTimeControl = useCallback((tc) => {
    setTimeControl(tc)
  }, [])

  const initialSeconds = timeControl.minutes !== null ? timeControl.minutes * 60 : null

  const { whiteTime, blackTime, reset: resetClock, addIncrement } = useChessClock({
    initialSeconds,
    increment: timeControl.increment,
    activeTurn: turn,
    running: status === 'playing',
    onTimeout: useCallback((color) => {
      const winner = color === 'w' ? 'Black' : 'White'
      flagged(winner)
    }, [flagged]),
  })

  // Add increment to the player who just moved
  const prevTurnRef = useRef(null)
  useEffect(() => {
    if (prevTurnRef.current && prevTurnRef.current !== turn && status === 'playing') {
      addIncrement(prevTurnRef.current)
    }
    prevTurnRef.current = turn
  }, [turn])  // eslint-disable-line react-hooks/exhaustive-deps
```

Update `handleNewGame` to also reset the clock:

```js
  const handleNewGame = useCallback(() => {
    if (aiThinking.current) stop()
    aiThinking.current = false
    newGame()
    resetClock()
  }, [newGame, stop, resetClock])
```

Destructure `flagged` from `useChessGame`:

```js
  const {
    fen, history, status, result, orientation, mode, turn, inCheck,
    makeMove, applyMove, undo, newGame, flipBoard, setMode, getMoves, resign, flagged,
  } = useChessGame()
```

Update the `SidePanel` JSX to pass new props:

```jsx
          <SidePanel
            mode={mode}
            elo={elo}
            history={history}
            status={status}
            roomUrl={roomUrl}
            onlineConnected={connected}
            onlineRole={role}
            onlineError={multiError}
            onSetMode={handleSetMode}
            onSetElo={setElo}
            onNewGame={handleNewGame}
            onUndo={handleUndo}
            onFlip={flipBoard}
            onResign={handleResign}
            timeControl={timeControl}
            onSetTimeControl={handleSetTimeControl}
            whiteTime={whiteTime}
            blackTime={blackTime}
            orientation={effectiveOrientation}
          />
```

- [ ] **Step 3: Start dev server and verify manually**

```bash
npm run dev
```

Verify:
- Time Control section appears in SidePanel with ∞ / 3+0 / 5+0 / 10+0 buttons
- Selecting 3+0 shows two clocks and the increment stepper
- − and + buttons on the increment stepper work (0–10 range)
- Clocks tick while game is in progress
- Running to zero ends the game with the correct modal (⏱ White/Black wins on time)

- [ ] **Step 4: Commit**

```bash
git add src/components/SidePanel.jsx src/App.jsx
git commit -m "feat: add time control UI and wire chess clock with increment into App"
```

---

## Task 5: Update `Board.jsx` for review arrows and highlights

**Files:**
- Modify: `src/components/Board.jsx`

- [ ] **Step 1: Update `Board.jsx`**

Replace the entire content of `src/components/Board.jsx`:

```jsx
import { Chessboard } from 'react-chessboard'
import { useMemo } from 'react'

export default function Board({
  fen, orientation, lastMove, inCheck, turn,
  onDrop, onSquareClick,
  selectedSquare, validMoveSquares,
  boardWidth,
  arrows,
  extraSquareStyles,
  readOnly,
}) {
  const squareStyles = useMemo(() => {
    const styles = {}
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.35)' }
      styles[lastMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.35)' }
    }
    if (inCheck) {
      const rows = fen.split(' ')[0].split('/')
      const kingChar = turn === 'w' ? 'K' : 'k'
      const files = 'abcdefgh'
      rows.forEach((row, rankIdx) => {
        let fileIdx = 0
        for (const ch of row) {
          if (ch === kingChar) {
            styles[`${files[fileIdx]}${8 - rankIdx}`] = { backgroundColor: 'rgba(255, 0, 0, 0.5)' }
          }
          if (isNaN(ch)) fileIdx++
          else fileIdx += parseInt(ch)
        }
      })
    }
    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: 'rgba(20, 85, 30, 0.5)' }
    }
    validMoveSquares?.forEach(sq => {
      styles[sq] = { background: 'radial-gradient(circle, rgba(0,0,0,.25) 36%, transparent 36%)' }
    })
    if (extraSquareStyles) {
      Object.assign(styles, extraSquareStyles)
    }
    return styles
  }, [lastMove, inCheck, fen, turn, selectedSquare, validMoveSquares, extraSquareStyles])

  return (
    <div style={{ width: boardWidth, flexShrink: 0 }}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          onPieceDrop: readOnly ? () => false : onDrop,
          onSquareClick: readOnly ? undefined : ({ square }) => onSquareClick?.(square),
          boardWidth: boardWidth,
          boardStyle: { borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' },
          darkSquareStyle: { backgroundColor: '#769656' },
          lightSquareStyle: { backgroundColor: '#eeeed2' },
          squareStyles: squareStyles,
          arrows: arrows ?? [],
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Board.jsx
git commit -m "feat: add arrows, extraSquareStyles, readOnly props to Board"
```

---

## Task 6: Create `GameReviewPanel.jsx`

**Files:**
- Create: `src/components/GameReviewPanel.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/GameReviewPanel.jsx`:

```jsx
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
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameReviewPanel.jsx
git commit -m "feat: add GameReviewPanel component with annotated move list and navigation"
```

---

## Task 7: Wire review mode in `App.jsx`

**Files:**
- Modify: `src/App.jsx`

This is the final integration task. It adds review state, the analysis loop, and wires the Board and SidePanel for review mode.

- [ ] **Step 1: Add imports to `App.jsx`**

Add to the existing imports at the top:

```js
import GameReviewPanel from './components/GameReviewPanel'
import { useChessClock } from './hooks/useChessClock'
```

(Note: `useChessClock` was already added in Task 4. Only add `GameReviewPanel` if not already imported.)

- [ ] **Step 2: Add the `evaluate` import from `useStockfish`**

Update the destructuring of `useStockfish`:

```js
  const { getBestMove, stop, evaluate } = useStockfish()
```

- [ ] **Step 3: Add review state inside `App()`**

Add after the clock state block (after `useChessClock`):

```js
  // Review mode
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewPositions, setReviewPositions] = useState([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [analysisResults, setAnalysisResults] = useState([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
```

- [ ] **Step 4: Add the `classify` helper and `handleReview` callback**

Add after the `handleResign` callback:

```js
  function classify(cpLoss) {
    if (cpLoss < 0) return 'Best'
    if (cpLoss < 50) return 'Good'
    if (cpLoss < 150) return 'Inaccuracy'
    if (cpLoss < 300) return 'Mistake'
    return 'Blunder'
  }

  const handleReview = useCallback(() => {
    if (history.length === 0) return
    const positions = [
      { fen: history[0].before },
      ...history.map(m => ({ fen: m.after })),
    ]
    setReviewPositions(positions)
    setReviewIndex(0)
    setAnalysisResults([])
    setAnalysisProgress(0)
    setReviewMode(true)
  }, [history])

  const handleExitReview = useCallback(() => {
    setReviewMode(false)
    setReviewPositions([])
    setAnalysisResults([])
  }, [])
```

- [ ] **Step 5: Add the analysis loop `useEffect`**

Add after the AI trigger `useEffect` (the one that depends on `[fen]`):

```js
  // Run sequential Stockfish analysis when review mode starts
  useEffect(() => {
    if (!reviewMode || reviewPositions.length === 0) return

    let cancelled = false
    const scores = []

    async function runAnalysis() {
      for (let i = 0; i < reviewPositions.length; i++) {
        if (cancelled) return
        const { score, bestMove } = await evaluate(reviewPositions[i].fen)
        // Normalize: Stockfish score is from side-to-move perspective → convert to White's perspective
        const isBlackTurn = reviewPositions[i].fen.split(' ')[1] === 'b'
        const normalizedScore = isBlackTurn ? -score : score
        scores.push({ score: normalizedScore, bestMove })
        setAnalysisProgress(i + 1)
      }
      if (cancelled) return

      // Classify each move by comparing adjacent scores
      const results = history.map((move, i) => {
        const scoreBefore = scores[i].score
        const scoreAfter = scores[i + 1].score
        const cpLoss = move.color === 'w'
          ? scoreBefore - scoreAfter
          : scoreAfter - scoreBefore
        return {
          san: move.san,
          bestMove: scores[i].bestMove,
          cpLoss: Math.round(Math.max(0, cpLoss)),
          classification: classify(cpLoss),
        }
      })
      setAnalysisResults(results)
    }

    runAnalysis()
    return () => { cancelled = true }
  }, [reviewMode, reviewPositions]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 6: Compute review board props**

Add these derived values in the render body (before the `return`):

```js
  // Board props for review mode
  const reviewFen = reviewMode ? (reviewPositions[reviewIndex]?.fen ?? fen) : fen

  const reviewArrows = (reviewMode && analysisResults[reviewIndex]?.bestMove)
    ? [[
        analysisResults[reviewIndex].bestMove.slice(0, 2),
        analysisResults[reviewIndex].bestMove.slice(2, 4),
        'rgba(104,211,145,0.8)',
      ]]
    : []

  const reviewSquareStyles = {}
  if (reviewMode && reviewIndex > 0) {
    const prevResult = analysisResults[reviewIndex - 1]
    const prevMove = history[reviewIndex - 1]
    if (prevResult && prevMove && (prevResult.classification === 'Blunder' || prevResult.classification === 'Mistake')) {
      reviewSquareStyles[prevMove.from] = { backgroundColor: 'rgba(252,129,129,0.45)' }
      reviewSquareStyles[prevMove.to] = { backgroundColor: 'rgba(252,129,129,0.45)' }
    }
  }
```

- [ ] **Step 7: Update Board JSX**

Replace the existing `<Board ... />` in the JSX with:

```jsx
          <Board
            fen={reviewFen}
            orientation={effectiveOrientation}
            lastMove={reviewMode ? null : lastMove}
            inCheck={reviewMode ? false : inCheck}
            turn={turn}
            onDrop={handleDrop}
            onSquareClick={handleSquareClick}
            selectedSquare={reviewMode ? null : selectedSquare}
            validMoveSquares={reviewMode ? [] : validMoveSquares}
            boardWidth={boardWidth}
            arrows={reviewArrows}
            extraSquareStyles={reviewSquareStyles}
            readOnly={reviewMode}
          />
```

- [ ] **Step 8: Update the `<aside>` to swap in `GameReviewPanel` during review**

Replace the existing `<aside>` block:

```jsx
        <aside className="w-full md:w-auto md:min-w-[240px] md:max-w-[280px]">
          {reviewMode ? (
            <GameReviewPanel
              positions={reviewPositions}
              results={analysisResults}
              reviewIndex={reviewIndex}
              analysisProgress={analysisProgress}
              onPrev={() => setReviewIndex(i => Math.max(0, i - 1))}
              onNext={() => setReviewIndex(i => Math.min(reviewPositions.length - 1, i + 1))}
              onExit={handleExitReview}
            />
          ) : (
            <SidePanel
              mode={mode}
              elo={elo}
              history={history}
              status={status}
              roomUrl={roomUrl}
              onlineConnected={connected}
              onlineRole={role}
              onlineError={multiError}
              onSetMode={handleSetMode}
              onSetElo={setElo}
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onFlip={flipBoard}
              onResign={handleResign}
              timeControl={timeControl}
              onSetTimeControl={handleSetTimeControl}
              whiteTime={whiteTime}
              blackTime={blackTime}
              orientation={effectiveOrientation}
            />
          )}
        </aside>
```

- [ ] **Step 9: Wire `onReview` in `GameEndModal` and hide modal during review**

Replace the existing `<GameEndModal ... />`:

```jsx
      {!reviewMode && (
        <GameEndModal
          result={result}
          status={status}
          onPlayAgain={handleNewGame}
          onReview={handleReview}
        />
      )}
```

- [ ] **Step 10: Start dev server and verify the full review flow**

```bash
npm run dev
```

Verify:
1. Play a complete game (resign or checkmate)
2. GameEndModal appears with Play Again + Review buttons
3. Click Review — modal closes, board shows starting position, SidePanel shows "Analyzing… 0 / N" with progress bar
4. Progress bar fills as Stockfish evaluates each position (~0.5s per position)
5. When done, annotated move list shows each move colored (green/yellow/orange/red)
6. ← Prev / Next → buttons step through positions
7. Green arrow appears on board showing Stockfish's best move from current position
8. Red highlights on from/to squares of a blunder or mistake
9. Annotation box below nav shows classification + cp loss + best move UCI string
10. "Exit Review" returns to the normal board view with the game result still shown

- [ ] **Step 11: Commit**

```bash
git add src/App.jsx src/components/GameReviewPanel.jsx src/components/Board.jsx
git commit -m "feat: wire full review mode with Stockfish batch analysis and annotated board"
```

---

## Self-Review Notes

- `classify()` is defined as a plain function inside App — it doesn't need to be a hook or callback since it has no deps
- `evaluate()` cancels any in-flight `getBestMove` before starting — safe because review only starts after game ends (AI is idle)
- The analysis loop uses `cancelled` flag to handle component unmount during analysis
- `arrows` in react-chessboard v5 options uses tuple format `[fromSq, toSq, color]` — if the board doesn't show arrows, check the react-chessboard v5 changelog for the exact prop name (`customArrows` vs `arrows`)
- Score normalization: Stockfish returns cp from the side-to-move's perspective; flipping when Black to move gives a consistent White-positive scale for cpLoss math
- Blunder highlight only appears at positions > 0 (there's no "previous move" at the starting position)
- `analysisProgress` counts FEN evaluations (N+1), not moves (N) — the progress label "X / positions.length" correctly shows total evaluations including the final position
