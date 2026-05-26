/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hydroService.ts

const BASE_URL = 'https://lro.hydroserver.org/api/sensorthings/v1.1'

// Each View pulls from Station interface
export interface Station {
  id: string
  displayName: string
  description?: string
  observation?: any
  coordinates: [number, number] | null
}

export const WATER_VARIBALES = [
  { id: 'Discharge', label: 'Discharge (cfs)' },
  { id: 'Water Temperature', label: 'Temperature (°C)' },
  { id: 'Specific Conductance', label: 'SPC (uS/cm)' },
  { id: 'pH', label: 'pH' },
  { id: 'Oxygen, dissolved', label: 'Dissolved Oxygen' },
]

function getCoordinates(ds: any): [number, number] | null {
  const p = ds.Thing?.Locations?.[0]?.location?.geometry?.coordinates

  if (p && p.length >= 2) {
    // API is [Lon, Lat], Map needs [Lat, Lon]
    return [p[1], p[0]]
  } else {
    return null
  }
}

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

export async function getDischargeStations(): Promise<Station[]> {
  const listUrl = `${BASE_URL}/Datastreams?$filter=contains(name,'Discharge') and contains(name,'cfs') and not contains(name,'cms')&$top=50&$orderby=name asc&$expand=Thing($expand=Locations)`

  const response = await fetch(listUrl)
  const data = await response.json()

  return data.value
    .filter((ds: any) => {
      const isDecommissioned =
        ds.description?.includes('Decommissioned') || ds.name?.includes('Decommissioned')
      const isTesting = ds.name?.includes('Testing')
      return !isDecommissioned && !isTesting
    })
    .map((ds: any) => {
      // 1. YOUR ORIGINAL NAMING LOGIC
      const cleanName = ds.name
        .split(' - ')[0]
        .split(' Discharge')[0]
        .replace(/^[A-Z0-9_]+ /, '')
        .replace('at Logan River at ', '')
        .trim()

      // 2. GET COORDINATES WITH FALLBACK
      const foundCoords = getCoordinates(ds)

      return {
        id: ds['@iot.id']?.toString(),
        displayName: STATION_NAME_MAP[cleanName] || cleanName || ds.name,
        description: ds.description,
        observation: null,
        coordinates: foundCoords,
      }
    })
}

/*export async function getStationsByVariable(variable: string = 'Discharge') {
  const baseUrl = 'https://lro.hydroserver.org/api/sensorthings/v1.1/Datastreams'

  // Use the $filter to only get datastreams for the selected property
  const filter = `substringof('${variable}', name)`
  const expand = '$expand=Thing($expand=Locations)'

  const url = `${baseUrl}?$filter=${filter}&${expand}`

  const response = await fetch(url)
  const data = await response.json()

  return data.value
    .filter((ds: any) => {
      const isDecommissioned =
        ds.description?.includes('Decommissioned') || ds.name?.includes('Decommissioned')
      return !isDecommissioned
    })
    .map((ds: any) => {
      // Your existing cleaning and coordinate logic here...
      const foundCoords = getCoordinates(ds)
      return {
        id: ds['@iot.id'],
        displayName: ds.name.split(' - ')[0], // Example cleaning
        coordinates: foundCoords,
        variableType: variable,
      }
    })
}*/

export async function getLatestObservation(stationId: string): Promise<any> {
  const obsUrl = `${BASE_URL}/Datastreams('${stationId}')/Observations?$top=1&$orderby=phenomenonTime desc`
  const response = await fetch(obsUrl)
  const data = await response.json()
  return data.value?.[0] || null
}

export function isStationActive(_observation: any): boolean {
  return true
}
