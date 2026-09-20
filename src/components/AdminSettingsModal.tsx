'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Sliders, Check, AlertCircle, UserPlus, Trash2 } from 'lucide-react';
import { useLang } from './LanguageProvider';
import { translateError } from '@/lib/i18n';
import { CampsiteDTO, Role, SystemSettingsDTO, UserAccountDTO, UserSession } from '@/lib/types';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  campsites: CampsiteDTO[];
  settings: SystemSettingsDTO;
  onSettingsUpdated: (newSettings: SystemSettingsDTO) => void;
  onCampsiteCapacityUpdated: (campsiteId: string, newCapacity: number) => void;
}

export default function AdminSettingsModal({
  isOpen,
  onClose,
  currentUser,
  campsites,
  settings,
  onSettingsUpdated,
  onCampsiteCapacityUpdated,
}: AdminSettingsModalProps) {
  const { t, lang } = useLang();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [pageTitle, setPageTitle] = useState(settings.pageTitle);
  const [capacities, setCapacities] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<UserAccountDTO[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('HOST');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setAccounts(data.users);
    } catch (e) {
      console.error('Failed to load accounts:', e);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setPageTitle(settings.pageTitle);
    const capMap: Record<string, number> = {};
    campsites.forEach((c) => {
      capMap[c.id] = c.dailyCapacity;
    });
    setCapacities(capMap);
    setSuccessMsg(null);
    setErrorMsg(null);
    setAccountMsg(null);
    setAccountError(null);
    setNewRole('HOST');
    loadAccounts();
  }, [isOpen, settings, campsites, loadAccounts]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const settingsRes = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageTitle,
          adminId: currentUser?.adminId,
          userName: currentUser?.name,
          requesterRole: currentUser?.role,
        }),
      });
      const settingsData = await settingsRes.json();
      if (!settingsData.success) {
        throw new Error(translateError(settingsData.error, lang));
      }
      onSettingsUpdated(settingsData.settings);

      for (const site of campsites) {
        const newCap = capacities[site.id];
        if (newCap !== undefined && newCap !== site.dailyCapacity) {
          const capRes = await fetch('/api/campsites', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campsiteId: site.id,
              dailyCapacity: newCap,
              adminId: currentUser?.adminId,
              userName: currentUser?.name,
              requesterRole: currentUser?.role,
            }),
          });
          const capData = await capRes.json();
          if (capData.success) {
            onCampsiteCapacityUpdated(site.id, newCap);
          }
        }
      }

      setSuccessMsg(t('settings.saved'));
      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : t('common.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAccount = async () => {
    setAccountMsg(null);
    setAccountError(null);
    setIsCreatingUser(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
          requesterRole: currentUser?.role,
          requesterAdminId: currentUser?.adminId,
          requesterName: currentUser?.name,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setAccountMsg(`${t('account.created')}: ${data.user.username} (${data.user.adminId})`);
        setNewUsername('');
        setNewPassword('');
        loadAccounts();
      } else {
        setAccountError(translateError(data.error, lang));
      }
    } catch {
      setAccountError(t('common.networkError'));
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteAccount = async (account: UserAccountDTO) => {
    if (!isSuperAdmin) return;
    if (account.adminId === currentUser?.adminId) return;
    if (!window.confirm(t('account.deleteConfirm', { name: account.username }))) return;

    setAccountMsg(null);
    setAccountError(null);
    setDeletingId(account.id);
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.id,
          requesterRole: currentUser?.role,
          requesterAdminId: currentUser?.adminId,
          requesterName: currentUser?.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAccountMsg(t('account.deleted'));
        loadAccounts();
      } else {
        setAccountError(translateError(data.error, lang));
      }
    } catch {
      setAccountError(t('common.networkError'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="modal-title">{t('settings.title')}</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {successMsg && (
              <div className="alert alert-success" style={{ marginTop: 0 }}>
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="alert alert-error" style={{ marginTop: 0 }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <section className="settings-section">
              <h4>{t('settings.caps')}</h4>
              <p>{t('settings.capsHint')}</p>
              <div className="settings-grid">
                {campsites.map((site) => (
                  <div key={site.id} className="form-group">
                    <label className="form-label">{site.name}</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={capacities[site.id] ?? site.dailyCapacity}
                      onChange={(e) =>
                        setCapacities({
                          ...capacities,
                          [site.id]: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="settings-section">
              <h4>{t('settings.accounts')}</h4>
              <p>
                {isSuperAdmin ? t('settings.accountsHintSA') : t('settings.accountsHint')}
              </p>

              {accountMsg && (
                <div className="alert alert-success" style={{ marginTop: 0 }}>
                  <Check size={16} />
                  <span>{accountMsg}</span>
                </div>
              )}
              {accountError && (
                <div className="alert alert-error" style={{ marginTop: 0 }}>
                  <AlertCircle size={16} />
                  <span>{accountError}</span>
                </div>
              )}

              <div className="settings-grid">
                <div className="form-group">
                  <label className="form-label">{t('field.username')} *</label>
                  <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('field.password')} *</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('account.passwordHint')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('field.role')}</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                    <option value="HOST">{t('role.HOST')}</option>
                    <option value="ADMIN">{t('role.ADMIN')}</option>
                    {isSuperAdmin && <option value="SUPER_ADMIN">{t('role.SUPER_ADMIN')}</option>}
                  </select>
                </div>
                <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCreateAccount}
                    disabled={isCreatingUser || !newUsername.trim() || !newPassword}
                  >
                    <UserPlus size={15} />
                    <span>{isCreatingUser ? t('account.creating') : t('account.create')}</span>
                  </button>
                </div>
              </div>

              <div className="accounts-list">
                <span className="accounts-list-title">{t('account.existing')}</span>
                {accounts.map((acc) => (
                  <div key={acc.id} className="accounts-list-row">
                    <span style={{ fontWeight: 600 }}>{acc.username}</span>
                    <span className={`role-pill role-${acc.role}`}>{t(`role.${acc.role}`)}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {acc.adminId}
                    </span>
                    {isSuperAdmin && acc.adminId !== currentUser?.adminId && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ marginInlineStart: 'auto', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                        onClick={() => handleDeleteAccount(acc)}
                        disabled={deletingId === acc.id}
                      >
                        <Trash2 size={14} />
                        <span>{t('account.delete')}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="settings-section">
              <h4>{t('settings.view')}</h4>
              <div className="form-group">
                <label className="form-label">{t('field.pageTitle')}</label>
                <input type="text" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} />
              </div>
            </section>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
              {t('settings.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
