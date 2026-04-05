import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'

const LS_KEY = 'wt_entries_v2'

// ─── localStorage helpers ──────────────────────────────────────────────────
function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function lsSet(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}
function sortEntries(arr) {
  return [...arr].sort((a, b) => {
    const d = new Date(b.date) - new Date(a.date)
    return d !== 0 ? d : new Date(b.createdAt) - new Date(a.createdAt)
  })
}

// ─── Hook ──────────────────────────────────────────────────────────────────
// syncKey: the user's sync key used as Firestore path; null → localStorage
export function useWeightData(syncKey) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !syncKey) {
      setEntries(sortEntries(lsGet()))
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(
      collection(db, 'users', syncKey, 'weights'),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('[Firestore] Snapshot error:', err)
        setEntries(sortEntries(lsGet()))
        setLoading(false)
      }
    )

    return () => unsub()
  }, [syncKey])

  // ─── Add ──────────────────────────────────────────────────────────────────
  const addEntry = useCallback(async ({ weightKg, date }) => {
    const entry = {
      weightKg: parseFloat(weightKg.toFixed(4)),
      date,
      createdAt: new Date().toISOString(),
    }

    if (!isFirebaseConfigured || !syncKey) {
      const data = lsGet()
      data.push({ ...entry, id: crypto.randomUUID() })
      lsSet(sortEntries(data))
      setEntries(sortEntries(data))
      return
    }

    await addDoc(collection(db, 'users', syncKey, 'weights'), {
      ...entry,
      serverTimestamp: serverTimestamp(),
    })
  }, [syncKey])

  // ─── Delete ───────────────────────────────────────────────────────────────
  const removeEntry = useCallback(async (id) => {
    if (!isFirebaseConfigured || !syncKey) {
      const data = sortEntries(lsGet().filter(e => e.id !== id))
      lsSet(data)
      setEntries(data)
      return
    }
    await deleteDoc(doc(db, 'users', syncKey, 'weights', id))
  }, [syncKey])

  // ─── Update ───────────────────────────────────────────────────────────────
  const updateEntry = useCallback(async ({ id, weightKg, date }) => {
    if (!isFirebaseConfigured || !syncKey) {
      const data = lsGet()
      const idx = data.findIndex(e => e.id === id)
      if (idx === -1) return
      data[idx] = { ...data[idx], weightKg: parseFloat(weightKg.toFixed(4)), date }
      const sorted = sortEntries(data)
      lsSet(sorted)
      setEntries(sorted)
      return
    }
    await updateDoc(doc(db, 'users', syncKey, 'weights', id), {
      weightKg: parseFloat(weightKg.toFixed(4)),
      date,
    })
  }, [syncKey])

  return { entries, loading, addEntry, removeEntry, updateEntry }
}
