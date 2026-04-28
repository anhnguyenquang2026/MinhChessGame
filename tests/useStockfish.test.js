import { renderHook, act, waitFor } from '@testing-library/react'
import { useStockfish } from '../src/hooks/useStockfish'

class MockWorker {
  constructor() { this.messages = [] }
  postMessage(msg) {
    this.messages.push(msg)
    if (msg === 'uci') setTimeout(() => this.onmessage?.({ data: 'uciok' }), 0)
    else if (msg === 'isready') setTimeout(() => this.onmessage?.({ data: 'readyok' }), 0)
    else if (typeof msg === 'string' && msg.startsWith('go')) {
      setTimeout(() => this.onmessage?.({ data: 'bestmove e2e4 ponder e7e5' }), 10)
    }
  }
  terminate() {}
}

vi.stubGlobal('Worker', MockWorker)

describe('useStockfish', () => {
  test('initialises as not ready', () => {
    const { result } = renderHook(() => useStockfish())
    expect(result.current.ready).toBe(false)
  })

  test('becomes ready after uci handshake', async () => {
    const { result } = renderHook(() => useStockfish())
    await waitFor(() => expect(result.current.ready).toBe(true))
  })

  test('getBestMove resolves with UCI move string', async () => {
    const { result } = renderHook(() => useStockfish())
    await waitFor(() => expect(result.current.ready).toBe(true))
    let move
    await act(async () => {
      move = await result.current.getBestMove(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        1200
      )
    })
    expect(move).toBe('e2e4')
  })
})
