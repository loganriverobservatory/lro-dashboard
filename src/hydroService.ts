/*
src/hydroService.ts - fetches and processes data from HydroServer for use in the app
*/
import type { DatastreamExtended } from '@hydroserver/client'

const BASE_URL = 'https://lro.hydroserver.org/api/sensorthings/v1.1'

let apiToken: string | undefined
export function setApiToken(token: string) { apiToken = token }
function authHeaders(): HeadersInit {
  return apiToken ? { Authorization: `Token ${apiToken}` } : {}
}

interface StaDatastream {
  '@iot.id': string | number
  name: string
  description?: string
  unitOfMeasurement?: { symbol: string }
  phenomenonTime?: string
  properties?: Pick<DatastreamExtended, 'isVisible' | 'status' | 'sampledMedium' | 'isPrivate'>
}

interface StaThing {
  '@iot.id': string
  properties?: { samplingFeatureCode?: string }
  Locations?: { location: { geometry: { coordinates: (number | string)[] } } }[]
}

export interface StaObservation {
  '@iot.id': string | number
  result: number | null
  phenomenonTime: string | null
}

export interface Station {
  id: string
  uuid: string
  displayName: string
  description?: string
  observation?: StaObservation | null
  coordinates: [number, number] | null
  unit?: string
  tributary?: string
  latestTime?: string | null
  isPrivate?: boolean
  isUSGS?: boolean
  isDWRi?: boolean
  siteLink?: string
  history?: [string, number][]
}

// Canonical waterway group names. These must exactly match the "name" values
// under waterway_groups in config/station_config.yaml.
const MAIN_STEM_GROUP = 'Logan River Observatory: Logan River Main Stem'
const HYDROSERVER_GROUP = 'Logan River Observatory'

// Populated by loadStationConfig(). Small hardcoded fallbacks so the app still
// has reasonable colors to render with if that fetch hasn't completed yet or fails.
export let WATERWAY_COLORS: Record<string, string> = {
  [MAIN_STEM_GROUP]: '#7d98c6',
  [HYDROSERVER_GROUP]: '#7d98c6',
  'USGS': '#d09559',
  'DWRi': '#6fa26b',
}

export let WATERWAY_LIST = Object.keys(WATERWAY_COLORS)

// Schematic-only accent colors for DWRi sub-groups, keyed by SchematicNode
// "colorGroup" values — kept separate from WATERWAY_COLORS/WATERWAY_LIST
// since those drive the sidebar's waterway filter checkboxes (keyed on
// Station.tributary, which is 'DWRi' for all of these) — adding these keys
// there would create checkboxes that never match any station's tributary value.
export let SCHEMATIC_ACCENT_COLORS: Record<string, string> = {
  'Logan River': '#c98a3c',
  'Little Bear River': '#4f8fb0',
  'Blacksmith Fork River': '#8a6fa2',
}

export const WATER_VARIBALES = [
  { id: 'Discharge', label: 'Discharge (cfs)', longLabel: 'Discharge in cfs (cubic feet per second)' },
  { id: 'Water Temperature', label: 'Temperature (°C)', longLabel: 'Water Temperature in °C (degrees Celsius)' },
  { id: 'Specific Conductance', label: 'SPC (µS/cm)', longLabel: 'Specific Conductance in µS/cm (microsiemens per centimeter)' },
  { id: 'pH', label: 'pH', longLabel: 'pH (potential of hydrogen)' },
  { id: 'Oxygen, dissolved', label: 'Dissolved Oxygen (mg/L)', longLabel: 'Dissolved Oxygen in mg/L (milligrams per liter)' },
]

