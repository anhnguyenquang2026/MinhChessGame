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
