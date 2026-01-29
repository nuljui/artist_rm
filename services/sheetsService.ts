import { Artist, SheetConfig, TouchPoint, LifecycleStage, ArtType, Persona } from '../types';
import { MOCK_ARTISTS, LOCAL_STORAGE_DATA_KEY, LOCAL_STORAGE_TOUCHPOINTS_KEY } from '../constants';

// Helper to perform GAS Request with Auth
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callScript = async (url: string, payload: any = null, password?: string, retries = 3): Promise<any> => {
  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, password }),
  };

  let resp;

  try {
    if (!payload) {
      // Append params safely
      const separator = url.includes('?') ? '&' : '?';
      const authUrl = `${url}${separator}op=fetch&password=${encodeURIComponent(password || '')}`;
      resp = await fetch(authUrl);
    } else {
      resp = await fetch(url, options);
    }
  } catch (netErr) {
    if (retries > 0) {
      console.warn(`Network error, retrying... (${retries} left)`);
      await wait(1500);
      return callScript(url, payload, password, retries - 1);
    }
    throw new Error("Network Error: Is the URL correct? (CORS check failed)");
  }
  // ... (rest of callScript logic unchanged)
  const text = await resp.text();

  try {
    const json = JSON.parse(text);

    // Auto-retry on Lock contention
    if (json.status === 'error' && json.message && json.message.includes('Server is busy') && retries > 0) {
      console.warn(`Server busy (LockService), retrying... (${retries} left)`);
      await wait(3000 + Math.random() * 1000); // Jitter
      return callScript(url, payload, password, retries - 1);
    }

    return json;
  } catch (e) {
    if (text.includes("<!DOCTYPE html>")) {
      if (text.includes("Google Drive - Page Not Found")) throw new Error("URL Not Found (404). Your URL might be incomplete or missing characters.");
      if (text.includes("Sign in")) throw new Error("Auth Failed. Script deployment access must be set to 'Anyone', not 'Anyone with Google Account'.");

      throw new Error("Received HTML error page instead of JSON. Check your deployment settings.");
    }
    throw new Error(`Invalid Server Response: ${text.substring(0, 100)}...`);
  }
};

