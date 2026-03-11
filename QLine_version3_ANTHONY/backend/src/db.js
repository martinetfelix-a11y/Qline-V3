const db = {
  users: [
    // { id, email, passHash, role, commerceId? }
  ],
  commerces: [
    { id: "c1", name: "Barbier Le Classique" },
    { id: "c2", name: "Garage Centre-Ville" },
    { id: "c3", name: "Cafe du Coin" },
  ],
  queues: { c1: [], c2: [], c3: [] },
  nowServing: { c1: null, c2: null, c3: null },
  ticketLedger: {},
  events: { c1: [], c2: [], c3: [] },
  models: {
    c1: { avg: 11 * 60, var: (4 * 60) ** 2 },
    c2: { avg: 12 * 60, var: (5 * 60) ** 2 },
    c3: { avg: 6 * 60, var: (3 * 60) ** 2 },
  },
  commerceState: {
    c1: { open: true, paused: false },
    c2: { open: true, paused: false },
    c3: { open: true, paused: false },
  },
};

module.exports = { db };
