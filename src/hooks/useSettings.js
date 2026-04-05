import { useState, useEffect } from 'react'

const GOAL_KEY    = 'wt_goal_v1'
const HEIGHT_KEY  = 'wt_height_v1'
const DARK_KEY    = 'wt_dark_v1'
const SYNC_KEY    = 'wt_sync_key_v1'

function getOrCreateSyncKey() {
  const existing = localStorage.getItem(SYNC_KEY)
  if (existing) return existing
  const newKey = crypto.randomUUID()
  localStorage.setItem(SYNC_KEY, newKey)
  return newKey
}

export function useSettings() {
  const [goalKg, setGoalKgRaw] = useState(() => {
    const v = localStorage.getItem(GOAL_KEY)
    return v !== null ? parseFloat(v) : null
  })
  const [heightCm, setHeightCmRaw] = useState(() => {
    const v = localStorage.getItem(HEIGHT_KEY)
    return v !== null ? parseFloat(v) : null
  })
  const [dark, setDarkRaw] = useState(() =>
    localStorage.getItem(DARK_KEY) === 'true'
  )
  const [syncKey, setSyncKeyRaw] = useState(() => getOrCreateSyncKey())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const setGoalKg = (kg) => {
    if (kg == null) { localStorage.removeItem(GOAL_KEY); setGoalKgRaw(null) }
    else { localStorage.setItem(GOAL_KEY, String(kg)); setGoalKgRaw(kg) }
  }
  const setHeightCm = (cm) => {
    if (cm == null) { localStorage.removeItem(HEIGHT_KEY); setHeightCmRaw(null) }
    else { localStorage.setItem(HEIGHT_KEY, String(cm)); setHeightCmRaw(cm) }
  }
  const setDark = (val) => {
    localStorage.setItem(DARK_KEY, String(val))
    setDarkRaw(val)
  }
  const setSyncKey = (key) => {
    localStorage.setItem(SYNC_KEY, key)
    setSyncKeyRaw(key)
  }

  return { goalKg, setGoalKg, heightCm, setHeightCm, dark, setDark, syncKey, setSyncKey }
}
