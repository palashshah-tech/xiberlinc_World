/* ============================================================
   Cloud Storage Utility — Firebase Firestore Edition
   ============================================================ */

import { db, authReady } from './firebase.js';
import { collection, addDoc, getDocs, query, orderBy, Timestamp, where } from "firebase/firestore";

const COLLECTION_NAME = "candidates";

export const Storage = {

  /**
   * Save the current session in progress (locally only)
   * We only push to Firebase once the test is COMPLETE.
   */
  saveCurrentSession(session) {
    localStorage.setItem('cogscreen_active_session', JSON.stringify(session));
  },

  getCurrentSession() {
    const s = localStorage.getItem('cogscreen_active_session');
    return s ? JSON.parse(s) : null;
  },

  clearCurrentSession() {
    localStorage.removeItem('cogscreen_active_session');
  },
  
  getLocalHistory() {
    const h = localStorage.getItem('cogscreen_history');
    return h ? JSON.parse(h) : [];
  },

  /**
   * SAVE CANDIDATE TO FIREBASE (Cloud)
   */
  async saveCandidate(candidate) {
    await authReady;
    try {
      const companyId = candidate.companyId || localStorage.getItem('cogscreen_company_id') || 'xiberlinc';
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...candidate,
        companyId,
        createdAt: Timestamp.now(),
        // Just in case, also store locally as a backup
      });
      console.log("Candidate saved to cloud with ID: ", docRef.id);
      
      // Save to local history for the user to see their progress
      const history = JSON.parse(localStorage.getItem('cogscreen_history') || '[]');
      history.unshift({
        id: docRef.id,
        scores: candidate.scores,
        completedAt: candidate.completedAt,
        taskCount: candidate.trials.length > 100 ? 3 : 1 // simple heuristic
      });
      localStorage.setItem('cogscreen_history', JSON.stringify(history.slice(0, 10))); // keep last 10
      
      return docRef.id;
    } catch (e) {
      console.error("Error saving to Firebase: ", e);
      // Fallback: Save to local storage if internet fails
      const local = JSON.parse(localStorage.getItem('cogscreen_failed_sync') || '[]');
      local.push(candidate);
      localStorage.setItem('cogscreen_failed_sync', JSON.stringify(local));
      throw e;
    }
  },

  /**
   * FETCH ALL CANDIDATES FROM FIREBASE (Cloud)
   */
  async getCandidates(companyId) {
    await authReady;
    try {
      const baseRef = collection(db, COLLECTION_NAME);
      const q = companyId && companyId !== 'xiberlinc'
        ? query(baseRef, where('companyId', '==', companyId), orderBy("createdAt", "desc"))
        : query(baseRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const candidates = [];
      querySnapshot.forEach((doc) => {
        candidates.push({ id: doc.id, ...doc.data() });
      });
      if (companyId === 'xiberlinc') {
        return candidates.map(c => ({ ...c, companyId: c.companyId || 'xiberlinc' }));
      }
      return candidates;
    } catch (e) {
      console.error("Error fetching from Firebase: ", e);
      return [];
    }
  },

  /**
   * Export tools (Admin only)
   */
  exportJSON(candidates) {
    return JSON.stringify(candidates, null, 2);
  },

  exportCSV(candidates) {
    if (!candidates || candidates.length === 0) return '';
    const headers = ['Name', 'Email', 'Handle', 'Age', 'Composite', 'KPure', 'KDist', 'RT', 'CompletedAt'];
    const rows = candidates.map(c => [
      c.name,
      c.email,
      c.handle,
      c.age,
      c.scores?.compositeScore?.toFixed(1) || 0,
      c.scores?.kPure?.toFixed(2) || 0,
      c.scores?.kDistractor?.toFixed(2) || 0,
      c.scores?.meanRT?.toFixed(0) || 0,
      c.completedAt || ''
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
};
