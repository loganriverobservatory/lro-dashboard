// Fetches diversion/gauge data from Utah DWRi JSON API.
// Station list is driven by the dwriStations field in public/config.json — no code changes needed
// to add or remove stations. Runs via the utah-dwr-cache GitHub Action.

import { readFileSync } from 'fs'

const BASE_URL = 'https://www.waterrights.utah.gov/dvrtdb/realtime-chart.asp'

// Use yesterday's date so early-morning UTC runs always have a full set of readings.
function yesterdayString() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function loadStations() {
  try {
    const raw = readFileSync('public/config.json', 'utf8')
    const config = JSON.parse(raw)
    const stations = config.dwriStations ?? []
    if (stations.length === 0) throw new Error('dwriStations array is empty')
    return stations
  } catch (err) {
    throw new Error(`Could not load station list from public/config.json: ${err.message}`)
  }
}

async function fetchStation(id) {
  const url = `${BASE_URL}?station_id=${id}&f=json&begin_date=${yesterdayString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  const readings = (data.values ?? [])
    .map(v => ({ time: v.datetime, value: v.value !== '' ? parseFloat(v.value) : null }))
    .filter(r => r.value !== null && !isNaN(r.value))

  const latest = readings[readings.length - 1]
  return {
    latestCfs: latest?.value ?? null,
    latestTime: latest?.time ?? null,
    readings,
  }
}

async function main() {
  const stations = loadStations()

  const results = await Promise.all(
    stations.map(async ({ id, displayName }) => {
      try {
        const { latestCfs, latestTime, readings } = await fetchStation(id)
        return { id, code: `DWRi-${id}`, latestCfs, latestTime, readings }
      } catch (err) {
        process.stderr.write(`Warning: station ${id} (${displayName}) failed: ${err.message}\n`)
        return { id, code: `DWRi-${id}`, latestCfs: null, latestTime: null, readings: [] }
      }
    })
  )

  const successCount = results.filter(s => s.latestCfs !== null).length
  if (successCount === 0)
    throw new Error('No stations returned valid data — DWRi API may be unavailable')

  process.stdout.write(
    JSON.stringify({ fetchedAt: new Date().toISOString(), stations: results }, null, 2) + '\n'
  )
}

main().catch(err => {
  process.stderr.write(err.message + '\n')
  process.exit(1)
})
