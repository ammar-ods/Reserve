'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Search, CheckCircle2, XCircle, Clock, FileSpreadsheet, Pencil } from 'lucide-react';
import { useLang } from './LanguageProvider';
import { ReservationDTO, SystemSettingsDTO, UserSession } from '@/lib/types';
import { exportReservationsToExcel } from '@/lib/export';
import { formatMoney } from '@/lib/i18n';
import { countryFlag, countryName } from '@/lib/countries';
import { campTypeLabel, hasTentsField, hasVisitPeriodField } from '@/lib/campsites';

interface ReservationTableProps {
  reservations: ReservationDTO[];
  headers?: SystemSettingsDTO['tableHeaders'];
  siteName?: string;
  campsiteSlug?: string;
  currentUser: UserSession | null;
  onConfirmRequest: (res: ReservationDTO) => void;
  onCancel: (res: ReservationDTO) => Promise<void>;
  onEdit: (res: ReservationDTO) => void;
}

export default function ReservationTable({
  reservations,
  headers,
  siteName = '',
  campsiteSlug,
  onConfirmRequest,
  onCancel,
  onEdit,
}: ReservationTableProps) {
  const { t, lang, dateLocale } = useLang();
  const showPeriod = hasVisitPeriodField(campsiteSlug);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const col = (key: keyof SystemSettingsDTO['tableHeaders'], translationKey: string) =>
    lang === 'ar' ? headers?.[key] || t(translationKey) : t(translationKey);

  const filtered = reservations.filter((res) => {
    const matchesStatus = statusFilter === 'ALL' || res.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const hostName = (res.createdByName || res.createdByAdminId).toLowerCase();
    const matchesSearch =
      !searchTerm ||
      res.customerName.toLowerCase().includes(term) ||
      res.reservationNumber.toLowerCase().includes(term) ||
      res.customerPhone.toLowerCase().includes(term) ||
      hostName.includes(term);
    return matchesStatus && matchesSearch;
  });

  const handleCancel = async (res: ReservationDTO) => {
    try {
      setUpdatingId(res.id);
      await onCancel(res);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExport = () => {
    exportReservationsToExcel(filtered, siteName, lang);
  };

  const items = (res: ReservationDTO) => {
    const chips: { key: string; label: string; background: string; color: string }[] = [];
    if (res.campType) {
      chips.push({
        key: 'campType',
        label: campTypeLabel(res.campType, lang),
        background: '#ecfeff',
        color: '#155e75',
      });
    }
    if (res.visitPeriod && !showPeriod) {
      chips.push({
        key: 'period',
        label: t(`period.${res.visitPeriod}`),
        background: '#fef9c3',
        color: '#854d0e',
      });
    }
    if (hasTentsField(campsiteSlug || res.campsite?.slug) && res.rentedTents > 0) {
      chips.push({ key: 'tents', label: `${res.rentedTents} ${t('stats.tents')}`, background: '#fef3c7', color: '#92400e' });
    }
    if (res.rentedCars > 0) {
      chips.push({ key: 'cars', label: `${res.rentedCars} ${t('stats.cars')}`, background: '#f3e8ff', color: '#6b21a8' });
    }
    if (res.rentedBirds > 0) {
      chips.push({ key: 'birds', label: `${res.rentedBirds} ${t('stats.birds')}`, background: '#e0f2fe', color: '#0369a1' });
    }
    if (res.rentedHoubara > 0) {
      chips.push({ key: 'houbara', label: `${res.rentedHoubara} ${t('stats.houbara')}`, background: '#eef2ff', color: '#3730a3' });
    }
    if (res.rentedSalukis > 0) {
      chips.push({ key: 'salukis', label: `${res.rentedSalukis} ${t('stats.salukis')}`, background: '#ffedd5', color: '#9a3412' });
    }
    if (res.rentedGazelles > 0) {
      chips.push({ key: 'gazelles', label: `${res.rentedGazelles} ${t('stats.gazelles')}`, background: '#dcfce7', color: '#166534' });
    }
    if (res.rentedRabbits > 0) {
      chips.push({
        key: 'rabbits',
        label: `${res.rentedRabbits} ${t('stats.rabbits')}`,
        background: '#fce7f3',
        color: '#9d174d',
      });
    }
    return chips;
  };

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={t('table.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {t('table.clear')}
            </button>
          )}
        </div>

        <div className="toolbar-actions">
          <div className="filter-tabs">
            {(['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`filter-tab ${statusFilter === tab ? 'active' : ''}`}
              >
                {t(`filter.${tab}`)}
              </button>
            ))}
          </div>

          <button onClick={handleExport} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={16} style={{ color: '#16a34a' }} />
            <span>{t('table.export')}</span>
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="reserve-table">
          <thead>
            <tr>
              <th>{col('colId', 'col.id')}</th>
              <th>{col('colCustomer', 'col.customer')}</th>
              <th>{col('colCheckIn', 'col.checkIn')}</th>
              <th>{col('colCheckOut', 'col.checkOut')}</th>
              {showPeriod && <th>{t('col.period')}</th>}
              <th>{col('colGuests', 'col.guests')}</th>
              <th>{col('colItems', 'col.items')}</th>
              <th>{col('colDeposit', 'col.deposit')}</th>
              <th>{col('colStatus', 'col.status')}</th>
              <th>{col('colHost', 'col.host')}</th>
              <th style={{ textAlign: 'end' }}>{col('colActions', 'col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={showPeriod ? 11 : 10} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  {t('table.empty')}
                </td>
              </tr>
            ) : (
              filtered.map((res) => {
                const isUpdating = updatingId === res.id;

                return (
                  <tr key={res.id} className={`row-${res.status}`} style={{ opacity: isUpdating ? 0.6 : 1 }}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {res.reservationNumber}
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span title={countryName(res.country, lang)} aria-label={countryName(res.country, lang)}>
                          {countryFlag(res.country)}
                        </span>
                        <span>{res.customerName}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', direction: 'ltr', textAlign: 'start' }}>
                        {res.customerPhone}
                      </div>
                      {res.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                          {res.notes}
                        </div>
                      )}
                    </td>

                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {format(new Date(res.startDate), 'dd MMM yyyy', { locale: dateLocale })}
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {format(new Date(res.endDate), 'dd MMM yyyy', { locale: dateLocale })}
                    </td>
                    {showPeriod && (
                      <td style={{ fontWeight: 600 }}>
                        {res.visitPeriod ? t(`period.${res.visitPeriod}`) : t('common.none')}
                      </td>
                    )}

                    <td style={{ fontWeight: 600 }}>{res.guestCount}</td>

                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '0.75rem' }}>
                        {items(res).length === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>{t('items.none')}</span>
                        ) : (
                          items(res).map((chip) => (
                            <span
                              key={chip.key}
                              style={{
                                padding: '2px 6px',
                                background: chip.background,
                                color: chip.color,
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              {chip.label}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      {res.depositAmount === null ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{t('deposit.none')}</span>
                      ) : (
                        formatMoney(res.depositAmount, lang)
                      )}
                    </td>

                    <td>
                      <span className={`status-badge ${res.status}`}>
                        {res.status === 'CONFIRMED' && <CheckCircle2 size={13} />}
                        {res.status === 'CANCELLED' && <XCircle size={13} />}
                        {res.status === 'PENDING' && <Clock size={13} />}
                        {t(`status.${res.status}`)}
                      </span>
                    </td>

                    <td>
                      <span className="host-tag">{res.createdByName || res.createdByAdminId}</span>
                    </td>

                    <td style={{ textAlign: 'end' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {res.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => onConfirmRequest(res)}
                            disabled={isUpdating}
                            className="btn btn-sm"
                            style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}
                          >
                            <CheckCircle2 size={14} />
                            {t('action.confirm')}
                          </button>
                        )}

                        <button onClick={() => onEdit(res)} disabled={isUpdating} className="btn btn-secondary btn-sm">
                          <Pencil size={14} />
                          {t('action.edit')}
                        </button>

                        {res.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancel(res)}
                            disabled={isUpdating}
                            className="btn btn-sm"
                            style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                          >
                            <XCircle size={14} />
                            {t('action.cancel')}
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
