export const SHEET_CONFIG_KEY = 'sheetcrm_config';
export const LOCAL_STORAGE_DATA_KEY = 'sheetcrm_data';
export const LOCAL_STORAGE_TOUCHPOINTS_KEY = 'sheetcrm_touchpoints';

export const MOCK_ARTISTS = [
  {
    id: '1',
    name: 'Sarah Chen',
    artType: 'Illustration',
    industry: 'Game Dev',
    persona: 'Professional',
    timezone: 'PST',
    influenceScore: 85,
    fitScore: 5,
    status: 'Engaged',
    owner: 'You',
    notes: 'Key prospect for Q3',
    lastTouched: '2023-10-01',
    doNotContact: false,
    profiles: [{ platform: 'ArtStation', handle: 'schen_art', url: 'https://artstation.com' }]
  },
  {
    id: '2',
    name: 'Mike Ross',
    artType: '3D',
    industry: 'Film',
    persona: 'Mid',
    timezone: 'EST',
    influenceScore: 60,
    fitScore: 3,
    status: 'Discovered',
    owner: 'Unassigned',
    notes: '',
    lastTouched: '2023-09-15',
    doNotContact: false,
    profiles: []
  }
];