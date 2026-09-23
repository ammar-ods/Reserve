'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, Sliders, Languages } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useLang } from './LanguageProvider';
import { UserSession } from '@/lib/types';

interface NavbarProps {
  currentUser: UserSession | null;
  onOpenAdminSettings?: () => void;
  isRealtimeConnected?: boolean;
}

export default function Navbar({
  currentUser,
  onOpenAdminSettings,
  isRealtimeConnected = true,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, lang, toggleLang } = useLang();

  const handleLogout = () => {
    localStorage.removeItem('reserve_user');
    localStorage.setItem('reserve_lang', 'ar');
    router.push('/');
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdminOrSuper = currentUser?.role === 'ADMIN' || isSuperAdmin;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/dashboard" className="brand-logo">
            <img src="/logo.png" alt={t('brand.place')} className="brand-logo-img" />
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem' }}>
            <Link
              href="/dashboard"
              style={{
                fontWeight: pathname === '/dashboard' ? 700 : 500,
                color: pathname === '/dashboard' ? 'var(--primary)' : 'var(--text-secondary)',
              }}
            >
              {t('nav.dashboard')}
            </Link>

            {isAdminOrSuper && (
              <Link
                href="/audit-log"
                style={{
                  fontWeight: pathname === '/audit-log' ? 700 : 500,
                  color: pathname === '/audit-log' ? 'var(--primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <ShieldCheck size={16} />
                {t('nav.auditLog')}
              </Link>
            )}
          </nav>
        </div>

        <div className="navbar-actions">
          {/* Live Sync Status indicator */}
          <div className="live-badge">
            <div
              className="live-dot"
              style={{ background: isRealtimeConnected ? '#10b981' : '#f59e0b' }}
            />
            <span>{isRealtimeConnected ? t('nav.live') : t('nav.connecting')}</span>
          </div>

          {isAdminOrSuper && onOpenAdminSettings && (
            <button onClick={onOpenAdminSettings} className="btn btn-secondary btn-sm">
              <Sliders size={15} />
              <span>{t('nav.settings')}</span>
            </button>
          )}

          {currentUser && (
            <div className="user-badge">
              <span className={`role-pill role-${currentUser.role}`}>{t(`role.${currentUser.role}`)}</span>
              <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
            </div>
          )}

          {/* Language switch is visible to the Super Admin only */}
          {isSuperAdmin && (
            <button onClick={toggleLang} className="btn btn-secondary btn-sm" title={t('nav.language')}>
              <Languages size={15} />
              <span style={{ fontWeight: 700 }}>{lang === 'ar' ? 'En' : 'ع'}</span>
            </button>
          )}

          <ThemeToggle />

          <button
            onClick={handleLogout}
            title={t('nav.logout')}
            aria-label={t('nav.logout')}
            style={{
              padding: '0.5rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