// mainstem/junction form the trunk, in file order (no row numbers). tributary (flows in) and
// diversion (flows out) attach to a trunk node via connectsTo, or chain onto another
// tributary/diversion. Position and every connector line are derived from kind + connectsTo +
// list order — there's no separate edges array.
//
// link is a pure "go to another page" card with no real station behind it (e.g. lower-logan's
// "Blacksmith Fork River" card). It's excluded from findLiveStation/getSchematicOrder because
// its label is generic enough to fuzzy-match every real station in that system. A real station
// that also sits at a page boundary (e.g. water_lab) stays 'mainstem' and just carries linkTo.
export type NodeKind = 'mainstem' | 'junction' | 'tributary' | 'diversion' | 'link'
export type SchematicSlug = 'upper-logan' | 'lower-logan' | 'blacksmith-fork' | 'little-bear'

export interface SchematicNode {
  id: string
  name: string // fuzzy-matched to a live station, except for junction/link nodes
  kind: NodeKind
  colorGroup?: string // key into WATERWAY_COLORS or SCHEMATIC_ACCENT_COLORS
  connectsTo?: string // tributary/diversion/link only: id of the node this attaches to
  side?: 'left' | 'right' // tributary/diversion/link only: which side of the trunk
  linkTo?: SchematicSlug // page to navigate to; required for 'link', optional elsewhere
  label?: string // linkTo button text override (defaults to name)
  terminus?: boolean // marks this mainstem node as the system's final endpoint
  description?: string // terminus subtitle text
  // tributary/diversion only: if this is the last node in a chain and the water rejoins
  // the trunk here (e.g. a canal that loops out and back in downstream), the id of the
  // junction it rejoins at. Draws a second connector back into the trunk.
  returnsTo?: string
}

export interface SchematicPageConfig {
  _instructions?: string[] // ignored by the renderer; plain-English edit notes for non-developers
  id: SchematicSlug
  title: string
  subtitle?: string
  nodes: SchematicNode[]
}

const SCHEMATIC_SLUGS: SchematicSlug[] = ['upper-logan', 'lower-logan', 'blacksmith-fork', 'little-bear']

export type SchematicPages = Record<SchematicSlug, SchematicPageConfig | null>

// Fetches the static per-page schematic layout files (edited directly in the repo under
// public/schematics/ — no live-fetch/publishing pipeline involved, unlike
// loadStationConfig()). Used both by SchematicView (to render whichever page is active) and
// by App.vue (to derive ListView's upstream->downstream station order).
export async function loadSchematicPages(): Promise<SchematicPages> {
  const results = await Promise.all(
    SCHEMATIC_SLUGS.map(async (slug): Promise<SchematicPageConfig | null> => {
      try {
        const res = await fetch(`/schematics/${slug}.json`, { cache: 'no-cache' })
        return res.ok ? ((await res.json()) as SchematicPageConfig) : null
      } catch {
        return null
      }
    }),
  )
  const pages = {} as SchematicPages
  SCHEMATIC_SLUGS.forEach((slug, i) => {
    pages[slug] = results[i] ?? null
  })
  return pages
}

interface UsgsStationEntry {
  id: string
  displayName: string
  siteLink?: string
  active?: boolean
}

interface DwriStationEntry {
  id: number
  displayName: string
  group: string
  schematicGroup: string
  lat: number
  lng: number
  latestCfs: number | null
  latestTime: string | null
  history: { time: string; value: number }[]
}

// Everything below is populated by loadStationConfig() from the generated
// config/station_config.yaml output (see .github/scripts/fetch_dwri.py),
// published on the data-cache branch. Starts empty — until that fetch
// completes, HydroServer stations show their raw codes as names and nothing
// is hidden; USGS/DWRi station lists are empty until loaded.
let HIDDEN_STATIONS: string[] = []
let DISPLAY_NAMES: Record<string, string> = {}
let USGS_STATIONS_CONFIG: UsgsStationEntry[] = []
let DWRI_STATIONS_DATA: DwriStationEntry[] = []

const STATION_CONFIG_URL =
  'https://raw.githubusercontent.com/loganriverobservatory/lro-dashboard/data-cache/station-config.json'

