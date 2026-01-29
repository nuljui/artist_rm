import React from 'react';
import { Artist, LifecycleStage, Persona } from '../types';

interface ArtistCardProps {
    artist: Artist;
    onClick: (artist: Artist) => void;
    onMessage: (artist: Artist, e: React.MouseEvent) => void;
    getLifecycleColor: (status: LifecycleStage) => React.CSSProperties;
    getPersonaBadge: (persona: Persona) => React.ReactNode;
    renderStars: (score: number) => React.ReactNode;
    getPrimaryProfile: (artist: Artist) => any;
}

const getProfileUrl = (platform: string, handleOrUrl: string) => {
    if (!handleOrUrl) return '';
    // If it looks like a URL, treat it as one (ensure protocol)
    if (handleOrUrl.includes('.') && (handleOrUrl.includes('/') || handleOrUrl.includes('com') || handleOrUrl.includes('net') || handleOrUrl.includes('app'))) {
        if (!/^https?:\/\//i.test(handleOrUrl)) return `https://${handleOrUrl}`;
        return handleOrUrl;
    }

    // Otherwise treat as handle
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

    return `https://${lowerPlatform}.com/${cleanHandle}`; // Improved Fallback
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
    return '#6b7280'; // default gray
}

export const ArtistCard: React.FC<ArtistCardProps> = ({
    artist,
    onClick,
    onMessage,
    getLifecycleColor,
    getPersonaBadge,
    renderStars,
    getPrimaryProfile
}) => {
    const primary = getPrimaryProfile(artist);

    return (
        <div
            onClick={() => onClick(artist)}
            className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl hover:bg-stone-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-ink/5"
        >
            {/* Avatar / Visual */}
            <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center text-ink font-bold text-lg border border-ink/5">
                    {artist.name.charAt(0)}
                </div>
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">

                {/* Identity */}
                <div className="sm:col-span-4">
                    <h3 className="text-base font-semibold text-ink truncate">{artist.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-ink/40 mt-0.5">
                        {primary && (
                            <span
                                className="truncate font-semibold uppercase tracking-wide text-[10px]"
                                style={{ color: getPlatformColor(primary.platform) }}
                            >
                                {primary.platform}
                            </span>
                        )}
                        {!primary && <span className="text-xs italic text-ink/30">No profile</span>}
                        <span>•</span>
                        <span className="truncate">{artist.industry || 'Unknown Ind.'}</span>
                    </div>
                </div>

                {/* Tags */}
                <div className="sm:col-span-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-ink/60 bg-ink/5 px-2 py-0.5 rounded text-center min-w-[60px]">
                            {artist.artType}
                        </span>
                        {getPersonaBadge(artist.persona)}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getLifecycleColor(artist.status).color }}></span>
                        <span className="text-xs font-medium text-ink/70">{artist.status}</span>
                    </div>
                </div>

                {/* Scores */}
                <div className="sm:col-span-3 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-ink/50">
                        <span className="w-14">Fit</span>
                        {renderStars(artist.fitScore)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink/50">
                        <span className="w-14">Influence</span>
                        <div className="w-20 bg-stone-200 rounded-full h-1">
                            <div className="bg-accent h-1 rounded-full opacity-70" style={{ width: `${artist.influenceScore}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="sm:col-span-2 flex justify-end gap-2">
                    {primary?.url && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const url = getProfileUrl(primary.platform, primary.url || primary.handle);
                                if (url) window.open(url, '_blank');
                            }}
                            className="p-2 text-ink/30 hover:text-accent transition-colors rounded-full hover:bg-white"
                            title={`Open ${primary.platform}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </button>
                    )}
                    <button
                        onClick={(e) => onMessage(artist, e)}
                        className="p-2 text-ink/30 hover:text-accent transition-colors rounded-full hover:bg-white"
                        title="Message"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </button>
                </div>

            </div>
        </div>
    );
};
