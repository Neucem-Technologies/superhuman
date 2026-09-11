import { useEffect, useState } from "react";

export type HourPoint = {
  hour: string;
  tempC: number;
  label: string;
  pop: number;
};

export type WeatherSnap = {
  tempC: number;
  highC: number;
  lowC: number;
  label: string;
  prediction: string;
  advice: string;
  pop: number;
  aqi: number;
  hours: HourPoint[];
  place: string;
};

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Haze",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

function labelFor(code: number) {
  return WMO[code] ?? "Mixed";
}

function hourLabel(iso: string) {
  const h = Number(iso.slice(11, 13));
  if (Number.isNaN(h)) return iso;
  const hr = h % 12 || 12;
  return `${hr} ${h >= 12 ? "pm" : "am"}`;
}

export function aqiLabel(aqi: number) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for some";
  if (aqi <= 200) return "Unhealthy";
  return "Hazardous";
}

export function weatherAdvice(high: number, pop: number, aqi: number) {
  if (pop >= 50) return "Rain risk. Gym over the park.";
  if (high >= 35) return "Heat. Keep the session indoor; water before the last set.";
  if (aqi >= 150) return "Air is poor. Prefer indoor work and a closed-window sit.";
  if (aqi >= 100) return "AQI is up. Keep the nidra indoor.";
  return "Fine to step out between blocks.";
}

function prediction(code: number, high: number, low: number, pop: number) {
  const sky = labelFor(code).toLowerCase();
  if (pop >= 60 || code >= 61) return `${labelFor(code)}. Rain likely. High ${high}°, ${low}° tonight.`;
  if (pop >= 30) return `${labelFor(code)}, showers possible. High ${high}°.`;
  if (code === 0 || code === 1) return `Clear stretch. High ${high}°, ${low}° tonight.`;
  return `${sky.charAt(0).toUpperCase()}${sky.slice(1)} holding. ${high}° peak, ${low}° tonight.`;
}

/** Delhi, late-monsoon afternoon — shown until Open-Meteo answers. */
export const WEATHER_FALLBACK: WeatherSnap = {
  tempC: 34,
  highC: 36,
  lowC: 27,
  label: "Haze",
  prediction: "Haze holding. 36° peak, easing after sunset.",
  advice: "Heat. Keep the session indoor; water before the last set.",
  pop: 10,
  aqi: 118,
  hours: [
    { hour: "3 pm", tempC: 34, label: "Haze", pop: 5 },
    { hour: "4 pm", tempC: 34, label: "Haze", pop: 8 },
    { hour: "5 pm", tempC: 33, label: "Haze", pop: 10 },
    { hour: "6 pm", tempC: 32, label: "Haze", pop: 10 },
    { hour: "7 pm", tempC: 31, label: "Haze", pop: 12 },
    { hour: "8 pm", tempC: 30, label: "Haze", pop: 12 },
  ],
  place: "Delhi",
};

const CACHE_KEY = "sh-weather";
const TTL_MS = 20 * 60_000;

function readCache(): WeatherSnap | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; snap: WeatherSnap };
    if (Date.now() - parsed.at > TTL_MS) return null;
    if (!parsed.snap?.hours) return null;
    if (!parsed.snap.place) parsed.snap.place = "Delhi";
    return parsed.snap;
  } catch {
    return null;
  }
}

function writeCache(snap: WeatherSnap) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), snap }));
  } catch {
    /* ignore */
  }
}

export function cachedWeather(): WeatherSnap | null {
  if (typeof window === "undefined") return null;
  return readCache();
}

function pickHours(times: string[], temps: number[], codes: number[], pops: number[]): HourPoint[] {
  const nowH = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" });
  const hour = Number(nowH);
  let start = times.findIndex((t) => Number(t.slice(11, 13)) >= hour);
  if (start < 0) start = 0;
  const out: HourPoint[] = [];
  for (let i = start; i < times.length && out.length < 6; i++) {
    out.push({
      hour: hourLabel(times[i] ?? ""),
      tempC: Math.round(temps[i] ?? 0),
      label: labelFor(codes[i] ?? 1),
      pop: Math.round(pops[i] ?? 0),
    });
  }
  return out.length ? out : WEATHER_FALLBACK.hours;
}

