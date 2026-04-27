import { useState, useCallback } from 'react'
import { Chess } from 'chess.js'

function deriveGameOver(chess) {
  if (chess.isCheckmate()) {
    const loser = chess.turn() === 'w' ? 'White' : 'Black'
    return { status: 'checkmate', result: `${loser === 'White' ? 'Black' : 'White'} wins by checkmate` }
  }
  if (chess.isStalemate()) return { status: 'stalemate', result: 'Draw by stalemate' }
  if (chess.isDraw()) return { status: 'draw', result: 'Draw' }
  return null
}

export function useChessGame() {
  const [chess] = useState(() => new Chess())
  const [fen, setFen] = useState(chess.fen())
  const [history, setHistory] = useState([])
  const [status, setStatus] = useState('playing')
  const [result, setResult] = useState(null)
  const [orientation, setOrientation] = useState('white')
  const [mode, setModeState] = useState('vsAI')

  const syncState = useCallback(() => {
    setFen(chess.fen())
    setHistory([...chess.history({ verbose: true })])
    const over = deriveGameOver(chess)
    if (over) {
      setStatus(over.status)
      setResult(over.result)
    }
  }, [chess])

  const makeMove = useCallback((from, to, promotion = 'q') => {
    if (status !== 'playing') return false
    try {
      const move = chess.move({ from, to, promotion })
      if (!move) return false
      syncState()
      return true
    } catch {
      return false
    }
  }, [chess, status, syncState])

  const applyMove = useCallback((uciMove) => {
    const from = uciMove.slice(0, 2)
    const to = uciMove.slice(2, 4)
    const promotion = uciMove.length === 5 ? uciMove[4] : 'q'
    return makeMove(from, to, promotion)
  }, [makeMove])

  const undo = useCallback((count = 1) => {
    for (let i = 0; i < count; i++) chess.undo()
    setFen(chess.fen())
    setHistory([...chess.history({ verbose: true })])
    setStatus('playing')
    setResult(null)
  }, [chess])

  const newGame = useCallback(() => {
    chess.reset()
    setFen(chess.fen())
    setHistory([])
    setStatus('playing')
    setResult(null)
  }, [chess])

  const resign = useCallback((winner) => {
    setStatus('resign')
    setResult(`${winner} wins — opponent resigned`)
  }, [])

  const flagged = useCallback((winner) => {
    setStatus('timeout')
    setResult(`${winner} wins on time`)
  }, [])

  const getMoves = useCallback((square) => {
    if (status !== 'playing') return []
    return chess.moves({ square, verbose: true })
  }, [chess, status])

  const flipBoard = useCallback(() => {
    setOrientation(o => o === 'white' ? 'black' : 'white')
  }, [])

  const setMode = useCallback((newMode) => {
    setModeState(newMode)
    chess.reset()
    setFen(chess.fen())
    setHistory([])
    setStatus('playing')
    setResult(null)
  }, [chess])

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
}
