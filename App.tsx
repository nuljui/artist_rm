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
  const [loading, setLoading] = useState(true);

  const [sheetConfig, setSheetConfig] = useState<SheetConfig>({
    scriptUrl: '',
    appPassword: ''
  });

  useEffect(() => {
    // Load config from local storage
    const storedConfig = localStorage.getItem(SHEET_CONFIG_KEY);
    if (storedConfig) {
      setSheetConfig(JSON.parse(storedConfig));
    }

    // Initial Fetch
    const loadData = async () => {
      setLoading(true);
      try {
        const config = storedConfig ? JSON.parse(storedConfig) : { scriptUrl: '' };
        const data = await SheetsService.fetchData(config);
        setArtists(data);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDATION
    if (sheetConfig.scriptUrl && !sheetConfig.scriptUrl.endsWith('/exec')) {
      alert("Invalid URL. Please use the Web App URL (ends in '/exec' from the Deploy dialog), NOT the editor URL.");
      return;
    }

    localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(sheetConfig));

    setLoading(true);
    try {
      // Test connection
      const data = await SheetsService.fetchData(sheetConfig);
      setArtists(data);
      alert("Success! Connected to your secure sheet.");
    } catch (e: any) {
      console.error("Connection failed", e);
      alert(`Failed to connect.\n\nError: ${e.message || e.toString()}\n\nPlease check console for technical details.`);
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
            <p className="text-ink/60 font-medium">Syncing with Secure Cloud...</p>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard data={artists} />;
      case 'list':
        return (
          <ArtistList
            data={artists}
            config={sheetConfig}
            onAdd={async (c) => {
              const newData = await SheetsService.addRow(c, sheetConfig);
              setArtists(newData);
            }}
            onUpdate={async (c) => {
              const newData = await SheetsService.updateRow(c, sheetConfig);
              setArtists(newData);
            }}
          />
        );
      case 'settings':
        return (
          <div className="max-w-2xl mx-auto bg-canvas p-8 rounded-xl shadow-sm border border-ink/10">
            <h2 className="text-2xl font-bold text-ink mb-6">Connection Settings</h2>

            <div className={`p-4 mb-6 border-l-4 rounded ${sheetConfig.scriptUrl && sheetConfig.appPassword ? 'bg-green-50 border-green-500' : 'bg-secondary/10 border-secondary'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`font-bold ${sheetConfig.scriptUrl && sheetConfig.appPassword ? 'text-green-700' : 'text-secondary'}`}>
                    {sheetConfig.scriptUrl && sheetConfig.appPassword ? 'Authenticated Connection' : 'Mock Mode / Not Configured'}
                  </p>
                  <p className="text-sm opacity-80 mt-1">
                    {sheetConfig.scriptUrl && sheetConfig.appPassword ? 'Securely synced with your sheet.' : 'Enter your Script details below.'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Google Apps Script URL</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-ink/20 rounded-lg focus:ring-2 focus:ring-accent focus:outline-none bg-white text-ink"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={sheetConfig.scriptUrl || ''}
                  onChange={e => setSheetConfig({ ...sheetConfig, scriptUrl: e.target.value })}
                />
                <p className="mt-2 text-xs text-ink/60">
                  Must end in <code>/exec</code>. Get this from Deploy &gt; New Deployment &gt; Web App.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">App Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-ink/20 rounded-lg focus:ring-2 focus:ring-accent focus:outline-none bg-white text-ink"
                  placeholder="Enter the password you set in Code.gs"
                  value={sheetConfig.appPassword || ''}
                  onChange={e => setSheetConfig({ ...sheetConfig, appPassword: e.target.value })}
                />
                <p className="mt-2 text-xs text-ink/60">
                  Set this inside your `Code.gs` file (`const APP_PASSWORD = "..."`)
                </p>
              </div>

              <div className="pt-4 border-t border-ink/10 flex justify-end items-center gap-4">
                {sheetConfig.scriptUrl && (
                  <a
                    href={`${sheetConfig.scriptUrl}?op=fetch&password=${encodeURIComponent(sheetConfig.appPassword || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline flex items-center gap-1"
                  >
                    <span>Test in Browser</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
                <button type="submit" className="bg-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors shadow-sm">
                  Verify & Save
                </button>
              </div>
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