// Fetches the generated station config (station lists, display names, colors)
// and populates the module state every other function here reads from. Call
// this once before getVariableStations/getUSGSStations/getDWRiStations so
// they have data to work with. Schematic page layout is NOT part of this —
// see loadSchematicPages() for the separate, statically-fetched per-page files.
export async function loadStationConfig(): Promise<void> {
  try {
    const res = await fetch(STATION_CONFIG_URL, { cache: 'no-cache' })
    if (!res.ok) return
    const data = await res.json()

    HIDDEN_STATIONS = data.hiddenStations ?? []
    DISPLAY_NAMES = data.displayNames ?? {}
    USGS_STATIONS_CONFIG = (data.usgsStations ?? []).filter((s: UsgsStationEntry) => s.active !== false)
    DWRI_STATIONS_DATA = data.dwriStations ?? []

    if (Array.isArray(data.waterwayGroups) && data.waterwayGroups.length) {
      const colors: Record<string, string> = {}
      for (const g of data.waterwayGroups) colors[g.name] = g.color
      WATERWAY_COLORS = colors
      WATERWAY_LIST = Object.keys(colors)
    }

    if (Array.isArray(data.schematicGroups) && data.schematicGroups.length) {
      const colors: Record<string, string> = {}
      for (const g of data.schematicGroups) colors[g.name] = g.color
      SCHEMATIC_ACCENT_COLORS = colors
    }
  } catch (e) {
    console.error('Error loading station config:', e)
  }
}

export async function getVariableStations(variable: string = 'Discharge'): Promise<Station[]> {
  const isDischarge = variable.toLowerCase() === 'discharge'

  const varFilter = isDischarge
    ? `contains(name,'Discharge') and contains(name,'cfs') and not contains(name,'cms')`
    : `contains(name,'${variable}')`

  const listUrl = `${BASE_URL}/Datastreams?$filter=${varFilter}&$top=50&$orderby=name asc`

  const thingsUrl = `${BASE_URL}/Things?$top=200&$expand=Locations`

  const [dsRes, thingsRes] = await Promise.all([fetch(listUrl, { headers: authHeaders() }), fetch(thingsUrl, { headers: authHeaders() })])
  const [data, thingsData] = await Promise.all([dsRes.json(), thingsRes.json()])

  const thingsByCode: Record<string, { uuid: string; coords: [number, number] | null }> = {}
  for (const t of (thingsData.value as StaThing[] | undefined) ?? []) {
    const code = t.properties?.samplingFeatureCode
    if (!code) continue
    const p = t.Locations?.[0]?.location?.geometry?.coordinates
    const coords: [number, number] | null = p && p.length >= 2 ? [Number(p[1]), Number(p[0])] : null
    thingsByCode[code] = { uuid: t['@iot.id']?.toString() ?? '', coords }
  }

  return data.value
    .filter((ds: StaDatastream) => {
      if (!ds.name) return false
      const code = ds.name.split(' ')[0]
      if (code && HIDDEN_STATIONS.includes(code)) return false
      const isDecommissioned =
        ds.description?.includes('Decommissioned') || ds.name.includes('Decommissioned')
      const isTesting = ds.name.includes('Testing')
      return !isDecommissioned && !isTesting
    })
    .map((ds: StaDatastream) => {
      const stationCode = ds.name.split(' ')[0] || 'UNKNOWN'
      const thingInfo = thingsByCode[stationCode] ?? { uuid: '', coords: null }

      const displayNameText: string = DISPLAY_NAMES[stationCode] || stationCode
      const tributaryBase = displayNameText.includes(':')
        ? displayNameText.split(':')?.[0]?.trim()
        : 'Unknown Tributary'

      const tributary = tributaryBase === 'Logan River' ? MAIN_STEM_GROUP : HYDROSERVER_GROUP

      // phenomenonTime is "start/end" interval — extract end as latest observation time
      const ptParts = ds.phenomenonTime?.split('/') ?? []
      const latestTime = ptParts[ptParts.length - 1] ?? null

      return {
        id: ds['@iot.id']?.toString(),
        uuid: thingInfo.uuid,
        displayName: displayNameText,
        description: ds.description || '',
        observation: null,
        coordinates: thingInfo.coords,
        unit: ds.unitOfMeasurement?.symbol || '',
        tributary,
        latestTime,
        isPrivate: ds.properties?.isVisible === false || ds.properties?.isPrivate === true,
      }
    })
}

