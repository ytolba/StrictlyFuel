import type { FuelInterval, GutTrainingLevel, RaceDefinition, RaceFuelItem, RaceFuelPlan, RaceFuelSegment, RaceSegmentKind } from "../types/raceMode";

const round5 = (value: number) => Math.round(value / 5) * 5;
const clamp = (low: number, value: number, high: number) => Math.max(low, Math.min(high, value));

function targetRate(kind: RaceSegmentKind, totalMinutes: number, level: GutTrainingLevel) {
  if (kind === "swim" || totalMinutes < 60) return 0;
  const base = totalMinutes < 150 ? 45 : totalMinutes < 210 ? 60 : 70;
  const tolerance = level === "new" ? -15 : level === "high" ? 15 : 0;
  const modality = kind === "bike" ? 5 : kind === "run" ? -5 : 0;
  const ceiling = kind === "bike" ? 90 : 80;
  return round5(clamp(30, base + tolerance + modality, ceiling));
}

function packFor(kind: RaceSegmentKind, target: number, durationMinutes: number): { items: RaceFuelItem[]; carbs: number } {
  if (!target) return { items: [], carbs: 0 };
  const desired = Math.ceil(target * 1.08);
  const items: RaceFuelItem[] = [];
  let remaining = desired;

  if (kind === "bike" || durationMinutes > 180) {
    const bottles = Math.min(Math.ceil(durationMinutes / (kind === "bike" ? 100 : 120)), Math.floor(remaining / 40));
    if (bottles) {
      items.push({ name: kind === "bike" ? "carb drink bottle" : "40 g drink-mix serving", count: bottles, carbsEach: 40, totalCarbs: bottles * 40, note: kind === "bike" ? "One measured 40 g carbohydrate bottle." : "Stage refills at aid stations or in drop bags." });
      remaining -= bottles * 40;
    }
    const chews = Math.min(Math.max(2, Math.ceil(durationMinutes / 180)), Math.floor(remaining / 40));
    if (chews) {
      items.push({ name: "chew pack", count: chews, carbsEach: 40, totalCarbs: chews * 40, note: "Split each pack across two feedings." });
      remaining -= chews * 40;
    }
    if (kind === "run" && durationMinutes >= 300) {
      const riceCakes = Math.min(Math.ceil(durationMinutes / 180), Math.floor(remaining / 30));
      if (riceCakes) {
        items.push({ name: "tested rice cake or soft bar", count: riceCakes, carbsEach: 30, totalCarbs: riceCakes * 30, note: "Use only a low-fat, low-fiber option you have tolerated in training." });
        remaining -= riceCakes * 30;
      }
    }
  }

  const gels = Math.max(0, Math.ceil(remaining / 23));
  if (gels) items.push({ name: "23 g carb gel", count: gels, carbsEach: 23, totalCarbs: gels * 23, note: "Take with water unless the product is explicitly isotonic." });
  const carbs = items.reduce((sum, item) => sum + item.totalCarbs, 0);
  return { items, carbs };
}

export function buildRaceFuelPlan(input: { race: RaceDefinition; durationMinutes: number; bodyWeightKg: number; gutTraining: GutTrainingLevel; intervalMinutes: FuelInterval }): RaceFuelPlan {
  const durationMinutes = Math.max(45, Math.round(input.durationMinutes));
  let elapsed = 0;
  const timeline: RaceFuelPlan["timeline"] = [];
  const segments: RaceFuelSegment[] = input.race.segments.map((segment, index) => {
    const segmentMinutes = index === input.race.segments.length - 1 ? durationMinutes - elapsed : Math.round(durationMinutes * segment.share);
    const start = elapsed;
    elapsed += segmentMinutes;
    const rate = targetRate(segment.kind, durationMinutes, input.gutTraining);
    const targetCarbs = round5(rate * segmentMinutes / 60);
    const packed = packFor(segment.kind, targetCarbs, segmentMinutes);
    if (rate > 0) {
      for (let minute = input.intervalMinutes; minute <= segmentMinutes; minute += input.intervalMinutes) {
        timeline.push({ minute: start + minute, label: `${segment.label} · ${minute} min`, carbs: Math.round(rate * input.intervalMinutes / 60) });
      }
    }
    return { kind: segment.kind, label: segment.label, durationMinutes: segmentMinutes, rate, targetCarbs, packCarbs: packed.carbs, items: packed.items };
  });
  const totalTargetCarbs = segments.reduce((sum, segment) => sum + segment.targetCarbs, 0);
  return {
    race: input.race,
    durationMinutes,
    preRaceCarbs: round5(clamp(40, input.bodyWeightKg * 2, 250)),
    totalTargetCarbs,
    totalPackedCarbs: segments.reduce((sum, segment) => sum + segment.packCarbs, 0),
    segments,
    timeline,
    intervalMinutes: input.intervalMinutes,
    evidenceNote: input.gutTraining === "new" ? "This starts below the upper research range. Practice the exact products and timing in long training before increasing intake." : "This plan uses duration-scaled carbohydrate targets and a small packing buffer. Practice the exact products, concentration, and timing before race day.",
  };
}

export const RACE_FUELING_SOURCES = [
  { title: "Carbohydrates for training and competition", url: "https://doi.org/10.1080/02640414.2011.585473" },
  { title: "World Athletics 2019 nutrition consensus", url: "https://worldathletics.org/about-iaaf/documents/health-science" },
  { title: "Gut-training systematic review", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10185635/" },
] as const;
