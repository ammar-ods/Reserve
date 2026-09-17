'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowLeft, Trees, Waves, Compass, Mountain, Tent, Sliders } from 'lucide-react';
import Navbar from '@/components/Navbar';
import StatsBar from '@/components/StatsBar';
import ReservationTable from '@/components/ReservationTable';
import BookingModal from '@/components/BookingModal';
import AdminSettingsModal from '@/components/AdminSettingsModal';
import {
  CampsiteDTO,
  ReservationDTO,
  StatsData,
  SystemSettingsDTO,
  UserSession,
  ActiveLockDTO,
  ReservationStatus,
  RealtimeEvent,
} from '@/lib/types';

const ICON_MAP: Record<string, React.ReactNode> = {
  Trees: <Trees size={26} />,
  Waves: <Waves size={26} />,
  Compass: <Compass size={26} />,
  Mountain: <Mountain size={26} />,
  Tent: <Tent size={26} />,
};

export default function SiteDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [campsite, setCampsite] = useState<CampsiteDTO | null>(null);
  const [allCampsites, setAllCampsites] = useState<CampsiteDTO[]>([]);
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [activeLocks, setActiveLocks] = useState<ActiveLockDTO[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalActiveReservations: 0,
    totalGuests: 0,
    rentedCars: 0,
    rentedTents: 0,
    rentedBirds: 0,
    rentedRabbits: 0,
    pendingCount: 0,
    confirmedCount: 0,
    cancelledCount: 0,
  });
  const [settings, setSettings] = useState<SystemSettingsDTO>({
    id: 'global_config',
    pageTitle: 'Reserve - Campsite Management',
    tableHeaders: {
      colId: 'Reservation ID',
      colCustomer: 'Customer / Contact',
      colDates: 'Visit Dates',
      colGuests: 'Guests',
      colGear: 'Rented Gear & Pets',
      colStatus: 'Booking Status',
      colHost: 'Host (Admin ID)',
      colActions: 'Actions',
    },
    updatedAt: new Date().toISOString(),
  });

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

          // Fetch reservations and locks for this specific site
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

    eventSource.addEventListener('message', (event) => {
      try {
        const parsed: RealtimeEvent = JSON.parse(event.data);
        // Refresh site data when any lock or reservation or settings change occurs
        loadSiteData();
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    });

    eventSource.onerror = () => {
      setIsRealtimeConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser, loadSiteData]);

  // Update Status (Confirmed / Cancelled / Pending)
  const handleStatusChange = async (id: string, newStatus: ReservationStatus) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          adminId: currentUser.adminId,
          userName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadSiteData();
      } else {
        alert(data.error || 'Failed to update reservation status');
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  if (!currentUser || isLoading || !campsite) {
    return (
      <div className="app-container">
        <Navbar currentUser={currentUser} />
        <main className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading campsite details...</p>
        </main>
      </div>
    );
  }

  const icon = ICON_MAP[campsite.iconName] || <Tent size={26} />;
  const isAdminOrSuper = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  return (
    <div className="app-container">
      <Navbar
        currentUser={currentUser}
        onUserChange={(u) => setCurrentUser(u)}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
        isRealtimeConnected={isRealtimeConnected}
      />

      <main className="main-content">
        {/* Breadcrumb & Site Header */}
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
            <ArrowLeft size={16} /> Back to All Campsites
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="campsite-logo">{icon}</div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {campsite.name}
                </h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {campsite.description}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                Daily Cap Limit: <strong>{campsite.dailyCapacity}</strong>/day
              </span>

              {isAdminOrSuper && (
                <button
                  onClick={() => setIsAdminSettingsOpen(true)}
                  className="btn btn-secondary btn-sm"
                  title="Admin: Edit table headers or site daily capacity"
                >
                  <Sliders size={15} />
                  <span>Edit Cap / Headers</span>
                </button>
              )}

              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus size={18} />
                <span>New Booking</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top: Site-Specific Stats Bar */}
        <StatsBar stats={stats} title={`Live Stats for ${campsite.name}`} />

        {/* Middle: Data Table of Reservations */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Reservations ({reservations.length})
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Sorted by Visit Date • Real-time synchronized
            </span>
          </div>

          <ReservationTable
            reservations={reservations}
            headers={settings.tableHeaders}
            siteName={campsite.name}
            currentUser={currentUser}
            onStatusChange={handleStatusChange}
          />
        </div>
      </main>

      {/* Floating '+' Action Button */}
      <button
        onClick={() => setIsBookingModalOpen(true)}
        className="floating-add-btn"
        title="Add New Reservation (Real-Time Lock)"
        aria-label="Add New Reservation"
      >
        <Plus size={28} />
      </button>

      {/* 2-Step Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          campsite={campsite}
          currentUser={currentUser}
          activeLocks={activeLocks}
          existingReservations={reservations}
          onReservationCreated={() => {
            loadSiteData();
          }}
        />
      )}

      {/* Admin Settings Modal */}
      {isAdminSettingsOpen && (
        <AdminSettingsModal
          isOpen={isAdminSettingsOpen}
          onClose={() => setIsAdminSettingsOpen(false)}
          currentUser={currentUser}
          campsites={allCampsites}
          settings={settings}
          onSettingsUpdated={(newSettings) => setSettings(newSettings)}
          onCampsiteCapacityUpdated={(id, newCap) => {
            if (campsite.id === id) {
              setCampsite({ ...campsite, dailyCapacity: newCap });
            }
            setAllCampsites((prev) =>
              prev.map((c) => (c.id === id ? { ...c, dailyCapacity: newCap } : c))
            );
          }}
        />
      )}
    </div>
  );
}
