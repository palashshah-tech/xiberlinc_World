/* ============================================================
   Xiberlinc World — Real Firebase Data Layer
   Queries the public-collector Firestore "candidates" collection
   and maps assessment scores to World player profiles
   ============================================================ */

import { db, authReady } from './firebase.js';
import {
  collection, getDocs, query, orderBy, limit, where
} from 'firebase/firestore';

const COLLECTION = 'candidates';

/* ── Rank tier from composite score ─────────────────────────── */
function getRankFromScore(composite) {
  if (composite >= 130) return { rank: 'Legend',   tier: 'star' };
  if (composite >= 115) return { rank: 'Master',   tier: 'star' };
  if (composite >= 100) return { rank: 'Diamond',  tier: 'rising' };
  if (composite >= 85)  return { rank: 'Platinum', tier: 'community' };
  if (composite >= 70)  return { rank: 'Gold',     tier: 'community' };
  return                       { rank: 'Silver',   tier: 'community' };
}

/* ── Avatar colour palette (deterministic from handle) ──────── */
const AVATAR_COLOURS = [
  '#7c3aed', '#2563eb', '#06b6d4', '#fbbf24',
  '#ec4899', '#d4ff00', '#f97316', '#a78bfa',
];
function avatarColor(handle = '') {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

/* ── Map a Firestore candidate doc → World player object ─────── */
function mapCandidate(doc, index) {
  const d = doc.data ? doc.data() : doc;
  const id = doc.id || `player_${index}`;

  const composite  = d.scores?.compositeScore ?? d.scores?.kPure ?? 0;
  const reactionMs = Math.round(d.scores?.meanRT ?? 220);
  const accuracy   = d.scores?.accuracyPure ?? d.scores?.accuracyDist ?? 0.5;
  const trust      = Math.min(0.99, 0.5 + accuracy * 0.5);

  const handle  = d.handle ? `@${d.handle.replace(/^@/, '')}` : `@player_${index}`;
  const name    = d.name || `Player ${index + 1}`;
  const avatar  = (name[0] || 'P').toUpperCase();
  const { rank, tier } = getRankFromScore(composite);
  const color   = avatarColor(handle);

  // Derive follower count from score (simulated social gravity)
  const followers = tier === 'star'
    ? Math.floor(composite * 320 + Math.random() * 5000)
    : tier === 'rising'
      ? Math.floor(composite * 80)
      : 0;

  // Tag inference from performance profile
  const tags = [];
  if (composite > 120)     tags.push('focus');
  if (reactionMs < 200)    tags.push('speed');
  if (accuracy > 0.8)      tags.push('precision');
  if (composite > 100)     tags.push('strategy');
  if (tags.length < 2)     tags.push('endurance');

  return {
    id,
    name,
    handle,
    avatar,
    avatarColor: color,
    wmi: Math.round(composite),
    reactionMs,
    trustScore: parseFloat(trust.toFixed(2)),
    accuracy: parseFloat((accuracy * 100).toFixed(1)),
    rank,
    tier,
    followers,
    region: d.metadata?.region || 'Global',
    country: d.metadata?.country || '—',
    specialty: rank === 'Legend' ? 'Visual Memory' : rank === 'Master' ? 'Executive Control' : 'Working Memory',
    tagline: `${rank} — ${Math.round(composite)} composite`,
    tags,
    completedAt: d.completedAt || null,
    chainDistance: Math.min(7, Math.max(1, index + 1)),  // simulated chain until graph is built
    connections: [],
    revenue: tier === 'star' ? Math.floor(followers * 7) : 0,
  };
}

/* ── Fetch top N players, ordered by composite score ─────────── */
export async function fetchTopPlayers(n = 20) {
  await authReady;
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy('scores.compositeScore', 'desc'),
      limit(n)
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc, i) => mapCandidate(doc, i));
  } catch (err) {
    console.warn('[WorldData] Composite query failed, trying kPure fallback:', err.code);
    // Fallback: order by kPure if compositeScore field doesn't exist
    try {
      const q2 = query(
        collection(db, COLLECTION),
        orderBy('scores.kPure', 'desc'),
        limit(n)
      );
      const snap2 = await getDocs(q2);
      return snap2.docs.map((doc, i) => mapCandidate(doc, i));
    } catch (err2) {
      console.warn('[WorldData] Both queries failed, fetching all:', err2.code);
      const snap3 = await getDocs(collection(db, COLLECTION));
      const all = snap3.docs.map((doc, i) => mapCandidate(doc, i));
      return all.sort((a, b) => b.wmi - a.wmi).slice(0, n);
    }
  }
}

/* ── Build leaderboard tiers from player list ────────────────── */
export function buildLeaderboard(players) {
  const ranked = [...players]
    .sort((a, b) => b.wmi - a.wmi)
    .map((p, i) => ({
      rank: i + 1,
      player: p,
      score: p.wmi,
      change: Math.floor(Math.random() * 5) - 2, // simulated movement
      isUser: false,
    }));

  return {
    region:  ranked.slice(0, 8),
    country: ranked.slice(0, 8),
    global:  ranked.slice(0, 8),
  };
}

/* ── Fetch live stats from the collection ───────────────────── */
export async function fetchLiveStats() {
  await authReady;
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    const total = snap.size;
    const recentCutoff = Date.now() - 24 * 60 * 60 * 1000; // last 24h
    let online = 0;
    snap.docs.forEach(doc => {
      const d = doc.data();
      const t = d.completedAt ? new Date(d.completedAt).getTime() : 0;
      if (t > recentCutoff) online++;
    });
    return {
      playersOnline: Math.max(online, 3),
      activeRooms: 6,
      starsLive: 3,
      matchesRunning: Math.floor(total * 0.02),
      totalPlayers: total,
      countriesRepresented: Math.min(47, Math.floor(total * 0.12) + 5),
    };
  } catch {
    return {
      playersOnline: 12,
      activeRooms: 6,
      starsLive: 3,
      matchesRunning: 4,
      totalPlayers: 0,
      countriesRepresented: 12,
    };
  }
}

export async function fetchUserProfile(email) {
  await authReady;
  try {
    const q = query(
      collection(db, 'candidates'),
      where('email', '==', email)
    );
    const snap = await getDocs(q);
    const history = [];
    snap.forEach(doc => {
      const d = doc.data();
      history.push({
        id: doc.id,
        score: Math.round(d.scores?.compositeScore ?? d.scores?.kPure ?? 0),
        accuracy: d.scores?.accuracyPure ?? d.scores?.accuracyDist ?? 0.5,
        reactionMs: Math.round(d.scores?.meanRT ?? 220),
        completedAt: d.completedAt || (d.createdAt && typeof d.createdAt.toDate === 'function' ? d.createdAt.toDate().toISOString() : new Date().toISOString())
      });
    });
    // Sort in memory by completedAt descending
    history.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    return history;
  } catch (e) {
    console.error("Failed to fetch user profile:", e);
    return [];
  }
}
