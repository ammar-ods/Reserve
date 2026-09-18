'use client';

import { format } from 'date-fns';
import { X } from 'lucide-react';
import { useLang } from './LanguageProvider';
import { formatMoney } from '@/lib/i18n';
import { countryFlag, countryName } from '@/lib/countries';
import { AuditChange, AuditLogDTO } from '@/lib/types';

interface AuditDetailModalProps {
  log: AuditLogDTO;
  onClose: () => void;
}

export default function AuditDetailModal({ log, onClose }: AuditDetailModalProps) {
  const { t, lang, dateLocale } = useLang();

  // Raw values are stored so they can be rendered in the active language.
  const renderValue = (change: AuditChange, value: string | number | null) => {
    if (value === null || value === '') return t('common.none');

    switch (change.labelKey) {
      case 'field.status':
        return t(`status.${value}`);
      case 'field.country':
        return `${countryFlag(String(value))} ${countryName(String(value), lang)}`;
      case 'field.role':
        return t(`role.${value}`);
      case 'field.startDate':
      case 'field.endDate':
        return format(new Date(String(value)), 'dd MMM yyyy', { locale: dateLocale });
      case 'field.total':
      case 'field.deposit':
      case 'field.priceTent':
      case 'field.priceCar':
      case 'field.priceBird':
      case 'field.priceRabbit':
        return formatMoney(Number(value), lang);
      default:
        return String(value);
    }
  };

  const changes = log.changes || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className={`audit-chip audit-${log.action}`}>{t(`action.${log.action}`)}</span>
            <h3 className="modal-title">{t('audit.detail.title')}</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="audit-detail-grid">
            <div>
              <span>{t(`target.${log.targetType}`) || log.targetType}</span>
              <strong>{log.targetLabel || log.targetId || t('common.none')}</strong>
            </div>
            <div>
              <span>{t('audit.detail.by')}</span>
              <strong>
                {log.userName} · {t(`role.${log.userRole}`)} ({log.adminId})
              </strong>
            </div>
            <div>
              <span>{t('audit.detail.when')}</span>
              <strong>{format(new Date(log.timestamp), 'dd MMM yyyy · HH:mm:ss', { locale: dateLocale })}</strong>
            </div>
            {log.campsiteName && (
              <div>
                <span>{t('audit.col.campsite')}</span>
                <strong>{log.campsiteName}</strong>
              </div>
            )}
            <div>
              <span>{t('audit.detail.description')}</span>
              <strong>{log.details}</strong>
            </div>
          </div>

          <h4 className="audit-detail-heading">{t('audit.detail.changes')}</h4>

          {changes.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('audit.detail.noChanges')}</p>
          ) : (
            <div className="table-responsive">
              <table className="reserve-table">
                <thead>
                  <tr>
                    <th>{t('audit.detail.field')}</th>
                    <th>{t('audit.detail.before')}</th>
                    <th>{t('audit.detail.after')}</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change) => (
                    <tr key={change.field}>
                      <td style={{ fontWeight: 600 }}>{t(change.labelKey)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{renderValue(change, change.before)}</td>
                      <td style={{ fontWeight: 600 }}>{renderValue(change, change.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            {t('booking.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
