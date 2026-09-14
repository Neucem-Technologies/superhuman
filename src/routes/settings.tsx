import { Link, createFileRoute } from "@tanstack/react-router";
import { Button, FontScalePicker, ThemePicker, TileFillPicker, TilePalettePicker } from "@/components/ui/primitives";
import { useContrast } from "@/lib/contrast";
import { useFontScale } from "@/lib/font-scale";
import { useTheme } from "@/lib/theme";
import { useTileFill } from "@/lib/tile-opacity";
import { useTilePalette } from "@/lib/tile-palette";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings · LivinSync" }],
  }),
  component: Settings,
});

function Settings() {
  const { high, toggle } = useContrast();
  const { mode, setTheme } = useTheme();
  const { pct: fontPct, setScale } = useFontScale();
  const { pct, setFill, blur, setBlur } = useTileFill();
  const { id, setPalette } = useTilePalette();

  return (
    <main className="min-h-dvh px-6 py-8 text-foreground md:px-12">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-subtle">LivinSync</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted">Display lives here. Account stays on Profile.</p>
        </div>

        <section className="rounded-md bg-elevated p-4 shadow-border">
          <p className="text-xs uppercase tracking-wide text-subtle">Display</p>

          <p className="mt-3 text-xs uppercase tracking-wide text-subtle">Dynamic theme</p>
          <p className="mt-1 text-sm text-muted">Auto follows the time of day in India. Or lock a sky.</p>
          <div className="mt-3">
            <ThemePicker mode={mode} setTheme={setTheme} />
          </div>

          <p className="mt-5 text-xs uppercase tracking-wide text-subtle">Text size</p>
          <p className="mt-1 text-sm text-muted">Accessibility scaling. Type stays high contrast.</p>
          <div className="mt-3">
            <FontScalePicker pct={fontPct} setScale={setScale} />
          </div>

          <p className="mt-5 text-xs uppercase tracking-wide text-subtle">Contrast</p>
          <p className="mt-1 text-sm text-muted">Ink on white. Stronger type. Photos off.</p>
          <Button className="mt-3" size="sm" variant={high ? "primary" : "secondary"} onClick={toggle}>
            High contrast {high ? "on" : "off"}
          </Button>

          <p className="mt-5 text-xs uppercase tracking-wide text-subtle">Tile glass</p>
          <p className="mt-1 text-sm text-muted">Wallpaper peeks through. Type stays bright.</p>
          <div className="mt-3">
            <TileFillPicker pct={pct} setFill={setFill} blur={blur} setBlur={setBlur} />
          </div>

          <p className="mt-5 text-xs uppercase tracking-wide text-subtle">Tile colour</p>
          <p className="mt-1 text-sm text-muted">Glass hue and the wash on each tile.</p>
          <div className="mt-3">
            <TilePalettePicker id={id} setPalette={setPalette} />
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link to="/profile" className="inline-block text-sm text-muted">
            Back to profile
          </Link>
          <Link to="/" className="inline-block text-sm text-muted">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
