/*
src/hydroService.ts - fetches and processes data from HydroServer for use in the app
*/
import type { DatastreamExtended } from '@hydroserver/client'

const BASE_URL = 'https://lro.hydroserver.org/api/sensorthings/v1.1'

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
}

export const WATERWAY_LIST = Object.keys(WATERWAY_COLORS)

export const WATER_VARIBALES = [
  { id: 'Discharge', label: 'Discharge (cfs)' },
  { id: 'Water Temperature', label: 'Temperature (°C)' },
  { id: 'Specific Conductance', label: 'SPC (uS/cm)' },
  { id: 'pH', label: 'pH (pH)' },
  { id: 'Oxygen, dissolved', label: 'Dissolved Oxygen (mg/L)' },
]

// Add or remove station codes here to control which sites appear in all views
// HS: ADD AS TAG
const STATIONS_NOT_DISPLAYED = [
  'TF_SAWM_A',
  'SPC_CONF_A',
  'SLB_600W_CNL',
  'NWF_1600N_CNL',
  'LR_RH_SD',
  'LR_SC_SD',
  'LR_DSC_A',
]

// format station name
// HS: ADD AS TAG
const STATION_NAME_MAP: Record<string, string> = {
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
}

export async function getVariableStations(variable: string = 'Discharge'): Promise<Station[]> {
  const isDischarge = variable.toLowerCase() === 'discharge'

  const varFilter = isDischarge
    ? `contains(name,'Discharge') and contains(name,'cfs') and not contains(name,'cms')`
    : `contains(name,'${variable}')`

  // 🟢 RESTORED: Fetches the matching station datasets correctly
  const listUrl = `${BASE_URL}/Datastreams?$filter=${varFilter}&$top=50&$orderby=name asc`

  const thingsUrl = `${BASE_URL}/Things?$top=200&$expand=Locations`

  const [dsRes, thingsRes] = await Promise.all([fetch(listUrl), fetch(thingsUrl)])
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
  // $orderby is ignored by this API; use the Datastream's phenomenonTime end as a ge filter
  if (!latestTime) return null

  const endISO = new Date(latestTime).toISOString()
  const obsUrl = `${BASE_URL}/Datastreams('${stationId}')/Observations?$filter=phenomenonTime ge ${endISO}&$top=1`

  try {
    const response = await fetch(obsUrl)
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
