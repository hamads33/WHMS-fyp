"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "whms-admin-theme";

// ── Color presets ────────────────────────────────────────────────────────────

export const COLOR_PRESETS = {
  zinc:   { label: "Zinc",    swatch: "#71717a" },
  slate:  { label: "Slate",   swatch: "#64748b" },
  blue:   { label: "Blue",    swatch: "#3b82f6" },
  indigo: { label: "Indigo",  swatch: "#6366f1" },
  violet: { label: "Violet",  swatch: "#8b5cf6" },
  purple: { label: "Purple",  swatch: "#a855f7" },
  pink:   { label: "Pink",    swatch: "#ec4899" },
  rose:   { label: "Rose",    swatch: "#f43f5e" },
  red:    { label: "Red",     swatch: "#ef4444" },
  orange: { label: "Orange",  swatch: "#f97316" },
  amber:  { label: "Amber",   swatch: "#f59e0b" },
  green:  { label: "Green",   swatch: "#22c55e" },
  teal:   { label: "Teal",    swatch: "#14b8a6" },
  cyan:   { label: "Cyan",    swatch: "#06b6d4" },
};

// ── Radius presets ───────────────────────────────────────────────────────────

export const RADIUS_PRESETS = [
  { label: "Sharp",   value: "0rem",     description: "No rounding" },
  { label: "Subtle",  value: "0.3rem",   description: "Slight curve" },
  { label: "Default", value: "0.625rem", description: "Balanced" },
  { label: "Rounded", value: "1rem",     description: "Soft look" },
  { label: "Pill",    value: "1.5rem",   description: "Very round" },
];

// ── Font scale presets ───────────────────────────────────────────────────────

export const FONT_SCALES = [
  { label: "Compact", value: "compact", description: "More content on screen" },
  { label: "Default", value: "default", description: "Balanced sizing" },
  { label: "Large",   value: "large",   description: "Easier to read" },
];

// ── Design styles ────────────────────────────────────────────────────────────
// These change the visual language of the entire app — shadows, borders,
// backgrounds, blur effects — independently of accent color.

export const DESIGN_STYLES = [
  {
    id:          "default",
    label:       "Default",
    description: "Clean shadcn/ui",
    // mini preview: subtle border, no shadow, white bg
    preview: {
      background:  "white",
      border:      "1.5px solid #e2e8f0",
      boxShadow:   "none",
      backdropFilter: "none",
    },
    previewDark: {
      background:  "#1e1e1e",
      border:      "1.5px solid #333",
      boxShadow:   "none",
    },
  },
  {
    id:          "elevated",
    label:       "Elevated",
    description: "Material-style shadows",
    preview: {
      background: "white",
      border:     "1.5px solid transparent",
      boxShadow:  "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
    },
    previewDark: {
      background: "#1e1e1e",
      border:     "1.5px solid transparent",
      boxShadow:  "0 4px 20px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)",
    },
  },
  {
    id:          "flat",
    label:       "Flat",
    description: "No shadows, sharp borders",
    preview: {
      background: "white",
      border:     "2px solid #94a3b8",
      boxShadow:  "none",
    },
    previewDark: {
      background: "#1e1e1e",
      border:     "2px solid #64748b",
      boxShadow:  "none",
    },
  },
  {
    id:          "glass",
    label:       "Glassmorphism",
    description: "Frosted glass surfaces",
    preview: {
      background:     "rgba(255,255,255,0.55)",
      border:         "1.5px solid rgba(255,255,255,0.6)",
      boxShadow:      "0 4px 24px rgba(99,102,241,0.15)",
      backdropFilter: "blur(12px)",
      backgroundImage: "linear-gradient(135deg,rgba(236,232,255,0.5),rgba(224,240,255,0.5))",
    },
    previewDark: {
      background:     "rgba(30,30,40,0.65)",
      border:         "1.5px solid rgba(255,255,255,0.1)",
      boxShadow:      "0 4px 24px rgba(0,0,0,0.4)",
      backdropFilter: "blur(12px)",
      backgroundImage: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(30,30,40,0.5))",
    },
  },
  {
    id:          "brutal",
    label:       "Brutalist",
    description: "Thick borders, raw aesthetic",
    preview: {
      background: "white",
      border:     "3px solid #0f172a",
      boxShadow:  "4px 4px 0px #0f172a",
    },
    previewDark: {
      background: "#0f172a",
      border:     "3px solid #f1f5f9",
      boxShadow:  "4px 4px 0px #f1f5f9",
    },
  },
  {
    id:          "soft",
    label:       "Soft UI",
    description: "Gentle shadows, tinted surfaces",
    preview: {
      background: "#f1f5f9",
      border:     "1.5px solid #e2e8f0",
      boxShadow:  "4px 4px 10px rgba(148,163,184,0.35), -2px -2px 6px rgba(255,255,255,0.8)",
    },
    previewDark: {
      background: "#1e2533",
      border:     "1.5px solid #2d3748",
      boxShadow:  "4px 4px 10px rgba(0,0,0,0.4), -2px -2px 6px rgba(255,255,255,0.03)",
    },
  },
];

// ── Full style presets ───────────────────────────────────────────────────────
// Each preset is a named combination of all dimensions for one-click apply.

