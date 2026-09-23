'use client';

import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import CampsiteIcon from './CampsiteIcon';
import { useLang } from './LanguageProvider';
import { CampsiteDTO } from '@/lib/types';
import { isDayUse } from '@/lib/campsites';

interface CampsiteCardProps {
  campsite: CampsiteDTO;
  // The daily cap is an operational limit: only Admins and the Super Admin see it.
  showCapacity?: boolean;
}

export default function CampsiteCard({ campsite, showCapacity = false }: CampsiteCardProps) {
  const { t } = useLang();
  const activeCount = campsite.activeReservationsCount || 0;
  const locksCount = campsite.activeLocksCount || 0;

  return (
    <Link href={`/sites/${campsite.slug}`} className="campsite-card">
      <div>
        <div className="campsite-card-header">
          <div className="campsite-logo">
            <CampsiteIcon name={campsite.iconName} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {locksCount > 0 && (
              <span className="campsite-held-badge">
                <Lock size={11} />
                {locksCount} {t('card.held')}
              </span>
            )}
            {showCapacity && (
              <span className="campsite-capacity-badge">
                {isDayUse(campsite.slug)
                  ? `${t('period.MORNING')} ${campsite.morningCapacity} · ${t('period.EVENING')} ${campsite.eveningCapacity}`
                  : `${t('card.cap')}: ${campsite.dailyCapacity}`}
              </span>
            )}
          </div>
        </div>

        <h3 className="campsite-name">{campsite.name}</h3>
      </div>

      <div className="campsite-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {activeCount} {t('card.activeBookings')}
          </span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {t('card.manage')} <ArrowLeft size={15} className="dir-flip" />
        </span>
      </div>
    </Link>
  );
}
