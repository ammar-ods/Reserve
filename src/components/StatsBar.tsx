'use client';

import { CalendarCheck, Users, Car, Tent, Bird, Rabbit } from 'lucide-react';
import { StatsData } from '@/lib/types';

interface StatsBarProps {
  stats: StatsData;
  title?: string;
}

export default function StatsBar({ stats, title }: StatsBarProps) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      {title && (
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
          {title}
        </h2>
      )}
      <div className="stats-grid">
        {/* Total Reservations (Previous & Current) */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CalendarCheck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalActiveReservations}</span>
            <span className="stat-label">Total Reserved</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Previous & Current</span>
          </div>
        </div>

        {/* Total Campers / Guests (Previous & Current) */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Users size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalGuests}</span>
            <span className="stat-label">Total Campers</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Previous & Current</span>
          </div>
        </div>

        {/* Rented Tents (Total rented and reserved) */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Tent size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.rentedTents}</span>
            <span className="stat-label">Tents Rented</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Rented & Reserved</span>
          </div>
        </div>

        {/* Rented Cars (Total rented and reserved) */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            <Car size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.rentedCars}</span>
            <span className="stat-label">Cars / Parking</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Rented & Reserved</span>
          </div>
        </div>

        {/* Rented Birds (Total rented and reserved) */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Bird size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.rentedBirds}</span>
            <span className="stat-label">Birds Rented</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Rented & Reserved</span>
          </div>
        </div>

        {/* Rented Rabbits (Total rented and reserved) */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#fce7f3', color: '#db2777' }}>
            <Rabbit size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.rentedRabbits}</span>
            <span className="stat-label">Rabbits Rented</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Rented & Reserved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
