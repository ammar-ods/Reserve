import { StatsData, SystemSettingsDTO } from './types';

export const DEFAULT_PAGE_TITLE = 'حجوزات محمية المرزوم';

export const DEFAULT_TABLE_HEADERS: SystemSettingsDTO['tableHeaders'] = {
  colId: 'رقم الحجز',
  colCustomer: 'الزائر / الجوال',
  colDates: 'تاريخ الزيارة',
  colCheckIn: 'تاريخ الدخول',
  colCheckOut: 'تاريخ الخروج',
  colGuests: 'الزوار',
  colItems: 'المستأجرات',
  colDeposit: 'العربون',
  colStatus: 'الحالة',
  colHost: 'الموظف',
  colActions: 'الإجراءات',
};

export const DEFAULT_SETTINGS: SystemSettingsDTO = {
  id: 'global_config',
  pageTitle: DEFAULT_PAGE_TITLE,
  tableHeaders: DEFAULT_TABLE_HEADERS,
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_STATS: StatsData = {
  totalActiveReservations: 0,
  totalGuests: 0,
  rentedCars: 0,
  rentedTents: 0,
  rentedBirds: 0,
  rentedHoubara: 0,
  rentedRabbits: 0,
  rentedSalukis: 0,
  rentedGazelles: 0,
  pendingCount: 0,
  confirmedCount: 0,
  cancelledCount: 0,
  totalAmount: 0,
  totalDeposits: 0,
  countryCounts: [],
};
