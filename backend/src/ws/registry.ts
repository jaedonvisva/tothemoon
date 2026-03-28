type Sender = { send: (data: string | ArrayBuffer) => void }

const subscribers = new Map<string, Set<Sender>>()

export function wsSubscribe(positionId: string, ws: Sender): () => void {
  let set = subscribers.get(positionId)
  if (!set) {
    set = new Set()
    subscribers.set(positionId, set)
  }
  set.add(ws)
  return () => {
    set?.delete(ws)
    if (set && set.size === 0) subscribers.delete(positionId)
  }
}

export function wsBroadcast(positionId: string, payload: unknown): void {
  const set = subscribers.get(positionId)
  if (!set?.size) return
  const msg = JSON.stringify(payload)
  for (const s of set) {
    try {
      s.send(msg)
    } catch {
      /* closed */
    }
  }
}
