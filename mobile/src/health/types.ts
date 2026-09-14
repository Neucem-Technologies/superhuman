export type HealthPermission = "steps" | "heartRate" | "workout";

export type HeartSample = {
  bpm: number;
  at: number;
};

export type WorkoutRecord = {
  id: string;
  activity: string;
  start: number;
  end: number;
  caloriesKcal?: number;
  distanceM?: number;
  source: "healthkit" | "health-connect" | "manual";
};

export type DaySummary = {
  date: string;
  steps: number;
  restingBpm?: number;
  avgBpm?: number;
  latestBpm?: number;
  workouts: number;
  activeMinutes: number;
  caloriesKcal?: number;
  platform: "ios" | "android" | "unknown";
  authorized: boolean;
};

export type HealthBridgeNative = {
  authorize(types: HealthPermission[]): Promise<{ granted: boolean; platform: string }>;
  getAuthorizationStatus(): Promise<{ granted: boolean; platform: string }>;
  getSteps(fromMs: number, toMs: number): Promise<{ count: number }>;
  getHeartRate(fromMs: number, toMs: number): Promise<{ samples: HeartSample[] }>;
  getWorkouts(fromMs: number, toMs: number): Promise<{ workouts: WorkoutRecord[] }>;
  getSummary(fromMs: number, toMs: number): Promise<DaySummary>;
  writeSteps(count: number, startMs: number, endMs: number): Promise<{ ok: true }>;
  writeHeartRate(bpm: number, atMs: number): Promise<{ ok: true }>;
  writeWorkout(input: {
    activity: string;
    startMs: number;
    endMs: number;
    caloriesKcal?: number;
    distanceM?: number;
  }): Promise<{ id: string }>;
};
