import { LifecycleStage, Persona } from '../types';

// Monolith Design System Tokens
export const PALETTE = {
    canvas: '#ffffff',
    ink: {
        DEFAULT: '#1D1D1F',
        dim: 'rgba(29, 29, 31, 0.4)',
        faint: 'rgba(29, 29, 31, 0.05)',
    },
    accent: '#0088FF',
    secondary: '#D97706',
    error: '#EF4444',
    success: '#10B981',
    stone: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
    },
    // Chart Colors
    Blue: '#3B82F6',
    Orange: '#F59E0B',
    Purple: '#8B5CF6',
    Green: '#10B981',
    Pink: '#EC4899',
    Teal: '#14B8A6'
};

export const LIFECYCLE_COLORS: Record<LifecycleStage, string> = {
    [LifecycleStage.Idea]: '#9CA3AF',
    [LifecycleStage.Outreach]: '#3B82F6',
    [LifecycleStage.Negotiation]: '#D97706',
    [LifecycleStage.Contract]: '#8B5CF6',
    [LifecycleStage.Active]: '#10B981',
    [LifecycleStage.Completed]: '#1F2937',
    [LifecycleStage.Declined]: '#EF4444',
};

export const PERSONA_COLORS: Record<Persona, string> = {
    [Persona.Professional]: '#4B5563',
    [Persona.Hobbyist]: '#EC4899',
    [Persona.Student]: '#F59E0B',
    [Persona.Influencer]: '#8B5CF6',
};
