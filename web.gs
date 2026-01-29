/**
 * SheetCRM Backend API
 * Filename: web.gs
 */

// --- CONFIGURATION ---

// CHANGE THIS TO YOUR PASSWORD
const CRM_APP_PASSWORD = "change-this-password"; 

const CRM_SHEETS = {
  ARTISTS_ASSIGNED: 'sheet_artists_assigned',
  PROFILES_ASSIGNED: 'sheet_profiles_assigned',
  ARTISTS_UNASSIGNED: 'sheet_artists',
  PROFILES_UNASSIGNED: 'sheet_profiles',
  TOUCHPOINTS: 'sheet_touchpoints',
  DASHBOARD: 'sheet_dashboard'
};

// --- AUTH ---

function crmCheckAuth(pass) {
  if (pass !== CRM_APP_PASSWORD) {
     throw "Unauthorized: Incorrect Password";
  }
}

// --- ENTRY POINTS ---

function doGet(e) {
  return handleCrmRequest(e);
}

function doPost(e) {
  return handleCrmRequest(e);
}

// --- MAIN CONTROLLER ---

function handleCrmRequest(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 30 seconds for other processes to finish.
  try {
      lock.waitLock(30000); 
  } catch (e) {
      return crmJsonResponse({ status: 'error', message: 'Server is busy. Please try again.' });
  }

  try {
    // 1. Handle POST (JSON body)
    if (e.postData && e.postData.contents) {
      const data = JSON.parse(e.postData.contents);
      
      crmCheckAuth(data.password);
      
      const op = data.op;
      
      // New Object-Based Handlers (Robust header mapping)
      if (op === 'addArtist') return crmAddArtist(data.data);
      if (op === 'updateArtist') return crmUpdateArtist(data.data);
      
      if (op === 'addProfile') return crmAddProfile(data.data);
      if (op === 'deleteProfile') return crmDeleteRow(CRM_SHEETS.PROFILES, data.id); // Re-use delete by ID
      
      if (op === 'addTouchpoint') return crmAddTouchpoint(data.data);

      // Generic Fallback (Legacy support if needed, or for simple deletes)
      if (op === 'deleteRow') return crmDeleteRow(data.sheet, data.id);
      
      return crmJsonResponse({ status: 'error', message: 'Unknown op: ' + op });
    }
    
    // 2. Handle GET (Params)
    const op = e.parameter.op;
    const view = e.parameter.view; // 'dashboard', 'assigned', 'unassigned'
    const pass = e.parameter.password;
    
    crmCheckAuth(pass);
    
    if (op === 'fetch') return crmFetchView(view);
    
    return crmJsonResponse({ status: 'error', message: 'Unknown op' });
    
  } catch (err) {
    return crmJsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- ACTIONS ---

function crmFetchView(viewMode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // DASHBOARD VIEW
  if (viewMode === 'dashboard') {
    const stats = crmGetDashboardStats(ss, CRM_SHEETS.DASHBOARD);
    return crmJsonResponse({
      status: 'success',
      data: { stats } // Only stats
    });
  }

  // ASSIGNED VIEW (Active Roster)
  if (viewMode === 'assigned') {
    return crmJsonResponse({
      status: 'success',
      data: {
        artists: crmGetSheetData(ss, CRM_SHEETS.ARTISTS_ASSIGNED),
        profiles: crmGetSheetData(ss, CRM_SHEETS.PROFILES_ASSIGNED),
        touchpoints: crmGetSheetData(ss, CRM_SHEETS.TOUCHPOINTS)
      }
    });
  }

  // UNASSIGNED VIEW (Inbox / Default)
  // Default fallback if no view specified
  return crmJsonResponse({
    status: 'success',
    data: {
      artists: crmGetSheetData(ss, CRM_SHEETS.ARTISTS_UNASSIGNED),
      profiles: crmGetSheetData(ss, CRM_SHEETS.PROFILES_UNASSIGNED),
      touchpoints: crmGetSheetData(ss, CRM_SHEETS.TOUCHPOINTS)
    }
  });
}

function crmGetDashboardStats(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return {};
  
  // Assumes a specific structure or we just dump the raw data?
  // The user provided a layout. Let's try to parse it generically or just return raw values
  // so the frontend can map strict positions.
  // For robustness, getting raw values is safest.
  return sheet.getDataRange().getValues();
}

// --- SPECIFIC HANDLERS (Header Mapped) ---

function crmAddArtist(artist) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CRM_SHEETS.ARTISTS_UNASSIGNED);
  if (!sheet) throw "Sheet not found: " + CRM_SHEETS.ARTISTS_UNASSIGNED;
  
  const headers = crmGetHeaderMap(sheet);
  const row = Array(sheet.getLastColumn()).fill("");
  
  // Map fields to headers
  crmSetVal(headers, row, "Artist ID", artist.id);
  crmSetVal(headers, row, "Name", artist.name);
  crmSetVal(headers, row, "Art Type", artist.artType);
  crmSetVal(headers, row, "Industry", artist.industry);
  crmSetVal(headers, row, "Persona", artist.persona);
  crmSetVal(headers, row, "Timezone", artist.timezone);
  crmSetVal(headers, row, "Influence Score", artist.influenceScore);
  crmSetVal(headers, row, "Fit Score", artist.fitScore);
  crmSetVal(headers, row, "Status", artist.status);
  crmSetVal(headers, row, "Owner", artist.owner);
  crmSetVal(headers, row, "Notes", artist.notes);
  crmSetVal(headers, row, "Last Touched", artist.lastTouched);
  crmSetVal(headers, row, "Do Not Contact", artist.doNotContact);

  sheet.appendRow(row);
  return crmFetchAllData();
}