export async function getLatestObservation(
  stationId: string,
  latestTime?: string | null,
): Promise<StaObservation | null> {
  // $orderby is ignored by API for some reason; use the Datastream's phenomenonTime end as a ge filter
  if (!latestTime) return null

  const endISO = new Date(latestTime).toISOString()
  const obsUrl = `${BASE_URL}/Datastreams('${stationId}')/Observations?$filter=phenomenonTime ge ${endISO}&$top=1`

  try {
    const response = await fetch(obsUrl, { headers: authHeaders() })
    if (!response.ok) return null

    const data = await response.json()
    const obs = data.value?.[0] ?? null
    if (!obs) return null

    return {
      '@iot.id': obs['@iot.id'] || '',
      result: obs.result !== null ? Number(obs.result) : null,
      phenomenonTime: obs.phenomenonTime ?? latestTime,
    }
  } catch (e) {
    console.error(`Error fetching observation for ${stationId}:`, e)
    return null
  }
}

// Live USGS readings are fetched directly here (not via the cached config
// pipeline) — USGS's NWIS API already sends proper CORS headers, so there's
// no need to route it through the batch-fetched cache. The station identity
// list (which sites, their names/links) comes from loadStationConfig().
export async function getUSGSStations(variable: string = 'Discharge'): Promise<Station[]> {
  if (variable.toLowerCase() !== 'discharge') return []
  if (USGS_STATIONS_CONFIG.length === 0) return []

  const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${USGS_STATIONS_CONFIG.map((s) => s.id).join(',')}&parameterCd=00060&format=json`

  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    const timeSeries: any[] = data?.value?.timeSeries ?? []

    return timeSeries.map((ts: any) => {
      const siteCode = ts.sourceInfo?.siteCode?.[0]?.value ?? ''
      const stationCode = `USGS-${siteCode}`
      const configEntry = USGS_STATIONS_CONFIG.find((s) => s.id === siteCode)
      const displayName = configEntry?.displayName ?? stationCode
      const tributaryBase = displayName.includes(':') ? (displayName.split(':')[0]?.trim() ?? 'USGS') : 'USGS'
      const tributary = tributaryBase === 'Logan River' ? MAIN_STEM_GROUP : tributaryBase

      const geo = ts.sourceInfo?.geoLocation?.geogLocation
      const coordinates: [number, number] | null =
        geo ? [Number(geo.latitude), Number(geo.longitude)] : null

      const latestVal = ts.values?.[0]?.value?.[0]
      const rawResult = latestVal?.value
      const result = rawResult !== undefined && rawResult !== '-999999' ? Number(rawResult) : null
      const phenomenonTime: string | null = latestVal?.dateTime ?? null

      return {
        id: stationCode,
        uuid: stationCode,
        displayName,
        coordinates,
        unit: 'cfs',
        tributary,
        latestTime: phenomenonTime,
        isPrivate: false,
        isUSGS: true,
        siteLink: configEntry?.siteLink,
        observation: phenomenonTime
          ? { '@iot.id': stationCode, result, phenomenonTime }
          : null,
      }
    })
  } catch {
    return []
  }
}

// DWRi live readings are already fetched and attached by the time
// loadStationConfig() resolves (the GitHub Action calls DVRT server-side,
// sidestepping DVRT's missing CORS header) — this just reshapes the already-
// loaded data into Station objects, no network call here.
export async function getDWRiStations(variable: string = 'Discharge'): Promise<Station[]> {
  if (variable.toLowerCase() !== 'discharge') return []

  const year = new Date().getFullYear()

  return DWRI_STATIONS_DATA.map((station) => {
    const code = `DWRi-${station.id}`
    return {
      id: code,
      uuid: code,
      displayName: station.displayName,
      coordinates: station.lat != null && station.lng != null ? [station.lat, station.lng] : null,
      unit: 'cfs',
      tributary: station.group,
      latestTime: station.latestTime ?? new Date().toISOString(),
      isPrivate: false,
      isDWRi: true,
      history: (station.history ?? []).map((h) => [h.time, h.value] as [string, number]),
      siteLink: `https://waterrights.utah.gov/cgi-bin/dvrtview.exe?Modinfo=StationView&STATION_ID=${station.id}&RECORD_YEAR=${year}&QuitKey=Close`,
      observation: {
        '@iot.id': code,
        result: station.latestCfs,
        phenomenonTime: station.latestTime,
      },
    }
  })
}

