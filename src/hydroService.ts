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
}

export const WATERWAY_COLORS: Record<string, string> = {
  'Logan River: Main Stem': '#13157a',
  'Blacksmith Fork River': '#b45309',
  'Spring Creek': '#0369a1',
  'Temple Fork': '#00b341',
  'Beaver Creek': '#b91c1c',
  'Little Bear River': '#0891b2',
  'Dewitt Springs': '#7c3aed',
  'Right Hand Fork': '#065f46',
  'Ricks Spring': '#db3464',
  'USGS': '#1d4ed8',
  'Utah DWRi': '#0e7490',
}

export const WATERWAY_LIST = Object.keys(WATERWAY_COLORS)

export const WATER_VARIBALES = [
  { id: 'Discharge', label: 'Discharge (cfs)', longLabel: 'Discharge in cfs (cubic feet per second)' },
  { id: 'Water Temperature', label: 'Temperature (°C)', longLabel: 'Water Temperature in °C (degrees Celsius)' },
  { id: 'Specific Conductance', label: 'SPC (µS/cm)', longLabel: 'Specific Conductance in µS/cm (microsiemens per centimeter)' },
  { id: 'pH', label: 'pH', longLabel: 'pH (potential of hydrogen)' },
  { id: 'Oxygen, dissolved', label: 'Dissolved Oxygen (mg/L)', longLabel: 'Dissolved Oxygen in mg/L (milligrams per liter)' },
]

let STATIONS_NOT_DISPLAYED: string[] = [
  'TF_SAWM_A',
  'SPC_CONF_A',
  'SLB_600W_CNL',
  'NWF_1600N_CNL',
  'LR_RH_SD',
  'LR_SC_SD',
  'LR_DSC_A',
]

let STATION_NAME_MAP: Record<string, string> = {
  BC_CONF_A: 'Beaver Creek: Before Confluence with the Logan River',
  BSF_1700S_A: 'Blacksmith Fork River: 1700 South Footbridge',
  BSF_CONF_BA: 'Blacksmith Fork River: Before Confluence with Logan River',
  BSF_Darwin_A: 'Blacksmith Fork River: Hollow Road',
  DS_CONF_A: 'Dewitt Springs: Before Confluence with Logan River',
  LBR_MR_A: 'Little Bear River: Mendon Road',
  LR_1000W_A: 'Logan River: 1000 West',
  LR_Cutler_A: 'Logan River: Before Confluence with Cutler Reservoir',
  LR_FB_BA: 'Logan River: Franklin Basin',
  LR_GCB_A: 'Logan River: Guinavah Campground',
  LR_MainStreet_BA: 'Logan River: Main Street',
  LR_Mendon_AA: 'Logan River: Mendon Road',
  LR_TG_BA: 'Logan River: Tony Grove',
  LR_WaterLab_AA: 'Logan River: Utah Water Research Laboratory',
  LR_WC_A: 'Logan River: Above Wood Camp',
  LR_WCB_A: 'Logan River: Wood Camp Bridge',
  RHF_CONF_A: 'Right Hand Fork: Before Confluence with Logan River',
  RS_CONF_A: 'Ricks Spring: Before Confluence with Logan River',
  SC_CONF_A: 'Spring Creek: Before Confluence with Logan River',
  SC_MR_A: 'Spring Creek: Mendon Road',
  TF_CONF_A: 'Temple Fork: Before Confluence with Logan River',
  LR_DSC_A: 'Logan River: Dewitt Springs Campground',
  'USGS-10108400': 'USGS: Cache Highline Canal Near Logan, UT',
  'USGS-10109000': 'USGS: Logan River Above First Dam',
}

export interface DWRiStationDef {
  id: number
  displayName: string
  tributary?: string
}

let DWRI_STATIONS: DWRiStationDef[] = []

