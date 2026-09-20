'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ShieldCheck, ArrowLeft, Search, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AuditDetailModal from '@/components/AuditDetailModal';
import { useLang } from '@/components/LanguageProvider';
import { translateError } from '@/lib/i18n';
import { AuditLogDTO, UserSession } from '@/lib/types';

export default function AuditLogPage() {
  const router = useRouter();
  const { t, lang, dateLocale } = useLang();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogDTO | null>(null);

  // Authenticate user
  useEffect(() => {
    const saved = localStorage.getItem('reserve_user');
    if (!saved) {
      router.push('/');
      return;
    }
    try {
      const user = JSON.parse(saved);
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      setCurrentUser(user);
    } catch {
      router.push('/');
    }
  }, [router]);

  const loadLogs = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit-logs?role=${currentUser.role}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      } else {
        setError(translateError(data.error, lang));
      }
    } catch {
      setError(t('common.networkError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, lang, t]);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN')) {
      loadLogs();
    }
  }, [currentUser, loadLogs]);

  const filtered = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      l.adminId.toLowerCase().includes(term) ||
      l.userName.toLowerCase().includes(term) ||
      l.action.toLowerCase().includes(term) ||
      (l.targetLabel && l.targetLabel.toLowerCase().includes(term)) ||
      (l.campsiteName && l.campsiteName.toLowerCase().includes(term)) ||
      l.details.toLowerCase().includes(term)
    );
  });

  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN')) return null;

  return (
    <div className="app-container">
      <Navbar currentUser={currentUser} />

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
            <ArrowLeft size={16} className="dir-flip" /> {t('nav.dashboard')}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#fdf2f8',
                  color: '#be185d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={26} />
              </div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {t('audit.title')}
              </h1>
            </div>

            <button onClick={loadLogs} className="btn btn-secondary" title={t('audit.refresh')}>
              <RefreshCw size={16} />
              <span>{t('audit.refresh')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginTop: 0 }}>
            <span>{error}</span>
          </div>
        )}

        <div className="table-card">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={t('audit.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {t('table.clear')}
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('audit.count')}: {filtered.length} · {t('audit.detail.hint')}
            </span>
          </div>

          <div className="table-responsive">
            <table className="reserve-table">
              <thead>
                <tr>
                  <th>{t('audit.col.time')}</th>
                  <th>{t('audit.col.action')}</th>
                  <th>{t('audit.col.user')}</th>
                  <th>{t('audit.col.target')}</th>
                  <th>{t('audit.col.campsite')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('audit.loading')}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('audit.empty')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="clickable-row" onClick={() => setSelectedLog(log)}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {format(new Date(log.timestamp), 'dd MMM · HH:mm', { locale: dateLocale })}
                      </td>
                      <td>
                        <span className={`audit-chip audit-${log.action}`}>{t(`action.${log.action}`)}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.userName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {log.adminId}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600 }}>{t(`target.${log.targetType}`)}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{log.targetLabel || '—'}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{log.campsiteName || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedLog && <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
