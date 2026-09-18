'use client';

import { useLang } from './LanguageProvider';
import { StatsData } from '@/lib/types';
import { formatMoney } from '@/lib/i18n';
import { countryFlag, countryName } from '@/lib/countries';

interface StatsBarProps {
  stats: StatsData;
  title?: string;
}

export default function StatsBar({ stats, title }: StatsBarProps) {
  const { t, lang } = useLang();

  const metrics: { key: string; label: string; value: string }[] = [
    { key: 'reservations', label: t('stats.reservations'), value: String(stats.totalActiveReservations) },
    { key: 'guests', label: t('stats.guests'), value: String(stats.totalGuests) },
    { key: 'tents', label: t('stats.tents'), value: String(stats.rentedTents) },
    { key: 'cars', label: t('stats.cars'), value: String(stats.rentedCars) },
    { key: 'birds', label: t('stats.birds'), value: String(stats.rentedBirds) },
    { key: 'rabbits', label: t('stats.rabbits'), value: String(stats.rentedRabbits) },
    { key: 'total', label: t('stats.total'), value: formatMoney(stats.totalAmount, lang) },
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
                <span aria-hidden>{countryFlag(c.code)}</span>
                <strong>{c.count}</strong>
                <span>{countryName(c.code, lang)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
