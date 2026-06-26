// ============================================================
// LRO Dashboard — Google Sheets → GitHub Config Sync
// ============================================================
//
// SETUP INSTRUCTIONS
// ------------------
// 1. Your Google Sheet needs these tabs:
//      Settings
//      Station Names
//      Schematic
//
//    The Schematic tab uses a single-row section layout:
//      Row 1: Section titles  →  MAIN STEM | (blank) | TRIBUTARIES | (blank) | BLACKSMITH FORK | (blank) | CUTLER INFLOWS
//      Row 2: Column headers  →  id | name | row | type | ...etc for each section
//      Row 3+: Data
//
// 2. Open Extensions → Apps Script in the spreadsheet.
//    Paste this entire file and save (Ctrl+S).
//
// 3. In Apps Script: Project Settings → Script Properties → Add:
//      GITHUB_TOKEN   →  GitHub Personal Access Token (repo write scope)
//      GITHUB_OWNER   →  your GitHub username  (e.g. brooke946)
//      GITHUB_REPO    →  repository name       (e.g. lro_dashboard)
//
// 4. Reload the spreadsheet — an "LRO Dashboard" menu appears.
//    Click  LRO Dashboard → Publish config.json to GitHub
//
// ============================================================
// SCHEMATIC GUIDE — HOW THE DIAGRAM WORKS
// ============================================================
//
//  The schematic is a 3-column grid. Flow direction is always
//  TOP → BOTTOM (upstream at top, downstream at bottom).
//
//  COLUMN LAYOUT
//  ┌──────────────────────────────────────────────────────────┐
//  │  LEFT COLUMN   │   CENTER COLUMN    │   RIGHT COLUMN    │
//  │  (col = left)  │   (Main Stem)      │  (col = right /  │
//  │                │   Logan River       │   Blacksmith /   │
//  │                │   ↓ flows down ↓   │   Cutler)        │
//  └──────────────────────────────────────────────────────────┘
//
//  MAIN STEM (center column)
//  • type = "source"        → headwaters node (top of diagram)
//  • type = "gauge"         → a monitoring station with live data
//  • type = "line-junction" → invisible connection point where a
//                             tributary arrow meets the main stem.
//                             Must exist for every tributary.
//  • row  → vertical position. Row 1 = most upstream (top).
//            Higher numbers = further downstream.
//  • Arrow direction on main stem: downward ↓
//
//  TRIBUTARIES (left or right column)
//  • juncId → must exactly match an "id" in Main Stem that has
//              type = "line-junction". This is where the arrow
//              connects to the main stem.
//  • col = "left"  → card on LEFT,  arrow points RIGHT → into stem
//  • col = "right" → card on RIGHT, arrow points LEFT  ← into stem
//  • row  → should roughly match the junction's row number
//
//  BLACKSMITH FORK (right column)
//  • Listed upstream → downstream (low row → high row)
//  • Bottom station connects into main stem at "bsf_confluence"
//  • Arrow direction: downward then curving LEFT into main stem
//
//  CUTLER INFLOWS (right column, independent)
//  • Flow directly into Cutler Reservoir, NOT via the Logan River
//  • Arrow direction: downward ↓ into terminus
//  • "tributary" column sets the card's waterway color
//
//  ADDING A NEW INFLOW TO THE MAIN STEM
//  1. Add a "line-junction" row to Main Stem at the correct row.
//  2. Renumber rows below it (+1 each).
//  3. Add the tributary to Tributaries with:
//       juncId = the new junction's id
//       col    = "left"  (comes from left bank)
//                "right" (comes from right bank)
//  4. Click Publish.
//
// ============================================================

function publishConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  try {
    const config = {
      apiToken:             getSettingValue(ss, 'apiToken'),
      stationsNotDisplayed: getStationsNotDisplayed(ss),
      stationNames:         getStationNames(ss),
      schematic:            getSchematic(ss),
    }
    pushToGitHub(JSON.stringify(config, null, 2))
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Error building config:\n' + e.message)
  }
}

// ── Settings tab ──────────────────────────────────────────────

function getSettingValue(ss, key) {
  const data = ss.getSheetByName('Settings').getDataRange().getValues()
  for (const row of data) {
    if (String(row[0]).trim() === key) return String(row[1]).trim()
  }
  return ''
}

// ── Station Names tab ─────────────────────────────────────────

function getStationsNotDisplayed(ss) {
  const data       = ss.getSheetByName('Station Names').getDataRange().getValues()
  const headers    = data[0]
  const codeIdx    = headers.indexOf('stationCode')
  const displayIdx = headers.indexOf('isDisplayed')
  return data.slice(1)
    .filter(r => r[codeIdx] && r[displayIdx] === false)
    .map(r => String(r[codeIdx]).trim())
}

