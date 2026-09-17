'use client';

import { useState, useEffect } from 'react';
import { X, Sliders, Check, AlertCircle } from 'lucide-react';
import { CampsiteDTO, SystemSettingsDTO, UserSession } from '@/lib/types';

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
  const [pageTitle, setPageTitle] = useState(settings.pageTitle || 'Reserve - Campsite Reservation System');
  const [headers, setHeaders] = useState(settings.tableHeaders);
  const [capacities, setCapacities] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPageTitle(settings.pageTitle || 'Reserve - Campsite Reservation System');
      setHeaders(settings.tableHeaders);
      const capMap: Record<string, number> = {};
      campsites.forEach((c) => {
        capMap[c.id] = c.dailyCapacity;
      });
      setCapacities(capMap);
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen, settings, campsites]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Save Header & Title settings
      const settingsRes = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageTitle,
          tableHeaders: headers,
          adminId: currentUser?.adminId,
          userName: currentUser?.name,
        }),
      });
      const settingsData = await settingsRes.json();
      if (!settingsData.success) {
        throw new Error(settingsData.error || 'Failed to save settings');
      }
      onSettingsUpdated(settingsData.settings);

      // 2. Save campsite capacity changes
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
            }),
          });
          const capData = await capRes.json();
          if (capData.success) {
            onCampsiteCapacityUpdated(site.id, newCap);
          }
        }
      }

      setSuccessMsg('Settings and capacity limits updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save admin settings';
      setErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="modal-title">Admin Management & UI Customization</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {successMsg && (
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
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
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
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Campsite Daily Capacity Limits */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>
                1. Campsite Daily Reservation Caps (Hard Limit)
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Dates automatically grey out when total active bookings + holds on any single date reach this limit.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
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
            </div>

            {/* Section 2: Table Header & UI Customization */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>
                2. Customize Table Column Headers & Page View
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Rename table column titles and application headings to suit operational terminology.
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">System Page Title</label>
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Column 1 (ID)</label>
                  <input
                    type="text"
                    value={headers.colId}
                    onChange={(e) => setHeaders({ ...headers, colId: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Column 2 (Customer)</label>
                  <input
                    type="text"
                    value={headers.colCustomer}
                    onChange={(e) => setHeaders({ ...headers, colCustomer: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Column 3 (Dates)</label>
                  <input
                    type="text"
                    value={headers.colDates}
                    onChange={(e) => setHeaders({ ...headers, colDates: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Column 4 (Guests)</label>
                  <input
                    type="text"
                    value={headers.colGuests}
                    onChange={(e) => setHeaders({ ...headers, colGuests: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Column 5 (Gear & Animals)</label>
                  <input
                    type="text"
                    value={headers.colGear}
                    onChange={(e) => setHeaders({ ...headers, colGear: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Column 6 (Status)</label>
                  <input
                    type="text"
                    value={headers.colStatus}
                    onChange={(e) => setHeaders({ ...headers, colStatus: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Column 7 (Host ID)</label>
                  <input
                    type="text"
                    value={headers.colHost}
                    onChange={(e) => setHeaders({ ...headers, colHost: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Column 8 (Actions)</label>
                  <input
                    type="text"
                    value={headers.colActions}
                    onChange={(e) => setHeaders({ ...headers, colActions: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving Changes...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
