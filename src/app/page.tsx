'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tent, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { UserSession } from '@/lib/types';

const TEST_ACCOUNTS: UserSession[] = [
  { id: '1', adminId: 'SA-01', name: 'Sarah Jenkins', email: 'superadmin@reserve.local', role: 'SUPER_ADMIN' },
  { id: '2', adminId: 'ADM-01', name: 'David Miller', email: 'admin@reserve.local', role: 'ADMIN' },
  { id: '3', adminId: 'HOST-01', name: 'Amina Clark', email: 'host1@reserve.local', role: 'HOST' },
  { id: '4', adminId: 'HOST-02', name: 'Marcus Thorne', email: 'host2@reserve.local', role: 'HOST' },
  { id: '5', adminId: 'HOST-03', name: 'Elena Rodriguez', email: 'host3@reserve.local', role: 'HOST' },
];

export default function LandingPage() {
  const router = useRouter();
  const [adminIdInput, setAdminIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const saved = localStorage.getItem('reserve_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.adminId) {
          router.push('/dashboard');
        }
      } catch {
        // Continue
      }
    }
  }, [router]);

  const handleLogin = (user: UserSession) => {
    localStorage.setItem('reserve_user', JSON.stringify(user));
    router.push('/dashboard');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const target = TEST_ACCOUNTS.find(
      (u) =>
        u.adminId.toLowerCase() === adminIdInput.trim().toLowerCase() ||
        u.email.toLowerCase() === adminIdInput.trim().toLowerCase()
    );

    if (target) {
      handleLogin(target);
    } else {
      setError('Invalid Admin ID or Email. Try HOST-01, ADM-01, or SA-01, or click one below.');
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        background: 'radial-gradient(circle at 50% 20%, rgba(15, 118, 110, 0.08) 0%, transparent 60%), var(--bg-primary)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Centered Logo and Title */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(15, 118, 110, 0.3)',
            marginBottom: '1.25rem',
          }}
        >
          <Tent size={36} />
        </div>

        <h1
          style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '0.4rem',
            color: 'var(--text-primary)',
          }}
        >
          Reserve
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            lineHeight: 1.4,
          }}
        >
          Real-Time Campsite Reservation Management & Concurrency Hub
        </p>

        {/* Login Box Directly Underneath */}
        <div
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            boxShadow: 'var(--shadow-xl)',
            textAlign: 'left',
          }}
        >
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: '#fef2f2',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Host Admin ID or Email</label>
              <input
                type="text"
                required
                placeholder="e.g. HOST-01, ADM-01, SA-01"
                value={adminIdInput}
                onChange={(e) => setAdminIdInput(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
            >
              <span>Sign In to Reserve</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* One-Click Quick Testing Switchers */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem',
                textAlign: 'center',
              }}
            >
              Or Quick Select Role (Instant Test)
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {TEST_ACCOUNTS.map((acc) => (
                <button
                  key={acc.adminId}
                  onClick={() => handleLogin(acc)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {acc.role === 'SUPER_ADMIN' ? (
                      <ShieldCheck size={16} style={{ color: '#be185d' }} />
                    ) : (
                      <UserCheck size={16} style={{ color: '#0f766e' }} />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.825rem' }}>{acc.name}</span>
                  </div>
                  <span className={`role-pill role-${acc.role}`} style={{ fontSize: '0.68rem' }}>
                    {acc.adminId}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
