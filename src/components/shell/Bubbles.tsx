const COUNT = [0, 1, 2, 3, 4, 5] as const;

export function Bubbles({ variant = "hero" }: { variant?: "hero" | "tile" | "sky" }) {
  return (
    <div className={`bubbles bubbles-${variant}`} aria-hidden>
      {COUNT.map((n) => (
        <span key={n} />
      ))}
    </div>
  );
}
