import { MapPin, Users } from "lucide-react";
import { useAppStore } from "@/spine/store";
import { SELF_ID } from "@/spine/types";
import { cn } from "@/lib/utils";

const WEST = 77.1;
const EAST = 77.35;
const SOUTH = 28.48;
const NORTH = 28.72;

const PINS: Record<string, { lat: number; lon: number; spot: string; ago: string }> = {
  rajan: { lat: 28.5574, lon: 77.1639, spot: "Home", ago: "now" },
  priya: { lat: 28.5276, lon: 77.2194, spot: "Saket", ago: "8 min" },
  anaya: { lat: 28.5918, lon: 77.2276, spot: "School", ago: "live" },
};

function mercY(lat: number) {
  const r = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + r / 2));
}

function project(lat: number, lon: number) {
  const x = ((lon - WEST) / (EAST - WEST)) * 100;
  const y = ((mercY(NORTH) - mercY(lat)) / (mercY(NORTH) - mercY(SOUTH))) * 100;
  return { left: `${Math.min(94, Math.max(6, x))}%`, top: `${Math.min(90, Math.max(10, y))}%` };
}

const EMBED = `https://www.openstreetmap.org/export/embed.html?bbox=${WEST}%2C${SOUTH}%2C${EAST}%2C${NORTH}&layer=mapnik`;

export function FamilyMapTile() {
  const people = useAppStore((s) => s.people);
  const family = people.filter((p) => p.circle === "family" || p.id === SELF_ID);
  const marks = family
    .map((p) => {
      const pin = PINS[p.id];
      if (!pin) return null;
      return { ...p, ...pin, pos: project(pin.lat, pin.lon) };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <section className="widget-tile overflow-hidden rounded-xl p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Users className="size-3.5 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wide text-foreground">Family</span>
        <span className="ml-auto text-xs text-muted">{marks.length} on map</span>
      </div>
      <div className="family-map">
        <iframe title="Family map" src={EMBED} loading="lazy" tabIndex={-1} />
        <div className="family-map-veil" />
        {marks.map((m) => (
          <div key={m.id} className="family-pin" style={m.pos}>
            <span className={cn("family-pin-dot", m.ago === "live" && "is-live")}>{m.initials}</span>
            <span className="family-pin-label">{m.shortName}</span>
          </div>
        ))}
      </div>
      <ul className="mt-2 space-y-1">
        {marks.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-xs">
            <MapPin className="size-3 text-accent" />
            <span className="font-medium text-foreground">{m.shortName}</span>
            <span className="text-muted">
              {m.spot} · {m.ago}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
