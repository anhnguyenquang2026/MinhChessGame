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

  test('addIncrement clamps to 3600s', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: 3598, increment: 5, activeTurn: 'w', running: false, onTimeout })
    )
    act(() => { result.current.addIncrement('w') })
    expect(result.current.whiteTime).toBe(3600)
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
      useChessClock({ initialSeconds: 60, increment: 5, activeTurn: 'w', running: false, onTimeout })
    )
    act(() => { result.current.addIncrement('w') })
    expect(result.current.whiteTime).toBe(65)
    act(() => { result.current.reset() })
    expect(result.current.whiteTime).toBe(60)
    expect(result.current.blackTime).toBe(60)
  })

  test('addIncrement does nothing in unlimited clock mode (initialSeconds=null)', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useChessClock({ initialSeconds: null, increment: 5, activeTurn: 'w', running: false, onTimeout })
    )
    act(() => { result.current.addIncrement('w') })
    expect(result.current.whiteTime).toBeNull()
  })
})
