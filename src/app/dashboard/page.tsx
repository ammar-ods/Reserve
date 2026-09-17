'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatsBar from '@/components/StatsBar';
import CampsiteCard from '@/components/CampsiteCard';
import AdminSettingsModal from '@/components/AdminSettingsModal';
import { CampsiteDTO, StatsData, SystemSettingsDTO, UserSession, RealtimeEvent } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [campsites, setCampsites] = useState<CampsiteDTO[]>([]);
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

  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Authenticate from localStorage
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

  // Fetch initial dashboard data (Campsites + Global Stats + Settings)
  const fetchDashboardData = useCallback(async () => {
    try {
      const [campsitesRes, resRes, settingsRes] = await Promise.all([
        fetch('/api/campsites'),
        fetch('/api/reservations'),
        fetch('/api/admin/settings'),
      ]);

      const campsitesData = await campsitesRes.json();
      const resData = await resRes.json();
      const settingsData = await settingsRes.json();

      if (campsitesData.success) setCampsites(campsitesData.campsites);
      if (resData.success && resData.stats) setStats(resData.stats);
      if (settingsData.success && settingsData.settings) setSettings(settingsData.settings);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, fetchDashboardData]);

  // Real-Time SSE Listener
  useEffect(() => {
    if (!currentUser) return;

    const eventSource = new EventSource('/api/realtime');

    eventSource.onopen = () => {
      setIsRealtimeConnected(true);
    };

    eventSource.addEventListener('message', (event) => {
      try {
        const parsed: RealtimeEvent = JSON.parse(event.data);
        // Refresh dashboard metrics when any booking or lock or capacity changes
        fetchDashboardData();
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    });

    eventSource.onerror = () => {
      setIsRealtimeConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser, fetchDashboardData]);

  if (!currentUser) return null;

  return (
    <div className="app-container">
      <Navbar
        currentUser={currentUser}
        onUserChange={(u) => setCurrentUser(u)}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
        isRealtimeConnected={isRealtimeConnected}
      />

      <main className="main-content">
        {/* Header Title / Welcome Banner */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {settings.pageTitle || 'Campsite Reservations Dashboard'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                Welcome, <strong>{currentUser.name}</strong> ({currentUser.adminId}) • Live Phone Booking System
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Global Stats Cards */}
        <StatsBar stats={stats} title="Live Global Inventory & Reservations" />

        {/* Bottom: 4 Campsite Cards */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Campsites ({campsites.length})
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Click any site to manage reservations or initiate a new booking
            </span>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading campsites and inventory...
            </div>
          ) : (
            <div className="campsites-grid">
              {campsites.map((c) => (
                <CampsiteCard key={c.id} campsite={c} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Admin Settings Modal */}
      {isAdminSettingsOpen && (
        <AdminSettingsModal
          isOpen={isAdminSettingsOpen}
          onClose={() => setIsAdminSettingsOpen(false)}
          currentUser={currentUser}
          campsites={campsites}
          settings={settings}
          onSettingsUpdated={(newSettings) => setSettings(newSettings)}
          onCampsiteCapacityUpdated={(id, newCap) => {
            setCampsites((prev) =>
              prev.map((c) => (c.id === id ? { ...c, dailyCapacity: newCap } : c))
            );
          }}
        />
      )}
    </div>
  );
}
