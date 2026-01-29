/** @OnlyCurrentDoc */

/**
 * ✅ CONFIG — rename these to match your tab names exactly
 */
const SHEETS = {
  PROFILES: "sheet_profiles",
  ARTISTS: "sheet_artists",
  CONFIG: "Config", // optional
};

const DEFAULT_STATUS = "DISCOVERED";
const DEFAULT_OWNER = "unassigned";

// Short IDs: A-xxxxxxxxxx / P-xxxxxxxxxx
const SHORT_ID_HEX_LEN = 10;

// Common ArtStation non-profile path prefixes (avoid mis-parsing these as handles)
const ARTSTATION_RESERVED_PATH_SEGMENTS = new Set([
  "artwork", "marketplace", "prints", "jobs", "learning", "challenge", "magazine",
  "discover", "search", "blog", "community", "contests", "store", "settings",
  "signin", "sign-in", "login", "register", "about", "help", "support",
  "terms", "privacy", "api"
]);

// Some obvious non-profile roots for Behance / DeviantArt (light guardrails)
const BEHANCE_RESERVED_PATH_SEGMENTS = new Set([
  "search", "galleries", "jobs", "hire", "pro", "blog", "assets", "about", "help", "privacy", "terms"
]);

const DEVIANTART_RESERVED_PATH_SEGMENTS = new Set([
  "tag", "search", "daily-deviation", "core-membership", "shop", "about", "help", "privacy", "terms",
  "join", "login", "logout", "notifications", "settings"
]);

/**
 * Adds a menu: Leads → Ingest Profile URLs (selected cells)
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Leads")
    .addItem("Ingest Profile URLs (selected cells)", "ingestSelectedProfileUrls")
    .addSeparator()
    .addItem("Reset owner rotation", "resetOwnerRotation")
    .addSeparator()
    .addItem("Debug selected cell", "debugSelectedCell")
    .addToUi();
}

/**
 * Select a range where:
 *   Col A = URL (required)
 *   Col B = Name override (optional)
 *   Col C = Followers (optional)
 */
/**
 * Select a range where:
 *   Col A = Platform (e.g. "Behance", "ArtStation", "Cara")
 *   Col B = Username/Handle
 *   Col C = Name override (optional)
 *   Col D = Followers (optional)
 */
function ingestSelectedProfileUrls() {
  const ss = SpreadsheetApp.getActive();
  const range = ss.getActiveRange();
  if (!range) throw new Error("Select cells with format: Platform | Username | Name | Followers");

  const displayValues = range.getDisplayValues();
  const ctx = createIngestContext_(ss);

  let added = 0, skipped = 0, errors = 0;
  const errorMessages = [];

  for (let r = 0; r < displayValues.length; r++) {
    const platformRaw = String(displayValues[r][0] || "").trim();
    const handleRaw = String(displayValues[r][1] || "").trim();
    const nameOverride = displayValues[r].length > 2 ? String(displayValues[r][2] || "").trim() : "";
    const followersRaw = displayValues[r].length > 3 ? String(displayValues[r][3] || "").trim() : "";

    if (!platformRaw || !handleRaw) continue;

    try {
      // Normalize Platform
      const platform = normalizePlatformName_(platformRaw);
      
      // Clean Handle (remove @, url parts if pasted by mistake)
      const handle = cleanHandleForPlatform_(platform, handleRaw);
      
      // Construct Canonical URL
      const canonicalUrl = constructCanonicalUrl_(platform, handle);

      const res = ingestProfileData_(ctx, {
        platform,
        handle,
        canonicalUrl,
        name: nameOverride,
        followers: followersRaw
      });

      if (res.action === "added") added++;
      else skipped++;
    } catch (e) {
      errors++;
      errorMessages.push(`Row ${r + 1}: ${e.message || e}`);
    }
  }

  ss.toast(`Ingest — added: ${added}, skipped: ${skipped}, errors: ${errors}`, "Leads", 6);

  if (errorMessages.length) {
    console.log(errorMessages.slice(0, 50).join("\n"));
  }
}

/**
 * Helper to standardise platform names from inputs like "behance", "Behance", "artstation"
 */
function normalizePlatformName_(input) {
  const lower = input.toLowerCase();
  
  if (lower.includes("artstation")) return "ArtStation";
  if (lower.includes("behance")) return "Behance";
  if (lower.includes("pixiv")) return "Pixiv";
  if (lower.includes("deviantart")) return "DeviantArt";
  if (lower.includes("cara")) return "Cara";
  if (lower.includes("500px")) return "500px";
  if (lower.includes("instagram")) return "Instagram";
  if (lower.includes("twitter") || lower.includes("x.com")) return "Twitter";
  if (lower.includes("linkedin")) return "LinkedIn";
  
  // Fallback: Capitalize first letter
  return input.charAt(0).toUpperCase() + input.slice(1);
}

