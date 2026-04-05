import { useState, useEffect } from 'react'

const GOAL_KEY   = 'wt_goal_v1'
const HEIGHT_KEY = 'wt_height_v1'
const DARK_KEY   = 'wt_dark_v1'

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

  return { goalKg, setGoalKg, heightCm, setHeightCm, dark, setDark }
}
