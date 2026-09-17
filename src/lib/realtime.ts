import { EventEmitter } from 'events';
import { prisma } from './prisma';
import { RealtimeEvent, ActiveLockDTO } from './types';

// Global Event Emitter for SSE broadcast across Next.js runtime
declare global {
  // eslint-disable-next-line no-var
  var realtimeEmitter: EventEmitter | undefined;
}

export const realtimeEmitter = globalThis.realtimeEmitter ?? new EventEmitter();
realtimeEmitter.setMaxListeners(100);
if (process.env.NODE_ENV !== 'production') {
  globalThis.realtimeEmitter = realtimeEmitter;
}

// Broadcast an event to all connected SSE clients
export function broadcastRealtimeEvent(event: RealtimeEvent) {
  realtimeEmitter.emit('message', event);
}

// Check capacity for each date in a range [startDate, endDate]
// Returns true if date range has availability under dailyCapacity
export async function checkCapacityAvailability(
  campsiteId: string,
  startDate: Date,
  endDate: Date,
  excludeHostAdminId?: string,
  excludeReservationId?: string
): Promise<{ available: boolean; reason?: string; congestedDate?: string }> {
  const campsite = await prisma.campsite.findUnique({
    where: { id: campsiteId },
    select: { dailyCapacity: true, name: true },
  });

  if (!campsite) {
    return { available: false, reason: 'Campsite not found' };
  }

  const now = new Date();

  // Clean expired locks first
  await prisma.activeLock.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  // Query active (PENDING or CONFIRMED) reservations that overlap the date range
  const activeReservations = await prisma.reservation.findMany({
    where: {
      campsiteId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      customerName: true,
    },
  });

  // Query active locks by other hosts that overlap
  const activeLocks = await prisma.activeLock.findMany({
    where: {
      campsiteId,
      expiresAt: { gt: now },
      ...(excludeHostAdminId ? { hostAdminId: { not: excludeHostAdminId } } : {}),
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      hostAdminId: true,
      hostName: true,
    },
  });

  // Iterate day by day from startDate to endDate
  const current = new Date(startDate);
  while (current < endDate) {
    const dayStart = new Date(current);
    const dayEnd = new Date(current);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Count reservations active on this day
    const resCount = activeReservations.filter(
      (r) => r.startDate < dayEnd && r.endDate > dayStart
    ).length;

    // Count locks held by others on this day
    const lockCount = activeLocks.filter(
      (l) => l.startDate < dayEnd && l.endDate > dayStart
    ).length;

    const totalOccupied = resCount + lockCount;

    if (totalOccupied >= campsite.dailyCapacity) {
      const dateStr = dayStart.toISOString().split('T')[0];
      return {
        available: false,
        reason: `Daily capacity limit (${campsite.dailyCapacity}) reached for ${dateStr}. (Active: ${resCount}, In-progress holds: ${lockCount})`,
        congestedDate: dateStr,
      };
    }

    current.setDate(current.getDate() + 1);
  }

  return { available: true };
}

// Acquire or refresh a lock
export async function acquireLock(params: {
  campsiteId: string;
  startDate: Date;
  endDate: Date;
  hostAdminId: string;
  hostName: string;
}): Promise<{ success: boolean; lock?: ActiveLockDTO; error?: string }> {
  const { campsiteId, startDate, endDate, hostAdminId, hostName } = params;

  // 1. Verify capacity availability
  const check = await checkCapacityAvailability(campsiteId, startDate, endDate, hostAdminId);
  if (!check.available) {
    return { success: false, error: check.reason };
  }

  // 2. Remove existing lock held by this host for this campsite
  await prisma.activeLock.deleteMany({
    where: {
      campsiteId,
      hostAdminId,
    },
  });

  // 3. Create new lock with 5-minute TTL
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const created = await prisma.activeLock.create({
    data: {
      campsiteId,
      startDate,
      endDate,
      hostAdminId,
      hostName,
      expiresAt,
    },
  });

  const lockDTO: ActiveLockDTO = {
    id: created.id,
    campsiteId: created.campsiteId,
    hostAdminId: created.hostAdminId,
    hostName: created.hostName,
    startDate: created.startDate.toISOString(),
    endDate: created.endDate.toISOString(),
    expiresAt: created.expiresAt.toISOString(),
  };

  // 4. Broadcast to all active hosts
  broadcastRealtimeEvent({
    type: 'LOCK_ACQUIRED',
    payload: lockDTO,
  });

  return { success: true, lock: lockDTO };
}

// Release lock by campsite and hostAdminId
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
