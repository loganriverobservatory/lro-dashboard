/*
src/hydroService.ts - fetches and processes data from HydroServer for use in the app
*/
import type { DatastreamExtended } from '@hydroserver/client'

// Set once by App.vue's loadConfig(), from public/config.json, before any of the fetch
// functions below run - there is no hardcoded LRO default to fall back to. That's deliberate:
// a deployment with a missing/mistyped endpoint should fail loudly at startup (see
// setApiConfig) instead of silently serving LRO's own data to a different organization.
let BASE_URL: string
let STATION_CONFIG_URL: string
let USGS_API_BASE_URL: string

export function setApiConfig(cfg: {
  hydroServerBaseUrl?: unknown
  stationConfigUrl?: unknown
  usgsApiBaseUrl?: unknown
}) {
  const entries: [string, unknown][] = [
    ['hydroServerBaseUrl', cfg.hydroServerBaseUrl],
    ['stationConfigUrl', cfg.stationConfigUrl],
    ['usgsApiBaseUrl', cfg.usgsApiBaseUrl],
  ]
  for (const [key, value] of entries) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(
        `config.json is missing a valid "${key}" value - the dashboard cannot start without it.`,
      )
    }
  }
  BASE_URL = cfg.hydroServerBaseUrl as string
  STATION_CONFIG_URL = cfg.stationConfigUrl as string
  USGS_API_BASE_URL = cfg.usgsApiBaseUrl as string
}

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
  [MAIN_STEM_GROUP]: '#2a78d6',
  [HYDROSERVER_GROUP]: '#2a78d6',
  'USGS': '#e87ba4',
  'DWRi': '#4a3aa7',
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
// A schematic page's slug, e.g. 'lower-logan'. Not a fixed literal union - which slugs exist is
// determined at runtime by public/schematics/manifest.json, so any adopter can add/rename/remove
// river systems by editing JSON only. The tradeoff: a typo in some JSON's `linkTo` is no longer
// caught by the type checker, only surfaced at runtime as a failed page load.
export type SchematicSlug = string

export interface SchematicNode {
  id: string
  name: string // fuzzy-matched to a live station, except for junction/link nodes
  kind: NodeKind
  colorGroup?: string // key into WATERWAY_COLORS or SCHEMATIC_ACCENT_COLORS
  connectsTo?: string // tributary/diversion/link only: id of the node this attaches to
  side?: 'left' | 'right' // tributary/diversion/link only: which side of the trunk
  linkTo?: SchematicSlug // page to navigate to; required for 'link', optional elsewhere
  label?: string // linkTo button text override (defaults to name)
  cardLabel?: string // overrides the on-card name shown once matched to a live station
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
  title: string // shown in the page header
  navLabel?: string // short name for the sidebar submenu / mobile tab bar; falls back to title
  subtitle?: string
  nodes: SchematicNode[]
}

interface SchematicManifest {
  slugs: SchematicSlug[]
}

// slugs is manifest order (only slugs whose JSON fetched successfully); bySlug is a lookup for
// resolving one page by its route param. Keeping both avoids every consumer re-deriving order.
export interface SchematicPages {
  slugs: SchematicSlug[]
  bySlug: Record<SchematicSlug, SchematicPageConfig | null>
}