export type FreshnessStatus = 'current' | 'stale' | 'outdated' | 'unknown'

export const STATUS_COLORS: Record<FreshnessStatus, string> = {
  current: '#16a34a',
  stale: '#d97706',
  outdated: '#973131',
  unknown: '#64748b',
}

export function getFreshnessStatus(observation: StaObservation | null): FreshnessStatus {
  if (!observation?.phenomenonTime) return 'unknown'

  const ageHours = (Date.now() - new Date(observation.phenomenonTime).getTime()) / (1000 * 60 * 60)
  if (ageHours < 2) return 'current'
  if (ageHours < 24) return 'stale'
  return 'outdated'
}

// Top-of-watershed-to-bottom order across all three schematic pages, in a fixed page
// sequence (upper-logan -> lower-logan -> blacksmith-fork). A node's row is its position
// among the trunk (mainstem/junction) nodes, in file order. A tributary/diversion sorts by
// the row of the trunk node it (eventually) attaches to — found by walking its connectsTo
// chain until it reaches a mainstem/junction node. junction and link nodes never match a
// real station, so they're excluded from the final list (link nodes especially, since their
// generic label would otherwise hijack the fuzzy match for every real station in that
// system — see NodeKind). Array.sort is stable, so ties keep their file order.
export function getSchematicOrder(pages: SchematicPages | null | undefined): string[] {
  if (!pages) return []

  const entries: { name: string; page: number; row: number }[] = []

  SCHEMATIC_SLUGS.forEach((slug, pageIndex) => {
    const page = pages[slug]
    if (!page) return

    const nodesById = new Map(page.nodes.map((n) => [n.id, n]))
    const trunkRowById = new Map<string, number>()
    page.nodes.forEach((n) => {
      if (n.kind === 'mainstem' || n.kind === 'junction') trunkRowById.set(n.id, trunkRowById.size)
    })

    function trunkRowOf(node: SchematicNode): number {
      let current: SchematicNode | undefined = node
      const seen = new Set<string>()
      while (current && !seen.has(current.id)) {
        seen.add(current.id)
        const row = trunkRowById.get(current.id)
        if (row !== undefined) return row
        current = current.connectsTo ? nodesById.get(current.connectsTo) : undefined
      }
      return Infinity
    }

    page.nodes.forEach((node) => {
      if (node.kind === 'junction' || node.kind === 'link') return
      entries.push({ name: node.name, page: pageIndex, row: trunkRowOf(node) })
    })
  })

  entries.sort((a, b) => a.page - b.page || a.row - b.row)
  return entries.map((e) => e.name)
}

// Matches SchematicView's findLiveStation fuzzy substring match, so list order stays
// consistent with how the schematic resolves config entries to live stations.
export function sortStationsBySchematic(stations: Station[], order: string[]): Station[] {
  const orderIndex = (station: Station): number => {
    const liveName = station.displayName.toLowerCase()
    const idx = order.findIndex((name) => {
      const targetName = name.toLowerCase()
      return liveName.includes(targetName) || targetName.includes(liveName)
    })
    return idx === -1 ? Infinity : idx
  }

  return stations
    .map((station, i) => ({ station, i, key: orderIndex(station) }))
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map((entry) => entry.station)
}
