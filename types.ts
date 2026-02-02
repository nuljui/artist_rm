export enum LifecycleStage {
  // Lifecycle Stages
  DISCOVERED = 'Discovered',
  QUALIFIED = 'Qualified',
  ASSIGNED = 'Assigned',
  MESSAGED = 'Messaged',
  ENGAGED = 'Engaged',
  CLICKED = 'Clicked',
  SIGNED_UP = 'Signed Up',
  FIRST_MARK = '1st Mark',
  INSTALLED = 'Installed',
  ACTIVE = 'Active',
  ADVOCATE = 'Advocate',

  // Closed Stages
  CLOSED_NOT_FIT = 'Closed: Not a fit',
  CLOSED_NO_RESPONSE = 'Closed: No response',
  CLOSED_HOSTILE = 'Closed: Hostile / do-not-contact / Later'
}

export enum ArtType {
  THREE_D = '3D',
  ILLUSTRATION = 'Illustration',
  VIDEO = 'Video',
  PHOTOGRAPHY = 'Photography',
  OTHER = 'Other',
  UNKNOWN = 'Unknown'
}

export enum Persona {
  STUDENT = 'Student',
  MID = 'Mid',
  PROFESSIONAL = 'Professional',
  INFLUENCER = 'Influencer',
  UNKNOWN = 'Unknown'
}

export interface PlatformProfile {
  id?: string; // Profile ID
  platform: string;
  handle: string;
  url: string;
  followers?: string;
}

export interface Artist {
  id: string; // Artist ID
  name: string;
  profiles: PlatformProfile[]; // Platform, Handle, url / link
  artType: ArtType;
  industry: string;
  persona: Persona;
  timezone: string;
  influenceScore: number; // Influence Score
  fitScore: number; // Fit Score: 1-5
  notes: string;
  status: LifecycleStage; // Status (pipeline)
  owner: string;
  lastTouched: string; // Last Touched (ISO Date)
  doNotContact: boolean;
  touchpoints: TouchPoint[];
}

export interface TouchPoint {
  touchId: string;
  artistId: string;
  platform: string;
  type: 'dm' | 'comment' | 'email';
  messageText: string;
  sentAt: string; // Sent
  outcome?: string;
  linkId?: string;
}

export interface Link {
  linkId: string;
  clicked: boolean;
}

export interface SheetConfig {
  scriptUrl?: string; // Google Apps Script Web App URL
  appPassword?: string;  // Custom Password for access
}


export interface DashboardStats {
  artists: number;
  engaged: number;
  avgFitScore: string;
  highInfluence: number;
  statuses: Record<string, number>;
  platforms: Record<string, number>;
  artTypes: Record<string, number>;
  personas: Record<string, number>;
  owners: Record<string, number>;
}

export type ViewState = 'dashboard' | 'assigned' | 'unassigned' | 'settings';
