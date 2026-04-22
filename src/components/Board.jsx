import { Chessboard } from 'react-chessboard'
import { useMemo } from 'react'

export default function Board({ fen, orientation, lastMove, inCheck, turn, onDrop, onSquareClick, selectedSquare, validMoveSquares, boardWidth }) {
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
    return styles
  }, [lastMove, inCheck, fen, turn, selectedSquare, validMoveSquares])

  return (
    <div style={{ width: boardWidth, flexShrink: 0 }}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          onPieceDrop: onDrop,
          onSquareClick: ({ square }) => onSquareClick?.(square),
          boardWidth: boardWidth,
          boardStyle: { borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' },
          darkSquareStyle: { backgroundColor: '#769656' },
          lightSquareStyle: { backgroundColor: '#eeeed2' },
          squareStyles: squareStyles,
        }}
      />
    </div>
  )
}
