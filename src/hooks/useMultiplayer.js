import { useEffect, useRef, useCallback, useState } from 'react'
import Peer from 'peerjs'

// TURN relay servers are required for mobile-to-mobile WebRTC (symmetric NAT on cellular)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
]

export function useMultiplayer({ onMove, onResign }) {
  const peerRef = useRef(null)
  const connRef = useRef(null)
  const onMoveRef = useRef(onMove)
  const onResignRef = useRef(onResign)
  onMoveRef.current = onMove
  onResignRef.current = onResign

  const [roomId, setRoomId] = useState(null)
  const [connected, setConnected] = useState(false)
  const [role, setRole] = useState(null)
  const [error, setError] = useState(null)

  const setupConn = useCallback((conn) => {
    connRef.current = conn
    conn.on('open', () => setConnected(true))
    conn.on('data', (data) => {
      if (data && typeof data === 'object' && data.type === 'resign') {
        onResignRef.current?.()
      } else {
        onMoveRef.current(data)
      }
    })
    conn.on('close', () => setConnected(false))
    conn.on('error', (err) => setError(String(err)))
  }, [])

  const createRoom = useCallback(() => {
    if (peerRef.current) return
    const peer = new Peer({ config: { iceServers: ICE_SERVERS } })
    peerRef.current = peer
    peer.on('open', (id) => { setRoomId(id); setRole('host') })
    peer.on('connection', (conn) => setupConn(conn))
    peer.on('error', (err) => setError(String(err)))
  }, [setupConn])

  const joinRoom = useCallback((id) => {
    if (peerRef.current) return
    const peer = new Peer({ config: { iceServers: ICE_SERVERS } })
    peerRef.current = peer
    setRole('guest')
    peer.on('open', () => {
      const conn = peer.connect(id)
      setupConn(conn)
    })
    peer.on('error', (err) => setError(String(err)))
  }, [setupConn])

  const sendMove = useCallback((uci) => {
    connRef.current?.send(uci)
  }, [])

  const sendResign = useCallback(() => {
    connRef.current?.send({ type: 'resign' })
  }, [])

  const reset = useCallback(() => {
    peerRef.current?.destroy()
    peerRef.current = null
    connRef.current = null
    setRoomId(null)
    setConnected(false)
    setRole(null)
    setError(null)
  }, [])

  useEffect(() => () => peerRef.current?.destroy(), [])

  return { roomId, connected, role, error, createRoom, joinRoom, sendMove, sendResign, reset }
}
