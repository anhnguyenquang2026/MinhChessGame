# Chess Web App — Claude Code Guide

## What This Is

A frontend-only chess web application built with React. Players can face an AI opponent powered by Stockfish WASM (running entirely in the browser) at a chosen ELO difficulty, or play a local two-player game. No backend, no database — pure static app deployable to GitHub Pages or Netlify.

## Tech Stack

- **Framework**: React + Vite (no Next.js, no backend framework)
- **Chess logic**: chess.js (move validation and game state)
- **Board UI**: react-chessboard
- **AI engine**: Stockfish WASM running in a Web Worker
- **Styling**: Tailwind CSS

## Key Architecture Decisions

- Stockfish WASM runs client-side in a Web Worker — no server process
- ELO difficulty tuned via UCI `setoption Skill Level`, `UCI_LimitStrength`, and `UCI_Elo` options (range: 1200–2000)
- All game state lives in React component state or a simple context — nothing in localStorage
- Vite builds to static `dist/` — deploy to GitHub Pages (gh-pages) or Netlify

## Features to Build

- Chess board with classic aesthetics: coordinates, last-move highlight, check indicator, drag & drop pieces
- Human vs AI mode (Stockfish WASM)
- Local 2-player mode (hot seat, same machine)
- Difficulty selector: Easy / Medium / Hard presets + ELO slider (1200–2000)
- Game controls: new game, undo move, flip board
- Move list / game notation display
- Static site deployment

## Out of Scope

- Backend API or server-side engine
- Database or game history persistence
- Online multiplayer
- User accounts / authentication

## Coding Guidelines

- No backend code — this is a pure static frontend app
- No persistence layer (no localStorage, no IndexedDB) unless explicitly requested
- Keep AI engine interaction isolated in a Web Worker wrapper
- Prefer composition over abstraction — don't add layers for hypothetical future needs
