// Exports all Firestore weight data via REST API → backup.json
// Runs in GitHub Actions; also works locally with VITE_FIREBASE_API_KEY set.

const PROJECT = 'wt-tracker-2026'
const API_KEY = process.env.VITE_FIREBASE_API_KEY

if (!API_KEY) {
  console.error('Missing VITE_FIREBASE_API_KEY')
  process.exit(1)
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

// ── Collection-group query: all "weights" docs across every user ────────────
async function fetchAllWeights() {
  const res = await fetch(`${BASE}:runQuery?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'weights', allDescendants: true }],
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firestore query failed: ${res.status} ${err}`)
  }

  return res.json()
}

// ── Convert Firestore field value to plain JS ──────────────────────────────
function fromFirestore(value) {
  if (value.stringValue  !== undefined) return value.stringValue
  if (value.doubleValue  !== undefined) return value.doubleValue
  if (value.integerValue !== undefined) return Number(value.integerValue)
  if (value.booleanValue !== undefined) return value.booleanValue
  if (value.timestampValue !== undefined) return value.timestampValue
  if (value.mapValue) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, fromFirestore(v)])
    )
  }
  return null
}

// ── Main ───────────────────────────────────────────────────────────────────
const rows = await fetchAllWeights()

// Group entries by sync key (extracted from the document path)
const users = {}
for (const row of rows) {
  if (!row.document) continue
  const name = row.document.name   // …/users/{syncKey}/weights/{docId}
  const parts = name.split('/')
  const syncKey = parts[parts.indexOf('users') + 1]
  const docId   = parts[parts.indexOf('weights') + 1]

  const fields = Object.fromEntries(
    Object.entries(row.document.fields || {}).map(([k, v]) => [k, fromFirestore(v)])
  )

  if (!users[syncKey]) users[syncKey] = []
  users[syncKey].push({ id: docId, ...fields })
}

const backup = {
  exportedAt: new Date().toISOString(),
  project: PROJECT,
  users,
}

const outPath = process.argv[2] || 'backup.json'
import { writeFileSync } from 'fs'
writeFileSync(outPath, JSON.stringify(backup, null, 2))

const totalEntries = Object.values(users).reduce((s, arr) => s + arr.length, 0)
console.log(`✓ Backup saved to ${outPath}`)
console.log(`  Users: ${Object.keys(users).length}  |  Entries: ${totalEntries}`)
