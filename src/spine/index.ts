/**
 * SUPERHUMAN architecture
 * -----------------------
 * Modular monolith. Timeline is the only cross-module contract.
 * Identity, notification bus, permissions, and the rules engine live here.
 */
export { useAppStore, personById } from "./store";
export type { AppState } from "./store";
export * from "./types";
export * from "./format";
export * from "./permissions";
export * from "./rules";
export * from "./commands";
export * from "./correct";
