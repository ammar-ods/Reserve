'use client';

import { useLang } from './LanguageProvider';
import { StatsData } from '@/lib/types';
import { formatMoney } from '@/lib/i18n';
import { countryFlag, countryName } from '@/lib/countries';
import { hasTentsField } from '@/lib/campsites';

interface StatsBarProps {
  stats: StatsData;
  title?: string;
  variant?: 'global' | 'site';
  campsiteSlug?: string;
}

export default function StatsBar({ stats, title, variant = 'site', campsiteSlug }: StatsBarProps) {
  const { t, lang } = useLang();

  const metrics: { key: string; label: string; value: string }[] =
    variant === 'global'
      ? [
          { key: 'reservations', label: t('stats.reservations'), value: String(stats.totalActiveReservations) },
          { key: 'guests', label: t('stats.guests'), value: String(stats.totalGuests) },
          { key: 'salukis', label: t('stats.salukis'), value: String(stats.rentedSalukis) },
          { key: 'houbara', label: t('stats.houbara'), value: String(stats.rentedHoubara) },
          { key: 'rabbits', label: t('stats.rabbits'), value: String(stats.rentedRabbits) },
          { key: 'gazelles', label: t('stats.gazelles'), value: String(stats.rentedGazelles) },
          { key: 'deposits', label: t('stats.deposits'), value: formatMoney(stats.totalDeposits, lang) },
        ]
      : [
          { key: 'reservations', label: t('stats.reservations'), value: String(stats.totalActiveReservations) },
          { key: 'guests', label: t('stats.guests'), value: String(stats.totalGuests) },
          ...(hasTentsField(campsiteSlug)
            ? [{ key: 'tents', label: t('stats.tents'), value: String(stats.rentedTents) }]
            : []),
          { key: 'cars', label: t('stats.cars'), value: String(stats.rentedCars) },
          { key: 'birds', label: t('stats.birds'), value: String(stats.rentedBirds) },
          { key: 'houbara', label: t('stats.houbara'), value: String(stats.rentedHoubara) },
          { key: 'salukis', label: t('stats.salukis'), value: String(stats.rentedSalukis) },
          { key: 'gazelles', label: t('stats.gazelles'), value: String(stats.rentedGazelles) },
          { key: 'rabbits', label: t('stats.rabbits'), value: String(stats.rentedRabbits) },
          { key: 'deposits', label: t('stats.deposits'), value: formatMoney(stats.totalDeposits, lang) },
        ];

  return (
    <section className="stats-panel">
      {title && <h2 className="stats-panel-title">{title}</h2>}

      <div className="stats-row">
        {metrics.map((m) => (
          <div key={m.key} className="stat-item">
            <span className="stat-item-value">{m.value}</span>
            <span className="stat-item-label">{m.label}</span>
          </div>
        ))}
      </div>

      <div className="stats-countries">
        <span className="stats-countries-label">{t('stats.countries')}</span>
        {stats.countryCounts.length === 0 ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('stats.noCountries')}</span>
        ) : (
          <div className="stats-countries-list">
            {stats.countryCounts.map((c) => (
              <span key={c.code} className="country-chip">
                <span className="country-chip-flag" aria-hidden>
                  {countryFlag(c.code)}
                </span>
                <span className="country-chip-body">
                  <span className="country-chip-name">{countryName(c.code, lang)}</span>
                  <span className="country-chip-metric">
                    {c.bookings} {t('stats.countryBookings')}
                  </span>
                  <span className="country-chip-metric">
                    {c.guests} {t('stats.countryVisitors')}
                  </span>
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
