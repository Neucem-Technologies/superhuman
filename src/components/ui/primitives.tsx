import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { TILE_BLUR_STEPS, TILE_FILL_STEPS, type TileBlur, type TileFill } from "@/lib/tile-opacity";
import { TILE_PALETTES, type TilePaletteId } from "@/lib/tile-palette";
import { THEME_MODES, type ThemeMode } from "@/lib/theme";
import { FONT_SCALE_STEPS, type FontScale } from "@/lib/font-scale";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 font-medium select-none transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground",
        secondary: "bg-elevated text-foreground shadow-border",
        ghost: "bg-transparent text-muted hover:text-foreground hover:bg-elevated",
        danger: "bg-bad/15 text-bad",
      },
      size: {
        sm: "h-8 px-2.5 text-xs rounded-sm",
        md: "h-10 px-3.5 text-sm rounded-md",
        lg: "h-11 px-4 text-sm rounded-md",
        icon: "size-10 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "accent";
  className?: string;
}) {
  const tones = {
    neutral: "bg-elevated text-muted",
    ok: "bg-ok/15 text-ok",
    warn: "bg-warn/15 text-warn",
    bad: "bg-bad/15 text-bad",
    accent: "bg-accent/15 text-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium tabular-nums",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md bg-elevated px-3 text-sm text-foreground shadow-border placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md bg-elevated px-3 py-2 text-sm text-foreground shadow-border placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    />
  );
}

export function Avatar({ initials, size = "sm" }: { initials: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-elevated font-medium text-muted shadow-border",
        size === "sm" ? "size-7 text-xs" : "size-9 text-sm",
      )}
    >
      {initials}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="glass flex gap-0.5 overflow-x-auto rounded-md p-0.5 no-scrollbar">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "h-8 shrink-0 rounded-sm px-2.5 text-xs font-medium transition-colors duration-150",
            value === o.id ? "bg-surface text-foreground" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TileFillPicker({
  pct,
  setFill,
  blur,
  setBlur,
}: {
  pct: TileFill;
  setFill: (n: TileFill) => void;
  blur: TileBlur;
  setBlur: (n: TileBlur) => void;
}) {
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs text-subtle">Opacity</p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Tile opacity">
        {TILE_FILL_STEPS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={pct === n}
            onClick={() => setFill(n)}
            className={cn(
              "h-8 min-w-10 rounded-sm px-2 text-xs tabular-nums",
              pct === n ? "bg-foreground text-background" : "bg-elevated text-muted shadow-border",
            )}
          >
            {n}%
          </button>
        ))}
      </div>
      <p className="text-xs text-subtle">Blur</p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Tile blur">
        {TILE_BLUR_STEPS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={blur === n}
            onClick={() => setBlur(n)}
            className={cn(
              "h-8 min-w-10 rounded-sm px-2 text-xs tabular-nums",
              blur === n ? "bg-foreground text-background" : "bg-elevated text-muted shadow-border",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TilePalettePicker({
  id,
  setPalette,
}: {
  id: TilePaletteId;
  setPalette: (n: TilePaletteId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Tile colour" onClick={(e) => e.stopPropagation()}>
      {TILE_PALETTES.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={id === p.id}
          aria-label={p.label}
          title={p.label}
          onClick={() => setPalette(p.id)}
          className={cn(
            "flex h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md px-2",
            id === p.id ? "shadow-border" : "",
          )}
          style={id === p.id ? { boxShadow: "0 0 0 2px var(--color-foreground)" } : undefined}
        >
          <span className="size-6 rounded-full" style={{ background: p.swatch, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)" }} />
          <span className="text-[10px] leading-none text-muted">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ThemePicker({
  mode,
  setTheme,
}: {
  mode: ThemeMode;
  setTheme: (n: ThemeMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Dynamic theme">
      {THEME_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          onClick={() => setTheme(m.id)}
          className={cn(
            "h-8 rounded-sm px-2.5 text-xs",
            mode === m.id ? "bg-foreground text-background" : "bg-elevated text-muted shadow-border",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function FontScalePicker({
  pct,
  setScale,
}: {
  pct: FontScale;
  setScale: (n: FontScale) => void;
}) {
  const labels: Record<FontScale, string> = {
    90: "S",
    100: "Default",
    115: "L",
    130: "XL",
  };
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Text size">
      {FONT_SCALE_STEPS.map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={pct === n}
          onClick={() => setScale(n)}
          className={cn(
            "h-8 min-w-10 rounded-sm px-2 text-xs",
            pct === n ? "bg-foreground text-background" : "bg-elevated text-muted shadow-border",
          )}
        >
          {labels[n]}
        </button>
      ))}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("glass rounded-lg p-3", className)}>{children}</div>;
}

export function Row({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn("flex w-full items-start gap-3 rounded-md px-1 py-2 text-left", className)}
    >
      {children}
    </Comp>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-background/80"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass relative z-10 flex max-h-[min(85dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-xl p-4"
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <h2 className="text-base font-medium tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-10 items-center px-2 text-xs text-muted">
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <div className="mt-4 flex shrink-0 justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-subtle">{children}</h2>
      {right}
    </div>
  );
}
