# Chess Web App

## What This Is

A frontend-only chess web application built with React. Players can face an AI opponent powered by Stockfish WASM (running entirely in the browser) at a chosen ELO difficulty, or play a local two-player game. No backend, no database — pure static app deployable to GitHub Pages or Netlify.

## Core Value

A smooth, classic-feel chess experience against a properly calibrated AI opponent — playable instantly in the browser, no login or server required.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Chess board with classic chess site aesthetics — coordinates, last-move highlight, check indicator, drag & drop pieces
- [ ] Human vs AI mode powered by Stockfish WASM (runs in browser, no server)
- [ ] Local 2-player mode (same machine, hot seat)
- [ ] Difficulty selector: Easy / Medium / Hard presets + ELO slider (1200–2000)
- [ ] Game controls: new game, undo move, flip board
- [ ] Move list / game notation display
- [ ] Deploy as static site to GitHub Pages or Netlify

### Out of Scope

- Backend API — Stockfish runs client-side, no server needed
- Database / game storage — no move history or result persistence
- Online multiplayer — local play only
- User accounts / authentication — stateless, no login

## Context

- **Tech stack**: React (Vite), chess.js (move logic + validation), react-chessboard (board UI), stockfish.js/WASM (AI engine), Tailwind CSS (styling)
- **Stockfish integration**: Stockfish WASM runs in a Web Worker; ELO is tuned via UCI `setoption Skill Level` and `UCI_LimitStrength` / `UCI_Elo` options — maps cleanly to 1200–2000 range
- **No persistence**: all game state lives in React component state or a simple context; nothing touches localStorage unless user requests it later
- **Deployment**: Vite builds to static `dist/` folder, compatible with GitHub Pages (gh-pages) and Netlify drag-and-drop or CI deploy

## Constraints

- **Tech stack**: React + Vite only (no Next.js, no backend framework) — keeps it deployable as a pure static site
- **AI engine**: Stockfish WASM only — no custom minimax, no server-side engine process
- **No database**: zero persistence layer by design; adding one would be a significant scope change

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Frontend-only (no backend) | No need to store games; Stockfish WASM handles AI in browser | — Pending |
| Stockfish WASM over custom engine | ELO tuning built-in, industry-quality play, no maintenance | — Pending |
| React + Vite over Next.js | Static export is simpler; no SSR needed for a game | — Pending |
| ELO slider (1200–2000) + presets | Gives both casual (Easy/Medium/Hard) and precise control | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-20 after initialization*
