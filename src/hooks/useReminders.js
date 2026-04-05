import { useState, useEffect } from 'react'
import { db, isFirebaseConfigured } from '../lib/firebase.js'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { getPermission } from '../lib/fcm.js'

const LS_KEY = 'wt_reminders_v1'

export function useReminders(syncKey) {
  const [reminders, setReminders]   = useState([])
  const [permission, setPermission] = useState(getPermission)

  useEffect(() => {
    if (!syncKey || !isFirebaseConfigured || !db) {
      try { setReminders(JSON.parse(localStorage.getItem(LS_KEY) || '[]')) } catch {}
      return
    }
    const unsub = onSnapshot(
      collection(db, 'users', syncKey, 'reminders'),
      snap => setReminders(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {
        try { setReminders(JSON.parse(localStorage.getItem(LS_KEY) || '[]')) } catch {}
      }
    )
    return unsub
  }, [syncKey])

  async function addReminder(data) {
    if (!syncKey || !isFirebaseConfigured || !db) {
      const list = [...reminders, { ...data, id: crypto.randomUUID() }]
      setReminders(list)
      localStorage.setItem(LS_KEY, JSON.stringify(list))
      return
    }
    await addDoc(collection(db, 'users', syncKey, 'reminders'), {
      ...data, createdAt: serverTimestamp(),
    })
  }

  async function updateReminder(id, changes) {
    if (!syncKey || !isFirebaseConfigured || !db) {
      const list = reminders.map(r => r.id === id ? { ...r, ...changes } : r)
      setReminders(list)
      localStorage.setItem(LS_KEY, JSON.stringify(list))
      return
    }
    await updateDoc(doc(db, 'users', syncKey, 'reminders', id), changes)
  }

  async function removeReminder(id) {
    if (!syncKey || !isFirebaseConfigured || !db) {
      const list = reminders.filter(r => r.id !== id)
      setReminders(list)
      localStorage.setItem(LS_KEY, JSON.stringify(list))
      return
    }
    await deleteDoc(doc(db, 'users', syncKey, 'reminders', id))
  }

  return { reminders, addReminder, updateReminder, removeReminder, permission, setPermission }
}