export const SheetsService = {

  // Fetch Data (Mock or Real)
  fetchData: async (config: SheetConfig, view: 'assigned' | 'unassigned' = 'assigned'): Promise<{ artists: Artist[], totalStats?: any }> => {
    // Mock Mode Check
    if (!config.scriptUrl) {
      console.log("Using Mock Data (No script URL)");
      const stored = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
      return { artists: stored ? JSON.parse(stored) : (MOCK_ARTISTS as unknown as Artist[]) };
    }

    try {
      console.log(`Fetching ${view} from Apps Script...`);
      // Just pass the view param to callScript, it will handle appending
      const separator = config.scriptUrl.includes('?') ? '&' : '?';
      const urlWithView = `${config.scriptUrl}${separator}view=${view}`;

      const response = await callScript(urlWithView, null, config.appPassword);

      if (response.status !== 'success') throw new Error(response.message);

      const { artists, profiles, touchpoints } = response.data; // Raw arrays of rows

      // Parse Profiles
      const profilesByArtist: Record<string, any[]> = {};
      if (Array.isArray(profiles)) {
        profiles.forEach((row: any[]) => {
          if (!row || row.length < 2) return;
          const [profileId, artistId, platform, followers, handle, url] = row;
          if (!profilesByArtist[artistId]) profilesByArtist[artistId] = [];
          profilesByArtist[artistId].push({ id: profileId, platform, handle, url, followers });
        });
      }

      // Parse Touchpoints
      const touchpointsByArtist: Record<string, TouchPoint[]> = {};
      if (Array.isArray(touchpoints)) {
        touchpoints.forEach((row: any[]) => {
          if (!row || row.length < 2) return;
          const [touchId, artistId, platform, type, messageText, sentAt, outcome, linkId] = row;
          if (!touchpointsByArtist[artistId]) touchpointsByArtist[artistId] = [];
          touchpointsByArtist[artistId].push({
            touchId: String(touchId),
            artistId: String(artistId),
            platform: String(platform),
            type: String(type) as any,
            messageText: String(messageText),
            sentAt: String(sentAt),
            outcome: String(outcome),
            linkId: String(linkId || '')
          });
        });
      }

      // Parse Artists
      if (!Array.isArray(artists)) return { artists: [] };

      const parsedArtists = artists.map((row: any[]) => {
        // Guard against empty rows
        if (!row || row.length === 0) return null;

        const [
          id, name, artType, industry, persona, timezone,
          influenceScore, fitScore, status, owner, notes, lastTouched, doNotContact
        ] = row;

        // Skip rows without ID or Name
        if (!id && !name) return null;

        return {
          id: String(id || Math.random().toString(36)),
          name: String(name || 'Unknown Artist'),
          artType: String(artType || 'Unknown') as ArtType,
          industry: String(industry || ''),
          persona: String(persona || 'Unknown') as Persona,
          timezone: String(timezone || ''),
          influenceScore: parseInt(String(influenceScore || '0')),
          fitScore: parseInt(String(fitScore || '0')),
          status: String(status || 'Discovered') as LifecycleStage,
          owner: String(owner || 'Unassigned'),
          notes: String(notes || ''),
          lastTouched: String(lastTouched || new Date().toISOString()),
          doNotContact: doNotContact === 'TRUE' || doNotContact === true,
          profiles: profilesByArtist[id] || [],
          touchpoints: touchpointsByArtist[id] || []
        };
      }).filter((a): a is Artist => a !== null && a.name !== 'Unknown Artist');

      return { artists: parsedArtists };

    } catch (error) {
      console.error("Error fetching from Script:", error);
      throw error;
    }
  },

  fetchDashboardStats: async (config: SheetConfig): Promise<any> => {
    if (!config.scriptUrl) return {}; // Mock not implemented for dashboard

    // FETCH 'dashboard' view
    const separator = config.scriptUrl.includes('?') ? '&' : '?';
    const response = await callScript(config.scriptUrl + separator + `view=dashboard`, null, config.appPassword);
    if (response.status !== 'success') throw new Error(response.message);

    return response.data.stats;
  },

  // Add Row
  addRow: async (artist: Artist, config?: SheetConfig): Promise<{ artists: Artist[] }> => {
    // REAL MODE
    if (config?.scriptUrl) {
      // 1. Add Artist
      await callScript(config.scriptUrl, {
        op: 'addArtist',
        data: artist
      }, config.appPassword);

      // 2. Add Profiles (Sequentially)
      for (const p of artist.profiles) {
        // Ensure ID
        const profileData = { ...p, id: p.id || 'p' + Math.random().toString(36).substr(2, 9), artistId: artist.id };

        await callScript(config.scriptUrl, {
          op: 'addProfile',
          data: profileData
        }, config.appPassword);
      }

      // Re-fetch
      return await SheetsService.fetchData(config);
    }

    // MOCK MODE
    await new Promise(resolve => setTimeout(resolve, 500));
    const stored = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
    const currentData = stored ? JSON.parse(stored) : MOCK_ARTISTS;
    const newData = [artist, ...currentData];
    localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(newData));
    return { artists: newData };
  },

  // Update Row
  updateRow: async (updatedArtist: Artist, config?: SheetConfig): Promise<{ artists: Artist[] }> => {
    if (config?.scriptUrl) {
      // 1. Update Artist Fields
      await callScript(config.scriptUrl, {
        op: 'updateArtist',
        data: updatedArtist
      }, config.appPassword);

      // 2. Add ANY NEW Profiles (that don't have an ID yet)
      // We must update the local object's IDs so the subsequent "Delete" check knows they exist.
      for (let i = 0; i < updatedArtist.profiles.length; i++) {
        const p = updatedArtist.profiles[i];
        if (!p.id) {
          const newId = 'p' + Math.random().toString(36).substr(2, 9);
          // CRITICAL: Update the local object so it matches what we just sent to server
          updatedArtist.profiles[i].id = newId;

          const newP = { ...p, id: newId, artistId: updatedArtist.id };
          await callScript(config.scriptUrl, {
            op: 'addProfile',
            data: newP
          }, config.appPassword);
        }
      }

      // 3. DELETE REMOVED Profiles
      // Fetch latest state to compare
      const freshData = await SheetsService.fetchData(config);
      const liveArtist = freshData.artists.find(a => a.id === updatedArtist.id);

      if (liveArtist) {
        const liveIDs = liveArtist.profiles.map(p => p.id).filter(Boolean) as string[];
        // Now this will include the IDs we just generated and added
        const currentIDs = updatedArtist.profiles.map(p => p.id).filter(Boolean) as string[];

        // Deleted = In Live BUT NOT in Current
        const toDelete = liveIDs.filter(id => !currentIDs.includes(id));

        for (const pid of toDelete) {
          await callScript(config.scriptUrl, {
            op: 'deleteProfile',
            id: pid
          }, config.appPassword);
        }
      }

      return await SheetsService.fetchData(config);
    }

    // MOCK MODE
    await new Promise(resolve => setTimeout(resolve, 500));
    const stored = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
    const currentData = stored ? JSON.parse(stored) : MOCK_ARTISTS;
    const newData = currentData.map(c => c.id === updatedArtist.id ? updatedArtist : c);
    localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(newData));
    return { artists: newData };
  },

  // Add Touchpoint
  addTouchpoint: async (touchpoint: TouchPoint, config?: SheetConfig): Promise<{ artists: Artist[] }> => {
    console.log('Adding touchpoint:', touchpoint);
    if (config?.scriptUrl) {
      try {
        const res = await callScript(config.scriptUrl, {
          op: 'addTouchpoint',
          data: touchpoint
        }, config.appPassword);
        console.log('Touchpoint response:', res);
      } catch (e) {
        console.error('Touchpoint failed:', e);
        throw e; // Rethrow so UI knows
      }

      return await SheetsService.fetchData(config);
    }

    // Mock Mode
    await new Promise(resolve => setTimeout(resolve, 300));
    const stored = localStorage.getItem(LOCAL_STORAGE_TOUCHPOINTS_KEY);
    const currentLogs = stored ? JSON.parse(stored) : [];
    const newLogs = [...currentLogs, touchpoint];
    localStorage.setItem(LOCAL_STORAGE_TOUCHPOINTS_KEY, JSON.stringify(newLogs));

    return await SheetsService.fetchData(config || { scriptUrl: '' });
  }
};