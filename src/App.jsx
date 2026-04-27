import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import Board from './components/Board'
import SidePanel from './components/SidePanel'
import GameEndModal from './components/GameEndModal'
import PromotionModal from './components/PromotionModal'
import { useChessGame } from './hooks/useChessGame'
import { useStockfish } from './hooks/useStockfish'
import { useMultiplayer } from './hooks/useMultiplayer'
import { useChessClock } from './hooks/useChessClock'
import GameReviewPanel from './components/GameReviewPanel'

const DEFAULT_ELO = 1200

export default function App() {
  const [elo, setElo] = useState(DEFAULT_ELO)
  const aiThinking = useRef(false)
  const prevTurnRef = useRef(null)

  const {
    fen, history, status, result, orientation, mode, turn, inCheck,
    makeMove, applyMove, undo, newGame, flipBoard, setMode, getMoves, resign, flagged,
  } = useChessGame()

  const { getBestMove, stop, evaluate } = useStockfish()

  const [timeControl, setTimeControl] = useState({ minutes: null, increment: 0 })

  const handleSetTimeControl = useCallback((tc) => {
    setTimeControl(tc)
  }, [])

  const initialSeconds = timeControl.minutes !== null ? timeControl.minutes * 60 : null

  const onTimeoutCallback = useCallback((color) => {
    const winner = color === 'w' ? 'Black' : 'White'
    flagged(winner)
  }, [flagged])

  const { whiteTime, blackTime, reset: resetClock, addIncrement } = useChessClock({
    initialSeconds,
    increment: timeControl.increment,
    activeTurn: turn,
    running: status === 'playing',
    onTimeout: onTimeoutCallback,
  })

  // Add increment to the player who just moved
  useEffect(() => {
    if (prevTurnRef.current && prevTurnRef.current !== turn && status === 'playing') {
      addIncrement(prevTurnRef.current)
    }
    prevTurnRef.current = turn
  }, [turn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Review mode
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewPositions, setReviewPositions] = useState([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [analysisResults, setAnalysisResults] = useState([])
  const [analysisProgress, setAnalysisProgress] = useState(0)

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [validMoveSquares, setValidMoveSquares] = useState([])

  // Promotion picker state: { from, to, color } when pending
  const [promotionPending, setPromotionPending] = useState(null)

  useEffect(() => {
    setSelectedSquare(null)
    setValidMoveSquares([])
  }, [fen])

  // Online multiplayer
  const handleMultiplayerMove = useCallback((uci) => {
    applyMove(uci)
  }, [applyMove])

  // Use a ref so the resign callback always has the latest `role` value
  // even though it's defined before useMultiplayer returns `role`
  const resignHandlerRef = useRef(null)

  const { roomId, connected, role, error: multiError, createRoom, joinRoom, sendMove, sendResign, reset: resetMultiplayer } = useMultiplayer({
    onMove: handleMultiplayerMove,
    onResign: () => resignHandlerRef.current?.(),
  })

  // Now `role` is available — update the ref each render so it always has fresh `role`
  resignHandlerRef.current = () => {
    const myColor = role === 'host' ? 'White' : 'Black'
    resign(myColor)
  }

  // Detect ?room= param on mount and auto-join
  const roomParam = useMemo(() => new URLSearchParams(window.location.search).get('room'), [])
  useEffect(() => {
    if (roomParam) {
      window.history.replaceState({}, '', window.location.pathname)
      setMode('online')
      joinRoom(roomParam)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset game when opponent first connects
  const prevConnected = useRef(false)
  useEffect(() => {
    if (mode === 'online' && connected && !prevConnected.current) {
      prevConnected.current = true
      newGame()
    }
    if (!connected) prevConnected.current = false
  }, [mode, connected, newGame])

  // Override orientation in online mode (host=white, guest=black)
  const effectiveOrientation = mode === 'online' && role
    ? (role === 'host' ? 'white' : 'black')
    : orientation

  const lastMove = history.length > 0 ? history[history.length - 1] : null

  const triggerAI = useCallback(async (currentFen) => {
    if (aiThinking.current) return
    aiThinking.current = true
    const move = await getBestMove(currentFen, elo)
    aiThinking.current = false
    if (move) applyMove(move)
  }, [getBestMove, elo, applyMove])

  const canMove = useCallback(() => {
    if (mode === 'vsAI' && turn === 'b') return false
    if (mode === 'online') {
      if (!connected) return false
      if (role === 'host' && turn !== 'w') return false
      if (role === 'guest' && turn !== 'b') return false
    }
    return true
  }, [mode, turn, connected, role])

  // Returns true if moving `from`->`to` is a pawn promotion
  const isPromotion = useCallback((from, to) => {
    const moves = getMoves(from)
    return moves.some(m => m.to === to && m.flags.includes('p'))
  }, [getMoves])

  const handleDrop = useCallback(({ sourceSquare, targetSquare }) => {
    if (!canMove()) return false
    if (isPromotion(sourceSquare, targetSquare)) {
      setPromotionPending({ from: sourceSquare, to: targetSquare, via: 'drop' })
      return false  // don't apply yet; wait for picker
    }
    const moved = makeMove(sourceSquare, targetSquare)
    if (moved && mode === 'online') sendMove(`${sourceSquare}${targetSquare}`)
    return moved
  }, [canMove, isPromotion, makeMove, mode, sendMove])

  const handleSquareClick = useCallback((square) => {
    if (status !== 'playing') return
    if (!canMove()) return

    if (selectedSquare === square) {
      setSelectedSquare(null)
      setValidMoveSquares([])
      return
    }

    if (selectedSquare && validMoveSquares.includes(square)) {
      if (isPromotion(selectedSquare, square)) {
        setPromotionPending({ from: selectedSquare, to: square, via: 'click' })
        setSelectedSquare(null)
        setValidMoveSquares([])
        return
      }
      const moved = makeMove(selectedSquare, square)
      if (moved && mode === 'online') sendMove(`${selectedSquare}${square}`)
      return
    }

    const moves = getMoves(square)
    if (moves.length > 0) {
      setSelectedSquare(square)
      setValidMoveSquares(moves.map(m => m.to))
    } else {
      setSelectedSquare(null)
      setValidMoveSquares([])
    }
  }, [status, canMove, selectedSquare, validMoveSquares, isPromotion, makeMove, getMoves, mode, sendMove])

  const handlePromotionSelect = useCallback((piece) => {
    if (!promotionPending) return
    const { from, to } = promotionPending
    setPromotionPending(null)
    const moved = makeMove(from, to, piece)
    if (moved && mode === 'online') sendMove(`${from}${to}${piece}`)
  }, [promotionPending, makeMove, mode, sendMove])

  useEffect(() => {
    if (mode === 'vsAI' && turn === 'b' && status === 'playing') {
      triggerAI(fen)
    }
  }, [fen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Run sequential Stockfish analysis when review mode starts
  useEffect(() => {
    if (!reviewMode || reviewPositions.length === 0) return

    let cancelled = false
    const scores = []

    async function runAnalysis() {
      for (let i = 0; i < reviewPositions.length; i++) {
        if (cancelled) return
        const { score, bestMove } = await evaluate(reviewPositions[i].fen)
        // Normalize: Stockfish score is from side-to-move perspective → White's perspective
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

  const handleUndo = useCallback(() => {
    if (mode === 'online') return
    if (aiThinking.current) stop()
    aiThinking.current = false
    undo(mode === 'vsAI' ? 2 : 1)
  }, [mode, undo, stop])

  const handleNewGame = useCallback(() => {
    if (aiThinking.current) stop()
    aiThinking.current = false
    newGame()
    resetClock()
  }, [newGame, stop, resetClock])

  const handleResign = useCallback(() => {
    if (status !== 'playing') return
    if (mode === 'online') {
      // Tell the opponent we resigned
      sendResign()
      // Local player (me) loses
      const myColor = role === 'host' ? 'White' : 'Black'
      const winner = myColor === 'White' ? 'Black' : 'White'
      resign(winner)
    } else {
      // In 2p / vsAI, the current turn's player resigns
      const loserColor = turn === 'w' ? 'White' : 'Black'
      const winner = loserColor === 'White' ? 'Black' : 'White'
      resign(winner)
    }
  }, [status, mode, role, turn, sendResign, resign])

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

  const handleSetMode = useCallback((m) => {
    if (aiThinking.current) stop()
    aiThinking.current = false
    if (m !== 'online') resetMultiplayer()
    setMode(m)
    if (m === 'online' && !roomParam) createRoom()
  }, [setMode, stop, createRoom, resetMultiplayer, roomParam])

  const roomUrl = roomId
    ? `${window.location.origin}${window.location.pathname}?room=${roomId}`
    : null

  const calcBoardWidth = () => {
    if (typeof window === 'undefined') return 480
    const w = window.innerWidth
    return w < 768
      ? Math.min(480, w - 24)          // mobile: full-width minus 12px padding each side
      : Math.min(560, Math.max(280, w - 340)) // desktop: leave room for side panel
  }

  const [boardWidth, setBoardWidth] = useState(calcBoardWidth)

  useEffect(() => {
    const onResize = () => setBoardWidth(calcBoardWidth())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <header className="py-4 px-6 border-b" style={{ borderColor: '#2d3748' }}>
        <h1 className="text-lg font-semibold tracking-wide" style={{ color: 'var(--color-accent)' }}>♟ Hoàng Minh lớp 5.3, play Chess with me</h1>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-center md:items-start justify-center gap-3 md:gap-6 p-3 md:p-6">
        <div className="flex-shrink-0">
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
        </div>

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
              turn={turn}
            />
          )}
        </aside>
      </main>

      {!reviewMode && (
        <GameEndModal
          result={result}
          status={status}
          onPlayAgain={handleNewGame}
          onReview={handleReview}
        />
      )}

      <PromotionModal
        color={promotionPending ? turn : null}
        onSelect={handlePromotionSelect}
      />
    </div>
  )
}
