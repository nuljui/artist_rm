/**
 * SheetCRM Backend API
 * Filename: web.gs
 */

// --- CONFIGURATION ---

// CHANGE THIS TO YOUR PASSWORD
const CRM_APP_PASSWORD = "change-this-password"; 

// Match key names to those in Code.gs or your actual sheet tabs
const CRM_SHEETS = {
  ARTISTS: 'sheet_artists',
  PROFILES: 'sheet_profiles',
  TOUCHPOINTS: 'sheet_touchpoints'
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
    const pass = e.parameter.password;
    
    crmCheckAuth(pass);
    
    if (op === 'fetch') return crmFetchAllData();
    
    return crmJsonResponse({ status: 'error', message: 'Unknown op' });
    
  } catch (err) {
    return crmJsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- ACTIONS ---

function crmFetchAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const artists = crmGetSheetData(ss, CRM_SHEETS.ARTISTS);
  const profiles = crmGetSheetData(ss, CRM_SHEETS.PROFILES);
  const touchpoints = crmGetSheetData(ss, CRM_SHEETS.TOUCHPOINTS);
  
  return crmJsonResponse({
    status: 'success',
    data: { artists, profiles, touchpoints }
  });
}

// --- SPECIFIC HANDLERS (Header Mapped) ---

function crmAddArtist(artist) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CRM_SHEETS.ARTISTS);
  if (!sheet) throw "Sheet not found: " + CRM_SHEETS.ARTISTS;
  
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
  const sheet = ss.getSheetByName(CRM_SHEETS.ARTISTS);
  if (!sheet) throw "Sheet not found";
  
  // Find Row
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  // Assumes ID is Col A / Index 0. 
  // BETTER: Use the header map to find the "Artist ID" column index, then search.
  const headers = crmGetHeaderMap(sheet);
  const idColIdx = headers.get("Artist ID");
  
  if (idColIdx == null) throw "Artist ID column not found";
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(artist.id)) {
      rowIndex = i + 1; 
      break;
    }
  }
  
  if (rowIndex === -1) throw "Artist ID not found: " + artist.id;

  // We have rowIndex. Now construct the update row.
  // Note: setValues expects a 2D array [[val, val...]]
  // We can just get the existing row to preserve unknown columns, or overwrite. 
  // Let's overwrite mapped columns only to be safe? 
  // No, getting the whole range is easier.
  
  const range = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn());
  const currentValues = range.getValues()[0]; // preserve existing data in unmapped cols
  
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
  return crmFetchAllData();
}

function crmAddProfile(profile) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CRM_SHEETS.PROFILES);
  if (!sheet) throw "Sheet not found: " + CRM_SHEETS.PROFILES;
  
  const headers = crmGetHeaderMap(sheet);
  const row = Array(sheet.getLastColumn()).fill("");
  
  crmSetVal(headers, row, "Profile ID", profile.id);
  crmSetVal(headers, row, "Artist ID", profile.artistId);
  crmSetVal(headers, row, "Platform", profile.platform);
  crmSetVal(headers, row, "Handle", profile.handle);
  crmSetVal(headers, row, "URL", profile.url);
  crmSetVal(headers, row, "Followers", profile.followers || ""); // Code.gs has this

  sheet.appendRow(row);
  return crmFetchAllData();
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
