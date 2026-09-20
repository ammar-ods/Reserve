'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatsBar from '@/components/StatsBar';
import CampsiteCard from '@/components/CampsiteCard';
import AdminSettingsModal from '@/components/AdminSettingsModal';
import { useLang } from '@/components/LanguageProvider';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '@/lib/defaults';
import { CampsiteDTO, StatsData, SystemSettingsDTO, UserSession } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [campsites, setCampsites] = useState<CampsiteDTO[]>([]);
  const [stats, setStats] = useState<StatsData>(DEFAULT_STATS);
  const [settings, setSettings] = useState<SystemSettingsDTO>(DEFAULT_SETTINGS);

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

    eventSource.addEventListener('message', () => {
      // Refresh dashboard metrics when any booking or lock or capacity changes
      fetchDashboardData();
    });

    eventSource.onerror = () => {
      setIsRealtimeConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser, fetchDashboardData]);

  if (!currentUser) return null;

  const isAdminOrSuper = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
  const pageTitle = lang === 'ar' ? settings.pageTitle || t('brand.system') : t('brand.system');

  return (
    <div className="app-container">
      <Navbar
        currentUser={currentUser}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
        isRealtimeConnected={isRealtimeConnected}
      />

      <main className="main-content">
        <h1 className="page-title">{pageTitle}</h1>

        <StatsBar stats={stats} title={t('stats.global')} variant="global" />

        <section>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            {t('dash.campsites')} ({campsites.length})
          </h2>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              {t('dash.loading')}
            </div>
          ) : (
            <div className="campsites-grid">
              {campsites.map((c) => (
                <CampsiteCard key={c.id} campsite={c} showCapacity={isAdminOrSuper} />
              ))}
            </div>
          )}
        </section>
      </main>

      {isAdminSettingsOpen && (
        <AdminSettingsModal
          isOpen={isAdminSettingsOpen}
          onClose={() => setIsAdminSettingsOpen(false)}
          currentUser={currentUser}
          campsites={campsites}
          settings={settings}
          onSettingsUpdated={(newSettings) => setSettings(newSettings)}
          onCampsiteCapacityUpdated={(id, newCap) => {
            setCampsites((prev) => prev.map((c) => (c.id === id ? { ...c, dailyCapacity: newCap } : c)));
          }}
        />
      )}
    </div>
  );
}
