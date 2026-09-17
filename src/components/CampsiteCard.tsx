'use client';

import Link from 'next/link';
import { Trees, Waves, Compass, Mountain, Tent, ArrowRight, Lock } from 'lucide-react';
import { CampsiteDTO } from '@/lib/types';

interface CampsiteCardProps {
  campsite: CampsiteDTO;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Trees: <Trees size={26} />,
  Waves: <Waves size={26} />,
  Compass: <Compass size={26} />,
  Mountain: <Mountain size={26} />,
  Tent: <Tent size={26} />,
};

export default function CampsiteCard({ campsite }: CampsiteCardProps) {
  const icon = ICON_MAP[campsite.iconName] || <Tent size={26} />;
  const activeCount = campsite.activeReservationsCount || 0;
  const locksCount = campsite.activeLocksCount || 0;
  const totalOccupied = activeCount + locksCount;
  const isNearCap = totalOccupied >= campsite.dailyCapacity;

  return (
    <Link href={`/sites/${campsite.slug}`} className="campsite-card">
      <div>
        <div className="campsite-card-header">
          <div className="campsite-logo">{icon}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {locksCount > 0 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  background: '#fef3c7',
                  color: '#92400e',
                  fontWeight: 600,
                }}
                title={`${locksCount} booking(s) currently being held by active hosts`}
              >
                <Lock size={11} />
                {locksCount} Held
              </span>
            )}
            <span
              className="campsite-capacity-badge"
              style={{
                color: isNearCap ? '#dc2626' : undefined,
                borderColor: isNearCap ? '#fca5a5' : undefined,
              }}
            >
              Cap: {campsite.dailyCapacity}/day
            </span>
          </div>
        </div>

        <h3 className="campsite-name">{campsite.name}</h3>
        <p className="campsite-desc">{campsite.description}</p>
      </div>

      <div className="campsite-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isNearCap ? '#ef4444' : '#10b981',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {activeCount} Active Bookings
          </span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Manage Bookings <ArrowRight size={15} />
        </span>
      </div>
    </Link>
  );
}
