import type { DaySummary, HealthBridgeNative, HeartSample, WorkoutRecord } from "./types";

function dayBounds(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return { from: d.getTime(), to: now };
}

const workouts: WorkoutRecord[] = [
  {
    id: "mock-run",
    activity: "running",
    start: Date.now() - 6 * 3600_000,
    end: Date.now() - 5.4 * 3600_000,
    caloriesKcal: 420,
    distanceM: 5200,
    source: "manual",
  },
];

export const mockHealth: HealthBridgeNative = {
  async authorize() {
    return { granted: true, platform: "unknown" };
  },
  async getAuthorizationStatus() {
    return { granted: true, platform: "unknown" };
  },
  async getSteps() {
    return { count: 7421 };
  },
  async getHeartRate() {
    const samples: HeartSample[] = [
      { bpm: 62, at: Date.now() - 3600_000 },
      { bpm: 118, at: Date.now() - 5.7 * 3600_000 },
    ];
    return { samples };
  },
  async getWorkouts() {
    return { workouts };
  },
  async getSummary() {
    const { from } = dayBounds();
    const summary: DaySummary = {
      date: new Date(from).toISOString().slice(0, 10),
      steps: 7421,
      restingBpm: 58,
      avgBpm: 72,
      latestBpm: 62,
      workouts: 1,
      activeMinutes: 36,
      caloriesKcal: 420,
      platform: "unknown",
      authorized: true,
    };
    return summary;
  },
  async writeSteps() {
    return { ok: true };
  },
  async writeHeartRate() {
    return { ok: true };
  },
  async writeWorkout(input) {
    const rec: WorkoutRecord = {
      id: `mock-${Date.now()}`,
      activity: input.activity,
      start: input.startMs,
      end: input.endMs,
      caloriesKcal: input.caloriesKcal,
      distanceM: input.distanceM,
      source: "manual",
    };
    workouts.unshift(rec);
    return { id: rec.id };
  },
};
