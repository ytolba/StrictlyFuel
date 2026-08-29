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
} as const;

export const strictlyDarkPalette = {
  // Brand greens, darkest to lightest.
  ink: "#0A1C12",           // deepest — high-emphasis cards, and content on lime
  inkSoft: "#15301F",       // inset wells inside dark cards
  background: "#102A1C",    // the page
  surface: "#1A3A28",       // cards
  surfaceMuted: "#234A33",  // chips, inputs, secondary fills
  cream: "#1E4230",         // tinted callout blocks
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
} as const;

export const carbSpeedMeta = {
  fast: { label: "Fast", color: carbSpeedColors.fast, hint: "Hits the bloodstream quickly — best close to training." },
  medium: { label: "Medium", color: carbSpeedColors.medium, hint: "Steady release — the everyday middle of a pre-workout meal." },
  slow: { label: "Slow", color: carbSpeedColors.slow, hint: "Digests gradually — useful when you have hours to spare." },
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

/** Layout constants shared between the tab bar and the screens it floats over. */
export const strictlyLayout = {
  tabBarHeight: 62,
  tabBarMargin: 12,
} as const;
