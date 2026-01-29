import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ArtistList } from './components/CustomerList';
import { SheetsService } from './services/sheetsService';
import { Artist, ViewState, SheetConfig } from './types';
import { SHEET_CONFIG_KEY } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [stats, setStats] = useState<any[][] | null>(null);
  const [loading, setLoading] = useState(false);

  const [sheetConfig, setSheetConfig] = useState<SheetConfig>({
    scriptUrl: '',
    appPassword: ''
  });

  // Load Config
  useEffect(() => {
    const storedConfig = localStorage.getItem(SHEET_CONFIG_KEY);
    if (storedConfig) {
      setSheetConfig(JSON.parse(storedConfig));
    }
  }, []);

  // Fetch Data on View Change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (!sheetConfig.scriptUrl) {
          // If no config, maybe don't load? Or try mock?
          // Mock logic is inside service.
        }

        if (view === 'dashboard') {
          const s = await SheetsService.fetchDashboardStats(sheetConfig);
          setStats(s);
        } else if (view === 'assigned' || view === 'unassigned') {
          const res = await SheetsService.fetchData(sheetConfig, view);
          setArtists(res.artists);
        }
        // Settings: No fetch
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };

    // Don't auto-load if config missing, unless it's mock (empty url)
    loadData();
  }, [view, sheetConfig.scriptUrl, sheetConfig.appPassword]); // Re-run when view changes

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sheetConfig.scriptUrl && !sheetConfig.scriptUrl.endsWith('/exec')) {
      alert("Invalid URL. Please use the Web App URL (ends in '/exec').");
      return;
    }

    localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(sheetConfig));

    setLoading(true);
    try {
      // Test Fetch (Default to dashboard fetch for speed test?)
      await SheetsService.fetchDashboardStats(sheetConfig);
      alert("Success! Connected.");
      // Reload current view
      window.location.reload();
    } catch (e: any) {
      console.error("Connection failed", e);
      alert(`Failed to connect.\n\nError: ${e.message || e.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
            <p className="text-ink/60 font-medium">Syncing...</p>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard stats={stats} />;
      case 'assigned':
      case 'unassigned':
        return (
          <ArtistList
            data={artists}
            config={sheetConfig}
            viewMode={view} // Pass view mode to List if needed for UI context
            onAdd={async (c) => {
              // Add always goes to Unassigned or Assigned? 
              // Service handles it. But we need to refresh.
              const res = await SheetsService.addRow(c, sheetConfig);
              setArtists(res.artists); // Service row operations return RE-FETCHED data.
            }}
            onUpdate={async (c) => {
              const res = await SheetsService.updateRow(c, sheetConfig);
              setArtists(res.artists);
            }}
          />
        );
      case 'settings':
        return (
          <div className="max-w-2xl mx-auto bg-canvas p-8 rounded-xl shadow-sm border border-ink/10">
            {/* Same Settings Form */}
            <h2 className="text-2xl font-bold text-ink mb-6">Connection Settings</h2>
            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Google Apps Script URL</label>
                <input type="text" className="w-full px-4 py-2 border border-ink/20 rounded-lg" value={sheetConfig.scriptUrl || ''} onChange={e => setSheetConfig({ ...sheetConfig, scriptUrl: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">App Password</label>
                <input type="password" className="w-full px-4 py-2 border border-ink/20 rounded-lg" value={sheetConfig.appPassword || ''} onChange={e => setSheetConfig({ ...sheetConfig, appPassword: e.target.value })} />
              </div>
              <button type="submit" className="bg-accent text-white px-6 py-2 rounded-lg">Save</button>
            </form>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout currentView={view} setView={setView}>
      {renderContent()}
    </Layout>
  );
};

export default App;