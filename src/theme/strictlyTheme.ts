import { DynamicColorIOS, Platform } from "react-native";

/**
 * StrictlyFuel design tokens.
 *
 * The app is brand-green first: the page itself is the deep brand green and
 * cards lift off it, rather than the old near-white sheet. Two rules keep this
 * readable everywhere:
 *
 *   - `text` / `textSoft` are the ONLY text colors on dark surfaces.
 *   - `onLime` (and `onLimeSoft`) are the ONLY text/icon colors on lime,
 *     because lime is the one light surface in the system.
 */
export const strictlyLightPalette = {
  ink: "#123C2A",
  inkSoft: "#20543B",
  background: "#F2EAD7",
  surface: "#FBF5E7",
  surfaceMuted: "#E8DFC9",
  cream: "#EDE3CD",
  paper: "#FBF5E7",
  lime: "#C9DA5B",
  limeDim: "#AEBE48",
  sage: "#6F8876",
  text: "#143323",
  textSoft: "#5F7565",
  muted: "#7F8C81",
  onLime: "#0A1C12",
  onLimeSoft: "#2C4A32",
  border: "#D7CDB8",
  borderStrong: "#B8AD96",
  line: "#D7CDB8",
  good: "#287A48",
  clay: "#B96D4F",
  danger: "#B84B3D",
  dangerSurface: "#F4D8CE",
  white: "#FFF9EC",
  black: "#0A1C12",
  glass: "rgba(18, 60, 42, 0.90)",
  inverseText: "#FFF9EC",
  inverseTextSoft: "#DDE4D8",
  overlaySubtle: "rgba(18,60,42,0.08)",
  overlayLine: "rgba(255,249,236,0.14)",
  scrim: "rgba(4,14,9,0.62)",
  shadow: "#0A1C12",
  inverseOverlay: "rgba(255,249,236,0.10)",
  onAccentOverlay: "rgba(10,28,18,0.12)",

  /**
   * Lime is a *fill* colour. As a foreground it only works against the dark
   * greens: on the cream surfaces of light mode #C9DA5B lands at 1.2–1.4:1,
   * which is effectively invisible. `accentText` is the accent to use for
   * text, icons and selection borders that sit on the page — it reads at
   * 5.6:1 or better on every light surface and stays lime in dark mode.
   */
  accentText: "#4C5C10",

  /** Typed value color in text inputs (email/password, etc). Explicit near-black in light mode. */
  fieldText: "#0A0A0A",

  /**
   * Stable cream tokens used by artwork and other non-adaptive brand assets.
   */
  creamLight: "#F2EAD7",
  onCreamLight: "#0A1C12",
} as const;

export const strictlyDarkPalette = {
  // Brand greens, darkest to lightest.
  ink: "#0A1C12",           // deepest — high-emphasis cards, and content on lime
  inkSoft: "#15301F",       // inset wells inside dark cards
  background: "#102A1C",    // the page
  surface: "#1A3A28",       // cards
  surfaceMuted: "#234A33",  // chips, inputs, secondary fills
  cream: "#1E4230",         // tinted callout blocks (a dark green, despite the name)
  paper: "#1A3A28",

  // Accent.
  lime: "#D8E66B",
  limeDim: "#AEBC4E",
  sage: "#9BB89F",

  // Text.
  text: "#F4EBD7",
  textSoft: "#C5BDAA",
  muted: "#7E9384",
  onLime: "#0A1C12",        // text/icons sitting on a lime surface
  onLimeSoft: "#2C4A32",

  // Lines.
  border: "#2B5138",
  borderStrong: "#3B6749",
  line: "#2B5138",

  // Status.
  good: "#7FC98A",
  clay: "#E08A6E",
  danger: "#FF8A7A",
  dangerSurface: "#3A1F1C",

  // Absolutes.
  white: "#FFF9EC",
  black: "#0A0A0A",
  glass: "rgba(8, 22, 14, 0.88)",
  inverseText: "#FFF9EC",
  inverseTextSoft: "#C5BDAA",
  overlaySubtle: "rgba(255,249,236,0.08)",
  overlayLine: "rgba(255,249,236,0.14)",
  scrim: "rgba(4,14,9,0.72)",
  shadow: "#050A07",
  inverseOverlay: "rgba(255,249,236,0.10)",
  onAccentOverlay: "rgba(10,28,18,0.12)",

  /** Accent foreground. On the dark greens lime already reads at 7–11:1. */
  accentText: "#D8E66B",

  /** Typed value color in text inputs (email/password, etc). Explicit warm beige in dark mode. */
  fieldText: "#E9D8B4",

  /** Stable cream tokens used by artwork and other non-adaptive brand assets. */
  creamLight: "#F2EAD7",
  onCreamLight: "#0A1C12",
} as const;

