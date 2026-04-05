import { getMessaging, getToken } from 'firebase/messaging'
import { getApp } from 'firebase/app'
import { db, isFirebaseConfigured } from './firebase.js'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export function notifSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function getPermission() {
  return notifSupported() ? Notification.permission : 'unsupported'
}

export async function requestAndRegister(syncKey) {
  if (!isFirebaseConfigured || !VAPID_KEY) {
    throw new Error('Firebase o VAPID key no configurados')
  }
  if (!notifSupported()) {
    throw new Error('Tu navegador no soporta notificaciones web')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permiso denegado')
  }

  const swReg = await navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}firebase-messaging-sw.js`,
    { scope: import.meta.env.BASE_URL }
  )

  // Wait for the SW to be ready
  await navigator.serviceWorker.ready

  const token = await getToken(getMessaging(getApp()), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  })

  if (token && syncKey && db) {
    const tokenId = btoa(token).replace(/[^A-Za-z0-9]/g, '').slice(-20)
    await setDoc(
      doc(db, 'users', syncKey, 'devices', tokenId),
      { token, updatedAt: serverTimestamp() },
      { merge: true }
    )
  }

  return token
}
