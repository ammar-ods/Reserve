'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import StatsBar from '@/components/StatsBar';
import ReservationTable from '@/components/ReservationTable';
import BookingModal from '@/components/BookingModal';
import ConfirmDepositModal from '@/components/ConfirmDepositModal';
import AdminSettingsModal from '@/components/AdminSettingsModal';
import CampsiteIcon from '@/components/CampsiteIcon';
import { useLang } from '@/components/LanguageProvider';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '@/lib/defaults';
import { translateError } from '@/lib/i18n';
import {
  CampsiteDTO,
  ReservationDTO,
  StatsData,
  SystemSettingsDTO,
  UserSession,
  ActiveLockDTO,
} from '@/lib/types';

export default function SiteDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { t, lang } = useLang();

  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [campsite, setCampsite] = useState<CampsiteDTO | null>(null);
  const [allCampsites, setAllCampsites] = useState<CampsiteDTO[]>([]);
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [activeLocks, setActiveLocks] = useState<ActiveLockDTO[]>([]);
  const [stats, setStats] = useState<StatsData>(DEFAULT_STATS);
  const [settings, setSettings] = useState<SystemSettingsDTO>(DEFAULT_SETTINGS);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationDTO | null>(null);
  const [confirmingReservation, setConfirmingReservation] = useState<ReservationDTO | null>(null);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Authenticate user
  useEffect(() => {
    const saved = localStorage.getItem('reserve_user');
    if (!saved) {
      router.push('/');
      return;
    }
    try {
      setCurrentUser(JSON.parse(saved));
    } catch {
      router.push('/');
    }
  }, [router]);

  // Load site and reservations data
  const loadSiteData = useCallback(async () => {
    try {
      const [campsitesRes, settingsRes] = await Promise.all([
        fetch('/api/campsites'),
        fetch('/api/admin/settings'),
      ]);

      const campsitesData = await campsitesRes.json();
      const settingsData = await settingsRes.json();

      if (campsitesData.success) {
        setAllCampsites(campsitesData.campsites);
        const match = campsitesData.campsites.find((c: CampsiteDTO) => c.slug === slug);
        if (match) {
          setCampsite(match);

          const [resRes, locksRes] = await Promise.all([
            fetch(`/api/reservations?campsiteId=${match.id}`),
            fetch(`/api/locks?campsiteId=${match.id}`),
          ]);

          const resData = await resRes.json();
          const locksData = await locksRes.json();

          if (resData.success) {
            setReservations(resData.reservations);
            if (resData.stats) setStats(resData.stats);
          }

          if (locksData.success) {
            setActiveLocks(locksData.locks);
          }
        }
      }

      if (settingsData.success && settingsData.settings) {
        setSettings(settingsData.settings);
      }
    } catch (e) {
      console.error('Failed to load site data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (currentUser) {
      loadSiteData();
    }
  }, [currentUser, loadSiteData]);

  // Real-Time SSE Event listener
  useEffect(() => {
    if (!currentUser) return;

    const eventSource = new EventSource('/api/realtime');

    eventSource.onopen = () => {
      setIsRealtimeConnected(true);
    };

    eventSource.addEventListener('message', () => {
      loadSiteData();
    });

    eventSource.onerror = () => {
      setIsRealtimeConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser, loadSiteData]);

  const patchReservation = async (id: string, payload: Record<string, unknown>) => {
    if (!currentUser) return false;
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          adminId: currentUser.adminId,
          userName: currentUser.name,
          requesterRole: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadSiteData();
        return true;
      }
      setActionError(translateError(data.error, lang, { date: data.congestedDate || '' }));
      return false;
    } catch {
      setActionError(t('common.networkError'));
      return false;
    }
  };

  if (!currentUser || isLoading || !campsite) {
    return (
      <div className="app-container">
        <Navbar currentUser={currentUser} />
        <main className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>{t('site.loading')}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        currentUser={currentUser}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
        isRealtimeConnected={isRealtimeConnected}
      />

      <main className="main-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} className="dir-flip" /> {t('site.back')}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="campsite-logo">
                <CampsiteIcon name={campsite.iconName} />
              </div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {campsite.name}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setEditingReservation(null);
                  setIsBookingModalOpen(true);
                }}
                className="btn btn-primary"
              >
                <Plus size={18} />
                <span>{t('site.newBooking')}</span>
              </button>
            </div>
          </div>
        </div>

        <StatsBar stats={stats} title={t('stats.site')} variant="site" campsiteSlug={campsite.slug} />

        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('site.reservations')} ({reservations.length})
          </h2>

          {actionError && (
            <div className="alert alert-error">
              <span>{actionError}</span>
            </div>
          )}

          <ReservationTable
            reservations={reservations}
            headers={settings.tableHeaders}
            siteName={campsite.name}
            campsiteSlug={campsite.slug}
            currentUser={currentUser}
            onConfirmRequest={(res) => setConfirmingReservation(res)}
            onCancel={async (res) => {
              await patchReservation(res.id, { status: 'CANCELLED' });
            }}
            onEdit={(res) => {
              setEditingReservation(res);
              setIsBookingModalOpen(true);
            }}
          />
        </div>
      </main>

      <button
        onClick={() => {
          setEditingReservation(null);
          setIsBookingModalOpen(true);
        }}
        className="floating-add-btn"
        title={t('site.newBooking')}
        aria-label={t('site.newBooking')}
      >
        <Plus size={28} />
      </button>

      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setEditingReservation(null);
          }}
          campsite={campsite}
          currentUser={currentUser}
          activeLocks={activeLocks}
          existingReservations={reservations}
          reservation={editingReservation}
          onSaved={() => {
            loadSiteData();
          }}
        />
      )}

      {confirmingReservation && (
        <ConfirmDepositModal
          reservation={confirmingReservation}
          onClose={() => setConfirmingReservation(null)}
          onConfirm={async (depositAmount) => {
            const ok = await patchReservation(confirmingReservation.id, {
              status: 'CONFIRMED',
              depositAmount,
            });
            if (ok) setConfirmingReservation(null);
          }}
        />
      )}

      {isAdminSettingsOpen && (
        <AdminSettingsModal
          isOpen={isAdminSettingsOpen}
          onClose={() => setIsAdminSettingsOpen(false)}
          currentUser={currentUser}
          campsites={allCampsites}
          settings={settings}
          onSettingsUpdated={(newSettings) => setSettings(newSettings)}
          onCampsiteCapacityUpdated={(id, update) => {
            if (campsite.id === id) {
              setCampsite({ ...campsite, ...update });
            }
            setAllCampsites((prev) => prev.map((c) => (c.id === id ? { ...c, ...update } : c)));
          }}
        />
      )}
    </div>
  );
}
