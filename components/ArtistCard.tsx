import React, { useState } from 'react';
import { Artist, LifecycleStage, Persona, ArtType } from '../types';

interface ArtistCardProps {
    artist: Artist;
    onClick: (artist: Artist) => void;
    onMessage: (artist: Artist, e: React.MouseEvent) => void;
    onInteraction: (artist: Artist, type: string) => Promise<void>;
    getLifecycleColor: (status: LifecycleStage) => React.CSSProperties;
    getPersonaBadge: (persona: Persona) => React.ReactNode;
    renderStars: (score: number) => React.ReactNode;
    getPrimaryProfile: (artist: Artist) => any;
}

const getProfileUrl = (platform: string, handleOrUrl: string) => {
    if (!handleOrUrl) return '';
    if (handleOrUrl.includes('.') && (handleOrUrl.includes('/') || handleOrUrl.includes('com') || handleOrUrl.includes('net') || handleOrUrl.includes('app'))) {
        if (!/^https?:\/\//i.test(handleOrUrl)) return `https://${handleOrUrl}`;
        return handleOrUrl;
    }
    const lowerPlatform = platform.toLowerCase();
    const cleanHandle = handleOrUrl.replace(/^@/, '');
    if (lowerPlatform.includes('artstation')) return `https://www.artstation.com/${cleanHandle}`;
    if (lowerPlatform.includes('behance')) return `https://www.behance.net/${cleanHandle}`;
    if (lowerPlatform.includes('instagram')) return `https://instagram.com/${cleanHandle}`;
    if (lowerPlatform.includes('twitter') || lowerPlatform.includes('x.com')) return `https://twitter.com/${cleanHandle}`;
    if (lowerPlatform.includes('tiktok')) return `https://tiktok.com/@${cleanHandle}`;
    if (lowerPlatform.includes('github')) return `https://github.com/${cleanHandle}`;
    if (lowerPlatform.includes('dribbble')) return `https://dribbble.com/${cleanHandle}`;
    if (lowerPlatform.includes('linkedin')) return `https://linkedin.com/in/${cleanHandle}`;
    if (lowerPlatform.includes('cara')) return `https://cara.app/${cleanHandle}`;
    if (lowerPlatform.includes('500px')) return `https://500px.com/p/${cleanHandle}`;
    return `https://${lowerPlatform}.com/${cleanHandle}`;
};

const getPlatformColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('artstation')) return '#13aff0';
    if (p.includes('behance')) return '#0057ff';
    if (p.includes('instagram')) return '#d62976';
    if (p.includes('twitter') || p.includes('x.com')) return '#1d9bf0';
    if (p.includes('cara')) return '#d9313a';
    if (p.includes('500px')) return '#000000';
    if (p.includes('linkedin')) return '#0a66c2';
    return '#6b7280';
}

const getArtTypeColor = (type: ArtType | string) => {
    switch (type) {
        case ArtType.THREE_D: return '#8B5CF6'; // Violet
        case ArtType.ILLUSTRATION: return '#EC4899'; // Pink
        case ArtType.VIDEO: return '#F59E0B'; // Amber
        case ArtType.PHOTOGRAPHY: return '#3B82F6'; // Blue
        case ArtType.OTHER: return '#6B7280'; // Gray
        default: return '#9CA3AF';
    }
};

