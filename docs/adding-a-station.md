# How to Add a Station

This is a plain-language guide for adding a new monitoring station to the LRO Dashboard. You don't need to know how to program — you're just editing two small data files, not writing code.

## The one thing to know before you start

**Adding a station has two separate steps, and doing one does not do the other:**

1. **The main dashboard** (the map, the list, the station cards) — controlled by one file: `config/station_config.yaml`.
2. **The schematic diagrams** (the river-flow pictures) — controlled by a different set of files in `public/schematics/`.

If you only do step 1, your station will show up on the map and in the list, but it will **not** appear on any schematic diagram. If you want it in both places, you have to edit both. Neither step requires touching any actual code.

---

## Step 1: Add the station to the main dashboard

Open `config/station_config.yaml`. This file already has an entry for every non-automatic station, plus instructions written directly inside it as comments.

There are three kinds of stations. Which one you're adding determines what you do:

### HydroServer stations
**You don't need to do anything.** These come in live from HydroServer automatically the moment the dashboard loads. There's nothing to add to this file. (You'd only touch the `display_names` or `hidden_stations` sections here if you wanted to rename or hide one of these.)

### USGS stations
1. Go to [waterdata.usgs.gov](https://waterdata.usgs.gov) and find the site's number (an 8-digit number, e.g. `10108400`).
2. In `station_config.yaml`, scroll to the `usgs_stations:` section.
3. Copy one of the existing entries and change the values:

```yaml
  - id: "10108400"
    displayName: "USGS: Cache Highline Canal Near Logan, UT"
    siteLink: "https://waterdata.usgs.gov/monitoring-location/USGS-10108400/#dataTypeId=continuous-00060-0&period=P7D&showMedian=true&showFieldMeasurements=true"
    active: true
```

- `id` — the site number from step 1, in quotes.
- `displayName` — the name shown on the dashboard. By convention it starts with `"USGS: "`.
- `siteLink` — the USGS page for that site (swap the site number into the URL above).
- `active` — leave as `true`. (Set to `false` later if you ever want to hide it without deleting it.)

You do **not** need to add coordinates — USGS supplies the station's location automatically.

### DWRi stations (Utah Division of Water Rights)
1. Find the station's ID at [waterrights.utah.gov](https://waterrights.utah.gov).
2. Scroll to the `dwri_stations:` section and copy an existing entry:

```yaml
  - id: 56
    displayName: "Logan River: 8th Ward Canal (Crockett Canal)"
    group: "DWRi"
    schematicGroup: "Logan River"
    lat: 41.734148
    lng: -111.811971
    active: true
```

- `id` — the DWRi station ID (a plain number, no quotes).
- `displayName` — the name shown on the dashboard.
- `group` — always `"DWRi"` for this station type.
- `schematicGroup` — which tributary it belongs to, for coloring on the schematic. Must be exactly one of the names listed near the top of the file under `schematic_groups:` (currently `"Logan River"`, `"Little Bear River"`, or `"Blacksmith Fork River"`).
- `lat` / `lng` — the station's coordinates (you can get these from Google Maps by right-clicking the location).
- `active` — leave as `true`.

### After you save the file
- Commit and push your change (or open a pull request, if that's your team's process).
- A check called "Validate Station Config" runs automatically and will flag mistakes — like a misspelled `schematicGroup` or a duplicate ID — before anything goes live.
- Within about 15 minutes, an automated process picks up your change and publishes it. If you don't want to wait, you (or someone with GitHub access) can manually run the "Update Utah DWRi Cache" action from the Actions tab to publish it immediately.
- Reload the dashboard to see your new station on the map and in the list.

---

## Step 2: Add the station to a schematic diagram (optional, separate step)

Do this only if you also want the station to appear on one of the river-flow diagrams. This is a completely separate set of files and does not need anything from Step 1 to already be committed — but the station does need to exist somewhere live (HydroServer, or the config file from Step 1) for its data to actually show up on the diagram card.

### Which file to edit
Inside `public/schematics/`, there's one file per diagram:
- `upper-logan.json`
- `lower-logan.json`
- `blacksmith-fork.json`
- `little-bear.json`

Open whichever one matches the river system your new station belongs to.

### How the diagram finds your station's live data
Each diagram file just lists "nodes" (cards) — it doesn't store any real-time data itself. Every node has a `name`, and can also have a `stationId`:

- **`stationId` (recommended)** — the exact id, no guessing. Use the same value you just used in Step 1: for a USGS or DWRi station, that's the `id` from `usgs_stations`/`dwri_stations`; for a HydroServer station, it's its short code (the same kind of code used as a key in the `display_names` section, e.g. `"BC_CONF_A"`).
- **`name` only (older/fallback way)** — if you leave out `stationId`, the diagram falls back to comparing `name` against the real station names, and uses whichever one looks closest. This usually works, but it's a guess — an unusual name can match the wrong station, or nothing at all.

**Always set `stationId` when adding a new node.** It's exact, so there's nothing to double-check later. If a card ever looks blank after you save (no live reading), it means neither `stationId` nor `name` matched a real station — check for a typo.

### The five card types (`kind`)
Every node has a `kind`, which controls how it's drawn:

| `kind` | What it means |
|---|---|
| `mainstem` | A regular gauge station on the main river. Use this for most stations. |
| `tributary` | A side station where water flows **in** (a creek, spring, etc.) |
| `diversion` | A side station where water flows **out** (a canal, ditch, etc.) |
| `junction` | An invisible connection point on the main river where a side station attaches — draws as a tiny dot, no card. You usually won't need to add one of these. |
| `link` | A button that jumps to a different diagram page — not a real station. |

### Adding one new station (the common case)
Add a new entry to the `nodes` list, in the position where the water actually flows (the order of entries in the list is what determines the layout — list stations in the order water flows downstream).

**If it's on the main river**, add:
```json
{ "id": "my_new_station", "name": "Logan River: My New Station", "stationId": "10199000", "kind": "mainstem" }
```

**If it's a side station (a creek flowing in, or a canal flowing out)**, also say what it connects to and which bank it's on:
```json
{ "id": "my_new_station", "name": "Some Creek: Before Confluence with Logan River", "stationId": "SC_BC_A", "kind": "tributary", "connectsTo": "nearest_junction_or_mainstem_id", "side": "left" }
```

- `id` — any short unique label you choose for this node (letters/numbers/underscores).
- `name` — a human-readable label; should closely match the real station's display name from Step 1.
- `stationId` — the exact id/code from Step 1 (see above) — this is what actually connects the card to live data.
- `connectsTo` — the `id` of the mainstem or junction node it attaches to (only needed for `tributary`/`diversion`).
- `side` — `"left"` or `"right"`, matching which bank of the river the station is actually on.

### After you save the file
Just commit and push (or open a pull request). There's no waiting, no automated action to run — the change is live the next time anyone loads that schematic page.

---

## Quick checklist

- [ ] Added an entry to `config/station_config.yaml` (for the main map/list) — skip this for HydroServer stations, they're automatic
- [ ] Added a node to the right file in `public/schematics/` (for the diagram) — only if you want it on a schematic too
- [ ] Set the schematic node's `stationId` to the same id/code used in Step 1
- [ ] Committed and pushed
- [ ] Waited ~15 minutes (or had someone run the cache-update action) for USGS/DWRi changes, then reloaded the dashboard to confirm it looks right
