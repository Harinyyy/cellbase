import { useEffect, useState, type FormEvent, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import * as incubatorsApi from '../../api/incubators';
import { ApiError } from '../../api/client';
import type { Incubator, IncubatorStatus } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { isManager } from '../../utils/format';

const STATUS_OPTIONS: IncubatorStatus[] = ['operational', 'maintenance', 'out_of_order'];

export function IncubatorsPage() {
  const { user } = useAuth();
  const canManage = isManager(user?.role);

  const [incubators, setIncubators] = useState<Incubator[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncubatorStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setIsLoading(true);
    setError(null);
    incubatorsApi
      .listIncubators(statusFilter || undefined)
      .then(({ incubators: list }) => setIncubators(list))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load incubators.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [statusFilter]);

  return (
    <AppShell title="Incubator Monitoring" subtitle="Track environmental conditions across every incubator.">
      <div className="page-header">
        <div />
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Add incubator
          </button>
        )}
      </div>

      <div className="filter-bar">
        <span className="filter-label">Status</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as IncubatorStatus | '')}>
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingState label="Loading incubators…" />}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && incubators && incubators.length === 0 && (
        <EmptyState
          title="No incubators yet"
          description={canManage ? 'Add your first incubator to start logging readings.' : 'Ask a lab manager to add one.'}
        />
      )}

      {!isLoading && !error && incubators && incubators.length > 0 && (
        <div className="stat-grid">
          {incubators.map((inc) => (
            <Link
              key={inc.id}
              to={`/incubators/${inc.id}`}
              className="stat-card"
              style={
                {
                  textDecoration: 'none',
                  color: 'inherit',
                  '--stripe':
                    inc.status === 'operational' ? 'var(--culture)' : inc.status === 'maintenance' ? 'var(--focus)' : 'var(--danger)',
                } as CSSProperties
              }
            >
              <div className="flex-between">
                <strong style={{ fontSize: '0.95rem' }}>{inc.name}</strong>
                <StatusBadge status={inc.status} />
              </div>
              <div className="mt-2" style={{ display: 'flex', gap: '1.2rem' }}>
                <div>
                  <div className="readout" style={{ fontSize: '1.2rem' }}>
                    {Number(inc.target_temperature_c).toFixed(1)}°C
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    target temp
                  </div>
                </div>
                <div>
                  <div className="readout" style={{ fontSize: '1.2rem' }}>
                    {Number(inc.target_co2_percent).toFixed(1)}%
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    target CO₂
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateIncubatorModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </AppShell>
  );
}

function CreateIncubatorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [temp, setTemp] = useState('37.0');
  const [co2, setCo2] = useState('5.0');
  const [humidity, setHumidity] = useState('');
  const [status, setStatus] = useState<IncubatorStatus>('operational');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await incubatorsApi.createIncubator({
        name,
        target_temperature_c: Number(temp),
        target_co2_percent: Number(co2),
        target_humidity_percent: humidity ? Number(humidity) : null,
        status,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create incubator.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Add incubator" description="Register a new incubator to start logging readings." onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field span-2">
            <label htmlFor="inc-name">Name</label>
            <input id="inc-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Incubator A" />
          </div>
          <div className="form-field">
            <label htmlFor="inc-temp">Target temperature (°C)</label>
            <input id="inc-temp" type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="inc-co2">Target CO₂ (%)</label>
            <input id="inc-co2" type="number" step="0.1" value={co2} onChange={(e) => setCo2(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="inc-humidity">Target humidity (%, optional)</label>
            <input id="inc-humidity" type="number" step="0.1" value={humidity} onChange={(e) => setHumidity(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="inc-status">Status</label>
            <select id="inc-status" value={status} onChange={(e) => setStatus(e.target.value as IncubatorStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add incubator'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
