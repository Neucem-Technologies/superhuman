export function Hud({ variant = "hero" }: { variant?: "hero" | "tile" | "sky" }) {
  return (
    <div className={`hud hud-${variant}`} aria-hidden>
      <span className="hud-grid" />
      <span className="hud-scan" />
      <span className="hud-frame" />
    </div>
  );
}
