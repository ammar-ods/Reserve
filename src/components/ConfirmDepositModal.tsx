'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLang } from './LanguageProvider';
import { formatMoney } from '@/lib/i18n';
import { ReservationDTO } from '@/lib/types';

interface ConfirmDepositModalProps {
  reservation: ReservationDTO;
  onClose: () => void;
  onConfirm: (depositAmount: number) => Promise<void>;
}

// Confirming a booking always goes through the deposit: the amount actually
// received can differ from what was agreed on the phone.
export default function ConfirmDepositModal({ reservation, onClose, onConfirm }: ConfirmDepositModalProps) {
  const { t, lang } = useLang();
  const [amount, setAmount] = useState<string>(
    reservation.depositAmount === null ? '' : String(reservation.depositAmount)
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAmount(reservation.depositAmount === null ? '' : String(reservation.depositAmount));
  }, [reservation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === '' || Number.isNaN(Number(amount))) {
      setError(t('confirmModal.required'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(Math.max(0, Number(amount)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('confirmModal.title')}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {t('confirmModal.hint')}
            </p>

            <div className="confirm-summary">
              <div>
                <span>{t('col.id')}</span>
                <strong>{reservation.reservationNumber}</strong>
              </div>
              <div>
                <span>{t('field.customerName')}</span>
                <strong>{reservation.customerName}</strong>
              </div>
              <div>
                <span>{t('confirmModal.agreed')}</span>
                <strong>
                  {reservation.depositAmount === null ? t('common.none') : formatMoney(reservation.depositAmount, lang)}
                </strong>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">{t('confirmModal.received')} *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
              {t('action.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <CheckCircle2 size={15} />
              <span>{isSaving ? t('booking.saving') : t('confirmModal.submit')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
