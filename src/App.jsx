import { useState, useCallback, useRef, useEffect } from 'react'
import Board from './components/Board'
import SidePanel from './components/SidePanel'
import GameEndModal from './components/GameEndModal'
import { useChessGame } from './hooks/useChessGame'
import { useStockfish } from './hooks/useStockfish'

const DEFAULT_ELO = 1200

export default function App() {
  const [elo, setElo] = useState(DEFAULT_ELO)
  const aiThinking = useRef(false)

  const {
    fen, history, status, result, orientation, mode, turn, inCheck,
    makeMove, applyMove, undo, newGame, flipBoard, setMode,
  } = useChessGame()

  const { getBestMove, stop } = useStockfish()

  const lastMove = history.length > 0 ? history[history.length - 1] : null

  const triggerAI = useCallback(async (currentFen) => {
    if (aiThinking.current) return
    aiThinking.current = true
    const move = await getBestMove(currentFen, elo)
    aiThinking.current = false
    if (move) applyMove(move)
  }, [getBestMove, elo, applyMove])

  const handleDrop = useCallback(({ sourceSquare, targetSquare }) => {
    if (mode === 'vsAI' && turn === 'b') return false
    return makeMove(sourceSquare, targetSquare)
  }, [mode, turn, makeMove])

  useEffect(() => {
    if (mode === 'vsAI' && turn === 'b' && status === 'playing') {
      triggerAI(fen)
    }
  }, [fen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = useCallback(() => {
    if (aiThinking.current) stop()
    aiThinking.current = false
    undo(mode === 'vsAI' ? 2 : 1)
  }, [mode, undo, stop])

  const handleNewGame = useCallback(() => {
    if (aiThinking.current) stop()
    aiThinking.current = false
    newGame()
  }, [newGame, stop])

  const handleSetMode = useCallback((m) => {
    if (aiThinking.current) stop()
    aiThinking.current = false
    setMode(m)
  }, [setMode, stop])

  const [boardWidth, setBoardWidth] = useState(() =>
    Math.min(560, typeof window !== 'undefined' ? Math.max(280, window.innerWidth - 340) : 560)
  )

  useEffect(() => {
    const onResize = () => setBoardWidth(Math.min(560, Math.max(280, window.innerWidth - 340)))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <header className="py-4 px-6 border-b" style={{ borderColor: '#2d3748' }}>
        <h1 className="text-lg font-semibold tracking-wide" style={{ color: 'var(--color-accent)' }}>♟ Chess</h1>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-start justify-center gap-6 p-6">
        <div className="flex-shrink-0">
          <Board
            fen={fen}
            orientation={orientation}
            lastMove={lastMove}
            inCheck={inCheck}
            turn={turn}
            onDrop={handleDrop}
            boardWidth={boardWidth}
          />
        </div>

        <aside className="w-full md:w-auto">
          <SidePanel
            mode={mode}
            elo={elo}
            history={history}
            onSetMode={handleSetMode}
            onSetElo={setElo}
            onNewGame={handleNewGame}
            onUndo={handleUndo}
            onFlip={flipBoard}
          />
        </aside>
      </main>

      <GameEndModal
        result={result}
        status={status}
        onPlayAgain={handleNewGame}
        onReview={() => {}}
      />
    </div>
  )
}