export type StrictlyPalette = { [K in keyof typeof strictlyDarkPalette]: string };
export type StrictlyColorKey = keyof StrictlyPalette;

const adaptive = (key: StrictlyColorKey) => Platform.OS === "ios"
  ? DynamicColorIOS({ light: strictlyLightPalette[key], dark: strictlyDarkPalette[key] })
  : strictlyDarkPalette[key];

/** Semantic colors update automatically when the saved iOS appearance changes. */
export const strictlyColors = Object.fromEntries(
  (Object.keys(strictlyDarkPalette) as StrictlyColorKey[]).map((key) => [key, adaptive(key)])
) as { [K in StrictlyColorKey]: ReturnType<typeof adaptive> };

/** Readable semantic aliases for new UI. Existing token names remain supported. */
export const semanticColors = {
  textPrimary: strictlyColors.text,
  textSecondary: strictlyColors.textSoft,
  textMuted: strictlyColors.muted,
  background: strictlyColors.background,
  surface: strictlyColors.surface,
  surfaceSecondary: strictlyColors.surfaceMuted,
  border: strictlyColors.border,
  accent: strictlyColors.lime,
  accentText: strictlyColors.accentText,
  success: strictlyColors.good,
  error: strictlyColors.danger,
  inverseText: strictlyColors.inverseText,
} as const;

/**
 * Rating colors. Scores use a four-band scale so a number reads as a verdict
 * at a glance instead of every score sharing the same lime.
 */
export const scoreColors = {
  excellent: "#8FE3A0",
  good: "#D8E66B",
  fair: "#F0B860",
  poor: "#F08C72",
} as const;

export type ScoreBand = keyof typeof scoreColors;

export const scoreBand = (score: number): ScoreBand =>
  score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : "poor";

export const scoreColor = (score: number) => scoreColors[scoreBand(score)];

export const scoreLabel = (score: number) =>
  score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs work";

/** Text/icon color that stays readable on top of a given score color. */
export const onScoreColor = strictlyColors.ink;

/**
 * Carb digestion speeds get their own fixed, distinct hues so the split reads
 * as three different things rather than three shades of one thing.
 */
export const carbSpeedColors = {
  fast: "#F5C451",   // amber — burns quickly
  medium: "#D8E66B", // lime  — the brand middle
  slow: "#6FB8C9",   // teal  — slow release
  unknown: "#A8AAA3", // neutral — evidence is incomplete
} as const;

export const carbSpeedMeta = {
  fast: { label: "Fast", color: carbSpeedColors.fast, hint: "Lower-burden carbohydrate likely to become available sooner." },
  medium: { label: "Medium", color: carbSpeedColors.medium, hint: "Moderate food structure and expected availability." },
  slow: { label: "Slow", color: carbSpeedColors.slow, hint: "More structure or digestion burden, usually better with more time." },
  unknown: { label: "Unclassified", color: carbSpeedColors.unknown, hint: "The available evidence is not strong enough to estimate availability." },
} as const;

export const strictlyRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 22,
  pill: 999,
} as const;

export const strictlyType = {
  sans: "System",
  sansMedium: "System",
  sansBold: "System",
  mono: "Menlo",
} as const;

/** Layout constants for the docked bottom tab bar. */
export const strictlyLayout = {
  /** Height of the row of tab items, before the home-indicator inset is added. */
  tabBarHeight: 62,
} as const;
