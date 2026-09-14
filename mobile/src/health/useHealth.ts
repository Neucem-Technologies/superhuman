import { useCallback, useEffect, useState } from "react";
import { ALL_PERMISSIONS, endOfDay, health, startOfDay } from "./HealthBridge";
import type { DaySummary, HeartSample, WorkoutRecord } from "./types";

export function useHealth() {
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [samples, setSamples] = useState<HeartSample[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const from = startOfDay();
      const to = endOfDay();
      const status = await health.getAuthorizationStatus();
      setAuthorized(status.granted);
      const [day, hr, wo] = await Promise.all([
        health.getSummary(from, to),
        health.getHeartRate(from, to),
        health.getWorkouts(from, to),
      ]);
      setSummary(day);
      setSamples(hr.samples);
      setWorkouts(wo.workouts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health read failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const request = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await health.authorize(ALL_PERMISSIONS);
      setAuthorized(res.granted);
      await refresh();
      return res.granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permission request failed");
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, samples, workouts, error, busy, authorized, refresh, request };
}
