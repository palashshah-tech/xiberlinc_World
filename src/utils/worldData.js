/* ============================================================
   Xiberlinc World — Real Firebase Data Layer
   Queries the public-collector Firestore "candidates" collection
   and maps assessment scores to World player profiles
   ============================================================ */

import { db, authReady, auth } from './firebase.js';
import {
  collection, getDocs, query, orderBy, limit, where, addDoc, updateDoc, doc, deleteDoc, getDoc, setDoc, serverTimestamp
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
    email: d.email || '',
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

/* ════════════════════════════════════════════════════════════
   SOCIAL CONNECTIONS & CONNECTION REQUESTS LAYER
   ════════════════════════════════════════════════════════════ */

// Search candidates dynamically for connecting
export async function searchCandidatesByHandle(handleQuery) {
  await authReady;
  const cleanQuery = handleQuery.replace(/^@/, '').trim().toLowerCase();
  if (!cleanQuery) return [];
  
  try {
    const snap = await getDocs(collection(db, 'candidates'));
    const matches = [];
    const currentUserEmail = auth.currentUser?.email;

    snap.forEach(doc => {
      const data = doc.data();
      const handle = (data.handle || '').toLowerCase();
      const name = (data.name || '').toLowerCase();
      const email = (data.email || '').toLowerCase();

      // Don't search for oneself
      if (email === currentUserEmail) return;

      if (handle.includes(cleanQuery) || name.includes(cleanQuery) || email.includes(cleanQuery)) {
        const composite = data.scores?.compositeScore ?? data.scores?.kPure ?? 0;
        const { rank } = getRankFromScore(composite);
        matches.push({
          uid: doc.id,
          email: data.email || '',
          handle: data.handle ? `@${data.handle.replace(/^@/, '')}` : `@player`,
          name: data.name || 'Anonymous Player',
          wmi: Math.round(composite),
          rank
        });
      }
    });

    const seen = new Set();
    const uniqueMatches = [];
    matches.forEach(m => {
      if (m.email && !seen.has(m.email)) {
        seen.add(m.email);
        uniqueMatches.push(m);
      }
    });

    return uniqueMatches.slice(0, 10);
  } catch (e) {
    console.error("Search candidates failed:", e);
    return [];
  }
}

// Send connection request to another player
export async function sendConnectionRequest(receiver) {
  await authReady;
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required.");

  if (user.email === receiver.email) {
    throw new Error("You cannot connect with yourself.");
  }

  // Check if request already exists (either direction)
  const q1 = query(
    collection(db, 'connection_requests'),
    where('senderEmail', '==', user.email),
    where('receiverEmail', '==', receiver.email)
  );
  const q2 = query(
    collection(db, 'connection_requests'),
    where('senderEmail', '==', receiver.email),
    where('receiverEmail', '==', user.email)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  if (!snap1.empty || !snap2.empty) {
    throw new Error("A connection request already exists or is active.");
  }

  const senderHandle = '@' + user.email.split('@')[0];

  await addDoc(collection(db, 'connection_requests'), {
    senderUid: user.uid,
    senderEmail: user.email,
    senderName: user.displayName || 'Gamer',
    senderHandle,
    receiverUid: receiver.uid || '',
    receiverEmail: receiver.email,
    receiverName: receiver.name,
    receiverHandle: receiver.handle,
    status: 'pending',
    createdAt: serverTimestamp()
  });
}

// Respond to pending connection requests
export async function respondToConnectionRequest(requestId, status) {
  await authReady;
  const ref = doc(db, 'connection_requests', requestId);
  await updateDoc(ref, { status });
}

// Fetch all incoming pending requests
export async function fetchIncomingRequests() {
  await authReady;
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, 'connection_requests'),
    where('receiverEmail', '==', user.email),
    where('status', '==', 'pending')
  );

  try {
    const snap = await getDocs(q);
    const requests = [];
    snap.forEach(d => {
      requests.push({ id: d.id, ...d.data() });
    });
    return requests;
  } catch (e) {
    console.error("Failed to fetch incoming connection requests:", e);
    return [];
  }
}

