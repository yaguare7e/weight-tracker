// Checks all users' reminders and sends FCM push notifications to those that are due.
// Runs every 15 minutes via GitHub Actions; fires reminders within the current 15-min window.
import { createSign } from 'crypto'

const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID
const SA      = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

if (!PROJECT || !SA) {
  console.error('Missing VITE_FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT')
  process.exit(1)
}

// ── OAuth2 access token from service account JWT ────────────────────────────
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss:   SA.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  })).toString('base64url')

  const sigInput = `${header}.${payload}`
  const sign = createSign('RSA-SHA256')
  sign.update(sigInput)
  const sig = sign.sign(SA.private_key, 'base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer',
      assertion:  `${sigInput}.${sig}`,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  return (await res.json()).access_token
}

// ── Firestore collection-group query ───────────────────────────────────────
async function queryGroup(token, collectionId) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId, allDescendants: true }] },
    }),
  })
  if (!res.ok) throw new Error(`Firestore query failed (${collectionId}): ${await res.text()}`)
  return res.json()
}

// ── Delete a stale device token from Firestore ─────────────────────────────
async function deleteDevice(token, syncKey, deviceId) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${syncKey}/devices/${deviceId}`
  await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
}

// ── Parse Firestore field value ─────────────────────────────────────────────
function fv(v) {
  if (v?.stringValue  !== undefined) return v.stringValue
  if (v?.doubleValue  !== undefined) return v.doubleValue
  if (v?.integerValue !== undefined) return Number(v.integerValue)
  if (v?.booleanValue !== undefined) return v.booleanValue
  if (v?.arrayValue)  return (v.arrayValue.values ?? []).map(fv)
  if (v?.mapValue)    return Object.fromEntries(
    Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, fv(x)])
  )
  return null
}

function parseRow(row) {
  if (!row.document) return null
  const parts  = row.document.name.split('/')
  const fields = Object.fromEntries(
    Object.entries(row.document.fields ?? {}).map(([k, v]) => [k, fv(v)])
  )
  return { parts, fields }
}

function syncKeyFrom(parts) {
  const i = parts.indexOf('users')
  return i >= 0 ? parts[i + 1] : null
}

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

// ── Send FCM notification ───────────────────────────────────────────────────
async function sendFCM(token, fcmToken) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title: 'Weight Tracker',
            body:  '¡Hora de registrar tu peso!',
          },
          webpush: {
            headers: { Urgency: 'high' },
            notification: {
              title: 'Weight Tracker',
              body:  '¡Hora de registrar tu peso!',
              icon:  '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag:   'weight-reminder',
              renotify: true,
            },
          },
          apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
          },
        },
      }),
    }
  )
  if (res.ok) return { ok: true }
  const body = await res.text()
  // UNREGISTERED = token is stale
  const invalid = res.status === 404 || body.includes('UNREGISTERED') || body.includes('INVALID_ARGUMENT')
  return { ok: false, invalid, status: res.status, body }
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log(`[${new Date().toISOString()}] Checking reminders…`)

const accessToken = await getAccessToken()

const [remRows, devRows] = await Promise.all([
  queryGroup(accessToken, 'reminders'),
  queryGroup(accessToken, 'devices'),
])

// Group by syncKey
const users = {}
for (const row of remRows) {
  const doc = parseRow(row)
  if (!doc) continue
  const key = syncKeyFrom(doc.parts)
  if (!key) continue
  if (!users[key]) users[key] = { reminders: [], devices: [] }
  users[key].reminders.push(doc.fields)
}
for (const row of devRows) {
  const doc = parseRow(row)
  if (!doc) continue
  const key = syncKeyFrom(doc.parts)
  if (!key) continue
  if (!users[key]) users[key] = { reminders: [], devices: [] }
  const deviceId = doc.parts[doc.parts.indexOf('devices') + 1]
  if (doc.fields.token) users[key].devices.push({ id: deviceId, token: doc.fields.token })
}

let sent = 0
let skipped = 0

for (const [syncKey, { reminders, devices }] of Object.entries(users)) {
  const due = reminders.some(isDue)
  if (!due || !devices.length) { skipped++; continue }

  for (const device of devices) {
    const result = await sendFCM(accessToken, device.token)
    if (result.ok) {
      sent++
      console.log(`  ✓ Sent → ${syncKey.slice(0, 8)}… (…${device.token.slice(-8)})`)
    } else if (result.invalid) {
      console.log(`  ⚠ Stale token removed: …${device.token.slice(-8)}`)
      await deleteDevice(accessToken, syncKey, device.id)
    } else {
      console.warn(`  ✗ Failed (${result.status}): ${result.body}`)
    }
  }
}

console.log(`Done — ${sent} sent, ${skipped} users skipped`)