export const ArtistCard: React.FC<ArtistCardProps> = ({
    artist,
    onClick,
    onMessage,
    onInteraction,
    getLifecycleColor,
    getPersonaBadge,
    renderStars,
    getPrimaryProfile
}) => {
    const primary = getPrimaryProfile(artist);
    const [interactionType, setInteractionType] = useState('Liked Content');
    const [isLogging, setIsLogging] = useState(false);

    const handleLogInteraction = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLogging) return;
        setIsLogging(true);
        try {
            await onInteraction(artist, interactionType);
        } catch (err) {
            console.error("Interaction log failed", err);
        } finally {
            setIsLogging(false);
        }
    };

    const artTypeColor = getArtTypeColor(artist.artType);

    return (
        <div
            onClick={() => onClick(artist)}
            className="group relative flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl hover:bg-stone-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-ink/5 bg-white shadow-sm hover:shadow-md"
        >
            {/* Avatar */}
            <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center text-ink font-bold text-lg border border-ink/5">
                    {artist.name.charAt(0)}
                </div>
            </div>

            {/* Main Content Info */}
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                {/* Identity & Tags (Col 1-5) */}
                <div className="md:col-span-5 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-ink truncate">{artist.name}</h3>
                        {primary && (
                            <span
                                className="font-semibold uppercase tracking-wide text-[10px]"
                                style={{ color: getPlatformColor(primary.platform) }}
                            >
                                {primary.platform}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Art Type Badge */}
                        {(artist.artType && artist.artType !== 'Unknown') && (
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-opacity-10 border border-opacity-20"
                                style={{
                                    color: artTypeColor,
                                    backgroundColor: `${artTypeColor}15`,
                                    borderColor: `${artTypeColor}30`
                                }}
                            >
                                {artist.artType}
                            </span>
                        )}

                        {/* Persona Badge */}
                        {getPersonaBadge(artist.persona)}

                        {/* Lifecycle */}
                        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-ink/10">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getLifecycleColor(artist.status).color }}></span>
                            <span className="text-xs font-medium text-ink/60">{artist.status}</span>
                        </div>
                    </div>
                </div>

                {/* Scores & Stats (Col 6-8) */}
                <div className="md:col-span-3 flex flex-col gap-1 justify-center">
                    <div className="flex items-center gap-2 text-xs text-ink/50">
                        <span className="w-16">Fit</span>
                        {renderStars(artist.fitScore)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink/50">
                        <span className="w-16">Influence</span>
                        <div className="w-20 bg-stone-200 rounded-full h-1">
                            <div className="bg-accent h-1 rounded-full opacity-70" style={{ width: `${artist.influenceScore}%` }}></div>
                        </div>
                    </div>
                    {/* Last Interaction */}
                    <div className="flex items-center gap-2 text-xs text-ink/50 mt-1" title="YYYY-MM-DD HH:MM">
                        <span className="w-16">Last Int.</span>
                        <span className="text-ink font-medium">
                            {artist.lastTouched && artist.lastTouched !== '1970-01-01' ? artist.lastTouched.replace('T', ' ').substring(0, 16) : 'Never'}
                        </span>
                    </div>
                </div>

                {/* Actions Area (Col 9-12) */}
                <div className="md:col-span-4 flex items-center justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-ink/5">

                    {/* Interaction Logger */}
                    <div className="flex items-center gap-1 bg-stone-50 rounded-lg p-1 border border-ink/5" onClick={e => e.stopPropagation()}>
                        <select
                            className="text-xs bg-transparent border-none focus:ring-0 text-ink/80 py-1 pr-6 cursor-pointer"
                            value={interactionType}
                            onChange={e => setInteractionType(e.target.value)}
                        >
                            <option>Liked Content</option>
                            <option>Followed</option>
                            <option>Messaged</option>
                            <option>Commented</option>
                        </select>
                        <button
                            onClick={handleLogInteraction}
                            disabled={isLogging}
                            className="bg-accent text-white p-1 rounded hover:bg-accent/90 disabled:opacity-50 transition-colors"
                            title="Log Interaction"
                        >
                            {isLogging ? (
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            )}
                        </button>
                    </div>

                    <div className="h-4 w-px bg-ink/10 mx-1"></div>

                    {/* Profile Link */}
                    {primary?.url && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const url = getProfileUrl(primary.platform, primary.url || primary.handle);
                                if (url) window.open(url, '_blank');
                            }}
                            className="p-1.5 text-ink/40 hover:text-accent transition-colors rounded-full hover:bg-stone-100"
                            title={`Open ${primary.platform}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </button>
                    )}

                    {/* Message Button */}
                    <button
                        onClick={(e) => onMessage(artist, e)}
                        className="p-1.5 text-ink/40 hover:text-accent transition-colors rounded-full hover:bg-stone-100"
                        title="Draft Message"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </button>
                </div>

            </div>
        </div>
    );
};
