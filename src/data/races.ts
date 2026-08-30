import type { RaceDefinition, RaceKind } from "../types/raceMode";

const single = (kind: "run" | "bike", label: string) => [{ kind, label, share: 1 }] as RaceDefinition["segments"];

export const RACES: RaceDefinition[] = [
  { id: "half_marathon", name: "Half Marathon", shortName: "Half", category: "running", distance: "21.1 km · 13.1 mi", defaultMinutes: 120, segments: single("run", "Run") },
  { id: "marathon", name: "Marathon", shortName: "Marathon", category: "running", distance: "42.2 km · 26.2 mi", defaultMinutes: 240, segments: single("run", "Run") },
  { id: "trail_50k", name: "Trail 50K", shortName: "50K", category: "running", distance: "50 km", defaultMinutes: 360, segments: single("run", "Trail run") },
  { id: "trail_100k", name: "Trail 100K", shortName: "100K", category: "running", distance: "100 km", defaultMinutes: 720, segments: single("run", "Trail run") },
  { id: "gran_fondo", name: "Gran Fondo", shortName: "Gran Fondo", category: "cycling", distance: "Long-course ride", defaultMinutes: 300, segments: single("bike", "Bike") },
  { id: "century_ride", name: "Century Ride", shortName: "Century", category: "cycling", distance: "100 mi · 161 km", defaultMinutes: 360, segments: single("bike", "Bike") },
  { id: "sprint_triathlon", name: "Sprint Triathlon", shortName: "Sprint Tri", category: "triathlon", distance: "750 m · 20 km · 5 km", defaultMinutes: 90, segments: [{ kind: "swim", label: "Swim", share: 0.18 }, { kind: "bike", label: "Bike", share: 0.45 }, { kind: "run", label: "Run", share: 0.37 }] },
  { id: "olympic_triathlon", name: "Olympic Triathlon", shortName: "Olympic Tri", category: "triathlon", distance: "1.5 km · 40 km · 10 km", defaultMinutes: 180, segments: [{ kind: "swim", label: "Swim", share: 0.16 }, { kind: "bike", label: "Bike", share: 0.5 }, { kind: "run", label: "Run", share: 0.34 }] },
  { id: "ironman_70_3", name: "Ironman 70.3", shortName: "70.3", category: "triathlon", distance: "1.9 km · 90 km · 21.1 km", defaultMinutes: 360, segments: [{ kind: "swim", label: "Swim", share: 0.12 }, { kind: "bike", label: "Bike", share: 0.54 }, { kind: "run", label: "Run", share: 0.34 }] },
  { id: "ironman", name: "Ironman", shortName: "Ironman", category: "triathlon", distance: "3.8 km · 180 km · 42.2 km", defaultMinutes: 720, segments: [{ kind: "swim", label: "Swim", share: 0.1 }, { kind: "bike", label: "Bike", share: 0.55 }, { kind: "run", label: "Run", share: 0.35 }] },
];

export const raceById = (id: RaceKind) => RACES.find((race) => race.id === id) || RACES[0];