// Fetch all accepted connections (friends)
export async function fetchUserConnections() {
  await authReady;
  const user = auth.currentUser;
  if (!user) return [];

  const q1 = query(
    collection(db, 'connection_requests'),
    where('senderEmail', '==', user.email),
    where('status', '==', 'accepted')
  );
  const q2 = query(
    collection(db, 'connection_requests'),
    where('receiverEmail', '==', user.email),
    where('status', '==', 'accepted')
  );

  try {
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const connections = [];
    
    snap1.forEach(d => {
      const data = d.data();
      connections.push({
        uid: data.receiverUid,
        email: data.receiverEmail,
        handle: data.receiverHandle,
        name: data.receiverName,
        requestId: d.id
      });
    });

    snap2.forEach(d => {
      const data = d.data();
      connections.push({
        uid: data.senderUid,
        email: data.senderEmail,
        handle: data.senderHandle,
        name: data.senderName,
        requestId: d.id
      });
    });

    return connections;
  } catch (e) {
    console.error("Failed to fetch connections:", e);
    return [];
  }
}

// Fetch all emails (accepted connections or pending requests) to ignore in recommendations
export async function fetchIgnoreEmails() {
  await authReady;
  const user = auth.currentUser;
  if (!user || !user.email) return [];

  const emails = new Set();
  emails.add(user.email.toLowerCase());

  const qSender = query(
    collection(db, 'connection_requests'),
    where('senderEmail', '==', user.email)
  );
  const qReceiver = query(
    collection(db, 'connection_requests'),
    where('receiverEmail', '==', user.email)
  );

  try {
    const [snap1, snap2] = await Promise.all([getDocs(qSender), getDocs(qReceiver)]);
    snap1.forEach(doc => {
      const data = doc.data();
      if (data.status === 'pending' || data.status === 'accepted') {
        if (data.receiverEmail) emails.add(data.receiverEmail.toLowerCase());
      }
    });
    snap2.forEach(doc => {
      const data = doc.data();
      if (data.status === 'pending' || data.status === 'accepted') {
        if (data.senderEmail) emails.add(data.senderEmail.toLowerCase());
      }
    });
  } catch (e) {
    console.error("Failed to fetch ignore emails:", e);
  }
  return Array.from(emails);
}

/* ════════════════════════════════════════════════════════════
   CUSTOM USER-CREATED NEURO ROOMS LAYER
   ════════════════════════════════════════════════════════════ */

// Create custom Neuro channel
export async function createCustomRoom(roomName, invitedEmails) {
  await authReady;
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required.");

  const creatorHandle = '@' + user.email.split('@')[0];
  const colors = ['#00f5ff', '#ff007f', '#a78bfa', '#06b6d4', '#ec4899', '#fbbf24'];
  const randColor = colors[Math.floor(Math.random() * colors.length)];

  const roomRef = await addDoc(collection(db, 'custom_rooms'), {
    name: roomName,
    creatorUid: user.uid,
    creatorHandle,
    creatorEmail: user.email,
    invitedEmails: invitedEmails || [],
    createdAt: serverTimestamp(),
    colorHex: randColor,
    description: `Private terminal active. Created by ${creatorHandle}.`,
    icon: 'terminal'
  });

  return roomRef.id;
}

