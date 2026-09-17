import * as XLSX from 'xlsx';
import { ReservationDTO } from './types';
import { format } from 'date-fns';

export function exportReservationsToExcel(reservations: ReservationDTO[], siteName: string = 'All Sites') {
  const rows = reservations.map((res) => ({
    'Reservation ID': res.reservationNumber,
    'Campsite': res.campsite?.name || siteName,
    'Customer Name': res.customerName,
    'Customer Phone': res.customerPhone,
    'Check-In Date': format(new Date(res.startDate), 'yyyy-MM-dd'),
    'Check-Out Date': format(new Date(res.endDate), 'yyyy-MM-dd'),
    'Guests': res.guestCount,
    'Rented Tents': res.rentedTents,
    'Rented Cars': res.rentedCars,
    'Rented Birds': res.rentedBirds,
    'Rented Rabbits': res.rentedRabbits,
    'Status': res.status,
    'Booked By (Admin ID)': res.createdByAdminId,
    'Notes': res.notes || '',
    'Created At': format(new Date(res.createdAt), 'yyyy-MM-dd HH:mm'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const colWidths = [
    { wch: 16 }, // ID
    { wch: 22 }, // Campsite
    { wch: 20 }, // Customer
    { wch: 18 }, // Phone
    { wch: 14 }, // Check-In
    { wch: 14 }, // Check-Out
    { wch: 8 },  // Guests
    { wch: 12 }, // Tents
    { wch: 12 }, // Cars
    { wch: 12 }, // Birds
    { wch: 14 }, // Rabbits
    { wch: 12 }, // Status
    { wch: 18 }, // Booked By
    { wch: 30 }, // Notes
    { wch: 18 }, // Created At
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservations');

  const filename = `Reservations_${siteName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
