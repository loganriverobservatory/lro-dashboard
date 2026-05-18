// src/hydroService.ts
const BASE_URL = 'https://lro.hydroserver.org/api/sensorthings/v1.1'

export interface Station {
  id: string
  displayName: string
  description: string
  observation: any
}

const STATION_NAME_MAP: Record<string, string> = {
  BC_CONF_A: 'Beaver Creek: Before Confluence with the Logan River',
  BSF_1700S_A: 'Blacksmith Fork River: 1700 South Footbridge',
  BSF_CONF_BA: 'Blacksmith Fork River: Before Confluence with Logan River',
  BSF_Darwin_A: 'Blacksmith Fork River: Hollow Road',
  DS_CONF_A: 'Dewitt Springs: Before Confluence with Logan River',
  LBR_MR_A: 'Little Bear River: Mendon Road',
  LR_1000W_A: 'Logan River: 1000 West',
  LR_Cutler_A: 'Logan River: Before Confluence with Cutler Reservior',
  LR_FB_BA: 'Logan River: Franklin Basin',
  LR_GCB_A: 'Logan River: Guinavah Campground',
  LR_MainStreet_BA: 'Logan River: Mainstreet',
  LR_Mendon_AA: 'Logan River: Mendon Road',
  LR_TG_BA: 'Logan River: Tony Grove',
  LR_WaterLab_AA: 'Logan River: Utah Water Reaserch Labratory',
  LR_WC_A: 'Logan River: Above Wood Camp',
  LR_WCB_A: 'Logan River: Wood Camp Bridge',
  RHF_CONF_A: 'Right Hand Fork: Before Confluence with Logan River',
  RS_CONF_A: 'Ricks Spring: Before Confluence with Logan River',
  SC_CONF_A: 'Spring Creek: Before Confluence with Logan River',
  SC_MR_A: 'Spring Creek: Mendon Road',
}

export async function getDischargeStations(): Promise<Station[]> {
  // Change $top=100 to $top=50
  const listUrl = `${BASE_URL}/Datastreams?$filter=contains(name,'Discharge') and contains(name,'cfs') and not contains(name,'cms')&$top=50&$orderby=name asc`
  const response = await fetch(listUrl)
  const data = await response.json()

  return data.value.map((ds: any) => {
    // We do the split and replace all in one go to prevent any "leaks"
    const cleanName = ds.name
      .split(' - ')[0] // Cut off " - Raw data"
      .split(' Discharge')[0] // Cut off " Discharge (cfs)"
      .replace(/^[A-Z0-9_]+ /, '') // Cut off "LR_DSC_A"
      .replace('at Logan River at ', '') // Cut off the redundant river name
      .trim()

    return {
      id: ds['@iot.id'],
      displayName: STATION_NAME_MAP[cleanName] || cleanName || ds.name,
      description: ds.description,
      observation: null,
    }
  })
}

export async function getLatestObservation(stationId: string): Promise<any> {
  const obsUrl = `${BASE_URL}/Datastreams('${stationId}')/Observations?$top=1&$orderby=phenomenonTime desc`
  const response = await fetch(obsUrl)
  const data = await response.json()
  return data.value?.[0] || null
}
