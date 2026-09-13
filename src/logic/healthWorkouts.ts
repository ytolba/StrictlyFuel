export type DatedWorkout = { startDate: string; endDate: string };

export function localDayBounds(now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { start, end };
}

export function selectTodayWorkouts<T extends DatedWorkout>(workouts: T[], now = new Date()) {
  const { start, end } = localDayBounds(now);
  return workouts
    .filter((item) => new Date(item.endDate).getTime() > start.getTime() && new Date(item.startDate).getTime() < end.getTime())
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
}
