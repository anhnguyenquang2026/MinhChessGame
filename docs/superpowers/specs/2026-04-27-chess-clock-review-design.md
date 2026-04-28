# Chess Clock + Game Review — Design Spec

**Date:** 2026-04-27
**Branch:** feature/chess-app

---

## Overview

Two features added to the chess web app:

1. **Chess Clock with time controls** — preset time controls (3+0, 5+0, 10+0) with a configurable increment (0–10 seconds). Running out of time loses the game.
2. **Game Review mode** — after a game ends, the player can review every position with Stockfish-powered annotations (best move, blunder, mistake, inaccuracy) shown on the board and in the move list.

---

## Feature 1: Chess Clock

### Time Control Selector (SidePanel)

A new "Time Control" section is added to `SidePanel.jsx`, positioned between the Difficulty panel and the Move List.

**Controls:**
- Four preset buttons: `∞` (no clock), `3+0`, `5+0`, `10+0`
- When any timed preset is active, an increment stepper appears: `−  Xs  +` (range 0–10 seconds, integer steps)
- Selecting `∞` hides the clock display and disables time enforcement

**State in App.jsx:**
```js
const [timeControl, setTimeControl] = useState({ minutes: null, increment: 0 })
// minutes: null = no clock; 3, 5, or 10 for timed controls
```

### Clock Display

`ChessClock.jsx` is rendered inside SidePanel (already implemented). Visible only when `minutes !== null`.

### useChessClock — Increment Support

Current hook signature: `{ initialSeconds, activeTurn, running, onTimeout }`

**Changes:**
- Add `increment` param (seconds)
- Expose `addIncrement(color)` method — called by App after each move to credit the moving player
- `addIncrement` clamps to a reasonable max (e.g., 600s) to prevent edge cases

**Wiring in App.jsx:**
```js
// After each turn switch, credit the player who just moved
useEffect(() => {
  if (prevTurn.current && prevTurn.current !== turn && status === 'playing') {
    addIncrement(prevTurn.current)  // credit the player who just moved
  }
  prevTurn.current = turn
}, [turn])
```

### Timeout → Game Over

A new `flagged(winner)` function is added to `useChessGame` (alongside `resign`):
- Sets `status: 'timeout'` and `result: "<winner> wins on time"`

`onTimeout('w')` → `flagged('Black')`
`onTimeout('b')` → `flagged('White')`

`GameEndModal` gains a `'timeout'` entry in its emoji/status map (⏱).

### Clock Reset

- Clocks reset when a new game starts (existing behavior in `useChessClock`)
- Clocks reset when the time control selection changes

---

## Feature 2: Game Review

### Trigger

"Review" button in `GameEndModal` → `onReview()` callback in App.

### Review State (App.jsx)

```js
const [reviewMode, setReviewMode] = useState(false)
const [reviewPositions, setReviewPositions] = useState([])   // array of { fen, move, san }
const [reviewIndex, setReviewIndex] = useState(0)
const [analysisResults, setAnalysisResults] = useState([])   // per-move { score, bestMove, classification, cpLoss }
const [analysisProgress, setAnalysisProgress] = useState(0)  // 0..reviewPositions.length
```

`reviewPositions` is built from the verbose history at game end — **N+1 entries for N moves**:
- Index 0 = starting FEN (before move 1) — taken from `chess.history({ verbose: true })[0].before`
- Index 1..N = FEN after each move — taken from `move.after`

This gives N+1 FENs to evaluate, producing N adjacent score pairs to classify each move.

### Stockfish Extension — Evaluation

`useStockfish` gains a new `evaluate(fen)` method that:
1. Posts `position fen <fen>` + `go movetime 500` (full strength, no ELO limit)
2. Captures `info score cp X` lines (or `mate M` lines)
3. Resolves with `{ score: number, bestMove: string }` when `bestmove` is received

The existing `getBestMove` path is unchanged. A second resolver ref handles evaluation calls.

**Score normalization:** Score is always from White's perspective (positive = White is better). Flip sign if it was Black to move.

### Move Classification

For each move at index `i`:
- `scoreBefore` = Stockfish score of position before the move (from White's perspective)
- `scoreAfter` = Stockfish score of position after the move (from White's perspective)
- `cpLoss` = `scoreBefore - scoreAfter` if White moved, or `scoreAfter - scoreBefore` if Black moved
  (i.e., how much the moving player's advantage decreased)

| cpLoss | Classification |
|--------|---------------|
| < 0 (improvement) | Best |
| 0–50 | Good |
| 50–150 | Inaccuracy |
| 150–300 | Mistake |
| 300+ | Blunder |

Mate scores are treated as ±10000cp for classification purposes.

### Analysis Workflow

1. User clicks "Review" → `GameEndModal` closes, `reviewMode = true`
2. App builds `reviewPositions` from game history
3. App runs analysis loop (sequential, not parallel — single Stockfish worker):
   - For each position FEN, call `evaluate(fen)`
   - Store result, increment `analysisProgress`
4. While analyzing: board shows starting position, SidePanel shows progress bar "Analyzing… 4 / 18"
5. When complete: full annotated move list rendered

### Board in Review Mode

- Board is **read-only** (no drag, no click moves)
- Shows the FEN at `reviewPositions[reviewIndex]`
- `customArrows`: green arrow for `bestMove` of the current position (from Stockfish)
- If the actual move played was a Blunder or Mistake: red highlight on the from/to squares

### SidePanel in Review Mode

Normal SidePanel content is replaced by `GameReviewPanel`:

```
[ Exit Review ]

Analyzing… 4 / 18   (progress bar, hidden when done)

Moves:
  1. e4  (Best)    e5  (Good)
  2. Nf3 (Inaccuracy)  Nc6 (Best)
  ...

[ ← Prev ]  Move 4 / 18  [ Next → ]

Annotation:
  "Blunder! Lost 320cp. Best was Nf3."
```

Move list items are color-coded:
- Green = Best/Good
- Yellow = Inaccuracy
- Orange = Mistake
- Red = Blunder

The current move is highlighted with a border/background.

### New Files

- No new hook file needed — review state lives in App.jsx
- `GameReviewPanel.jsx` — new component for the review SidePanel content

### Modified Files

| File | Change |
|------|--------|
| `useChessGame.js` | Add `flagged(winner)` for timeout game-over |
| `useChessClock.js` | Add `increment` param + `addIncrement()` |
| `useStockfish.js` | Add `evaluate(fen)` returning `{ score, bestMove }` |
| `App.jsx` | Wire time control, addIncrement, review mode state + analysis loop |
| `SidePanel.jsx` | Add Time Control section + clock display; accept `reviewMode` prop to swap content |
| `GameEndModal.jsx` | Add `timeout` to emoji/status map |
| `ChessClock.jsx` | Minor: display increment value in label if increment > 0 |
| `Board.jsx` | Accept `customArrows` + `customSquareStyles` for review highlights |

---

## Out of Scope

- Clock display near the board (side panel only per user choice)
- Saving review results to localStorage
- Opening Explorer / tablebases
- Multi-line analysis (single best move per position only)
