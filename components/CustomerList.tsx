import React, { useState } from 'react';
import { Artist, LifecycleStage, ArtType, Persona, SheetConfig } from '../types';
import { GeminiService } from '../services/geminiService';
import { SheetsService } from '../services/sheetsService';
import { PALETTE, LIFECYCLE_COLORS, PERSONA_COLORS } from './colors';
import { ArtistCard } from './ArtistCard';
import { ActionModal } from './ActionModal';
import { ArtistForm } from './ArtistForm';

interface ArtistListProps {
  data: Artist[];
  config: SheetConfig;
  onAdd: (c: Artist) => void;
  onUpdate: (c: Artist) => void;
}

export const ArtistList: React.FC<ArtistListProps> = ({ data, config, onAdd, onUpdate }) => {
  const [filter, setFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fitFilter, setFitFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  // Message Draft & AI Search States
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [messageContext, setMessageContext] = useState({ template: 'Quick Follow-up', engagementType: 'Initial Message' });

  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const filteredData = data.filter(c => {
    // Safety check: Explicitly cast to String to handle numbers/booleans
    const name = String(c.name || '');
    const industry = String(c.industry || '');
    const artType = String(c.artType || '');

    const matchesText = name.toLowerCase().includes(filter.toLowerCase()) ||
      industry.toLowerCase().includes(filter.toLowerCase()) ||
      artType.toLowerCase().includes(filter.toLowerCase());

    const matchesOwner = ownerFilter === 'All' || c.owner === ownerFilter;
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesFit = fitFilter === 'All' || (c.fitScore || 0).toString() === fitFilter;
    const matchesPlatform = platformFilter === 'All' || (c.profiles || []).some(p => p.platform === platformFilter);

    return matchesText && matchesOwner && matchesStatus && matchesFit && matchesPlatform;
  });

  const owners = Array.from(new Set(data.map(c => c.owner))).sort();
  const statuses = Object.values(LifecycleStage);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, ownerFilter, statusFilter, fitFilter, platformFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDraftMessage = (artist: Artist, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedArtist(artist);

    // Reset if switching artists
    if (selectedArtist?.id !== artist.id) {
      setMessageContext({ template: 'Quick Follow-up', engagementType: 'Initial Message' });
      setDraft(''); // Start empty
    }
  };

  const handleRegenerate = async () => {
    if (!selectedArtist) return;
    setIsDrafting(true);
    const text = await GeminiService.draftMessage(selectedArtist, {
      ...messageContext,
      history: selectedArtist.touchpoints
    });
    setDraft(text);
    setIsDrafting(false);
  };

  const handleSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAsking(true);
    const answer = await GeminiService.askData(aiQuery, data);
    setAiAnswer(answer);
    setIsAsking(false);
  };

  const cleanUpdate = (artist: Artist) => {
    onUpdate(artist);
    setEditingArtist(null);
  };

  const getPrimaryProfile = (artist: Artist) => {
    if (!artist.profiles || artist.profiles.length === 0) return null;

    const priority = ['ArtStation', 'Behance', 'Cara', '500px', 'LinkedIn', 'Instagram', 'Twitter', 'TikTok', 'Website', 'Email'];

    // safe sort
    const sorted = [...artist.profiles].sort((a, b) => {
      const idxA = priority.indexOf(a.platform);
      const idxB = priority.indexOf(b.platform);
      // If both in list, lower index wins. If one not in list, it goes to end.
      const valA = idxA === -1 ? 999 : idxA;
      const valB = idxB === -1 ? 999 : idxB;
      return valA - valB;
    });

    return sorted[0];
  };

  const renderStars = (score: number) => {
    return (
      <div className="flex text-secondary">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className={`w-3 h-3 ${i < score ? 'fill-current' : 'text-ink/10 fill-current'}`} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    )
  }

  const getLifecycleColor = (status: LifecycleStage) => {
    // We'll use inline styles for dynamic colors to avoid huge Tailwind config
    const baseColor = LIFECYCLE_COLORS[status] || '#6b7280';
    return {
      color: baseColor,
      backgroundColor: `${baseColor}15`, // 15 = ~10% opacity, hex alpha
      border: `1px solid ${baseColor}30` // 30 = ~20% opacity
    };
  };

  const getPersonaBadge = (persona: Persona) => {
    if (!persona || String(persona) === 'Unknown') return null;
    const baseColor = PERSONA_COLORS[persona] || '#6b7280';
    const style = {
      color: baseColor,
      backgroundColor: `${baseColor}10`, // very light bg
      border: `1px solid ${baseColor}20`
    };
    return <span style={style} className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">{persona}</span>
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-ink/5 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-ink tracking-tight">
            Artist List
            <span className="ml-3 text-lg font-medium text-ink/40 bg-ink/5 px-3 py-1 rounded-full align-middle">
              {filteredData.length}
            </span>
          </h1>
          <p className="text-lg text-ink/60 font-light">Track engagement & manage relationships.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Simple Filters */}
          <select className="px-4 py-2.5 border border-ink/10 rounded-xl text-sm bg-canvas text-ink focus:ring-2 focus:ring-accent focus:outline-none shadow-sm" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
            <option value="All">All Owners</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="px-4 py-2.5 border border-ink/10 rounded-xl text-sm bg-canvas text-ink focus:ring-2 focus:ring-accent focus:outline-none shadow-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search artists..."
              className="w-full pl-10 pr-4 py-2.5 border border-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm bg-canvas text-ink placeholder-ink/30 shadow-sm transition-shadow"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <svg className="w-5 h-5 text-ink/30 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <button
            onClick={() => alert("This would open a modal to add a new Artist row to Sheets.")}
            className="bg-ink text-white px-5 py-2.5 rounded-xl hover:bg-ink/90 font-medium text-sm whitespace-nowrap shadow-lg hover:shadow-xl transition-all"
          >
            + Add Artist
          </button>
        </div>
      </div>

      {/* AI Smart Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center border-b border-ink/5 pb-6 mb-6">
        <div className="p-2 bg-accent/10 rounded-full">
          <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
        </div>
        <form onSubmit={handleSmartSearch} className="flex-1 flex gap-2 w-full">
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="Ask Gemini about your roster (e.g. 'Who are the top 3 influencers?')"
            className="flex-1 border-none bg-transparent focus:ring-0 text-sm md:text-base text-ink placeholder-ink/40"
          />
          <button
            type="submit"
            disabled={isAsking}
            className="text-accent font-medium text-sm hover:text-accent/80 disabled:opacity-50"
          >
            {isAsking ? 'Thinking...' : 'Ask'}
          </button>
        </form>
        {aiAnswer && (
          <div className="w-full md:w-auto md:max-w-md bg-stone-100 px-4 py-2 rounded-lg text-sm text-ink border border-stone-200">
            <span className="font-semibold mr-1">Answer:</span> {aiAnswer}
            <button onClick={() => setAiAnswer(null)} className="ml-2 text-ink/40 hover:text-ink">&times;</button>
          </div>
        )}
      </div>

      {/* NEW: ARTIST GRID/LIST */}
      <div className="grid grid-cols-1 gap-4">
        {currentData.map(artist => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            onClick={setEditingArtist}
            onMessage={handleDraftMessage}
            getLifecycleColor={getLifecycleColor}
            getPersonaBadge={getPersonaBadge}
            renderStars={renderStars}
            getPrimaryProfile={getPrimaryProfile}
          />
        ))}

        {filteredData.length === 0 && (
          <div className="p-12 text-center text-ink/40">
            No artists found matching your filter.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-ink/5 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-ink bg-canvas border border-ink/20 rounded-md hover:bg-stone-50 disabled:opacity-50">Previous</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-ink bg-canvas border border-ink/20 rounded-md hover:bg-stone-50 disabled:opacity-50">Next</button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <p className="text-sm text-ink/60">Showing <span className="font-medium text-ink">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-ink">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-medium text-ink">{filteredData.length}</span> results</p>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-ink/20 bg-canvas text-sm font-medium text-ink/60 hover:bg-stone-50 disabled:opacity-50">
                <span>Previous</span>
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-ink/20 bg-canvas text-sm font-medium text-ink">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-ink/20 bg-canvas text-sm font-medium text-ink/60 hover:bg-stone-50 disabled:opacity-50">
                <span>Next</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* MESSAGE MODAL */}
      <ActionModal
        title={`Draft Message to ${selectedArtist?.name || 'Artist'}`}
        isOpen={!!selectedArtist}
        onClose={() => setSelectedArtist(null)}
      >
        {isDrafting ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <svg className="animate-spin h-8 w-8 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-ink/60 animate-pulse">Gemini is gathering context & generating...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedArtist && (
              <div className="bg-stone-50 p-3 rounded-lg text-xs text-ink/70 border border-ink/5">
                <strong>Context:</strong> {selectedArtist.artType}, Fit: {selectedArtist.fitScore}/5.
                Targeting: {selectedArtist.profiles[0]?.platform || 'Email'}.
              </div>
            )}

            {/* History Section */}
            {selectedArtist && (
              <div className="max-h-32 overflow-y-auto bg-stone-50 border border-ink/5 rounded-lg p-2 text-xs space-y-2">
                <h4 className="font-semibold text-ink/40 uppercase tracking-wider text-[10px] mb-1">Touchpoint History</h4>
                {selectedArtist.touchpoints && selectedArtist.touchpoints.length > 0 ? (
                  selectedArtist.touchpoints.map((tp, idx) => (
                    <div key={idx} className="border-l-2 border-ink/10 pl-2">
                      <span className="text-ink/40 block">{tp.sentAt} • {tp.type}</span>
                      <p className="text-ink/80 line-clamp-2">{tp.messageText}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-ink/30 italic">No prior history recorded.</div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Message Template</label>
                <select
                  className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink"
                  value={messageContext.template}
                  onChange={e => setMessageContext({ ...messageContext, template: e.target.value })}
                >
                  <option>Quick Follow-up</option>
                  <option>Intro / Cold Outreach</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Engagement Type</label>
                <select
                  className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink"
                  value={messageContext.engagementType}
                  onChange={e => setMessageContext({ ...messageContext, engagementType: e.target.value })}
                >
                  <option>Initial Message</option>
                  <option>Message History</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Draft</label>
              <textarea
                className="w-full h-48 p-3 border border-ink/20 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm leading-relaxed bg-canvas text-ink"
                value={draft || ''}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>

            <div className="flex justify-between space-x-3 pt-4 border-t border-ink/5">
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 border border-accent text-accent rounded-lg hover:bg-accent/5 text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {draft ? 'Regenerate' : 'Draft with AI'}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedArtist(null)}
                  className="px-4 py-2 text-ink/60 hover:text-ink text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedArtist || !draft) return;

                    // Prepend Engagement Type if not 'Initial Message' (or always? "put whatever this engagement type at the start")
                    // User said: "lets just put whatever this engagement type at the start of the message."
                    const finalMsg = `[${messageContext.engagementType}] ${draft}`;

                    await SheetsService.addTouchpoint({
                      touchId: 't' + Math.random().toString(36).substr(2, 9),
                      artistId: selectedArtist.id,
                      platform: selectedArtist.profiles[0]?.platform || 'Email',
                      type: 'dm',
                      messageText: finalMsg,
                      sentAt: new Date().toISOString().split('T')[0],
                      outcome: 'Messaged',
                      linkId: ''
                    }, config);
                    setMessageContext({ template: 'Quick Follow-up', engagementType: 'Initial Message' });
                    setDraft('');
                    setSelectedArtist(null);
                  }}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 text-sm font-medium shadow-sm"
                >
                  Log Message
                </button>
              </div>
            </div>
          </div>
        )}
      </ActionModal>

      {/* EDIT MODAL: Keeping simple for now, wrapping in ActionModal could work but form is complex.
          Just updating the container class to match new style if needed.
      */}
      {/* EDIT MODAL */}
      {editingArtist && (
        <ActionModal
          title={`Edit Artist: ${editingArtist.name}`}
          isOpen={!!editingArtist}
          onClose={() => setEditingArtist(null)}
        >
          <ArtistForm
            initialArtist={editingArtist}
            onSave={(updated) => {
              cleanUpdate(updated);
            }}
            onCancel={() => setEditingArtist(null)}
          />
        </ActionModal>
      )}

    </div>
  );
};