import { DynamicColorIOS, Platform } from "react-native";

/**
 * StrictlyFuel design tokens.
 *
 * The app shares the Strictly product system with strictlyinc.com: a
 * near-black ground, raised graphite surfaces with hairline borders, and one
 * lime accent that carries the primary action and live data. Two rules keep
 * this readable everywhere:
 *
 *   - `text` / `textSoft` are the ONLY text colors on page and card surfaces.
 *   - `onLime` (and `onLimeSoft`) are the ONLY text/icon colors on lime,
 *     because lime is a fill, never a text color on light surfaces.
 */
export const strictlyLightPalette = {
  ink: "#08090A",
  inkSoft: "#1A1D20",
  background: "#F4F5F4",
  surface: "#FFFFFF",
  surfaceMuted: "#EBEDEB",
  cream: "#EEF4DA",         // lime-tinted callout blocks
  paper: "#FFFFFF",
  lime: "#CDF564",
  limeDim: "#B9E148",
  sage: "#3F7A4C",
  text: "#0B0C0D",
  textSoft: "#4F5652",
  muted: "#6A716D",
  onLime: "#08090A",
  onLimeSoft: "#2E3A12",
  border: "#DEE1DF",
  borderStrong: "#C4C8C5",
  line: "#DEE1DF",
  good: "#2B7A45",
  clay: "#B4583A",
  danger: "#B8392C",
  dangerSurface: "#F8DDD8",
  white: "#FFFFFF",
  black: "#08090A",
  glass: "rgba(8, 9, 10, 0.90)",
  inverseText: "#F4F5F4",
  inverseTextSoft: "#C9CECB",
  overlaySubtle: "rgba(8,9,10,0.06)",
  overlayLine: "rgba(255,255,255,0.14)",
  scrim: "rgba(0,0,0,0.55)",
  shadow: "#000000",
  inverseOverlay: "rgba(255,255,255,0.10)",
  onAccentOverlay: "rgba(8,9,10,0.12)",

  /**
   * Lime is a *fill* colour. On the light surfaces #CDF564 lands near 1.3:1,
   * so `accentText` is the accent for text, icons and selection borders on the
   * page — 7:1 on white — and stays lime in dark mode.
   */
  accentText: "#4A5E0C",

  /** Typed value color in text inputs (email/password, etc). */
  fieldText: "#0B0C0D",

  /** Stable tokens used by artwork and other non-adaptive brand assets. */
  creamLight: "#F4F5F4",
  onCreamLight: "#08090A",
} as const;

export const strictlyDarkPalette = {
  // Grounds, darkest to lightest.
  ink: "#050607",           // deepest — high-emphasis cards, and content on lime
  inkSoft: "#0C0E10",       // inset wells inside dark cards
  background: "#08090A",    // the page
  surface: "#101214",       // cards
  surfaceMuted: "#181B1E",  // chips, inputs, secondary fills
  cream: "#141A10",         // lime-tinted callout blocks
  paper: "#101214",

  // Accent.
  lime: "#CDF564",
  limeDim: "#B9E148",
  sage: "#8FE3A0",

  // Text.
  text: "#F4F5F4",
  textSoft: "#A2AAA6",
  muted: "#838B87",
  onLime: "#08090A",        // text/icons sitting on a lime surface
  onLimeSoft: "#2E3A12",

  // Lines.
  border: "#1F2326",
  borderStrong: "#2E3337",
  line: "#1F2326",

  // Status.
  good: "#8FE3A0",
  clay: "#F0A080",
  danger: "#FF8A7A",
  dangerSurface: "#2A1614",

  // Absolutes.
  white: "#FFFFFF",
  black: "#000000",
  glass: "rgba(8, 9, 10, 0.88)",
  inverseText: "#F4F5F4",
  inverseTextSoft: "#A2AAA6",
  overlaySubtle: "rgba(255,255,255,0.06)",
  overlayLine: "rgba(255,255,255,0.12)",
  scrim: "rgba(0,0,0,0.72)",
  shadow: "#000000",
  inverseOverlay: "rgba(255,255,255,0.08)",
  onAccentOverlay: "rgba(8,9,10,0.12)",

  /** Accent foreground. On the near-black grounds lime reads at 14:1+. */
  accentText: "#CDF564",

  /** Typed value color in text inputs (email/password, etc). */
  fieldText: "#F4F5F4",

  /** Stable tokens used by artwork and other non-adaptive brand assets. */
  creamLight: "#F4F5F4",
  onCreamLight: "#08090A",
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
  good: "#CDF564",
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
  medium: "#CDF564", // lime  — the brand middle
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
  xlarge: 20,
  pill: 999,
} as const;

/**
 * Space Grotesk carries the whole UI, matching strictlyinc.com and StrictlyVision.
 * Each weight is its own face, so styles pick a weight token instead of setting
 * fontWeight. The legacy names stay for components that pass a family through.
 */
export const strictlyType = {
  light: "SpaceGrotesk_300Light",
  regular: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  semibold: "SpaceGrotesk_600SemiBold",
  bold: "SpaceGrotesk_700Bold",
  sans: "SpaceGrotesk_400Regular",
  sansMedium: "SpaceGrotesk_500Medium",
  sansBold: "SpaceGrotesk_700Bold",
  mono: "SpaceGrotesk_600SemiBold",
} as const;

/** Layout constants for the docked bottom tab bar. */
export const strictlyLayout = {
  /** Height of the row of tab items, before the home-indicator inset is added. */
  tabBarHeight: 62,
} as const;
