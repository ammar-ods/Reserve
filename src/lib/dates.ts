function atStartOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Occupied nights are [check-in, check-out). Same-day visits occupy that single day. */
export function occupancyRange(startDate: Date, endDate: Date): { start: Date; end: Date } {
  const start = atStartOfDay(startDate);
  const end = atStartOfDay(endDate);
  if (end.getTime() <= start.getTime()) {
    return { start, end: addDays(start, 1) };
  }
  return { start, end };
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  const a = occupancyRange(aStart, aEnd);
  const b = occupancyRange(bStart, bEnd);
  return a.start < b.end && b.start < a.end;
}

export function dateOccupiesDay(startDate: Date, endDate: Date, day: Date): boolean {
  const { start, end } = occupancyRange(startDate, endDate);
  const current = atStartOfDay(day);
  return current >= start && current < end;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return atStartOfDay(a).getTime() === atStartOfDay(b).getTime();
}

export function isValidBookingRange(startDate: Date, endDate: Date, allowSameDay: boolean): boolean {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return false;
  if (allowSameDay) return atStartOfDay(endDate) >= atStartOfDay(startDate);
  return atStartOfDay(endDate) > atStartOfDay(startDate);
}