export const STYLE_PRESETS = [
  {
    id: "default",    label: "Default",      description: "Clean & professional",
    color: "zinc",    radius: "0.625rem",    fontScale: "default",  designStyle: "default",
  },
  {
    id: "ocean",      label: "Ocean",        description: "Fresh blue, elevated",
    color: "blue",    radius: "1rem",        fontScale: "default",  designStyle: "elevated",
  },
  {
    id: "midnight",   label: "Midnight",     description: "Focused & compact",
    color: "indigo",  radius: "0.3rem",      fontScale: "compact",  designStyle: "flat",
  },
  {
    id: "forest",     label: "Forest",       description: "Calm & natural",
    color: "green",   radius: "0.625rem",    fontScale: "default",  designStyle: "soft",
  },
  {
    id: "rosegarden", label: "Rose Garden",  description: "Warm & romantic",
    color: "pink",    radius: "1.5rem",      fontScale: "default",  designStyle: "soft",
  },
  {
    id: "sunset",     label: "Sunset",       description: "Warm & elevated",
    color: "amber",   radius: "1rem",        fontScale: "default",  designStyle: "elevated",
  },
  {
    id: "arctic",     label: "Arctic",       description: "Cool & minimal",
    color: "cyan",    radius: "0.3rem",      fontScale: "default",  designStyle: "flat",
  },
  {
    id: "amethyst",   label: "Amethyst",     description: "Rich & frosted",
    color: "violet",  radius: "1.5rem",      fontScale: "large",    designStyle: "glass",
  },
  {
    id: "crimson",    label: "Crimson",      description: "Bold brutalist",
    color: "red",     radius: "0rem",        fontScale: "default",  designStyle: "brutal",
  },
  {
    id: "slate",      label: "Slate",        description: "Refined neutral",
    color: "slate",   radius: "0.625rem",    fontScale: "default",  designStyle: "default",
  },
];

// ── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext(null);

const DEFAULT_STATE = {
  colorTheme:  "zinc",
  radius:      "0.625rem",
  fontScale:   "default",
  designStyle: "default",
};

export function AdminThemeProvider({ children }) {
  const [colorTheme,  setColorThemeState]  = useState(DEFAULT_STATE.colorTheme);
  const [radius,      setRadiusState]      = useState(DEFAULT_STATE.radius);
  const [fontScale,   setFontScaleState]   = useState(DEFAULT_STATE.fontScale);
  const [designStyle, setDesignStyleState] = useState(DEFAULT_STATE.designStyle);
  const [mounted,     setMounted]          = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { colorTheme: c, radius: r, fontScale: f, designStyle: d } = JSON.parse(saved);
        if (c && COLOR_PRESETS[c])  { applyColor(c);       setColorThemeState(c); }
        if (r)                       { applyRadius(r);      setRadiusState(r); }
        if (f && f !== "default")    { applyFontScale(f);   setFontScaleState(f); }
        if (d && d !== "default")    { applyDesignStyle(d); setDesignStyleState(d); }
      }
    } catch { /* ignore */ }
  }, []);

  // ── DOM helpers ─────────────────────────────────────────────────────────────

  function applyColor(theme) {
    document.documentElement.setAttribute("data-color-theme", theme);
  }
  function applyRadius(r) {
    document.documentElement.style.setProperty("--radius", r);
  }
  function applyFontScale(scale) {
    if (scale === "default") {
      document.documentElement.removeAttribute("data-font-scale");
    } else {
      document.documentElement.setAttribute("data-font-scale", scale);
    }
  }
  function applyDesignStyle(style) {
    if (style === "default") {
      document.documentElement.removeAttribute("data-design-style");
    } else {
      document.documentElement.setAttribute("data-design-style", style);
    }
  }

  function persist(c, r, f, d) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ colorTheme: c, radius: r, fontScale: f, designStyle: d }));
    } catch { /* ignore */ }
  }

  // ── Setters ─────────────────────────────────────────────────────────────────

  function setColorTheme(theme) {
    if (!COLOR_PRESETS[theme]) return;
    setColorThemeState(theme);
    applyColor(theme);
    persist(theme, radius, fontScale, designStyle);
  }
  function setRadius(r) {
    setRadiusState(r);
    applyRadius(r);
    persist(colorTheme, r, fontScale, designStyle);
  }
  function setFontScale(scale) {
    setFontScaleState(scale);
    applyFontScale(scale);
    persist(colorTheme, radius, scale, designStyle);
  }
  function setDesignStyle(style) {
    setDesignStyleState(style);
    applyDesignStyle(style);
    persist(colorTheme, radius, fontScale, style);
  }

  /** Apply a full style preset (all dimensions) in one call. */
  function applyPreset(preset) {
    setColorThemeState(preset.color);
    setRadiusState(preset.radius);
    setFontScaleState(preset.fontScale);
    setDesignStyleState(preset.designStyle);
    applyColor(preset.color);
    applyRadius(preset.radius);
    applyFontScale(preset.fontScale);
    applyDesignStyle(preset.designStyle);
    persist(preset.color, preset.radius, preset.fontScale, preset.designStyle);
  }

  function resetTheme() {
    applyPreset({ ...DEFAULT_STATE });
  }

  /** Returns the preset id whose all four dimensions match current settings, or null. */
  const activePresetId =
    STYLE_PRESETS.find(p =>
      p.color === colorTheme &&
      p.radius === radius &&
      p.fontScale === fontScale &&
      p.designStyle === designStyle
    )?.id ?? null;

  return (
    <ThemeContext.Provider value={{
      colorTheme,  setColorTheme,
      radius,      setRadius,
      fontScale,   setFontScale,
      designStyle, setDesignStyle,
      applyPreset, resetTheme,
      activePresetId, mounted,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used inside AdminThemeProvider");
  return ctx;
}
