import { ActionType, Prisma, Role } from '@prisma/client';
import { prisma } from './prisma';
import { AuditChange } from './types';

interface LogActionParams {
  action: ActionType;
  adminId: string;
  userName?: string;
  userRole?: Role;
  targetType: 'RESERVATION' | 'CAMPSITE' | 'LOCK' | 'SETTINGS' | 'USER';
  targetId?: string;
  targetLabel?: string;
  campsiteName?: string;
  details: string;
  changes?: AuditChange[];
}

export async function logAuditAction(params: LogActionParams) {
  try {
    let userName = params.userName;
    let userRole = params.userRole;

    if (!userName || !userRole) {
      const user = await prisma.user.findUnique({
        where: { adminId: params.adminId },
        select: { name: true, role: true },
      });
      if (user) {
        userName = userName || user.name;
        userRole = userRole || user.role;
      }
    }

    await prisma.auditLog.create({
      data: {
        action: params.action,
        adminId: params.adminId,
        userName: userName || params.adminId,
        userRole: userRole || Role.HOST,
        targetType: params.targetType,
        targetId: params.targetId,
        targetLabel: params.targetLabel,
        campsiteName: params.campsiteName,
        details: params.details,
        changes:
          params.changes && params.changes.length > 0
            ? (params.changes as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

type AuditValue = string | number | null;

// Field map shared by every tracked entity so the Super Admin popup can label
// each change in the active interface language.
const FIELD_LABELS: Record<string, string> = {
  customerName: 'field.customerName',
  customerPhone: 'field.phone',
  country: 'field.country',
  guestCount: 'field.guests',
  rentedTents: 'field.tents',
  rentedCars: 'field.cars',
  rentedBirds: 'field.birds',
  rentedRabbits: 'field.rabbits',
  notes: 'field.notes',
  totalAmount: 'field.total',
  depositAmount: 'field.deposit',
  status: 'field.status',
  startDate: 'field.startDate',
  endDate: 'field.endDate',
  dailyCapacity: 'field.dailyCapacity',
  pageTitle: 'field.pageTitle',
  priceTent: 'field.priceTent',
  priceCar: 'field.priceCar',
  priceBird: 'field.priceBird',
  priceRabbit: 'field.priceRabbit',
  tableHeaders: 'field.tableHeaders',
  role: 'field.role',
  username: 'field.username',
};

function normalize(value: unknown): AuditValue {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' || typeof value === 'string') return value;
  return JSON.stringify(value);
}

// Builds the field-by-field change list stored with every audit event.
export function buildChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): AuditChange[] {
  const changes: AuditChange[] = [];

  for (const field of fields) {
    const from = normalize(before[field]);
    const to = normalize(after[field]);
    if (from === to) continue;
    changes.push({
      field,
      labelKey: FIELD_LABELS[field] || field,
      before: from,
      after: to,
    });
  }

  return changes;
}

// Snapshot of a freshly created record, recorded as "added" values.
export function buildCreationSnapshot(record: Record<string, unknown>, fields: string[]): AuditChange[] {
  return fields
    .map((field) => ({
      field,
      labelKey: FIELD_LABELS[field] || field,
      before: null,
      after: normalize(record[field]),
    }))
    .filter((change) => change.after !== null);
}
