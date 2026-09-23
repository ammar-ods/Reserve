import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ReservationDTO } from './types';
import { Lang, translate } from './i18n';
import { countryName } from './countries';
import { campTypeLabel } from './campsites';

export function exportReservationsToExcel(
  reservations: ReservationDTO[],
  siteName: string = '',
  lang: Lang = 'ar'
) {
  const t = (key: string) => translate(key, lang);

  const rows = reservations.map((res) => ({
    [t('col.id')]: res.reservationNumber,
    [t('field.campsite')]: res.campsite?.name || siteName,
    [t('field.customerName')]: res.customerName,
    [t('field.phone')]: res.customerPhone,
    [t('field.country')]: countryName(res.country, lang),
    [t('field.startDate')]: format(new Date(res.startDate), 'yyyy-MM-dd'),
    [t('field.endDate')]: format(new Date(res.endDate), 'yyyy-MM-dd'),
    [t('field.guests')]: res.guestCount,
    [t('field.campType')]: res.campType ? campTypeLabel(res.campType, lang) : '',
    [t('field.visitPeriod')]: res.visitPeriod ? t(`period.${res.visitPeriod}`) : '',
    [t('stats.tents')]: res.rentedTents,
    [t('stats.cars')]: res.rentedCars,
    [t('stats.birds')]: res.rentedBirds,
    [t('stats.houbara')]: res.rentedHoubara,
    [t('stats.salukis')]: res.rentedSalukis,
    [t('stats.gazelles')]: res.rentedGazelles,
    [t('stats.rabbits')]: res.rentedRabbits,
    [t('col.deposit')]: res.depositAmount ?? 0,
    [t('col.status')]: t(`status.${res.status}`),
    [t('col.host')]: res.createdByName || res.createdByAdminId,
    [t('field.notes')]: res.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservations');

  const suffix = siteName ? `_${siteName.replace(/\s+/g, '_')}` : '';
  XLSX.writeFile(workbook, `Reservations${suffix}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}
