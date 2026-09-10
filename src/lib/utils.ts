import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  const raw =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${raw.slice(0, 8)}`;
}

export function str(p: Record<string, unknown>, k: string, fallback = ""): string {
  const v = p[k];
  return typeof v === "string" ? v : fallback;
}

export function num(p: Record<string, unknown>, k: string, fallback = 0): number {
  const v = p[k];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function bool(p: Record<string, unknown>, k: string, fallback = false): boolean {
  const v = p[k];
  return typeof v === "boolean" ? v : fallback;
}
