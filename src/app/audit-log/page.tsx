'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ShieldCheck, ArrowLeft, UserPlus, Search, RefreshCw, AlertCircle, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { AuditLogDTO, UserSession } from '@/lib/types';

export default function AuditLogPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New User Creation state
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newAdminId, setNewAdminId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'HOST'>('HOST');
  const [userCreatedMsg, setUserCreatedMsg] = useState<string | null>(null);
  const [userCreateError, setUserCreateError] = useState<string | null>(null);

  // Authenticate user
  useEffect(() => {
    const saved = localStorage.getItem('reserve_user');
    if (!saved) {
      router.push('/');
      return;
    }
    try {
      const user = JSON.parse(saved);
      if (user.role !== 'SUPER_ADMIN') {
        // Exclusively viewed by Super Admin
        router.push('/dashboard');
        return;
      }
      setCurrentUser(user);
    } catch {
      router.push('/');
    }
  }, [router]);

  // Load audit logs
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/audit-logs?role=SUPER_ADMIN');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      } else {
        setError(data.error || 'Failed to fetch audit log');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === 'SUPER_ADMIN') {
      loadLogs();
    }
  }, [currentUser, loadLogs]);

  // Create new user account handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreatedMsg(null);
    setUserCreateError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: newAdminId.trim(),
          name: newName.trim(),
          email: newEmail.trim(),
          role: newRole,
          requesterRole: currentUser?.role,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUserCreatedMsg(`Successfully created account for ${data.user.name} (${data.user.adminId})!`);
        setNewAdminId('');
        setNewName('');
        setNewEmail('');
        loadLogs(); // Refresh logs to show the user creation event
      } else {
        setUserCreateError(data.error || 'Failed to create user account');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setUserCreateError(message);
    }
  };

  const filtered = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      l.adminId.toLowerCase().includes(term) ||
      l.userName.toLowerCase().includes(term) ||
      l.action.toLowerCase().includes(term) ||
      (l.campsiteName && l.campsiteName.toLowerCase().includes(term)) ||
      l.details.toLowerCase().includes(term)
    );
  });

  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') return null;

  return (
    <div className="app-container">
      <Navbar currentUser={currentUser} onUserChange={(u) => setCurrentUser(u)} />

      <main className="main-content">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
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
            <ArrowLeft size={16} /> Back to Dashboard
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
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Global System Audit Log
                </h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Restricted view for Super Admin • Tracking every add, edit, cancel, and delete with Host Admin IDs
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setIsCreateUserOpen(!isCreateUserOpen)}
                className="btn btn-primary"
              >
                <UserPlus size={16} />
                <span>{isCreateUserOpen ? 'Close Account Form' : 'Create Admin / Host Account'}</span>
              </button>
              <button onClick={loadLogs} className="btn btn-secondary" title="Refresh logs">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Super Admin Account Creation Panel */}
        {isCreateUserOpen && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Create New Host or Admin Account
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Add a new staff member to the booking system. Each user is assigned an Admin ID for audit tracking.
            </p>

            {userCreatedMsg && (
              <div
                style={{
                  padding: '0.75rem',
                  background: '#ecfdf5',
                  color: '#065f46',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Check size={16} />
                <span>{userCreatedMsg}</span>
              </div>
            )}

            {userCreateError && (
              <div
                style={{
                  padding: '0.75rem',
                  background: '#fef2f2',
                  color: '#991b1b',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{userCreateError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Admin ID (Unique) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HOST-04, ADM-02"
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alice Cooper"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alice@reserve.local"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'HOST')}
                  >
                    <option value="HOST">Host (Manage bookings)</option>
                    <option value="ADMIN">Admin (Capacities & UI edit)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">
                  <span>Register Account</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Audit Log Table Card */}
        <div className="table-card">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search audit logs by Host ID, action, campsite, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Clear
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {filtered.length} logged events
            </span>
          </div>

          <div className="table-responsive">
            <table className="reserve-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Host (Admin ID)</th>
                  <th>Role</th>
                  <th>Target Type</th>
                  <th>Campsite</th>
                  <th>Event Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Loading audit events...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td>
                        <span className={`audit-chip audit-${log.action}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{log.adminId}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.userName}</div>
                      </td>
                      <td>
                        <span className={`role-pill role-${log.userRole}`} style={{ fontSize: '0.68rem' }}>
                          {log.userRole}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {log.targetType}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {log.campsiteName || '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem', maxWidth: '360px', wordBreak: 'break-word' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
