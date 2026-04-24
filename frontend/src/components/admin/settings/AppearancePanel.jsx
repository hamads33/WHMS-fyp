"use client";

import { Check, Loader2, RotateCcw, Sun, Moon, Monitor, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import {
  useAdminTheme,
  COLOR_PRESETS, RADIUS_PRESETS, FONT_SCALES, STYLE_PRESETS, DESIGN_STYLES,
} from "@/lib/context/ThemeContext";

function SectionLabel({ children, hint }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold">{children}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

export default function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const {
    colorTheme,  setColorTheme,
    radius,      setRadius,
    fontScale,   setFontScale,
    designStyle, setDesignStyle,
    applyPreset, resetTheme,
    activePresetId, mounted,
  } = useAdminTheme();
  const { toast } = useToast();

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading theme settings…
      </div>
    );
  }

  function handleReset() {
    resetTheme();
    setTheme("system");
    toast({ title: "Theme reset", description: "Appearance restored to defaults." });
  }

  return (
    <div className="space-y-8">

      {/* ── 1. Style Presets ──────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="One-click combinations of color, radius, and font size.">
          Style Presets
        </SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {STYLE_PRESETS.map(preset => {
            const swatch = COLOR_PRESETS[preset.color]?.swatch ?? "#71717a";
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                aria-pressed={isActive}
                className={[
                  "group relative flex flex-col items-start rounded-xl border-2 overflow-hidden text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary shadow-sm"
                    : "border-border hover:border-primary/50 hover:shadow-sm",
                ].join(" ")}
              >
                {/* Color stripe */}
                <div
                  className="w-full h-8 shrink-0"
                  style={{ backgroundColor: swatch, opacity: 0.9 }}
                />
                {/* Label */}
                <div className="px-3 py-2 w-full">
                  <p className={`text-xs font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                    {preset.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate leading-tight">
                    {preset.description}
                  </p>
                </div>
                {/* Active checkmark */}
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 2. Mode ───────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Light, dark, or follow your system setting.">
          Mode
        </SectionLabel>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { value: "light",  label: "Light",  Icon: Sun },
            { value: "dark",   label: "Dark",   Icon: Moon },
            { value: "system", label: "System", Icon: Monitor },
          ].map(({ value, label, Icon }) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={isActive}
                className={[
                  "flex flex-col items-center gap-2 rounded-xl border-2 py-4 px-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                ].join(" ")}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 3. Design Style ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Changes the visual language of the entire interface — shadows, surfaces, and effects.">
          Design Style
        </SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DESIGN_STYLES.map(style => {
            const isActive = designStyle === style.id;
            const isDark   = theme === "dark";
            const preview  = isDark ? (style.previewDark ?? style.preview) : style.preview;
            return (
              <button
                key={style.id}
                onClick={() => setDesignStyle(style.id)}
                aria-pressed={isActive}
                className={[
                  "group relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary shadow-sm"
                    : "border-border hover:border-primary/50",
                ].join(" ")}
              >
                {/* Mini preview area */}
                <div
                  className="w-full h-16 relative overflow-hidden"
                  style={{
                    background: isDark ? "#111" : "#f8fafc",
                    backgroundImage: style.id === "glass"
                      ? (isDark
                          ? "radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.3), transparent)"
                          : "radial-gradient(ellipse at 30% 40%, rgba(196,181,253,0.5), transparent)")
                      : undefined,
                  }}
                >
                  {/* Fake card inside preview */}
                  <div
                    className="absolute inset-3"
                    style={{
                      background:     preview.background,
                      border:         preview.border,
                      boxShadow:      preview.boxShadow,
                      backdropFilter: preview.backdropFilter,
                      backgroundImage: preview.backgroundImage,
                      borderRadius:   "6px",
                    }}
                  >
                    {/* Fake content lines */}
                    <div className="absolute left-2.5 top-2.5 space-y-1">
                      <div
                        className="h-1.5 w-10 rounded-full"
                        style={{ background: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)" }}
                      />
                      <div
                        className="h-1 w-7 rounded-full"
                        style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Label */}
                <div className="px-3 py-2.5">
                  <p className={`text-xs font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                    {style.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {style.description}
                  </p>
                </div>

                {/* Active checkmark */}
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 4. Accent Color ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Sets the primary accent color used on buttons, links, and active states.">
          Accent Color
        </SectionLabel>
        <div className="grid grid-cols-7 gap-2">
          {Object.entries(COLOR_PRESETS).map(([key, preset]) => {
            const isActive = colorTheme === key;
            return (
              <button
                key={key}
                onClick={() => setColorTheme(key)}
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={isActive}
                className={[
                  "group flex flex-col items-center gap-1.5 rounded-lg py-2 px-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-primary/8" : "hover:bg-muted/60",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-all",
                    isActive ? "ring-2 ring-primary scale-110" : "ring-1 ring-black/10 group-hover:scale-105",
                  ].join(" ")}
                  style={{ backgroundColor: preset.swatch }}
                />
                <span className={`text-[10px] font-medium leading-none ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 5. Border Radius ──────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Controls the roundness of buttons, cards, and input fields.">
          Border Radius
        </SectionLabel>
        <div className="flex flex-wrap gap-2">
          {RADIUS_PRESETS.map(preset => {
            const isActive = radius === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => setRadius(preset.value)}
                aria-pressed={isActive}
                title={preset.description}
                className={[
                  "flex items-center gap-2 rounded-lg border-2 px-3.5 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                ].join(" ")}
              >
                <span
                  className="h-5 w-5 border-2 border-current shrink-0"
                  style={{ borderRadius: preset.value }}
                />
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 6. Font Size ──────────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Scales the entire interface proportionally using rem units.">
          Font Size
        </SectionLabel>
        <div className="grid grid-cols-3 gap-2.5">
          {FONT_SCALES.map(scale => {
            const isActive = fontScale === scale.value;
            const sizeClass = scale.value === "compact" ? "text-xs" : scale.value === "large" ? "text-base" : "text-sm";
            return (
              <button
                key={scale.value}
                onClick={() => setFontScale(scale.value)}
                aria-pressed={isActive}
                className={[
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 px-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                ].join(" ")}
              >
                <span className={`font-bold leading-none ${sizeClass} ${isActive ? "text-primary" : "text-foreground"}`}>Aa</span>
                <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{scale.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{scale.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 7. Live Preview ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Reflects all your customizations in real time.">
          Live Preview
        </SectionLabel>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {/* Buttons row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="outline">Outline</Button>
            <Button size="sm" variant="secondary">Secondary</Button>
            <Button size="sm" variant="ghost">Ghost</Button>
            <Button size="sm" variant="destructive">Danger</Button>
          </div>
          {/* Elements row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Input className="h-8 w-40 text-xs" placeholder="Input field…" readOnly />
          </div>
          {/* Mini card */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Sample Card</p>
              <p className="text-xs text-muted-foreground">This is how cards will look.</p>
            </div>
            <Button size="sm" variant="outline">Action</Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── 8. Reset ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Reset to Defaults</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Restores the Default preset — zinc accent, shadcn style, balanced radius, default font size, and system mode.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0">
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

    </div>
  );
}
