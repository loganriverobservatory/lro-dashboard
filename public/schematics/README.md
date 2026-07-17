# Schematic page config files

This folder holds one JSON file per schematic diagram page shown in the dashboard's "Schematic View", plus `manifest.json`, which lists which of those pages exist and in what order:

- `manifest.json` — ordered list of page slugs. Add/remove/reorder a whole system here; no code change needed.
- `upper-logan.json` — Upper Logan Canyon (Franklin Basin down to the UWRL Water Lab)
- `lower-logan.json` — Lower Logan River (Dewitt Springs down to Cutler Terminus, plus Cutler Inflows)
- `blacksmith-fork.json` — Blacksmith Fork River (the full BSF system)
- `little-bear.json` — Little Bear River (Porcupine Reservoir Outlet down to Cutler Terminus)

These are plain static files served directly by the web app — edit one, commit it, and the next time someone loads that schematic page they'll see your change. There's no build step, no publishing pipeline, and no live-data fetch involved (that's different from `config/station_config.yaml`, which drives station identity/colors and *is* published through a GitHub Action — this folder is unrelated to that pipeline).

## Adding a whole new system

1. Create `<slug>.json` in this folder (copy an existing file as a starting point).
2. Add `"<slug>"` to the `slugs` array in `manifest.json`, wherever you want it to appear in the sidebar/tab order.

That's it — the sidebar submenu, the mobile tab bar, and the `/schematic/<slug>` route all pick it up automatically, reading each page's own `navLabel` for its display name.

Each file also carries its own `_instructions` field at the top with a shorter, in-context version of everything below — this README is the full reference.

## Basic shape

```json
{
  "id": "upper-logan",
  "title": "Upper Logan Canyon",
  "navLabel": "Upper Logan Canyon",
  "subtitle": "Franklin Basin down to the UWRL Water Lab",
  "nodes": [ /* ... */ ]
}
```

`id` must match the filename (minus `.json`) and appear in `manifest.json`'s `slugs` list — this is how the app knows which file to load for a given page URL.

`navLabel` is the short name shown in the sidebar submenu and the mobile tab bar. `title`/`subtitle` are only shown in the page header, so `navLabel` can be shorter/plainer than `title` if you want (e.g. `title: "Lower Logan River: Valley"` but `navLabel: "Lower Logan River"`).

There is no separate `edges` list. A node's on-screen position and every connector line are derived automatically from `kind` + `connectsTo` + the order nodes appear in the `nodes` array — see below.

## Nodes

Each node is one card on the diagram (except `junction`, which draws as a small dot). List them in the order the water actually flows — that order *is* the layout.

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique within this file. `connectsTo` and `linkTo` reference nodes by this id, so don't change an existing one casually. |
| `name` | yes | For `kind: "mainstem"`, `"tributary"`, or `"diversion"`, this is matched (fuzzily — partial matches count both directions) against a live station's display name from HydroServer, DWRi, or USGS. For `junction`/`link` nodes it's just label text. |
| `cardLabel` | no | Overrides the on-card name shown once matched to a live station. Normally the card shows the live station's own `displayName`, auto-shortened by `shortenForSchematic()` (handles two shapes: `"Logan River: X"` → `"X"`, and `"X: Before Confluence with Y"` → `"Y"`). A live name that doesn't fit either shape — e.g. `"USGS: Cache Highline Canal Near Logan, UT"` — gets shortened wrong (shows `"USGS"`). Set `cardLabel` instead of fighting that heuristic. |
| `kind` | yes | One of `mainstem`, `junction`, `tributary`, `diversion`, `link` — see below. |
| `connectsTo` | `tributary`/`diversion`/`link` only | The id of the mainstem/junction node this attaches to — or the id of *another* tributary/diversion/link to chain onto (e.g. a canal with several stations along it before it does anything else). A `link` node only needs this if it's a side attachment (like Blacksmith Fork River's card on the Lower Logan page); omit it if the link is just the next stop on the main channel (like `ext_to_lower`). |
| `side` | `tributary`/`diversion`/`link` only, when `connectsTo` is set | `"left"` or `"right"` — which side of the main channel to draw the card on. Set this to match which bank of the river the station is really on, not to dodge crowding — if a side gets crowded (e.g. a long canal chain), the diagram grows taller to fit it rather than moving anything to the other side (see `computeLayout()` in `SchematicView.vue`). |
| `colorGroup` | no | Tints the card's background. Must match a `name` from `waterway_groups` or `schematic_groups` in `config/station_config.yaml`. |
| `linkTo` | no | A schematic page slug (any slug listed in `manifest.json`) to navigate to on click. On a normal node this adds a "view full system" button below its card; on a `link` node this *is* the card. |
| `label` | `linkTo` nodes only | Button text. Defaults to `name` if omitted. |
| `terminus` | `mainstem` only | Marks this node as the system's final endpoint (labeled endpoint banner instead of a normal gauge card). Only one per page, if any. |
| `description` | `terminus` node only | Subtitle text. |
| `returnsTo` | `tributary`/`diversion` only | If this is the last node in a chain and the water actually rejoins the main channel here (e.g. a canal that loops out and back in downstream), the id of the junction it rejoins at. Draws a second connector back into the trunk. |

