# Schematic page config files

This folder holds one JSON file per schematic diagram page shown in the dashboard's "Schematic View":

- `upper-logan.json` — Upper Logan Canyon (Franklin Basin down to the UWRL Water Lab)
- `lower-logan.json` — Lower Logan River (Dewitt Springs down to Cutler Terminus, plus Little Bear River and Cutler Inflows)
- `blacksmith-fork.json` — Blacksmith Fork River (the full BSF system)

These are plain static files served directly by the web app — edit one, commit it, and the next time someone loads that schematic page they'll see your change. There's no build step, no publishing pipeline, and no live-data fetch involved (that's different from `config/station_config.yaml`, which drives station identity/colors and *is* published through a GitHub Action — this folder is unrelated to that pipeline).

Each file also carries its own `_instructions` field at the top with a shorter, in-context version of everything below — this README is the full reference.

## Basic shape

```json
{
  "id": "upper-logan",
  "title": "Upper Logan Canyon",
  "subtitle": "Franklin Basin down to the UWRL Water Lab",
  "nodes": [ /* ... */ ],
  "edges": [ /* ... */ ]
}
```

`id` must be one of `upper-logan`, `lower-logan`, `blacksmith-fork` and must match the filename — this is how the app knows which file to load for a given page URL.

## Nodes

Each node is one card on the diagram.

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique within this file. Edges reference nodes by this id, so don't change an existing one casually. |
| `name` | yes | For `type: "station"`, this is matched (fuzzily — partial matches count both directions) against a live station's display name from HydroServer, DWRi, or USGS. For `junction`/`terminus`/`extension` nodes it's just label text. |
| `row` | yes | Vertical position. Smaller numbers are further upstream / higher on the page. |
| `col` | yes | Horizontal lane (a plain integer). By convention: `2` is the main channel, `1` is left-bank tributaries/canals, `3` is right-bank. Additional lanes (like Little Bear River's own column on the Lower Logan page) just use the next free number — there's no fixed maximum. |
| `type` | yes | One of `station`, `junction`, `terminus`, `extension` — see below. |
| `colorGroup` | no | Tints the card's background. Must match a `name` from `waterway_groups` or `schematic_groups` in `config/station_config.yaml`. |
| `description` | no | Subtitle text, only used on `terminus` nodes. |
| `targetSchematic` | `extension` nodes only | Which page slug to navigate to when clicked (`upper-logan`, `lower-logan`, or `blacksmith-fork`). |
| `label` | `extension` nodes only | Button text. Defaults to `name` if omitted. |

### Node types

- **`station`** — shows a live data card (name, current reading, freshness). This is what most nodes should be.
- **`junction`** — an invisible connection point on the main channel where a tributary or diversion attaches. No card is drawn; it just gives edges somewhere to connect to.
- **`terminus`** — a labeled endpoint banner (used once, for Cutler Reservoir on the Lower Logan page). Only add one per page, if any.
- **`extension`** — a clickable card that takes the user to a *different* schematic page. Used for cross-page links, like the Blacksmith Fork River card on the Lower Logan page.

## Edges

Each edge draws a connector line from one node to another.

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique within this file. |
| `from` | yes | Source node id. For a tributary/diversion, this is the tributary/diversion, not the junction. |
| `to` | yes | Target node id. For a tributary/diversion, this is the junction it attaches to. |
| `style` | yes | `"main"` (thick dark line, the main channel), `"branch"` (a tributary or diversion attaching to a junction), or `"thin"` (an independent flow that doesn't attach to a junction, like the Little Bear River chain). |
| `direction` | no | `"in"` (water flowing into the main channel — the default) or `"out"` (water flowing away, e.g. a diversion/canal). Only meaningful for `branch` edges; controls which end gets an arrowhead. |
| `edgeType` | no | Line shape: `"bezier"`, `"smoothstep"` (the default), or `"straight"`. |

**Important:** `style: "branch"` is also what tells the app's station-list ordering feature that this node attaches to a junction (so it sorts next to that junction rather than by its own `row`). Use `"main"` or `"thin"` for anything that's really just a sequential chain of its own (like Little Bear River), not an attachment.

## Common edits

**Add a new live station:**
1. Add a node with `type: "station"` and a `name` that matches (even loosely) the station's real display name.
2. Add an edge connecting it to whichever junction or station it flows into. Use `style: "branch"` if it's attaching to a junction on the main channel, `style: "main"` if it's just the next stop in a straight chain.

**Add a new diversion or canal:** same as above, but set `"direction": "out"` on the edge.

**Link to another schematic page:** add a node with `type: "extension"`, `targetSchematic` set to the target page's slug, and connect it with an edge like any other node. Consider adding the reciprocal link on the target page too, so users can navigate back.

**Remove a station:** delete its node and any edges that reference it. If it was a `branch`/`thin` link in the middle of a chain, reconnect the edges around it (e.g. if A→B→C and you remove B, add an edge A→C) so the chain stays connected.

## Worked example

```json
{
  "id": "blacksmith-fork",
  "title": "Blacksmith Fork River",
  "subtitle": "The full Blacksmith Fork River system",
  "nodes": [
    { "id": "hollow_rd", "name": "Blacksmith Fork River: Hollow Road", "row": 1, "col": 2, "type": "station", "colorGroup": "Blacksmith Fork River" },
    { "id": "seventeen_s", "name": "Blacksmith Fork River: 1700 South Footbridge", "row": 2, "col": 2, "type": "station", "colorGroup": "Blacksmith Fork River" },
    { "id": "to_lower_logan", "name": "Lower Logan River", "row": 3, "col": 2, "type": "extension", "targetSchematic": "lower-logan", "label": "Confluence with Logan River →" }
  ],
  "edges": [
    { "id": "main-1", "from": "hollow_rd", "to": "seventeen_s", "style": "main" },
    { "id": "main-2", "from": "seventeen_s", "to": "to_lower_logan", "style": "main" }
  ]
}
```