function getStationNames(ss) {
  const data    = ss.getSheetByName('Station Names').getDataRange().getValues()
  const headers = data[0]
  const codeIdx = headers.indexOf('stationCode')
  const nameIdx = headers.indexOf('displayName')
  const map = {}
  data.slice(1).forEach(r => {
    const code = String(r[codeIdx] || '').trim()
    const name = String(r[nameIdx] || '').trim()
    if (code && name) map[code] = name
  })
  return map
}

// ── Schematic tab (single tab, multi-section) ─────────────────

function getSchematic(ss) {
  const sheet = ss.getSheetByName('Schematic')
  if (!sheet) throw new Error('Tab "Schematic" not found.')
  const data = sheet.getDataRange().getValues()

  // Row 0 = section titles, Row 1 = column headers, Row 2+ = data
  const sectionRow = data[0]
  const headerRow  = data[1]

  const sections = findSections(sectionRow, headerRow)

  return {
    mainStem:        readSection(data, sections['MAIN STEM'],       ['id','name','row','type'],             r => ({...r, row: Number(r.row)})),
    leftTributaries: readSection(data, sections['TRIBUTARIES'],     ['id','name','row','juncId','col'],      r => ({...r, row: Number(r.row)})),
    blacksmithFork:  readSection(data, sections['BLACKSMITH FORK'], ['id','name','row'],                    r => ({...r, row: Number(r.row)})),
    cutlerInflows:   readSection(data, sections['CUTLER INFLOWS'],  ['id','name','row','tributary'],        r => ({...r, row: Number(r.row)})),
  }
}

function findSections(sectionRow, headerRow) {
  const sections = {}
  let currentTitle = null
  let startCol = 0

  for (let col = 0; col < sectionRow.length; col++) {
    const cell = String(sectionRow[col]).trim().toUpperCase()
    if (cell && cell !== currentTitle) {
      if (currentTitle) {
        sections[currentTitle].endCol = col
      }
      currentTitle = cell
      startCol = col
      sections[currentTitle] = { startCol, endCol: sectionRow.length }
    }
  }

  // Build column-name → col-index maps for each section
  for (const title in sections) {
    const s = sections[title]
    s.colMap = {}
    for (let c = s.startCol; c < s.endCol; c++) {
      const h = String(headerRow[c]).trim()
      if (h) s.colMap[h] = c
    }
  }

  return sections
}

function readSection(data, section, keys, transform) {
  if (!section) return []
  const results = []
  for (let i = 2; i < data.length; i++) {   // data starts at row index 2
    const row = data[i]
    const firstKey = keys[0]
    const firstVal = String(row[section.colMap[firstKey]] ?? '').trim()
    if (!firstVal) continue                  // skip blank rows
    const obj = {}
    keys.forEach(k => {
      const col = section.colMap[k]
      obj[k] = col !== undefined ? String(row[col] ?? '').trim() : ''
    })
    results.push(transform ? transform(obj) : obj)
  }
  return results
}

// ── GitHub push ───────────────────────────────────────────────

function pushToGitHub(jsonContent) {
  const props = PropertiesService.getScriptProperties()
  const token = props.getProperty('GITHUB_TOKEN')
  const owner = props.getProperty('GITHUB_OWNER')
  const repo  = props.getProperty('GITHUB_REPO')

  if (!token || !owner || !repo) {
    SpreadsheetApp.getUi().alert('❌ Missing Script Properties.\nPlease add GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO\nin Apps Script → Project Settings → Script Properties.')
    return
  }

  const apiUrl  = `https://api.github.com/repos/${owner}/${repo}/contents/public/config.json`
  const authHdr = { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }

  // Get current file SHA (required by GitHub to update an existing file)
  const getResp = UrlFetchApp.fetch(apiUrl, { headers: authHdr, muteHttpExceptions: true })
  let sha = ''
  if (getResp.getResponseCode() === 200) {
    sha = JSON.parse(getResp.getContentText()).sha
  }

  const payload = {
    message: 'Update config.json from Google Sheets',
    content: Utilities.base64Encode(jsonContent),
  }
  if (sha) payload.sha = sha

  const putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: { ...authHdr, 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  })

  const code = putResp.getResponseCode()
  if (code === 200 || code === 201) {
    SpreadsheetApp.getUi().alert('✅ config.json published to GitHub!\nNetlify will redeploy automatically if auto-deploy is enabled.')
  } else {
    SpreadsheetApp.getUi().alert('❌ GitHub error (' + code + '):\n' + putResp.getContentText())
  }
}

// ── Menu ──────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('LRO Dashboard')
    .addItem('📤  Publish config.json to GitHub', 'publishConfig')
    .addToUi()
}
