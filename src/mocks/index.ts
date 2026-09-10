/**
 * Mock APIs for email, calendar, banks, HealthKit, UltraHuman, maps,
 * payments, YouTube and Spotify. No real credentials. Local-only stand-ins.
 */

export function fetchAppleHealth() {
  return {
    source: "apple" as const,
    hrv: 38,
    rhr: 61,
    steps: 6420,
    sleepHours: 5.6,
    stress: 74,
    recovery: 48,
    sleepScore: 58,
    deepSleepH: 0.9,
    remSleepH: 1.0,
    lightSleepH: 3.4,
    spo2: 97,
    respRate: 15,
    strain: 8.8,
    calories: 1680,
    activeMin: 41,
    vo2: 43,
  };
}

export function fetchUltraHuman() {
  return {
    source: "ultrahuman" as const,
    hrv: 32,
    rhr: 64,
    steps: 6180,
    sleepHours: 5.5,
    stress: 78,
    recovery: 41,
    sleepScore: 54,
    deepSleepH: 0.8,
    remSleepH: 0.9,
    lightSleepH: 3.3,
    spo2: 96,
    skinTempDeltaC: 0.3,
    respRate: 16,
    strain: 9.4,
    calories: 1720,
    activeMin: 38,
    vo2: 42,
    glucoseMgDl: 108,
  };
}

export function mockUsageHours() {
  return [0, 0, 0, 0, 0, 1, 2, 4, 9, 14, 13, 8, 4, 3, 6, 10, 12, 7, 3, 2, 1, 0, 0, 0];
}

export function mockSearch(query: string) {
  const q = query.toLowerCase();
  if (q.includes("meditat") || q.includes("stress") || q.includes("calm") || q.includes("nidra")) {
    return [
      { title: "Yoga Nidra — 10 minutes", source: "youtube" as const, meta: "Ally Boothroyd · subscribed" },
      { title: "Music for Inner Stillness", source: "spotify" as const, meta: "In your library" },
    ];
  }
  if (q.includes("podcast") || q.includes("huberman")) {
    return [{ title: "Huberman Lab — Stress & the nervous system", source: "spotify" as const, meta: "Subscribed" }];
  }
  if (q.includes("travel") || q.includes("goa") || q.includes("gokarna")) {
    return [{ title: "Gokarna slow days — walking tour", source: "youtube" as const, meta: "Watch later" }];
  }
  return [
    { title: "Morning liturgy, spoken", source: "spotify" as const, meta: "In your library" },
    { title: "The Cloud of Unknowing — read aloud", source: "youtube" as const, meta: "Subscribed" },
  ];
}

export const DESTINATIONS = [
  {
    name: "Gokarna",
    vibe: "beach",
    blurb: "Quiet beaches, ashrams nearby, walkable. Anaya-friendly Om Beach mornings.",
    estimate: 98000,
    itinerary: [
      { day: 1, title: "Arrive + Om Beach", detail: "IndiGo to GOX, cab to homestay, sunset swim." },
      { day: 2, title: "Kudle + temple", detail: "Morning walk, Mahabaleshwar temple, slow lunch." },
      { day: 3, title: "Half-day boat", detail: "Half moon beach, early flight back optional." },
    ],
  },
  {
    name: "Kovalam",
    vibe: "beach",
    blurb: "Lighthouse beach, Ayurvedic shala, easy flights via TRV.",
    estimate: 125000,
    itinerary: [
      { day: 1, title: "Lighthouse", detail: "Evening beach + lighthouse climb." },
      { day: 2, title: "Backwaters day", detail: "Poovar estuary, kid-safe boat." },
      { day: 3, title: "Spa morning", detail: "Short treatment, late flight." },
    ],
  },
  {
    name: "Alibaug",
    vibe: "beach",
    blurb: "Ferry from Mumbai, closer, lower spend, monsoon-shoulder still green.",
    estimate: 42000,
    itinerary: [
      { day: 1, title: "Ferry + fort", detail: "Mandwa ferry, Kolaba fort at low tide." },
      { day: 2, title: "Nagaon beach", detail: "Quiet stretch, seafood lunch." },
    ],
  },
];
