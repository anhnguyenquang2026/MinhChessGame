# Chess Web App — Design Spec

**Date:** 2026-04-20
**Status:** Approved

---

## Overview

A frontend-only chess web application built with React + Vite. Players can face Stockfish WASM at a chosen ELO difficulty or play local 2-player hot-seat. No backend, no persistence — pure static site deployable to GitHub Pages or Netlify.

---

## Visual Style

- **Board:** Green (#769656) & cream (#eeeed2) squares — Lichess palette
- **UI chrome:** Dark navy background (#1a1a2e), dark panel backgrounds (#16213e)
- **Typography:** Clean sans-serif (Inter or system-ui)
- **Accents:** Teal (#7ec8e3) for labels, green (#769656) for primary actions

---

## Layout

**Desktop (≥768px):** Two-column — board dominates the left, right sidebar (~280px) contains difficulty panel, move list, and game controls stacked vertically.

**Mobile (<768px):** Single column — board full width, controls collapse into a bottom bar below the board.

The app loads directly into a game (vs AI, Easy by default) — no setup screen.

---

## Component Structure

```
App
├── useChessGame()         ← all game state + move logic (chess.js)
├── useStockfish()         ← Web Worker wrapper, UCI protocol
│
├── Board                  ← react-chessboard, drag/drop, highlights
├── SidePanel
│   ├── DifficultyPanel    ← Easy/Med/Hard presets + ELO slider
│   ├── MoveList           ← scrollable PGN notation
│   └── GameControls       ← New Game / Undo / Flip buttons
└── GameEndModal           ← result overlay + Play Again / Review
```

`Board`, `SidePanel`, and `GameEndModal` are presentational — they receive props and call callbacks. No component reads from another component's state.

---

## State & Data Flow

### `useChessGame` state

| Field | Type | Description |
|-------|------|-------------|
| `chess` | `Chess` | chess.js instance — source of truth for position |
| `fen` | `string` | Derived from chess, passed to Board |
| `history` | `Move[]` | Full move history for MoveList |
| `status` | `'playing' \| 'checkmate' \| 'stalemate' \| 'draw'` | Game state |
| `result` | `string \| null` | e.g. "White wins by checkmate" |
| `orientation` | `'white' \| 'black'` | Board flip state |
| `mode` | `'vsAI' \| '2p'` | Current game mode |

### Turn flow (vs AI)

1. Player drops piece → `onDrop(from, to)` → `chess.move()` validates
2. If legal: update `fen`, `history`, check game-over
3. If still playing: call `stockfish.getBestMove(fen, elo)`
4. Stockfish resolves → `chess.move(bestMove)` → update state
5. Check game-over again → if ended, set `status` + `result` → modal renders

### Undo (vs AI)

Calls `chess.undo()` twice — removes AI reply + player move — then updates `fen` and `history`. If called when it's the AI's turn (mid-think), sends `stop` to the engine first.

### 2-player mode

Same flow, no Stockfish call. Turns alternate via `chess.turn()`.

---

## Stockfish Integration

### `useStockfish` hook

- Loads `stockfish.js` as a Web Worker on mount, tears down on unmount
- Sends UCI init: `uci` → `uciok` → `isready` → `readyok`
- Exposes `getBestMove(fen: string, elo: number): Promise<string>`

### ELO → UCI mapping

| Preset | Skill Level | UCI_Elo |
|--------|-------------|---------|
| Easy | 5 | 1200 |
| Medium | 12 | 1600 |
| Hard | 20 | 2000 |
| Slider | Linear interpolation | 1200–2000 |

### Per-move command sequence

```
setoption name UCI_LimitStrength value true
setoption name UCI_Elo value <elo>
position fen <fen>
go movetime 1000
```

Resolves when engine replies `bestmove <move>`. If a new request arrives while one is pending, sends `stop` before issuing the new `position` command.

---

## UI & Interactions

### Board

- `react-chessboard` — `boardWidth` responsive, max ~560px
- Last-move highlight: yellow tint on `from`/`to` squares via `customSquareStyles`
- Check indicator: red tint on the king's square
- Drag & drop enabled; illegal moves silently rejected

### Side Panel

- **ModeToggle:** Two-button toggle at the top of the panel — "vs AI" / "2 Player". Switching mode starts a new game immediately.
- **DifficultyPanel:** 3 preset buttons + ELO slider. Visible only in vs AI mode. Difficulty change takes effect on next AI move.
- **MoveList:** Scrollable, auto-scrolls to latest move, PGN pair format (`1. e4 e5`).
- **GameControls:** New Game, Undo, Flip Board — icon + label buttons.

### Game End Modal

- Semi-transparent dark overlay over full app
- Centered card: result text, two actions:
  - **Play Again** — resets game, same mode + difficulty, modal closes
  - **Review** — dismisses modal, board stays for post-game review

---

## Out of Scope

- Backend API or server-side engine
- Persistence (localStorage, IndexedDB, database)
- Online multiplayer
- User accounts / authentication
- Opening book display
- Premoves

---

## Deployment

Vite builds to static `dist/`. Compatible with:
- **GitHub Pages** via `gh-pages` npm package
- **Netlify** drag-and-drop or CI deploy

No server config required — pure static files.