### Node kinds

- **`mainstem`** — a real gauge station on the main channel. This is what most nodes should be.
- **`junction`** — an invisible confluence point on the main channel where a tributary or diversion attaches. No card is drawn; it's just an attachment point.
- **`tributary`** — a side station where water flows **in** (a creek, spring, or other natural inflow).
- **`diversion`** — a side station where water flows **out** (a canal, ditch, or other diversion).
- **`link`** — a card with no live data of its own that only navigates to a different schematic page. Used both for pure page-boundary cards inline on the main channel (`ext_to_lower`, `ext_to_upper`) and for cross-page links off to the side (Blacksmith Fork River's card on the Lower Logan page). Kept as its own kind — not just a `linkTo` on a real station — because its label (e.g. "Blacksmith Fork River") is generic enough that it would otherwise fuzzy-match every real station in that system and corrupt both live-data lookup and the app's station-list ordering.

## How position and connectors are derived

- **Trunk row** — a node's position among the `mainstem`/`junction` nodes (plus any inline `link` node with no `connectsTo`), in the order they appear in the file. The main channel line connects them in that order.
- **Branch placement** — a `tributary`/`diversion`/`link`-with-`connectsTo` node attaches at (or just past) the row of the node it `connectsTo`, on whichever `side` it specifies. A chain (several nodes `connectsTo`-ing one after another) stacks downward from its attachment point.
- **Flow direction** — `tributary` always draws as flowing in; `diversion` always draws as flowing out. This follows automatically from `kind`, so there's no separate direction field to set.

## Common edits

**Add a new live station:**
1. Add a node with `kind: "mainstem"` (on the main channel) or `kind: "tributary"`/`"diversion"` (a side attachment), with a `name` that matches (even loosely) the station's real display name.
2. If it's a side attachment, set `connectsTo` to the junction (or mainstem node) it flows into, and `side` to `"left"` or `"right"`.

**Add a new diversion or canal:** same as above, with `kind: "diversion"`.

**Link to another schematic page:** add a node with `kind: "link"`, `linkTo` set to the target page's slug, and (if it's a side attachment rather than the next stop on the main channel) `connectsTo` + `side`. Consider adding the reciprocal link on the target page too, so users can navigate back.

**Remove a station:** delete its node. If another node's `connectsTo` pointed at it (mid-chain), repoint that node's `connectsTo` to whatever the removed node was itself attached to, so the chain stays connected.

## Worked example

```json
{
  "id": "blacksmith-fork",
  "title": "Blacksmith Fork River",
  "subtitle": "The full Blacksmith Fork River system",
  "nodes": [
    { "id": "hollow_rd", "name": "Blacksmith Fork River: Hollow Road", "kind": "mainstem", "colorGroup": "Blacksmith Fork River" },
    { "id": "seventeen_s", "name": "Blacksmith Fork River: 1700 South Footbridge", "kind": "mainstem", "colorGroup": "Blacksmith Fork River" },
    { "id": "to_lower_logan", "name": "Lower Logan River", "kind": "link", "linkTo": "lower-logan", "label": "Confluence with Logan River →" }
  ]
}
```
