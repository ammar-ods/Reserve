'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tent, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useLang } from '@/components/LanguageProvider';
import { translateError } from '@/lib/i18n';

export default function LandingPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError(t('login.required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('reserve_user', JSON.stringify(data.user));
        if (data.user.role !== 'SUPER_ADMIN') {
          localStorage.setItem('reserve_lang', 'ar');
        }
        router.push('/dashboard');
      } else {
        setError(translateError(data.error, lang));
      }
    } catch {
      setError(t('common.networkError'));
    } finally {
      setIsSubmitting(false);
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
      <div style={{ position: 'absolute', top: '1.5rem', insetInlineEnd: '1.5rem' }}>
        <ThemeToggle />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
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
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '2rem',
            color: 'var(--text-primary)',
          }}
        >
          {t('brand.place')}
        </h1>

        <div
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            boxShadow: 'var(--shadow-xl)',
            textAlign: 'start',
          }}
        >
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('login.username')}</label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('login.password')}</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
            >
              <span>{isSubmitting ? t('login.loading') : t('login.submit')}</span>
              {!isSubmitting && <ArrowLeft size={16} className="dir-flip" />}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
