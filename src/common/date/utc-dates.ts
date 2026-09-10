export function getUtcPeriodDate(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function formatUtcPeriodDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
