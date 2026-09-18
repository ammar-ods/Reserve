import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ReservationDTO } from './types';
import { Lang, translate } from './i18n';
import { countryName } from './countries';

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
    [t('stats.tents')]: res.rentedTents,
    [t('stats.cars')]: res.rentedCars,
    [t('stats.birds')]: res.rentedBirds,
    [t('stats.rabbits')]: res.rentedRabbits,
    [t('col.total')]: res.totalAmount,
    [t('col.deposit')]: res.depositAmount ?? 0,
    [t('col.status')]: t(`status.${res.status}`),
    [t('col.host')]: res.createdByAdminId,
    [t('field.notes')]: res.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 16 }, // reservation no.
    { wch: 20 }, // campsite
    { wch: 20 }, // guest name
    { wch: 18 }, // phone
    { wch: 18 }, // country
    { wch: 14 }, // start
    { wch: 14 }, // end
    { wch: 8 }, // guests
    { wch: 10 }, // tents
    { wch: 10 }, // cars
    { wch: 10 }, // birds
    { wch: 12 }, // rabbits
    { wch: 12 }, // total
    { wch: 12 }, // deposit
    { wch: 12 }, // status
    { wch: 12 }, // host
    { wch: 30 }, // notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservations');

  const suffix = siteName ? `_${siteName.replace(/\s+/g, '_')}` : '';
  XLSX.writeFile(workbook, `Reservations${suffix}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}
