import { EventEmitter } from 'events';
import { prisma } from './prisma';
import { dateOccupiesDay, occupancyRange, rangesOverlap } from './dates';
import { isDayUse, isPrivateCampTypeId, PRIVATE_CAMP_SLUG } from './campsites';
import { RealtimeEvent, ActiveLockDTO, VisitPeriod } from './types';

declare global {
  // eslint-disable-next-line no-var
  var realtimeEmitter: EventEmitter | undefined;
}

export const realtimeEmitter = globalThis.realtimeEmitter ?? new EventEmitter();
realtimeEmitter.setMaxListeners(100);
if (process.env.NODE_ENV !== 'production') {
  globalThis.realtimeEmitter = realtimeEmitter;
}

export function broadcastRealtimeEvent(event: RealtimeEvent) {
  realtimeEmitter.emit('message', event);
}

function occupiedOnDay(
  items: { startDate: Date; endDate: Date; visitPeriod?: VisitPeriod | null }[],
  day: Date,
  period?: VisitPeriod | null
) {
  return items.filter((item) => {
    if (!dateOccupiesDay(item.startDate, item.endDate, day)) return false;
    if (period && item.visitPeriod !== period) return false;
    return true;
  }).length;
}

export async function checkCapacityAvailability(
  campsiteId: string,
  startDate: Date,
  endDate: Date,
  excludeHostAdminId?: string,
  excludeReservationId?: string,
  visitPeriod?: VisitPeriod | null
): Promise<{ available: boolean; reason?: string; congestedDate?: string }> {
  const campsite = await prisma.campsite.findUnique({
    where: { id: campsiteId },
    select: {
      dailyCapacity: true,
      morningCapacity: true,
      eveningCapacity: true,
      slug: true,
      name: true,
    },
  });

  if (!campsite) {
    return { available: false, reason: 'Campsite not found' };
  }

  const now = new Date();

  await prisma.activeLock.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  const activeReservations = await prisma.reservation.findMany({
    where: {
      campsiteId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      customerName: true,
      visitPeriod: true,
    },
  });

  const activeLocks = await prisma.activeLock.findMany({
    where: {
      campsiteId,
      expiresAt: { gt: now },
      ...(excludeHostAdminId ? { hostAdminId: { not: excludeHostAdminId } } : {}),
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      hostAdminId: true,
      hostName: true,
      visitPeriod: true,
    },
  });

  const dayUse = isDayUse(campsite.slug);
  const periods: VisitPeriod[] = visitPeriod ? [visitPeriod] : dayUse ? ['MORNING', 'EVENING'] : [];

  const range = occupancyRange(startDate, endDate);
  const current = new Date(range.start);
  while (current < range.end) {
    if (dayUse) {
      const blocked = periods.filter((period) => {
        const cap = period === 'MORNING' ? campsite.morningCapacity : campsite.eveningCapacity;
        const resCount = occupiedOnDay(activeReservations, current, period);
        const lockCount = occupiedOnDay(activeLocks, current, period);
        return resCount + lockCount >= cap;
      });
      // A specific period must be free. With no period yet, the day stays open while either period has room.
      const allRequestedPeriodsFull = visitPeriod ? blocked.length > 0 : blocked.length === periods.length;
      if (allRequestedPeriodsFull) {
        const dateStr = current.toISOString().split('T')[0];
        return {
          available: false,
          reason: 'CAPACITY_REACHED',
          congestedDate: dateStr,
        };
      }
    } else {
      const resCount = occupiedOnDay(activeReservations, current);
      const lockCount = occupiedOnDay(activeLocks, current);
      if (resCount + lockCount >= campsite.dailyCapacity) {
        const dateStr = current.toISOString().split('T')[0];
        return {
          available: false,
          reason: `Daily capacity limit (${campsite.dailyCapacity}) reached for ${dateStr}. (Active: ${resCount}, In-progress holds: ${lockCount})`,
          congestedDate: dateStr,
        };
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return { available: true };
}

export async function checkCampTypeAvailability(
  campsiteId: string,
  campType: string,
  startDate: Date,
  endDate: Date,
  excludeReservationId?: string
): Promise<{ available: boolean; congestedDate?: string }> {
  if (!isPrivateCampTypeId(campType)) {
    return { available: false };
  }

  const overlapping = await prisma.reservation.findMany({
    where: {
      campsiteId,
      campType,
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { startDate: true, endDate: true },
  });

  const clash = overlapping.find((r) => rangesOverlap(r.startDate, r.endDate, startDate, endDate));
  if (!clash) return { available: true };

  const range = occupancyRange(clash.startDate, clash.endDate);
  return { available: false, congestedDate: range.start.toISOString().split('T')[0] };
}

export async function bookedCampTypesForRange(
  campsiteId: string,
  startDate: Date,
  endDate: Date,
  excludeReservationId?: string
): Promise<string[]> {
  const campsite = await prisma.campsite.findUnique({
    where: { id: campsiteId },
    select: { slug: true },
  });
  if (campsite?.slug !== PRIVATE_CAMP_SLUG) return [];

  const reservations = await prisma.reservation.findMany({
    where: {
      campsiteId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      campType: { not: null },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { campType: true, startDate: true, endDate: true },
  });

  const taken = new Set<string>();
  for (const reservation of reservations) {
    if (reservation.campType && rangesOverlap(reservation.startDate, reservation.endDate, startDate, endDate)) {
      taken.add(reservation.campType);
    }
  }
  return [...taken];
}

export async function acquireLock(params: {
  campsiteId: string;
  startDate: Date;
  endDate: Date;
  hostAdminId: string;
  hostName: string;
  visitPeriod?: VisitPeriod | null;
}): Promise<{ success: boolean; lock?: ActiveLockDTO; error?: string; congestedDate?: string }> {
  const { campsiteId, startDate, endDate, hostAdminId, hostName, visitPeriod } = params;

  const check = await checkCapacityAvailability(campsiteId, startDate, endDate, hostAdminId, undefined, visitPeriod);
  if (!check.available) {
    return { success: false, error: check.reason, congestedDate: check.congestedDate };
  }

  await prisma.activeLock.deleteMany({
    where: {
      campsiteId,
      hostAdminId,
    },
  });

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const created = await prisma.activeLock.create({
    data: {
      campsiteId,
      startDate,
      endDate,
      hostAdminId,
      hostName,
      visitPeriod: visitPeriod || null,
      expiresAt,
    },
  });

  const lockDTO: ActiveLockDTO = {
    id: created.id,
    campsiteId: created.campsiteId,
    hostAdminId: created.hostAdminId,
    hostName: created.hostName,
    visitPeriod: created.visitPeriod,
    startDate: created.startDate.toISOString(),
    endDate: created.endDate.toISOString(),
    expiresAt: created.expiresAt.toISOString(),
  };

  broadcastRealtimeEvent({
    type: 'LOCK_ACQUIRED',
    payload: lockDTO,
  });

  return { success: true, lock: lockDTO };
}

export async function releaseLock(campsiteId: string, hostAdminId: string) {
  const deleted = await prisma.activeLock.deleteMany({
    where: {
      campsiteId,
      hostAdminId,
    },
  });

  if (deleted.count > 0) {
    broadcastRealtimeEvent({
      type: 'LOCK_RELEASED',
      payload: { campsiteId, hostAdminId },
    });
  }
}