const DELHI = { lat: 28.6139, lon: 77.209, place: "Delhi", tz: "Asia/Kolkata" };

async function reversePlace(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return DELHI.place;
    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
    };
    return data.city || data.locality || data.principalSubdivision || DELHI.place;
  } catch {
    return DELHI.place;
  }
}

function locate(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ lat: DELHI.lat, lon: DELHI.lon });
      return;
    }
    const timer = window.setTimeout(() => resolve({ lat: DELHI.lat, lon: DELHI.lon }), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        window.clearTimeout(timer);
        resolve({ lat: DELHI.lat, lon: DELHI.lon });
      },
      { enableHighAccuracy: false, timeout: 3500, maximumAge: 30 * 60_000 },
    );
  });
}

export async function fetchDelhiWeather(): Promise<WeatherSnap> {
  const here = await locate();
  const isDelhi = Math.abs(here.lat - DELHI.lat) < 0.35 && Math.abs(here.lon - DELHI.lon) < 0.35;
  const place = isDelhi ? DELHI.place : await reversePlace(here.lat, here.lon);
  const tz = isDelhi ? DELHI.tz : "auto";
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${here.lat}&longitude=${here.lon}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(tz)}&forecast_days=1`;
  const aqiUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${here.lat}&longitude=${here.lon}&current=us_aqi&timezone=${encodeURIComponent(tz)}`;
  const [forecastRes, aqiRes] = await Promise.all([fetch(forecastUrl), fetch(aqiUrl)]);
  if (!forecastRes.ok) throw new Error("weather");
  const data = (await forecastRes.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
    hourly?: { time?: string[]; temperature_2m?: number[]; weather_code?: number[]; precipitation_probability?: number[] };
    daily?: {
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
    };
  };
  let aqi = WEATHER_FALLBACK.aqi;
  if (aqiRes.ok) {
    const aq = (await aqiRes.json()) as { current?: { us_aqi?: number } };
    if (typeof aq.current?.us_aqi === "number") aqi = Math.round(aq.current.us_aqi);
  }
  const tempC = Math.round(data.current?.temperature_2m ?? WEATHER_FALLBACK.tempC);
  const highC = Math.round(data.daily?.temperature_2m_max?.[0] ?? tempC + 2);
  const lowC = Math.round(data.daily?.temperature_2m_min?.[0] ?? tempC - 6);
  const code = data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? 45;
  const pop = data.daily?.precipitation_probability_max?.[0] ?? 0;
  const hours = pickHours(
    data.hourly?.time ?? [],
    data.hourly?.temperature_2m ?? [],
    data.hourly?.weather_code ?? [],
    data.hourly?.precipitation_probability ?? [],
  );
  const snap: WeatherSnap = {
    tempC,
    highC,
    lowC,
    label: labelFor(code),
    prediction: prediction(code, highC, lowC, pop),
    advice: weatherAdvice(highC, pop, aqi),
    pop,
    aqi,
    hours,
    place,
  };
  writeCache(snap);
  return snap;
}

type Listener = (snap: WeatherSnap) => void;
const listeners = new Set<Listener>();
let memory: WeatherSnap | null = null;
let booted = false;

function emit(snap: WeatherSnap) {
  memory = snap;
  for (const l of listeners) l(snap);
}

function boot() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  const cached = readCache();
  if (cached) emit(cached);
  void fetchDelhiWeather()
    .then(emit)
    .catch(() => emit(memory ?? WEATHER_FALLBACK));
}

export function useDelhiWeather(): WeatherSnap {
  const [snap, setSnap] = useState<WeatherSnap>(memory ?? WEATHER_FALLBACK);
  useEffect(() => {
    listeners.add(setSnap);
    boot();
    if (memory) setSnap(memory);
    return () => {
      listeners.delete(setSnap);
    };
  }, []);
  return snap;
}
