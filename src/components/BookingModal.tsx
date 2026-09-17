'use client';

import { useState, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  addDays,
} from 'date-fns';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Lock, Check, AlertCircle } from 'lucide-react';
import { CampsiteDTO, UserSession, ActiveLockDTO, ReservationDTO } from '@/lib/types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  campsite: CampsiteDTO;
  currentUser: UserSession | null;
  activeLocks: ActiveLockDTO[];
  existingReservations: ReservationDTO[];
  onReservationCreated: (res: ReservationDTO) => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  campsite,
  currentUser,
  activeLocks,
  existingReservations,
  onReservationCreated,
}: BookingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Step 1: Selected Dates & Lock State
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [lockAcquired, setLockAcquired] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  // Step 2: All 7 Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [rentedTents, setRentedTents] = useState<number>(1);
  const [rentedCars, setRentedCars] = useState<number>(1);
  const [rentedBirds, setRentedBirds] = useState<number>(0);
  const [rentedRabbits, setRentedRabbits] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setStartDate(null);
      setEndDate(null);
      setLockAcquired(false);
      setLockError(null);
      setSaveError(null);
      setCustomerName('');
      setCustomerPhone('');
      setGuestCount(2);
      setRentedTents(1);
      setRentedCars(1);
      setRentedBirds(0);
      setRentedRabbits(0);
      setNotes('');
    }
  }, [isOpen]);

  // Clean up lock if user closes modal
  const handleCancelAndRelease = async () => {
    if (lockAcquired && currentUser) {
      try {
        await fetch('/api/locks/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campsiteId: campsite.id,
            hostAdminId: currentUser.adminId,
          }),
        });
      } catch (e) {
        console.error('Failed to release lock on close:', e);
      }
    }
    onClose();
  };

  // Helper to compute daily occupancy (active reservations + other hosts' locks)
  const getDayAvailability = (day: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(day, today)) {
      return { available: false, count: 0, reason: 'Past date' };
    }

    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);

    // Active reservations overlapping this day
    const resCount = existingReservations.filter((r) => {
      if (r.status === 'CANCELLED') return false;
      const rStart = new Date(r.startDate);
      const rEnd = new Date(r.endDate);
      return rStart < dayEnd && rEnd > dayStart;
    }).length;

    // Active locks by OTHER hosts
    const otherLocks = activeLocks.filter((l) => {
      if (l.hostAdminId === currentUser?.adminId) return false;
      const lStart = new Date(l.startDate);
      const lEnd = new Date(l.endDate);
      return lStart < dayEnd && lEnd > dayStart;
    });

    const lockCount = otherLocks.length;
    const totalOccupied = resCount + lockCount;
    const cap = campsite.dailyCapacity;

    if (totalOccupied >= cap) {
      const lockHolder = otherLocks[0]?.hostName || otherLocks[0]?.hostAdminId;
      return {
        available: false,
        count: totalOccupied,
        reason: lockCount > 0 ? `Held by ${lockHolder}` : `Capacity full (${totalOccupied}/${cap})`,
        isLockedByOther: lockCount > 0,
      };
    }

    return {
      available: true,
      count: totalOccupied,
      remaining: cap - totalOccupied,
    };
  };

  // Handle Date Clicks in Calendar
  const handleDateClick = async (day: Date) => {
    const avail = getDayAvailability(day);
    if (!avail.available) return;

    if (!startDate || (startDate && endDate)) {
      // Starting fresh selection
      setStartDate(day);
      setEndDate(null);
      setLockAcquired(false);
      setLockError(null);
    } else {
      // Selecting end date
      if (isBefore(day, startDate) || isSameDay(day, startDate)) {
        // If clicked on or before start, make it the new start date
        setStartDate(day);
        setEndDate(null);
        return;
      }

      // Check if all dates in between are available
      let curr = new Date(startDate);
      let rangeBlocked = false;
      while (curr < day) {
        const check = getDayAvailability(curr);
        if (!check.available) {
          rangeBlocked = true;
          setLockError(`Date ${format(curr, 'MMM dd')} is not available: ${check.reason}`);
          break;
        }
        curr = addDays(curr, 1);
      }

      if (rangeBlocked) return;

      setEndDate(day);

      // Trigger Real-Time Lock immediately per specification
      if (currentUser) {
        setIsLocking(true);
        setLockError(null);
        try {
          const res = await fetch('/api/locks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campsiteId: campsite.id,
              startDate: startDate.toISOString(),
              endDate: day.toISOString(),
              hostAdminId: currentUser.adminId,
              hostName: currentUser.name,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setLockAcquired(true);
          } else {
            setLockError(data.error || 'Failed to acquire temporary hold on dates.');
            setLockAcquired(false);
          }
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Network error';
          setLockError(message);
        } finally {
          setIsLocking(false);
        }
      }
    }
  };

  // Save Reservation (Step 2)
  const handleSaveReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !currentUser) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setSaveError('Please enter customer name and phone number.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campsiteId: campsite.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          guestCount: Number(guestCount),
          rentedTents: Number(rentedTents),
          rentedCars: Number(rentedCars),
          rentedBirds: Number(rentedBirds),
          rentedRabbits: Number(rentedRabbits),
          notes: notes.trim(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: 'PENDING',
          createdByAdminId: currentUser.adminId,
          hostName: currentUser.name,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onReservationCreated(data.reservation);
        onClose();
      } else {
        setSaveError(data.error || 'Failed to create reservation.');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Calendar dates computation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              {step === 1 ? 'Step 1: Select Booking Dates' : 'Step 2: Reservation Details (All 7 Fields)'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Booking for <strong>{campsite.name}</strong> • Daily Cap: {campsite.dailyCapacity}
            </p>
          </div>
          <button onClick={handleCancelAndRelease} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: CALENDAR VIEW */}
        {step === 1 && (
          <div className="modal-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarIcon size={18} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="calendar-day-header">
                  {d}
                </div>
              ))}

              {calendarDays.map((day) => {
                const avail = getDayAvailability(day);
                const isSelectedStart = startDate && isSameDay(day, startDate);
                const isSelectedEnd = endDate && isSameDay(day, endDate);
                const isInRange =
                  startDate && endDate && day > startDate && day < endDate;
                const isCurrentMonthDay = isSameMonth(day, currentMonth);

                let dayClass = 'calendar-day';
                if (!isCurrentMonthDay) dayClass += ' text-muted';
                if (!avail.available) {
                  dayClass += avail.isLockedByOther ? ' locked' : ' disabled';
                }
                if (isSelectedStart || isSelectedEnd) dayClass += ' selected';
                else if (isInRange) dayClass += ' in-range';

                return (
                  <div
                    key={day.toISOString()}
                    className={dayClass}
                    onClick={() => handleDateClick(day)}
                    title={
                      avail.available
                        ? `Available (${campsite.dailyCapacity - avail.count} slots left)`
                        : avail.reason
                    }
                  >
                    <span>{format(day, 'd')}</span>
                    {avail.available && (
                      <span className="day-capacity-dot" style={{ color: 'var(--text-muted)' }}>
                        {avail.count}/{campsite.dailyCapacity}
                      </span>
                    )}
                    {!avail.available && avail.isLockedByOther && (
                      <span style={{ position: 'absolute', top: 2, right: 2 }}>
                        <Lock size={10} style={{ color: '#d97706' }} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                marginTop: '1.25rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--primary)' }} />
                <span>Selected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: '#f1f5f9',
                    backgroundImage: 'repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 2px, transparent 2px, transparent 4px)',
                  }}
                />
                <span>Held by other host</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg-surface-subtle)', border: '1px dashed #cbd5e1' }} />
                <span>Full capacity</span>
              </div>
            </div>

            {/* Status and Lock banner */}
            {startDate && !endDate && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-subtle)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CalendarIcon size={16} style={{ color: 'var(--primary)' }} />
                <span>
                  Check-in: <strong>{format(startDate, 'MMM dd, yyyy')}</strong>. Please click the Check-out date.
                </span>
              </div>
            )}

            {isLocking && (
              <div style={{ marginTop: '1rem', color: 'var(--primary)', fontSize: '0.85rem' }}>
                Securing real-time lock for {currentUser?.adminId}...
              </div>
            )}

            {lockAcquired && startDate && endDate && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Check size={16} />
                <span>
                  Dates <strong>{format(startDate, 'MMM dd')}</strong> to <strong>{format(endDate, 'MMM dd')}</strong> are locked and greyed out for all other active hosts.
                </span>
              </div>
            )}

            {lockError && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{lockError}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: ALL 7 DATA FIELDS ON A SINGLE SCREEN */}
        {step === 2 && (
          <form onSubmit={handleSaveReservation}>
            <div className="modal-body">
              {/* Date recap banner */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  Visit: {startDate && format(startDate, 'MMM dd, yyyy')} → {endDate && format(endDate, 'MMM dd, yyyy')}
                </span>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '4px' }}>
                  Locked for {currentUser?.adminId}
                </span>
              </div>

              {saveError && (
                <div
                  style={{
                    padding: '0.75rem',
                    background: '#fef2f2',
                    color: '#991b1b',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                  }}
                >
                  {saveError}
                </div>
              )}

              <div className="fields-grid">
                {/* 1. Customer Name */}
                <div className="form-group">
                  <label className="form-label">1. Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                {/* 2. Customer Phone */}
                <div className="form-group">
                  <label className="form-label">2. Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 (555) 019-2834"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                {/* 3. Number of Guests */}
                <div className="form-group">
                  <label className="form-label">3. Number of Campers / Guests</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                {/* 4. Rented Tents */}
                <div className="form-group">
                  <label className="form-label">4. Gear: Rented Tents (Qty)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={rentedTents}
                    onChange={(e) => setRentedTents(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>

                {/* 5. Rented Cars / Parking */}
                <div className="form-group">
                  <label className="form-label">5. Gear: Rented Cars / Parking (Qty)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={rentedCars}
                    onChange={(e) => setRentedCars(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>

                {/* 6. Rented Birds */}
                <div className="form-group">
                  <label className="form-label">6. Special: Rented Birds (Qty)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={rentedBirds}
                    onChange={(e) => setRentedBirds(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>

                {/* 7. Rented Rabbits */}
                <div className="form-group">
                  <label className="form-label">7. Special: Rented Rabbits (Qty)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={rentedRabbits}
                    onChange={(e) => setRentedRabbits(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>

                {/* Notes (Optional) */}
                <div className="form-group field-full">
                  <label className="form-label">Special Requests / Caller Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Needs shade, late check-in, brought pet bedding..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 2 Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                Back to Calendar
              </button>
              <button
                type="button"
                onClick={handleCancelAndRelease}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                Cancel Booking
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Reservation'}
              </button>
            </div>
          </form>
        )}

        {/* Step 1 Footer */}
        {step === 1 && (
          <div className="modal-footer">
            <button onClick={handleCancelAndRelease} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!startDate || !endDate || !lockAcquired}
              className="btn btn-primary"
            >
              Next: Reservation Info (7 Fields) →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