/**
 * Remove @, trailing slashes, or extract from URL if user accidentally pasted URL in handle col
 */
function cleanHandleForPlatform_(platform, input) {
  let s = String(input).trim();
  
  // If it looks like a URL, try to extract lead text
  if (s.includes('/') || s.includes('.')) {
    const parts = s.split('/');
    s = parts[parts.length - 1] || parts[parts.length - 2]; 
  }
  
  return s.replace(/^@/, '').replace(/[?#].*$/, '');
}

/**
 * Construct valid URL from platform + handle
 */
function constructCanonicalUrl_(platform, handle) {
  const p = platform.toLowerCase();
  
  if (p === "artstation") return `https://www.artstation.com/${handle}`;
  if (p === "behance") return `https://www.behance.net/${handle}`;
  if (p === "pixiv") return `https://www.pixiv.net/en/users/${handle}`;
  if (p === "deviantart") return `https://www.deviantart.com/${handle}`;
  if (p === "cara") return `https://cara.app/${handle}`;
  if (p === "500px") return `https://500px.com/p/${handle}`;
  if (p === "instagram") return `https://instagram.com/${handle}`;
  if (p === "twitter") return `https://twitter.com/${handle}`;
  if (p === "linkedin") return `https://linkedin.com/in/${handle}`;
  
  return ""; 
}

/**
 * Core ingestion for one Profile (append-only; dedupe by Platform+Handle).
 */
function ingestProfileData_(ctx, { platform, handle, canonicalUrl, name: nameInput, followers: followersInput }) {
  const key = `${platform}|${handle}`;

  // Append-only behavior: if it already exists, do nothing
  if (ctx.profileKeyToRow.has(key)) {
    return { action: "exists", platform, handle, canonicalUrl };
  }

  // Short IDs (still plenty unique for your sheet)
  const artistId = shortId_("A-", SHORT_ID_HEX_LEN);
  const profileId = shortId_("P-", SHORT_ID_HEX_LEN);

  // Owner (None for new ingest - unassigned)
  const owner = "";

  // Name: prefer human override, else derive from platform+handle
  const derivedName = deriveNameFromPlatformHandle_(platform, handle);
  const name = nameInput ? String(nameInput).trim() : derivedName;

  // Followers: user-provided (kept as-is)
  const followers = followersInput ? String(followersInput).trim() : "";

  // Append Artist row
  appendArtistRow_(ctx, {
    artistId,
    name,
    status: DEFAULT_STATUS,
    owner,
    lastTouched: new Date(),
  });

  // Append Profile row
  appendProfileRow_(ctx, {
    profileId,
    artistId,
    platform,
    followers,
    handle,
    url: canonicalUrl,
  });

  // Update in-memory map so duplicates in the same run are skipped
  ctx.profileKeyToRow.set(key, true);

  return { action: "added", artistId, profileId, platform, handle, canonicalUrl, owner };
}

/**
 * --- Context / setup ---
 */
function createIngestContext_(ss) {
  const profilesSheet = mustGetSheet_(ss, SHEETS.PROFILES);
  const artistsSheet = mustGetSheet_(ss, SHEETS.ARTISTS);

  const profilesHeaders = getHeaderMap_(profilesSheet);
  const artistsHeaders = getHeaderMap_(artistsSheet);

  // Build dedupe map from existing Profiles
  const profileKeyToRow = new Map();
  const lastRow = profilesSheet.getLastRow();
  if (lastRow >= 2) {
    const data = profilesSheet.getRange(2, 1, lastRow - 1, profilesSheet.getLastColumn()).getValues();
    const iPlatform = profilesHeaders.get("Platform");
    const iHandle = profilesHeaders.get("Handle");

    if (iPlatform == null || iHandle == null) {
      throw new Error(`Profiles sheet must have headers: Platform, Handle (and your listed columns).`);
    }

    for (const row of data) {
      const p = String(row[iPlatform] || "").trim();
      const h = String(row[iHandle] || "").trim().toLowerCase();
      if (!p || !h) continue;
      profileKeyToRow.set(`${p}|${h}`, true);
    }
  }

  // Owners list is optional
  const owners = readOwners_(ss);

  return {
    ss,
    profilesSheet,
    artistsSheet,
    profilesHeaders,
    artistsHeaders,
    profileKeyToRow,
    owners,
  };
}

function mustGetSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error(`Missing sheet tab named "${name}". Update SHEETS config or rename the tab.`);
  return sh;
}

function getHeaderMap_(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = new Map();
  for (let i = 0; i < headerRow.length; i++) {
    const h = String(headerRow[i] || "").trim();
    if (h) map.set(h, i);
  }
  return map;
}

/**
 * --- Append row helpers (header-driven) ---
 */
function appendProfileRow_(ctx, { profileId, artistId, platform, followers, handle, url }) {
  const cols = ctx.profilesSheet.getLastColumn();
  const row = Array(cols).fill("");

  setByHeader_(ctx.profilesHeaders, row, "Profile ID", profileId);
  setByHeader_(ctx.profilesHeaders, row, "Artist ID", artistId);
  setByHeader_(ctx.profilesHeaders, row, "Platform", platform);
  setByHeader_(ctx.profilesHeaders, row, "Followers", followers ?? "");
  setByHeader_(ctx.profilesHeaders, row, "Handle", handle);
  setByHeader_(ctx.profilesHeaders, row, "URL", url);

  ctx.profilesSheet.appendRow(row);
}

function appendArtistRow_(ctx, { artistId, name, status, owner, lastTouched }) {
  const cols = ctx.artistsSheet.getLastColumn();
  const row = Array(cols).fill("");

  setByHeader_(ctx.artistsHeaders, row, "Artist ID", artistId);
  setByHeader_(ctx.artistsHeaders, row, "Name", name);
  setByHeader_(ctx.artistsHeaders, row, "Status", status);
  setByHeader_(ctx.artistsHeaders, row, "Owner", owner);
  setByHeader_(ctx.artistsHeaders, row, "Last Touched", lastTouched);

  ctx.artistsSheet.appendRow(row);
}

function setByHeader_(headerMap, row, headerName, value) {
  const idx = headerMap.get(headerName);
  if (idx == null) return; // allow extra columns / optional fields
  row[idx] = value;
}

/**
 * --- Owners (round robin) ---
 */
function readOwners_(ss) {
  const sh = ss.getSheetByName(SHEETS.CONFIG);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  return sh.getRange(2, 1, lastRow - 1, 1).getValues()
    .map(r => String(r[0] || "").trim())
    .filter(Boolean);
}

function getNextOwner_(ctx) {
  const owners = ctx.owners;
  if (!owners || owners.length === 0) return DEFAULT_OWNER;

  const props = PropertiesService.getDocumentProperties();
  const key = "OWNER_RR_INDEX";
  const idx = Number(props.getProperty(key) || "0");
  const owner = owners[idx % owners.length];
  props.setProperty(key, String((idx + 1) % owners.length));
  return owner || DEFAULT_OWNER;
}

function resetOwnerRotation() {
  PropertiesService.getDocumentProperties().deleteProperty("OWNER_RR_INDEX");
  SpreadsheetApp.getActive().toast("Owner rotation reset.", "Leads", 4);
}

/**
 * --- Normalization ---
 */
function normalizeUrlString_(raw) {
  if (raw == null) return "";
  return String(raw)
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .replace(/\u00A0/g, " ")              // nbsp
    .replace(/[\r\n\t]/g, " ")
    .trim();
}

/**
 * --- Short IDs ---
 */
function shortId_(prefix, hexLen) {
  const raw = Utilities.getUuid().replace(/-/g, "").toLowerCase(); // 32 hex chars
  return `${prefix}${raw.slice(0, hexLen)}`;
}

/**
 * --- Name derivation ---
 */
function deriveNameFromPlatformHandle_(platform, handle) {
  if (platform === "Pixiv") {
    return `User ${handle}`; // Pixiv URL uses numeric user IDs
  }
  return deriveNameFromHandle_(handle);
}

/**
 * niko -> Niko
 * paula_mendes5 -> Paula Mendes5
 * concept-art -> Concept Art
 * john.doe -> John Doe
 */
function deriveNameFromHandle_(handle) {
  const parts = String(handle || "")
    .split(/[_\-.]+/g)
    .filter(Boolean)
    .slice(0, 8);

  const titled = parts.map(p => p.length ? (p[0].toUpperCase() + p.slice(1)) : p);
  return titled.join(" ").trim();
}

/**
 * --- Platform + handle parsing ---
 */
function parsePlatformHandleAndCanonicalUrl_(rawUrl) {
  const s = normalizeUrlString_(rawUrl);
  if (!s) return null;

  const str = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  const lower = str.toLowerCase();

  if (lower.includes("artstation.com")) {
    const handle = parseArtStationHandle_(str);
    if (!handle) return null;
    return {
      platform: "ArtStation",
      handle,
      canonicalUrl: `https://www.artstation.com/${handle}`
    };
  }

  if (lower.includes("behance.net")) {
    const handle = parseBehanceHandle_(str);
    if (!handle) return null;
    return {
      platform: "Behance",
      handle,
      canonicalUrl: `https://www.behance.net/${handle}`
    };
  }

  if (lower.includes("pixiv.net")) {
    const handle = parsePixivUserId_(str);
    if (!handle) return null;
    return {
      platform: "Pixiv",
      handle,
      canonicalUrl: `https://www.pixiv.net/en/users/${handle}`
    };
  }

  if (lower.includes("deviantart.com")) {
    const handle = parseDeviantArtHandle_(str);
    if (!handle) return null;
    return {
      platform: "DeviantArt",
      handle,
      canonicalUrl: `https://www.deviantart.com/${handle}`
    };
  }

  if (lower.includes("cara.app")) {
    const handle = parseCaraHandle_(str);
    if (!handle) return null;
    return {
      platform: "Cara",
      handle,
      canonicalUrl: `https://cara.app/${handle}`
    };
  }

  if (lower.includes("500px.com")) {
    const handle = parse500pxHandle_(str);
    if (!handle) return null;
    return {
      platform: "500px",
      handle,
      canonicalUrl: `https://500px.com/p/${handle}`
    };
  }

  if (lower.includes("linkedin.com")) {
    const handle = parseLinkedInHandle_(str);
    if (!handle) return null;
    return {
      platform: "LinkedIn",
      handle,
      canonicalUrl: `https://linkedin.com/in/${handle}`
    };
  }

  return null;
}

/**
 * --- ArtStation parsing ---
 */
function parseArtStationHandle_(url) {
  const str = url;

  // 1) Path-based: https://www.artstation.com/artist/<handle>
  let m = str.match(/^https?:\/\/(?:www\.)?artstation\.com\/(?:artist|artists|user|users)\/([a-z0-9][a-z0-9_-]*)(?:\/|$)/i);
  if (m && m[1]) return canonicalizeHandleGeneric_(m[1], { allowDot: false, reserved: ARTSTATION_RESERVED_PATH_SEGMENTS });

  // 2) Path-based: https://www.artstation.com/<handle>
  m = str.match(/^https?:\/\/(?:www\.)?artstation\.com\/([a-z0-9][a-z0-9_-]*)(?:\/|$)/i);
  if (m && m[1]) return canonicalizeHandleGeneric_(m[1], { allowDot: false, reserved: ARTSTATION_RESERVED_PATH_SEGMENTS });

  // 3) Subdomain: https://<handle>.artstation.com
  m = str.match(/^https?:\/\/([a-z0-9][a-z0-9_-]*)\.artstation\.com(\/|$)/i);
  if (m && m[1]) {
    const sub = String(m[1]).toLowerCase();
    if (sub === "www" || sub === "artstation") return null;
    return canonicalizeHandleGeneric_(sub, { allowDot: false, reserved: ARTSTATION_RESERVED_PATH_SEGMENTS });
  }

  return null;
}

/**
 * --- Behance parsing ---
 * Example: https://www.behance.net/paulamendes5
 */
function parseBehanceHandle_(url) {
  const str = url;
  const m = str.match(/^https?:\/\/(?:www\.)?behance\.net\/([^\/\?#]+)(?:\/|$)/i);
  if (!m || !m[1]) return null;
  return canonicalizeHandleGeneric_(m[1], { allowDot: true, reserved: BEHANCE_RESERVED_PATH_SEGMENTS });
}

/**
 * --- Pixiv parsing ---
 * Examples:
 *   https://www.pixiv.net/en/users/429077
 *   https://www.pixiv.net/users/429077
 */
function parsePixivUserId_(url) {
  const str = url;
  let m = str.match(/^https?:\/\/(?:www\.)?pixiv\.net\/(?:en\/)?users\/(\d+)(?:\/|$)/i);
  if (m && m[1]) return String(m[1]).trim();

  // Legacy format: https://www.pixiv.net/member.php?id=123
  m = str.match(/^https?:\/\/(?:www\.)?pixiv\.net\/member\.php\?id=(\d+)/i);
  if (m && m[1]) return String(m[1]).trim();

  return null;
}

/**
 * --- DeviantArt parsing ---
 * Examples:
 *   https://www.deviantart.com/theshuyi
 *   https://theshuyi.deviantart.com
 */
function parseDeviantArtHandle_(url) {
  const str = url;

  // Subdomain form: https://<handle>.deviantart.com
  let m = str.match(/^https?:\/\/([a-z0-9][a-z0-9_-]*)\.deviantart\.com(\/|$)/i);
  if (m && m[1]) {
    const sub = String(m[1]).toLowerCase();
    if (sub === "www" || sub === "deviantart") return null;
    return canonicalizeHandleGeneric_(sub, { allowDot: false, reserved: DEVIANTART_RESERVED_PATH_SEGMENTS });
  }

  // Path form: https://www.deviantart.com/<handle>
  m = str.match(/^https?:\/\/(?:www\.)?deviantart\.com\/([a-z0-9][a-z0-9_-]*)(?:\/|$)/i);
  if (m && m[1]) return canonicalizeHandleGeneric_(m[1], { allowDot: false, reserved: DEVIANTART_RESERVED_PATH_SEGMENTS });

  return null;
}



/**
 * Generic canonicalization for handles/usernames.
 */
function canonicalizeHandleGeneric_(h, { allowDot, reserved }) {
  const handle = String(h || "").trim().toLowerCase();

  if (!handle) return null;
  if (handle === "www") return null;

  const re = allowDot
    ? /^[a-z0-9][a-z0-9._-]*$/
    : /^[a-z0-9][a-z0-9_-]*$/;

  if (!re.test(handle)) return null;
  if (reserved && reserved.has(handle)) return null;

  return handle;
}

/**
 * --- Cara parsing ---
 * Example: https://cara.app/christchen
 */
function parseCaraHandle_(url) {
  const str = url;
  const m = str.match(/^https?:\/\/(?:www\.)?cara\.app\/([^\/\?#]+)(?:\/|$)/i);
  if (!m || !m[1]) return null;
  return canonicalizeHandleGeneric_(m[1], { allowDot: true, reserved: new Set(['explore', 'jobs', 'about']) });
}

/**
 * --- 500px parsing ---
 * Example: https://500px.com/p/NarayanNeupane
 */
function parse500pxHandle_(url) {
  const str = url;
  // Accounts usually found at /p/handle or sometimes directly /handle (though less common for profiles vs photos)
  let m = str.match(/^https?:\/\/(?:www\.)?500px\.com\/p\/([^\/\?#]+)(?:\/|$)/i);
  if (m && m[1]) return canonicalizeHandleGeneric_(m[1], { allowDot: true });
  
  // Fallback for direct handle: https://500px.com/handle
  m = str.match(/^https?:\/\/(?:www\.)?500px\.com\/([^\/\?#]+)(?:\/|$)/i);
  if (m && m[1]) {
     if (['popular', 'new', 'editors', 'fresh', 'upcoming', 'search', 'login', 'signup'].includes(m[1].toLowerCase())) return null;
     return canonicalizeHandleGeneric_(m[1], { allowDot: true });
  }

  return null;
}



/**
 * Optional: spreadsheet custom function to extract handle (read-only).
 * Usage: =PROFILE_HANDLE(A2)
 */
function PROFILE_HANDLE(url) {
  const parsed = parsePlatformHandleAndCanonicalUrl_(url);
  return parsed ? parsed.handle : "";
}

/**
 * Debug helper: select a cell and run Leads → Debug selected cell
 */
function debugSelectedCell() {
  const cell = SpreadsheetApp.getActive().getActiveRange();
  const v = cell.getValue();
  const s = String(v);
  console.log("VALUE:", s);
  console.log("NORMALIZED:", normalizeUrlString_(s));
  console.log("CHAR CODES:", Array.from(s).map(c => c.charCodeAt(0)));

  const parsed = parsePlatformHandleAndCanonicalUrl_(s);
  console.log("PARSED:", parsed);

  if (parsed) {
    console.log("DERIVED NAME:", deriveNameFromPlatformHandle_(parsed.platform, parsed.handle));
  }
}

/**
 * --- LinkedIn parsing ---
 * Example: https://www.linkedin.com/in/johndoe/
 */
function parseLinkedInHandle_(url) {
  const str = url;
  const m = str.match(/^https?:\/\/(?:www\.)?linkedin\.com\/in\/([^\/\?#]+)(?:\/|$)/i);
  if (!m || !m[1]) return null;
  return canonicalizeHandleGeneric_(m[1], { allowDot: true, reserved: new Set(['feed', 'jobs', 'mynetwork', 'messaging', 'notifications']) });
}