export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function todayISO(): string {
  return startOfDay(new Date()).toISOString().split("T")[0];
}