function crmUpdateArtist(artist) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Try Assigned First
  let sheet = ss.getSheetByName(CRM_SHEETS.ARTISTS_ASSIGNED);
  let result = findRowIndex_(sheet, artist.id);
  
  // If not found, try Unassigned
  if (result.rowIndex === -1) {
    sheet = ss.getSheetByName(CRM_SHEETS.ARTISTS_UNASSIGNED);
    result = findRowIndex_(sheet, artist.id);
  }
  
  if (!sheet || result.rowIndex === -1) throw "Artist ID not found in Assigned or Unassigned sheets: " + artist.id;

  const headers = result.headers;
  const rowIndex = result.rowIndex;
  
  // We have rowIndex. Now update.
  const range = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn());
  const currentValues = range.getValues()[0];
  
  crmSetVal(headers, currentValues, "Name", artist.name);
  crmSetVal(headers, currentValues, "Art Type", artist.artType);
  crmSetVal(headers, currentValues, "Industry", artist.industry);
  crmSetVal(headers, currentValues, "Persona", artist.persona);
  crmSetVal(headers, currentValues, "Timezone", artist.timezone);
  crmSetVal(headers, currentValues, "Influence Score", artist.influenceScore);
  crmSetVal(headers, currentValues, "Fit Score", artist.fitScore);
  crmSetVal(headers, currentValues, "Status", artist.status);
  crmSetVal(headers, currentValues, "Owner", artist.owner);
  crmSetVal(headers, currentValues, "Notes", artist.notes);
  crmSetVal(headers, currentValues, "Last Touched", artist.lastTouched);
  crmSetVal(headers, currentValues, "Do Not Contact", artist.doNotContact);
  
  range.setValues([currentValues]);
  
  // Return SUCCESS, but we can't easily return the "View" data because we don't know what view the client is in.
  // The client will likely re-fetch manually. Returning simple success object.
  return crmJsonResponse({ status: 'success', message: 'Updated' });
}

