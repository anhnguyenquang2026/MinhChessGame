import { renderHook, act } from '@testing-library/react'
import { useChessGame } from '../src/hooks/useChessGame'

describe('useChessGame', () => {
  test('initialises with starting position', () => {
    const { result } = renderHook(() => useChessGame())
    expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(result.current.status).toBe('playing')
    expect(result.current.history).toHaveLength(0)
    expect(result.current.mode).toBe('vsAI')
    expect(result.current.orientation).toBe('white')
  })

  test('makeMove returns true for legal move and updates fen', () => {
    const { result } = renderHook(() => useChessGame())
    let legal
    act(() => { legal = result.current.makeMove('e2', 'e4') })
    expect(legal).toBe(true)
    expect(result.current.fen).not.toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(result.current.history).toHaveLength(1)
  })

  test('makeMove returns false for illegal move', () => {
    const { result } = renderHook(() => useChessGame())
    let legal
    act(() => { legal = result.current.makeMove('e2', 'e5') })
    expect(legal).toBe(false)
    expect(result.current.history).toHaveLength(0)
  })

  test('undo removes last move', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => { result.current.makeMove('e2', 'e4') })
    act(() => { result.current.undo() })
    expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(result.current.history).toHaveLength(0)
  })

  test('newGame resets to starting position', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => { result.current.makeMove('e2', 'e4') })
    act(() => { result.current.newGame() })
    expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(result.current.history).toHaveLength(0)
    expect(result.current.status).toBe('playing')
  })

  test('flipBoard toggles orientation', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => { result.current.flipBoard() })
    expect(result.current.orientation).toBe('black')
    act(() => { result.current.flipBoard() })
    expect(result.current.orientation).toBe('white')
  })

  test('setMode updates mode and resets game', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => { result.current.makeMove('e2', 'e4') })
    act(() => { result.current.setMode('2p') })
    expect(result.current.mode).toBe('2p')
    expect(result.current.history).toHaveLength(0)
  })
})
