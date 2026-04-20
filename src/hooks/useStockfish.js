import { useEffect, useRef, useState, useCallback } from 'react'

function eloToSkillLevel(elo) {
  const clamped = Math.max(1200, Math.min(2000, elo))
  return Math.round(((clamped - 1200) / 800) * 15) + 5
}

export function useStockfish() {
  const workerRef = useRef(null)
  const resolverRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // stockfish-18-lite.js + .wasm are copied to public/ — served from root, no CORS
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
      if (typeof data === 'string' && data.startsWith('bestmove')) {
        const move = data.split(' ')[1]
        resolverRef.current?.(move)
        resolverRef.current = null
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

  const stop = useCallback(() => {
    workerRef.current?.postMessage('stop')
    resolverRef.current?.(null)
    resolverRef.current = null
  }, [])

  return { ready, getBestMove, stop }
}
