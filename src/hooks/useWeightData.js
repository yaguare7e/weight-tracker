import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { db, auth, isFirebaseConfigured } from '../lib/firebase'

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
export function useWeightData() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState(null)

  // Auth + localStorage init
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setEntries(sortEntries(lsGet()))
      setLoading(false)
      return
    }

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid)
      } else {
        try {
          await signInAnonymously(auth)
        } catch (err) {
          console.error('[Firebase] Anonymous sign-in failed:', err)
          setEntries(sortEntries(lsGet()))
          setLoading(false)
        }
      }
    })

    return () => unsubAuth()
  }, [])

  // Firestore real-time subscription
  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return

    const q = query(
      collection(db, 'users', uid, 'weights'),
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
  }, [uid])

  // ─── Add ────────────────────────────────────────────────────────────────
  const addEntry = useCallback(async ({ weightKg, date }) => {
    const now = new Date().toISOString()
    const entry = {
      weightKg: parseFloat(weightKg.toFixed(4)),
      date,        // 'YYYY-MM-DD'
      createdAt: now,
    }

    if (!isFirebaseConfigured) {
      const data = lsGet()
      data.push({ ...entry, id: crypto.randomUUID() })
      lsSet(sortEntries(data))
      setEntries(sortEntries(data))
      return
    }

    await addDoc(collection(db, 'users', uid, 'weights'), {
      ...entry,
      serverTimestamp: serverTimestamp(),
    })
  }, [uid])

  // ─── Delete ─────────────────────────────────────────────────────────────
  const removeEntry = useCallback(async (id) => {
    if (!isFirebaseConfigured) {
      const data = sortEntries(lsGet().filter(e => e.id !== id))
      lsSet(data)
      setEntries(data)
      return
    }
    await deleteDoc(doc(db, 'users', uid, 'weights', id))
  }, [uid])

  // ─── Update ─────────────────────────────────────────────────────────────
  const updateEntry = useCallback(async ({ id, weightKg, date }) => {
    if (!isFirebaseConfigured) {
      const data = lsGet()
      const idx = data.findIndex(e => e.id === id)
      if (idx === -1) return
      data[idx] = { ...data[idx], weightKg: parseFloat(weightKg.toFixed(4)), date }
      const sorted = sortEntries(data)
      lsSet(sorted)
      setEntries(sorted)
      return
    }
    await updateDoc(doc(db, 'users', uid, 'weights', id), {
      weightKg: parseFloat(weightKg.toFixed(4)),
      date,
    })
  }, [uid])

  return { entries, loading, addEntry, removeEntry, updateEntry }
}
