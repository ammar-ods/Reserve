'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Sliders, Check, AlertCircle, UserPlus } from 'lucide-react';
import { useLang } from './LanguageProvider';
import { translateError } from '@/lib/i18n';
import { CampsiteDTO, SystemSettingsDTO, UserAccountDTO, UserSession } from '@/lib/types';

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

  const [pageTitle, setPageTitle] = useState(settings.pageTitle);
  const [headers, setHeaders] = useState(settings.tableHeaders);
  const [capacities, setCapacities] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState({
    priceTent: settings.priceTent,
    priceCar: settings.priceCar,
    priceBird: settings.priceBird,
    priceRabbit: settings.priceRabbit,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Account creation state
  const [accounts, setAccounts] = useState<UserAccountDTO[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'HOST'>('HOST');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
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
    setHeaders(settings.tableHeaders);
    setPrices({
      priceTent: settings.priceTent,
      priceCar: settings.priceCar,
      priceBird: settings.priceBird,
      priceRabbit: settings.priceRabbit,
    });
    const capMap: Record<string, number> = {};
    campsites.forEach((c) => {
      capMap[c.id] = c.dailyCapacity;
    });
    setCapacities(capMap);
    setSuccessMsg(null);
    setErrorMsg(null);
    setAccountMsg(null);
    setAccountError(null);
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
          tableHeaders: headers,
          ...prices,
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

  const priceFields: { key: keyof typeof prices; labelKey: string }[] = [
    { key: 'priceTent', labelKey: 'field.priceTent' },
    { key: 'priceCar', labelKey: 'field.priceCar' },
    { key: 'priceBird', labelKey: 'field.priceBird' },
    { key: 'priceRabbit', labelKey: 'field.priceRabbit' },
  ];

  const headerFields: { key: keyof SystemSettingsDTO['tableHeaders']; labelKey: string }[] = [
    { key: 'colId', labelKey: 'col.id' },
    { key: 'colCustomer', labelKey: 'col.customer' },
    { key: 'colDates', labelKey: 'col.dates' },
    { key: 'colGuests', labelKey: 'col.guests' },
    { key: 'colItems', labelKey: 'col.items' },
    { key: 'colTotal', labelKey: 'col.total' },
    { key: 'colDeposit', labelKey: 'col.deposit' },
    { key: 'colStatus', labelKey: 'col.status' },
    { key: 'colHost', labelKey: 'col.host' },
    { key: 'colActions', labelKey: 'col.actions' },
  ];

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

            {/* 1. Daily caps */}
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

            {/* 2. Unit prices used for the auto-calculated totals */}
            <section className="settings-section">
              <h4>{t('settings.prices')}</h4>
              <p>{t('settings.pricesHint')}</p>
              <div className="settings-grid">
                {priceFields.map((field) => (
                  <div key={field.key} className="form-group">
                    <label className="form-label">
                      {t(field.labelKey)} ({t('common.currency')})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={prices[field.key]}
                      onChange={(e) =>
                        setPrices({ ...prices, [field.key]: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Accounts */}
            <section className="settings-section">
              <h4>{t('settings.accounts')}</h4>
              <p>{t('settings.accountsHint')}</p>

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
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'HOST')}>
                    <option value="HOST">{t('role.HOST')}</option>
                    <option value="ADMIN">{t('role.ADMIN')}</option>
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
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Titles & column labels */}
            <section className="settings-section">
              <h4>{t('settings.view')}</h4>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">{t('field.pageTitle')}</label>
                <input type="text" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} />
              </div>
              <div className="settings-grid">
                {headerFields.map((field) => (
                  <div key={field.key} className="form-group">
                    <label className="form-label">{t(field.labelKey)}</label>
                    <input
                      type="text"
                      value={headers[field.key]}
                      onChange={(e) => setHeaders({ ...headers, [field.key]: e.target.value })}
                    />
                  </div>
                ))}
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
