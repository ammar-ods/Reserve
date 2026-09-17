'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Tent, ShieldCheck, LogOut, Sliders } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { UserSession } from '@/lib/types';

interface NavbarProps {
  currentUser: UserSession | null;
  onUserChange?: (user: UserSession) => void;
  onOpenAdminSettings?: () => void;
  isRealtimeConnected?: boolean;
}

const PRESET_USERS: UserSession[] = [
  { id: '1', adminId: 'SA-01', name: 'Sarah Jenkins', email: 'superadmin@reserve.local', role: 'SUPER_ADMIN' },
  { id: '2', adminId: 'ADM-01', name: 'David Miller', email: 'admin@reserve.local', role: 'ADMIN' },
  { id: '3', adminId: 'HOST-01', name: 'Amina Clark', email: 'host1@reserve.local', role: 'HOST' },
  { id: '4', adminId: 'HOST-02', name: 'Marcus Thorne', email: 'host2@reserve.local', role: 'HOST' },
  { id: '5', adminId: 'HOST-03', name: 'Elena Rodriguez', email: 'host3@reserve.local', role: 'HOST' },
];

export default function Navbar({
  currentUser,
  onUserChange,
  onOpenAdminSettings,
  isRealtimeConnected = true,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSwitchUser = (adminId: string) => {
    const target = PRESET_USERS.find((u) => u.adminId === adminId);
    if (target && onUserChange) {
      onUserChange(target);
      localStorage.setItem('reserve_user', JSON.stringify(target));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('reserve_user');
    router.push('/');
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdminOrSuper = currentUser?.role === 'ADMIN' || isSuperAdmin;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/dashboard" className="brand-logo">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Tent size={20} />
            </div>
            <span>Reserve</span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem' }}>
            <Link
              href="/dashboard"
              style={{
                fontWeight: pathname === '/dashboard' ? 700 : 500,
                color: pathname === '/dashboard' ? 'var(--primary)' : 'var(--text-secondary)',
              }}
            >
              Dashboard
            </Link>

            {/* Exclusive link for Super Admin per spec */}
            {isSuperAdmin && (
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
                Global Audit Log
              </Link>
            )}
          </nav>
        </div>

        <div className="navbar-actions">
          {/* Live Sync Status indicator */}
          <div className="live-badge" title={isRealtimeConnected ? 'Real-time synchronization active' : 'Connecting...'}>
            <div
              className="live-dot"
              style={{ background: isRealtimeConnected ? '#10b981' : '#f59e0b' }}
            />
            <span>{isRealtimeConnected ? 'Live Sync' : 'Connecting'}</span>
          </div>

          {/* Admin UI Customization Button */}
          {isAdminOrSuper && onOpenAdminSettings && (
            <button
              onClick={onOpenAdminSettings}
              className="btn btn-secondary btn-sm"
              title="Admin: Edit table headers, titles, and site capacities"
            >
              <Sliders size={15} />
              <span>Admin Settings</span>
            </button>
          )}

          {/* User selector / profile badge */}
          {currentUser && (
            <div className="user-badge">
              <span className={`role-pill role-${currentUser.role}`}>
                {currentUser.role.replace('_', ' ')}
              </span>
              <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({currentUser.adminId})</span>

              {/* Fast role switcher for pair-testing */}
              <select
                aria-label="Switch User Role"
                value={currentUser.adminId}
                onChange={(e) => handleSwitchUser(e.target.value)}
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {PRESET_USERS.map((u) => (
                  <option key={u.adminId} value={u.adminId}>
                    Switch to {u.adminId} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <ThemeToggle />

          <button
            onClick={handleLogout}
            title="Logout"
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
