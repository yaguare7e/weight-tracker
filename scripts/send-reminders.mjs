// Checks all users' reminders and sends FCM push notifications to those that are due.
// Runs every 15 minutes via GitHub Actions.
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore }        from 'firebase-admin/firestore'
import { getMessaging }        from 'firebase-admin/messaging'

const SA = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
if (!SA) { console.error('Missing FIREBASE_SERVICE_ACCOUNT'); process.exit(1) }

const app       = initializeApp({ credential: cert(SA) })
const db        = getFirestore(app)
const messaging = getMessaging(app)

// ── Check if a reminder is due in the current 15-min window ────────────────
function isDue(reminder) {
  if (!reminder.enabled) return false
  const tz = reminder.timezone || 'UTC'
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date()).map(p => [p.type, p.value])
    )
    const localH   = parseInt(parts.hour === '24' ? '0' : parts.hour)
    const localM   = parseInt(parts.minute)
    const localDay = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      .indexOf(parts.weekday)

    const days = reminder.days ?? []
    if (!days.includes(localDay)) return false

    const [remH, remM] = (reminder.time ?? '08:00').split(':').map(Number)
    const blockStart = Math.floor(localM / 15) * 15
    return localH === remH && remM >= blockStart && remM < blockStart + 15
  } catch {
    return false
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log(`[${new Date().toISOString()}] Checking reminders…`)

const [reminderSnap, deviceSnap] = await Promise.all([
  db.collectionGroup('reminders').get(),
  db.collectionGroup('devices').get(),
])

// Group by syncKey
const users = {}
for (const doc of reminderSnap.docs) {
  const syncKey = doc.ref.parent.parent.id
  if (!users[syncKey]) users[syncKey] = { reminders: [], tokens: [] }
  users[syncKey].reminders.push(doc.data())
}
for (const doc of deviceSnap.docs) {
  const syncKey = doc.ref.parent.parent.id
  if (!users[syncKey]) users[syncKey] = { reminders: [], tokens: [] }
  const { token } = doc.data()
  if (token) users[syncKey].tokens.push({ id: doc.id, token })
}

let sent = 0
let skipped = 0

for (const [syncKey, { reminders, tokens }] of Object.entries(users)) {
  if (!reminders.some(isDue) || !tokens.length) { skipped++; continue }

  for (const { id, token } of tokens) {
    try {
      await messaging.send({
        token,
        notification: { title: 'Weight Tracker', body: '¡Hora de registrar tu peso!' },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon:     '/icons/icon-192.png',
            badge:    '/icons/icon-192.png',
            tag:      'weight-reminder',
            renotify: true,
          },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      })
      console.log(`  ✓ Sent → ${syncKey.slice(0, 8)}… (…${token.slice(-8)})`)
      sent++
    } catch (err) {
      if (err.code === 'messaging/registration-token-not-registered') {
        await db.doc(`users/${syncKey}/devices/${id}`).delete()
        console.log(`  ⚠ Stale token removed (…${token.slice(-8)})`)
      } else {
        console.warn(`  ✗ Failed: ${err.message}`)
      }
    }
  }
}

console.log(`\nDone — ${sent} sent, ${skipped} users skipped`)
