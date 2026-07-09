/* ============================================================
   Access Control Utility — Stubbed for Public Edition
   ============================================================ */

export async function validateAccessCode() {
  return { ok: true };
}

export async function ensureAccessAndSession() {
  return { ok: true };
}

export function startHeartbeat() {
  // No heartbeats needed in public edition
}

export function endSession() {
  // No sessions to end in public edition
}

export function validateAdminAccess() {
  return true;
}
