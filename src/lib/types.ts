export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'HOST';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type VisitPeriod = 'MORNING' | 'EVENING';

export type ActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'CANCEL'
  | 'DELETE'
  | 'LOCK_ACQUIRED'
  | 'LOCK_RELEASED'
  | 'SETTING_UPDATE';

export interface UserSession {
  id: string;
  adminId: string; // e.g. "SA-01", "ADM-01", "HOST-01"
  username: string;
  name: string;
  role: Role;
}

export interface UserAccountDTO {
  id: string;
  adminId: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface CampsiteDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  dailyCapacity: number;
  morningCapacity: number;
  eveningCapacity: number;
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
  country: string; // ISO 3166-1 alpha-2
  guestCount: number;
  rentedTents: number;
  rentedCars: number;
  rentedBirds: number;
  rentedHoubara: number;
  rentedRabbits: number;
  rentedSalukis: number;
  rentedGazelles: number;
  visitPeriod: VisitPeriod | null;
  campType: string | null;
  notes: string | null;
  totalAmount: number;
  depositAmount: number | null;
  startDate: string; // ISO string
  endDate: string; // ISO string
  status: ReservationStatus;
  createdByAdminId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveLockDTO {
  id: string;
  campsiteId: string;
  hostAdminId: string;
  hostName: string;
  visitPeriod: VisitPeriod | null;
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
    colCheckIn: string;
    colCheckOut: string;
    colGuests: string;
    colItems: string;
    colDeposit: string;
    colStatus: string;
    colHost: string;
    colActions: string;
  };
  updatedBy?: string | null;
  updatedAt: string;
}

export interface CountryCount {
  code: string;
  bookings: number;
  guests: number;
}

export interface StatsData {
  totalActiveReservations: number;
  totalGuests: number;
  rentedCars: number;
  rentedTents: number;
  rentedBirds: number;
  rentedHoubara: number;
  rentedRabbits: number;
  rentedSalukis: number;
  rentedGazelles: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  totalAmount: number;
  totalDeposits: number;
  countryCounts: CountryCount[];
}

export interface AuditChange {
  field: string;
  labelKey: string;
  before: string | number | null;
  after: string | number | null;
}

export interface AuditLogDTO {
  id: string;
  action: ActionType;
  adminId: string;
  userRole: Role;
  userName: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  campsiteName: string | null;
  details: string;
  changes: AuditChange[] | null;
  timestamp: string;
}

export type RealtimeEvent =
  | { type: 'LOCK_ACQUIRED'; payload: ActiveLockDTO }
  | { type: 'LOCK_RELEASED'; payload: { campsiteId: string; lockId?: string; hostAdminId?: string } }
  | { type: 'RESERVATION_CREATED'; payload: ReservationDTO }
  | { type: 'RESERVATION_UPDATED'; payload: ReservationDTO }
  | { type: 'CAPACITY_UPDATED'; payload: { campsiteId: string; newCapacity: number } }
  | { type: 'SETTINGS_UPDATED'; payload: SystemSettingsDTO };
