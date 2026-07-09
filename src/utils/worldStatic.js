/* ============================================================
   World Static Data — Neuro Rooms & Events
   (Not from Firebase — community-managed content)
   ============================================================ */

export const NEURO_ROOMS = [
  {
    id: 'room_1', name: 'Focus Zone', vibe: '🧠',
    description: 'Deep work, no distractions. Share your session, stay locked in.',
    online: 234, colorHex: '#2563eb', tags: ['deep work','silence','flow state'], locked: false,
  },
  {
    id: 'room_2', name: 'Hype Zone', vibe: '⚡',
    description: 'Celebrate wins, hype each other up. Energy is everything.',
    online: 891, colorHex: '#d4ff00', tags: ['wins','energy','motivation'], locked: false,
  },
  {
    id: 'room_3', name: 'Strategy Talk', vibe: '📊',
    description: 'Discuss training methods, score breakdowns, optimal techniques.',
    online: 312, colorHex: '#7c3aed', tags: ['analysis','training','techniques'], locked: false,
  },
  {
    id: 'room_4', name: 'Wind Down', vibe: '🌙',
    description: 'Chill space. Decompress after sessions, share music, talk life.',
    online: 156, colorHex: '#06b6d4', tags: ['chill','music','relax'], locked: false,
  },
  {
    id: 'room_5', name: 'Star Meet', vibe: '⭐',
    description: 'Exclusive room. Top 100 players only.',
    online: 47, colorHex: '#fbbf24', tags: ['elite','exclusive','mentorship'], locked: true, lockRank: 'Diamond+',
  },
  {
    id: 'room_6', name: 'Global Connect', vibe: '🌐',
    description: 'Cross the 7 chains. Meet players from every corner of the world.',
    online: 1204, colorHex: '#ec4899', tags: ['social','global','connections'], locked: false,
  },
];

export const EVENTS = [
  {
    id: 'ev_1', icon: '🏆', type: 'tournament',
    title: 'Tokyo Invitational', subtitle: 'Season 3 Grand Finals',
    date: new Date(Date.now() + 3 * 86400000),
    prizePool: '¥500,000', participants: 128, maxParticipants: 128, full: true,
    region: 'Tokyo, Japan', colorHex: '#d4ff00',
  },
  {
    id: 'ev_2', icon: '🤝', type: 'meetup',
    title: 'Neuro Meetup — Shibuya', subtitle: 'IRL community event',
    date: new Date(Date.now() + 8 * 86400000),
    prizePool: null, participants: 67, maxParticipants: 150, full: false,
    region: 'Shibuya, Tokyo', colorHex: '#06b6d4',
  },
  {
    id: 'ev_3', icon: '🌍', type: 'championship',
    title: 'World Championship', subtitle: 'Global qualifier — Season 4',
    date: new Date(Date.now() + 21 * 86400000),
    prizePool: '$50,000 USD', participants: 892, maxParticipants: 1024, full: false,
    region: 'Global (Online)', colorHex: '#7c3aed',
  },
];