// Fetches public/schematics/manifest.json (the single place that registers which schematic
// systems exist and in what order), then each listed slug's static page file — edited directly
// in the repo under public/schematics/, no live-fetch/publishing pipeline involved, unlike
// loadStationConfig(). Used both by SchematicView (to render whichever page is active) and by
// App.vue (to derive ListView's upstream->downstream station order, and the sidebar/tab nav).
export async function loadSchematicPages(): Promise<SchematicPages> {
  let slugs: SchematicSlug[] = []
  try {
    const res = await fetch('/schematics/manifest.json', { cache: 'no-cache' })
    if (res.ok) {
      const manifest = (await res.json()) as SchematicManifest
      slugs = Array.isArray(manifest.slugs) ? manifest.slugs : []
    }
  } catch {
    slugs = []
  }

  const results = await Promise.all(
    slugs.map(async (slug): Promise<SchematicPageConfig | null> => {
      try {
        const res = await fetch(`/schematics/${slug}.json`, { cache: 'no-cache' })
        return res.ok ? ((await res.json()) as SchematicPageConfig) : null
      } catch {
        return null
      }
    }),
  )

  const bySlug: Record<SchematicSlug, SchematicPageConfig | null> = {}
  slugs.forEach((slug, i) => {
    bySlug[slug] = results[i] ?? null
  })
  return { slugs, bySlug }
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

  const url = `${USGS_API_BASE_URL}?sites=${USGS_STATIONS_CONFIG.map((s) => s.id).join(',')}&parameterCd=00060&format=json`

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

interface SchematicOrderEntry {
  name: string
  slug: SchematicSlug
  page: number
  row: number
}

// Top-of-watershed-to-bottom order across every schematic page, in manifest.json's page
// sequence. A node's row is its position among the trunk (mainstem/junction) nodes, in file
// order. A tributary/diversion sorts by the row of the trunk node it (eventually) attaches
// to — found by walking its connectsTo chain until it reaches a mainstem/junction node.
// junction and link nodes never match a real station, so they're excluded from the final list
// (link nodes especially, since their generic label would otherwise hijack the fuzzy match for
// every real station in that system — see NodeKind). Array.sort is stable, so ties keep their
// file order. Shared by getSchematicOrder() and getSchematicSystemOrder() below, so there's
// only one place that walks the schematic files.
function buildSchematicEntries(pages: SchematicPages | null | undefined): SchematicOrderEntry[] {
  if (!pages) return []

  const entries: SchematicOrderEntry[] = []

  pages.slugs.forEach((slug, pageIndex) => {
    const page = pages.bySlug[slug]
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
      entries.push({ name: node.name, slug, page: pageIndex, row: trunkRowOf(node) })
    })
  })

  entries.sort((a, b) => a.page - b.page || a.row - b.row)
  return entries
}

export function getSchematicOrder(pages: SchematicPages | null | undefined): string[] {
  return buildSchematicEntries(pages).map((e) => e.name)
}

// Same ordered list as getSchematicOrder(), but keeping each entry's system slug - this is
// what lets a live station be matched back to which schematic page (Upper Logan, Little Bear,
// etc.) it belongs to, for the List/Map view system filter. Adding or removing a station is a
// schematic-JSON-only edit - nothing here needs to change to pick it up.
export function getSchematicSystemOrder(pages: SchematicPages | null | undefined): { name: string; slug: SchematicSlug }[] {
  return buildSchematicEntries(pages).map((e) => ({ name: e.name, slug: e.slug }))
}

// Shared by findLiveStation (SchematicView.vue), sortStationsBySchematic, and
// findStationSystem below - all three need to match a live station's display name against a
// schematic-authored name via fuzzy (bidirectional) substring matching. Picking the *first*
// candidate that satisfies the substring check (as all three used to) breaks when one name is
// a literal text-prefix of another's, e.g. "Highline Canal" vs "Highline Canal at Pond" - the
// shorter name's station would win the match for both, showing its reading on both cards.
// Preferring an exact match, then the closest-length partial match, fixes that.
export function bestFuzzyMatch<T>(targetName: string, items: T[], nameOf: (item: T) => string): T | undefined {
  const target = targetName.toLowerCase()
  let best: T | undefined
  let bestDiff = Infinity
  for (const item of items) {
    const name = nameOf(item).toLowerCase()
    if (name === target) return item
    if (name.includes(target) || target.includes(name)) {
      const diff = Math.abs(name.length - target.length)
      if (diff < bestDiff) {
        best = item
        bestDiff = diff
      }
    }
  }
  return best
}

export function sortStationsBySchematic(stations: Station[], order: string[]): Station[] {
  const orderIndex = (station: Station): number => {
    const match = bestFuzzyMatch(station.displayName, order, (name) => name)
    return match === undefined ? Infinity : order.indexOf(match)
  }

  return stations
    .map((station, i) => ({ station, i, key: orderIndex(station) }))
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map((entry) => entry.station)
}

// Used by the List/Map view system filter to find which schematic page a live station belongs
// to. Returns undefined if the station doesn't match any node in any schematic file (e.g. a
// brand-new live station that hasn't been added to a schematic JSON yet) - callers treat that
// the same as belonging to no system, so it's hidden by the filter same as anything else, not
// exempted from it. Add the station to a schematic JSON to make it filterable.
export function findStationSystem(
  displayName: string,
  systemOrder: { name: string; slug: SchematicSlug }[],
): SchematicSlug | undefined {
  return bestFuzzyMatch(displayName, systemOrder, (e) => e.name)?.slug
}
