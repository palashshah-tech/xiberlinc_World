/* ============================================================
   World Graph Util — 7-chain distance helpers
   (Lightweight version for the public app — no mock player deps)
   ============================================================ */

const AVATAR_COLOURS = [
  '#7c3aed','#2563eb','#06b6d4','#fbbf24',
  '#ec4899','#d4ff00','#f97316','#a78bfa',
];

export function formatChainDistance(dist) {
  if (dist === 0) return "It's you!";
  if (dist === 1) return '1 chain away';
  if (!isFinite(dist)) return 'Not connected';
  return `${dist} chains away`;
}

export function getRecommendations(players, limit = 4) {
  return [...players]
    .sort((a, b) => b.trustScore - a.trustScore)
    .slice(0, limit);
}

export function getSocialGraphData(players) {
  const nodes = [];
  const edges = [];

  nodes.push({ id: 'you', label: 'YOU', x: 0.5, y: 0.5, radius: 18, color: '#d4ff00', isUser: true, ring: 0 });

  const ringColors = ['#7c3aed','#2563eb','#06b6d4','#fbbf24','#f97316'];
  const rings = [[], [], [], []];

  players.slice(0, 12).forEach((p, i) => {
    rings[Math.min(3, p.chainDistance - 1)]?.push(p);
  });

  rings.forEach((ring, ri) => {
    const angle = (2 * Math.PI) / Math.max(1, ring.length);
    const r = 0.12 + ri * 0.16;
    ring.forEach((p, i) => {
      const theta = angle * i - Math.PI / 2;
      const x = Math.max(0.05, Math.min(0.95, 0.5 + r * Math.cos(theta)));
      const y = Math.max(0.05, Math.min(0.95, 0.5 + r * Math.sin(theta)));
      nodes.push({ id: p.id, label: p.handle, x, y, radius: Math.max(6, 13 - ri * 2), color: ringColors[ri] || '#9a9a9f', ring: ri + 1, player: p });
      edges.push({ from: 'you', to: p.id, opacity: Math.max(0.1, 0.55 - ri * 0.1), color: ringColors[ri] || '#9a9a9f' });
    });
  });

  return { nodes, edges };
}
