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
