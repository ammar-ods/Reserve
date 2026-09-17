'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Download, CheckCircle2, XCircle, Clock, FileSpreadsheet } from 'lucide-react';
import { ReservationDTO, ReservationStatus, SystemSettingsDTO, UserSession } from '@/lib/types';
import { exportReservationsToExcel } from '@/lib/export';

interface ReservationTableProps {
  reservations: ReservationDTO[];
  headers?: SystemSettingsDTO['tableHeaders'];
  siteName?: string;
  currentUser: UserSession | null;
  onStatusChange: (id: string, newStatus: ReservationStatus) => Promise<void>;
  onRefresh?: () => void;
}

export default function ReservationTable({
  reservations,
  headers = {
    colId: 'Reservation ID',
    colCustomer: 'Customer / Phone',
    colDates: 'Visit Dates',
    colGuests: 'Guests',
    colGear: 'Rented Gear & Pets',
    colStatus: 'Status',
    colHost: 'Host (Admin ID)',
    colActions: 'Actions',
  },
  siteName = 'Campsite',
  currentUser,
  onStatusChange,
}: ReservationTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filter reservations based on search and status
  const filtered = reservations.filter((res) => {
    const matchesStatus = statusFilter === 'ALL' || res.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      res.customerName.toLowerCase().includes(term) ||
      res.reservationNumber.toLowerCase().includes(term) ||
      res.customerPhone.toLowerCase().includes(term) ||
      res.createdByAdminId.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const handleStatusUpdate = async (id: string, nextStatus: ReservationStatus) => {
    try {
      setUpdatingId(id);
      await onStatusChange(id, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExport = () => {
    exportReservationsToExcel(filtered, siteName);
  };

  return (
    <div className="table-card">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        {/* Instant Search */}
        <div className="search-box">
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by customer name or ID (e.g. RES-2026)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs & Export Button */}
        <div className="toolbar-actions">
          <div className="filter-tabs">
            {(['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`filter-tab ${statusFilter === tab ? 'active' : ''}`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="btn btn-secondary btn-sm"
            title="Export filtered records to .xlsx file"
          >
            <FileSpreadsheet size={16} style={{ color: '#16a34a' }} />
            <span>Export to .xlsx</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="reserve-table">
          <thead>
            <tr>
              <th>{headers.colId}</th>
              <th>{headers.colCustomer}</th>
              <th>{headers.colDates}</th>
              <th>{headers.colGuests}</th>
              <th>{headers.colGear}</th>
              <th>{headers.colStatus}</th>
              <th>{headers.colHost}</th>
              <th style={{ textAlign: 'right' }}>{headers.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  No reservations found matching the filters.
                </td>
              </tr>
            ) : (
              filtered.map((res) => {
                const isConfirmed = res.status === 'CONFIRMED';
                const isCancelled = res.status === 'CANCELLED';
                const isPending = res.status === 'PENDING';
                const isUpdating = updatingId === res.id;

                return (
                  <tr
                    key={res.id}
                    className={`row-${res.status}`}
                    style={{
                      opacity: isUpdating ? 0.6 : 1,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Reservation ID */}
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {res.reservationNumber}
                    </td>

                    {/* Customer */}
                    <td>
                      <div style={{ fontWeight: 600 }}>{res.customerName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {res.customerPhone}
                      </div>
                      {res.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                          “{res.notes}”
                        </div>
                      )}
                    </td>

                    {/* Visit Dates - Primary Sort Order */}
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {format(new Date(res.startDate), 'MMM dd, yyyy')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        to {format(new Date(res.endDate), 'MMM dd, yyyy')}
                      </div>
                    </td>

                    {/* Guests */}
                    <td>
                      <span style={{ fontWeight: 600 }}>{res.guestCount}</span> campers
                    </td>

                    {/* Rented Gear */}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '0.75rem' }}>
                        {res.rentedTents > 0 && (
                          <span style={{ padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>
                            {res.rentedTents} Tents
                          </span>
                        )}
                        {res.rentedCars > 0 && (
                          <span style={{ padding: '2px 6px', background: '#f3e8ff', color: '#6b21a8', borderRadius: '4px', fontWeight: 600 }}>
                            {res.rentedCars} Cars
                          </span>
                        )}
                        {res.rentedBirds > 0 && (
                          <span style={{ padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 600 }}>
                            {res.rentedBirds} Birds
                          </span>
                        )}
                        {res.rentedRabbits > 0 && (
                          <span style={{ padding: '2px 6px', background: '#fce7f3', color: '#9d174d', borderRadius: '4px', fontWeight: 600 }}>
                            {res.rentedRabbits} Rabbits
                          </span>
                        )}
                        {!res.rentedTents && !res.rentedCars && !res.rentedBirds && !res.rentedRabbits && (
                          <span style={{ color: 'var(--text-muted)' }}>None</span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`status-badge ${res.status}`}>
                        {isConfirmed && <CheckCircle2 size={13} />}
                        {isCancelled && <XCircle size={13} />}
                        {isPending && <Clock size={13} />}
                        {res.status}
                      </span>
                    </td>

                    {/* Booked By */}
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {res.createdByAdminId}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {res.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => handleStatusUpdate(res.id, 'CONFIRMED')}
                            disabled={isUpdating}
                            className="btn btn-sm"
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                            }}
                            title="Confirm reservation (turns green)"
                          >
                            <CheckCircle2 size={14} />
                            Confirm
                          </button>
                        )}

                        {res.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleStatusUpdate(res.id, 'CANCELLED')}
                            disabled={isUpdating}
                            className="btn btn-sm"
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                            }}
                            title="Cancel reservation (turns red, frees dates, keeps history)"
                          >
                            <XCircle size={14} />
                            Cancel
                          </button>
                        )}

                        {res.status !== 'PENDING' && (
                          <button
                            onClick={() => handleStatusUpdate(res.id, 'PENDING')}
                            disabled={isUpdating}
                            className="btn btn-secondary btn-sm"
                            title="Revert back to Pending"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
