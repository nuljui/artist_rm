import React, { useState } from 'react';
import { Artist, LifecycleStage, ArtType, Persona } from '../types';

interface ArtistFormProps {
    initialArtist: Artist;
    onSave: (artist: Artist) => void;
    onCancel: () => void;
}

export const ArtistForm: React.FC<ArtistFormProps> = ({ initialArtist, onSave, onCancel }) => {
    const [artist, setArtist] = useState<Artist>(initialArtist);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(artist);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Name</label>
                    <input type="text" className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink focus:ring-2 focus:ring-accent focus:outline-none" value={artist.name} onChange={e => setArtist({ ...artist, name: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Industry</label>
                    <input type="text" className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink focus:ring-2 focus:ring-accent focus:outline-none" value={artist.industry} onChange={e => setArtist({ ...artist, industry: e.target.value })} />
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-ink/60">Profiles</label>
                    <button
                        type="button"
                        onClick={() => {
                            setArtist({
                                ...artist,
                                profiles: [...artist.profiles, { platform: 'Instagram', handle: '', url: '' }]
                            });
                        }}
                        className="text-xs text-accent hover:text-accent/80 font-medium"
                    >
                        + Add Profile
                    </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {artist.profiles.map((profile, idx) => (
                        <div key={idx} className="flex gap-2">
                            <select
                                className="w-1/3 px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink"
                                value={profile.platform}
                                onChange={e => {
                                    const newProfiles = [...artist.profiles];
                                    newProfiles[idx] = { ...newProfiles[idx], platform: e.target.value };
                                    setArtist({ ...artist, profiles: newProfiles });
                                }}
                            >
                                <option>Instagram</option>
                                <option>Twitter</option>
                                <option>ArtStation</option>
                                <option>TikTok</option>
                                <option>Behance</option>
                                <option>Website</option>
                                <option>Email</option>
                            </select>
                            <input
                                type="text"
                                className="w-1/3 px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink"
                                placeholder="Handle"
                                value={profile.handle}
                                onChange={e => {
                                    const newProfiles = [...artist.profiles];
                                    newProfiles[idx] = { ...newProfiles[idx], handle: e.target.value };
                                    setArtist({ ...artist, profiles: newProfiles });
                                }}
                            />
                            <input
                                type="text"
                                className="w-1/3 px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink"
                                placeholder="URL"
                                value={profile.url}
                                onChange={e => {
                                    const newProfiles = [...artist.profiles];
                                    newProfiles[idx] = { ...newProfiles[idx], url: e.target.value };
                                    setArtist({ ...artist, profiles: newProfiles });
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const newProfiles = artist.profiles.filter((_, i) => i !== idx);
                                    setArtist({ ...artist, profiles: newProfiles });
                                }}
                                className="text-ink/40 hover:text-red-500"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Art Type</label>
                    <select className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink" value={artist.artType} onChange={e => setArtist({ ...artist, artType: e.target.value as ArtType })}>
                        {Object.values(ArtType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Persona</label>
                    <select className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink" value={artist.persona} onChange={e => setArtist({ ...artist, persona: e.target.value as Persona })}>
                        {Object.values(Persona).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Status</label>
                <select className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink" value={artist.status} onChange={e => setArtist({ ...artist, status: e.target.value as LifecycleStage })}>
                    {Object.values(LifecycleStage).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Fit Score (1-5)</label>
                    <input type="number" min="1" max="5" className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink" value={artist.fitScore} onChange={e => setArtist({ ...artist, fitScore: parseInt(e.target.value) })} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Influence (0-100)</label>
                    <input type="number" min="0" max="100" className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink" value={artist.influenceScore} onChange={e => setArtist({ ...artist, influenceScore: parseInt(e.target.value) })} />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Notes</label>
                <textarea className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm bg-canvas text-ink" rows={3} value={artist.notes} onChange={e => setArtist({ ...artist, notes: e.target.value })}></textarea>
            </div>

            <div className="flex items-center gap-2">
                <input type="checkbox" id="dnc" className="rounded border-ink/20 text-accent focus:ring-accent" checked={artist.doNotContact} onChange={e => setArtist({ ...artist, doNotContact: e.target.checked })} />
                <label htmlFor="dnc" className="text-sm text-ink/80">Do Not Contact</label>
            </div>

            <div className="pt-4 border-t border-ink/10 flex justify-end gap-3">
                <button type="button" onClick={onCancel} className="px-4 py-2 border border-ink/20 rounded-lg text-ink/80 hover:bg-stone-50 font-medium text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium text-sm shadow-sm">Save Changes</button>
            </div>
        </form>
    );
};
