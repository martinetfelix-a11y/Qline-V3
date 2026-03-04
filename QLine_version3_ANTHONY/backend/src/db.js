const db = {
  users: [
    // { id, email, passHash, role, commerceId? }
  ],
  commerces: [
    { id: "c1", name: "Barbier Le Classique" },
    { id: "c2", name: "Garage Centre-Ville" },
    { id: "c3", name: "Café du Coin" }
  ],

  // Queue state per commerce
  queues: { c1: [], c2: [], c3: [] },

  // Events used for stats
  events: { c1: [], c2: [], c3: [] },

  // Simple "AI" model per commerce (mean + variance of service duration)
  models: {
    c1: { avg: 11 * 60, var: (4 * 60) ** 2 },
    c2: { avg: 12 * 60, var: (5 * 60) ** 2 },
    c3: { avg: 6 * 60, var: (3 * 60) ** 2 }
  },

  // Settings/state per commerce
  commerceState: {
    c1: { open: true, paused: false },
    c2: { open: true, paused: false },
    c3: { open: true, paused: false }
  }
};

module.exports = { db };
