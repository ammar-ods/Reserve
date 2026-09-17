export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'HOST';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type ActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'CANCEL'
  | 'DELETE'
  | 'LOCK_ACQUIRED'
  | 'LOCK_RELEASED'
  | 'SETTING_UPDATE'
  | 'CAPACITY_UPDATE';

export interface UserSession {
  id: string;
  adminId: string; // e.g. "SA-01", "ADM-01", "HOST-01", "HOST-02", "HOST-03"
  name: string;
  email: string;
  role: Role;
}

export interface CampsiteDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  dailyCapacity: number;
  iconName: string;
  activeReservationsCount?: number;
  activeLocksCount?: number;
}

export interface ReservationDTO {
  id: string;
  reservationNumber: string;
  campsiteId: string;
  campsite?: {
    id: string;
    slug: string;
    name: string;
  };
  customerName: string;
  customerPhone: string;
  guestCount: number;
  rentedTents: number;
  rentedCars: number;
  rentedBirds: number;
  rentedRabbits: number;
  notes: string | null;
  startDate: string; // ISO string
  endDate: string; // ISO string
  status: ReservationStatus;
  createdByAdminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveLockDTO {
  id: string;
  campsiteId: string;
  hostAdminId: string;
  hostName: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  expiresAt: string; // ISO string
}

export interface SystemSettingsDTO {
  id: string;
  pageTitle: string;
  tableHeaders: {
    colId: string;
    colCustomer: string;
    colDates: string;
    colGuests: string;
    colGear: string;
    colStatus: string;
    colHost: string;
    colActions: string;
  };
  updatedBy?: string | null;
  updatedAt: string;
}

export interface StatsData {
  totalActiveReservations: number;
  totalGuests: number;
  rentedCars: number;
  rentedTents: number;
  rentedBirds: number;
  rentedRabbits: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
}

export interface AuditLogDTO {
  id: string;
  action: ActionType;
  adminId: string;
  userRole: Role;
  userName: string;
  targetType: string;
  targetId: string | null;
  campsiteName: string | null;
  details: string;
  timestamp: string;
}

export type RealtimeEvent =
  | { type: 'LOCK_ACQUIRED'; payload: ActiveLockDTO }
  | { type: 'LOCK_RELEASED'; payload: { campsiteId: string; lockId?: string; hostAdminId?: string } }
  | { type: 'RESERVATION_CREATED'; payload: ReservationDTO }
  | { type: 'RESERVATION_UPDATED'; payload: ReservationDTO }
  | { type: 'CAPACITY_UPDATED'; payload: { campsiteId: string; newCapacity: number } }
  | { type: 'SETTINGS_UPDATED'; payload: SystemSettingsDTO };