export function setStationConfig(
  notDisplayed: string[],
  nameMap: Record<string, string>,
  dwriStations?: DWRiStationDef[]
) {
  STATIONS_NOT_DISPLAYED = notDisplayed
  STATION_NAME_MAP = { ...STATION_NAME_MAP, ...nameMap }
  if (dwriStations?.length) DWRI_STATIONS = dwriStations
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
      if (code && STATIONS_NOT_DISPLAYED.includes(code)) return false
      const isDecommissioned =
        ds.description?.includes('Decommissioned') || ds.name.includes('Decommissioned')
      const isTesting = ds.name.includes('Testing')
      return !isDecommissioned && !isTesting
    })
    .map((ds: StaDatastream) => {
      const stationCode = ds.name.split(' ')[0] || 'UNKNOWN'
      const thingInfo = thingsByCode[stationCode] ?? { uuid: '', coords: null }

      const displayNameText: string = STATION_NAME_MAP[stationCode] || stationCode
      const tributaryBase = displayNameText.includes(':')
        ? displayNameText.split(':')?.[0]?.trim()
        : 'Unknown Tributary'

      const tributary = tributaryBase === 'Logan River' ? 'Logan River: Main Stem' : tributaryBase

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

const USGS_SITE_CODES = ['10108400', '10109000']

const USGS_SITE_LINKS: Record<string, string> = {
  'USGS-10108400': 'https://waterdata.usgs.gov/monitoring-location/USGS-10108400/#dataTypeId=continuous-00060-0&period=P7D&showMedian=true&showFieldMeasurements=true',
  'USGS-10109000': 'https://waterdata.usgs.gov/monitoring-location/USGS-10109000/#dataTypeId=continuous-00060-0&period=P7D&showMedian=true&showFieldMeasurements=true',
}

export async function getUSGSStations(variable: string = 'Discharge'): Promise<Station[]> {
  if (variable.toLowerCase() !== 'discharge') return []

  const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${USGS_SITE_CODES.join(',')}&parameterCd=00060&format=json`

  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    const timeSeries: any[] = data?.value?.timeSeries ?? []

    return timeSeries.map((ts: any) => {
      const siteCode = ts.sourceInfo?.siteCode?.[0]?.value ?? ''
      const stationCode = `USGS-${siteCode}`
      const displayName = STATION_NAME_MAP[stationCode] ?? stationCode
      const tributaryBase = displayName.includes(':') ? displayName.split(':')[0].trim() : 'USGS'
      const tributary = tributaryBase === 'Logan River' ? 'Logan River: Main Stem' : tributaryBase

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
        siteLink: USGS_SITE_LINKS[stationCode],
        observation: phenomenonTime
          ? { '@iot.id': stationCode, result, phenomenonTime }
          : null,
      }
    })
  } catch {
    return []
  }
}

const DWRI_CACHE_URL =
  'https://raw.githubusercontent.com/loganriverobservatory/lro-dashboard/data-cache/utah-dwr-cache.json'

export async function getDWRiStations(variable: string = 'Discharge'): Promise<Station[]> {
  if (variable.toLowerCase() !== 'discharge') return []
  if (DWRI_STATIONS.length === 0) return []

  try {
    const res = await fetch(DWRI_CACHE_URL)
    if (!res.ok) return []
    const data = await res.json()

    const year = new Date().getFullYear()
    const fetchedAt: string = data.fetchedAt ?? new Date().toISOString()
    const stationIndex = new Map(DWRI_STATIONS.map(s => [s.id, s]))

    return (data.stations ?? [])
      .filter((s: { id: number; code: string }) =>
        stationIndex.has(s.id) && !STATIONS_NOT_DISPLAYED.includes(s.code)
      )
      .map((s: { id: number; code: string; latestCfs: number | null }) => {
        const def = stationIndex.get(s.id)!
        return {
          id: s.code,
          uuid: s.code,
          displayName: STATION_NAME_MAP[s.code] ?? def.displayName,
          coordinates: null,
          unit: 'cfs',
          tributary: def.tributary ?? 'Utah DWRi',
          latestTime: fetchedAt,
          isPrivate: false,
          isDWRi: true,
          siteLink: `https://waterrights.utah.gov/cgi-bin/dvrtview.exe?Modinfo=StationView&STATION_ID=${s.id}&RECORD_YEAR=${year}&QuitKey=Close`,
          observation: { '@iot.id': s.code, result: s.latestCfs, phenomenonTime: fetchedAt },
        }
      })
  } catch {
    return []
  }
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
