import { NativeModules, Platform } from "react-native";
import { mockHealth } from "./mock";
import type { HealthBridgeNative, HealthPermission } from "./types";

const native = NativeModules.LivinSyncHealth as HealthBridgeNative | undefined;

export const health: HealthBridgeNative = native ?? mockHealth;

export const usingNativeBridge = Boolean(native);

export const platformLabel =
  Platform.OS === "ios" ? "Apple Health" : Platform.OS === "android" ? "Health Connect" : "Simulator";

export const ALL_PERMISSIONS: HealthPermission[] = ["steps", "heartRate", "workout"];

export function startOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