function findRowIndex_(sheet, id) {
  if (!sheet) return { rowIndex: -1, headers: null };
  
  const headers = crmGetHeaderMap(sheet);
  const idColIdx = headers.get("Artist ID");
  if (idColIdx == null) return { rowIndex: -1, headers }; // Header missing?

  const data = sheet.getDataRange().getValues();
  // Start at 1 to skip header
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(id)) {
      return { rowIndex: i + 1, headers };
    }
  }
  return { rowIndex: -1, headers };
}

function crmAddProfile(profile) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Determine where the Parent Artist is
  // Check Assigned first
  let artistSheet = ss.getSheetByName(CRM_SHEETS.ARTISTS_ASSIGNED);
  let artistLoc = findRowIndex_(artistSheet, profile.artistId);
  
  let targetProfileSheetName = CRM_SHEETS.PROFILES_ASSIGNED; // Default to Assigned if found there
  
  if (artistLoc.rowIndex === -1) {
    // Check Unassigned
    artistSheet = ss.getSheetByName(CRM_SHEETS.ARTISTS_UNASSIGNED);
    artistLoc = findRowIndex_(artistSheet, profile.artistId);
    targetProfileSheetName = CRM_SHEETS.PROFILES_UNASSIGNED; // Found in Unassigned (or not found at all, default here)
  }

  const sheet = ss.getSheetByName(targetProfileSheetName);
  if (!sheet) throw "Profile Sheet not found: " + targetProfileSheetName;
  
  const headers = crmGetHeaderMap(sheet);
  const row = Array(sheet.getLastColumn()).fill("");
  
  crmSetVal(headers, row, "Profile ID", profile.id);
  crmSetVal(headers, row, "Artist ID", profile.artistId);
  crmSetVal(headers, row, "Platform", profile.platform);
  crmSetVal(headers, row, "Handle", profile.handle);
  crmSetVal(headers, row, "URL", profile.url);
  crmSetVal(headers, row, "Followers", profile.followers || "");

  sheet.appendRow(row);
  return crmJsonResponse({ status: 'success', message: 'Profile Added' });
}

function crmAddTouchpoint(touch) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CRM_SHEETS.TOUCHPOINTS);
  if (!sheet) throw "Sheet not found: " + CRM_SHEETS.TOUCHPOINTS;
  
  const headers = crmGetHeaderMap(sheet);
  const row = Array(sheet.getLastColumn()).fill("");
  
  crmSetVal(headers, row, "Touch ID", touch.touchId);
  crmSetVal(headers, row, "Artist ID", touch.artistId);
  crmSetVal(headers, row, "Platform", touch.platform);
  crmSetVal(headers, row, "Type", touch.type);
  crmSetVal(headers, row, "Message Text", touch.messageText);
  crmSetVal(headers, row, "Sent At", touch.sentAt);
  crmSetVal(headers, row, "Outcome", touch.outcome);
  crmSetVal(headers, row, "Link ID", touch.linkId);

  sheet.appendRow(row);
  return crmFetchAllData();
}

function crmDeleteRow(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  // Try to find an "ID" column? Or just assume col 0 for generic delete?
  // Let's assume generic delete looks at Col 0 (legacy behavior) OR searches specifically if possible.
  // For safety, let's look for "Profile ID", "Artist ID", "Touch ID" based on sheet name?
  // Or just Col 0. Most sheets have ID in Col 0.
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      rowIndex = i + 1; 
      break;
    }
  }
  
  if (rowIndex === -1) {
    return crmJsonResponse({ status: 'error', message: 'ID not found' });
  }
  
  sheet.deleteRow(rowIndex);
  
  return crmFetchAllData();
}

// --- HELPERS ---

function crmGetSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length > 1) rows.shift(); // Remove header
  return rows;
}

function crmGetHeaderMap(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = new Map();
  for (let i = 0; i < headerRow.length; i++) {
    const h = String(headerRow[i] || "").trim();
    if (h) map.set(h, i);
  }
  return map;
}

function crmSetVal(headerMap, rowArray, headerName, value) {
  const idx = headerMap.get(headerName);
  if (idx != null) {
    rowArray[idx] = value;
  }
}

function crmJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
