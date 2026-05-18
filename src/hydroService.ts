// src/hydroService.ts
const BASE_URL = "https://lro.hydroserver.org/api/sensorthings/v1.1";

export interface Station {
  id: string;
  displayName: string;
  description: string;
  observation: any;
}

export async function getDischargeStations(): Promise<Station[]> {
  // Change $top=100 to $top=50
const listUrl = `${BASE_URL}/Datastreams?$filter=contains(name,'Discharge') and contains(name,'cfs') and not contains(name,'cms')&$top=50&$orderby=name asc`;
  const response = await fetch(listUrl);
  const data = await response.json();
  
  return data.value.map((ds: any) => {
    // We do the split and replace all in one go to prevent any "leaks"
    const cleanName = ds.name
      .split(' - ')[0]             // Cut off " - Raw data"
      .split(' Discharge')[0]      // Cut off " Discharge (cfs)"
      .replace(/^[A-Z0-9_]+ /, '') // Cut off "LR_DSC_A"
      .replace('at Logan River at ', '') // Cut off the redundant river name
      .trim();

    return {
      id: ds['@iot.id'],
      displayName: cleanName || ds.name, 
      description: ds.description,
      observation: null
    };
  });
}

export async function getLatestObservation(stationId: string): Promise<any> {
  const obsUrl = `${BASE_URL}/Datastreams('${stationId}')/Observations?$top=1&$orderby=phenomenonTime desc`;
  const response = await fetch(obsUrl);
  const data = await response.json();
  return data.value?.[0] || null;
}