// Fetch custom Neuro channels visible to current user
export async function fetchCustomRooms() {
  await authReady;
  const user = auth.currentUser;
  if (!user) return [];

  // Query rooms where user is creator
  const q1 = query(
    collection(db, 'custom_rooms'),
    where('creatorEmail', '==', user.email)
  );

  // Query rooms where user is invited
  const q2 = query(
    collection(db, 'custom_rooms'),
    where('invitedEmails', 'array-contains', user.email)
  );

  try {
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const rooms = [];
    const seenIds = new Set();

    const addRoom = (d) => {
      if (seenIds.has(d.id)) return;
      seenIds.add(d.id);
      const data = d.data();
      rooms.push({
        id: d.id,
        name: data.name,
        creatorHandle: data.creatorHandle,
        creatorEmail: data.creatorEmail,
        colorHex: data.colorHex,
        description: data.description,
        icon: data.icon,
        isCustom: true
      });
    };

    snap1.forEach(addRoom);
    snap2.forEach(addRoom);

    return rooms;
  } catch (e) {
    console.error("Failed to fetch custom rooms:", e);
    return [];
  }
}

/* ════════════════════════════════════════════════════════════
   COLLABORATIVE WHITEBOARD SYNCHRONIZATION
   ════════════════════════════════════════════════════════════ */

// Save stroke to room's whiteboard stream
export async function saveWhiteboardStroke(roomId, stroke) {
  await authReady;
  const user = auth.currentUser;
  const senderHandle = user ? '@' + user.email.split('@')[0] : '@player';
  
  await addDoc(collection(db, 'whiteboard_strokes'), {
    roomId,
    strokeId: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    color: stroke.color || '#ffffff',
    lineWidth: stroke.lineWidth || 2,
    points: stroke.points || [],
    senderHandle,
    createdAt: serverTimestamp()
  });
}

// Clear all whiteboard drawings for a room
export async function clearWhiteboard(roomId) {
  await authReady;
  const q = query(
    collection(db, 'whiteboard_strokes'),
    where('roomId', '==', roomId)
  );
  
  try {
    const snap = await getDocs(q);
    const deletePromises = [];
    snap.forEach(d => {
      deletePromises.push(deleteDoc(doc(db, 'whiteboard_strokes', d.id)));
    });
    await Promise.all(deletePromises);
  } catch (e) {
    console.error("Failed to clear whiteboard:", e);
  }
}

// Delete custom user-created room from Firestore
export async function deleteCustomRoom(roomId) {
  await authReady;
  try {
    await deleteDoc(doc(db, 'custom_rooms', roomId));
    await clearWhiteboard(roomId);
  } catch (e) {
    console.error("Failed to delete custom room:", e);
    throw e;
  }
}

/* ════════════════════════════════════════════════════════════
   TRADE ARENA & CARD EXCHANGE LAYER
   ════════════════════════════════════════════════════════════ */

// Publish a trade listing to Firestore
export async function createTradeListing({ cardId, cardName, cardRarity, askingOffer }) {
  await authReady;
  const user = auth.currentUser;
  const sellerEmail = user?.email || localStorage.getItem('cogscreen_user_email') || 'anonymous@player';
  const sellerName = user?.displayName || sellerEmail.split('@')[0];
  const sellerHandle = '@' + sellerEmail.split('@')[0];

  const docRef = await addDoc(collection(db, 'trade_listings'), {
    sellerUid: user?.uid || 'anon',
    sellerEmail,
    sellerName,
    sellerHandle,
    cardId,
    cardName,
    cardRarity,
    askingOffer: askingOffer || 'Open to all card offers',
    status: 'active',
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

// Fetch all active trade listings posted across the network
export async function fetchActiveTradeListings() {
  await authReady;
  try {
    const q = query(
      collection(db, 'trade_listings'),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    const listings = [];
    snap.forEach(d => {
      listings.push({ id: d.id, ...d.data() });
    });
    listings.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return listings;
  } catch (e) {
    console.error("Failed to fetch trade listings:", e);
    return [];
  }
}

// Accept a trade listing in Firestore
export async function acceptTradeListing(listingId) {
  await authReady;
  const user = auth.currentUser;
  const buyerEmail = user?.email || localStorage.getItem('cogscreen_user_email') || 'anonymous@player';
  
  const ref = doc(db, 'trade_listings', listingId);
  await updateDoc(ref, {
    status: 'completed',
    buyerEmail,
    completedAt: serverTimestamp()
  });
}

