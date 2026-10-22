import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Sparkline } from '../../components/common/Sparkline';
import * as incubatorsApi from '../../api/incubators';
import { ApiError } from '../../api/client';
import type { Incubator, IncubatorReading, IncubatorStatus } from '../../types';
import { formatDateTime, formatNum, isManager } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const STATUS_OPTIONS: IncubatorStatus[] = ['operational', 'maintenance', 'out_of_order'];

export function IncubatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const incubatorId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = isManager(user?.role);

  const [incubator, setIncubator] = useState<Incubator | null>(null);
  const [readings, setReadings] = useState<IncubatorReading[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([incubatorsApi.getIncubator(incubatorId), incubatorsApi.listReadings(incubatorId, 30)])
      .then(([incRes, readingsRes]) => {
        setIncubator(incRes.incubator);
        setReadings(readingsRes.readings);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load this incubator.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [incubatorId]);

  async function handleStatusChange(status: IncubatorStatus) {
    if (!incubator) return;
    try {
      const { incubator: updated } = await incubatorsApi.updateIncubator(incubator.id, { status });
      setIncubator(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status.');
    }
  }

  async function handleDelete() {
    if (!incubator) return;
    if (!confirm(`Delete "${incubator.name}"? This also removes its logged readings.`)) return;
    try {
      await incubatorsApi.deleteIncubator(incubator.id);
      navigate('/incubators');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete incubator.');
    }
  }

  const tempTrend = readings ? [...readings].reverse().map((r) => Number(r.temperature_c)) : [];
  const co2Trend = readings ? [...readings].reverse().map((r) => Number(r.co2_percent)) : [];

  return (
    <AppShell title={incubator ? incubator.name : 'Incubator'} subtitle="Environmental monitoring detail">
      {isLoading && <LoadingState label="Loading incubator…" />}
      {!isLoading && error && !incubator && <ErrorState message={error} onRetry={load} />}

      {!isLoading && incubator && (
        <>
          <div className="page-header">
            <div className="flex-row">
              <StatusBadge status={incubator.status} />
              {canManage && (
                <select
                  value={incubator.status}
                  onChange={(e) => handleStatusChange(e.target.value as IncubatorStatus)}
                  style={{
                    border: '1px solid var(--line-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.8rem',
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      Set: {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {canManage && (
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                Delete incubator
              </button>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="layout-grid">
            <div className="stack">
              <div className="card">
                <h2>Temperature trend</h2>
                <div className="sparkline-wrap mt-2">
                  <div>
                    <div className="sparkline-value readout">
                      {readings && readings[0] ? formatNum(readings[0].temperature_c) : '—'}°C
                    </div>
                    <div className="sparkline-caption">latest • target {formatNum(incubator.target_temperature_c)}°C</div>
                  </div>
                  <Sparkline values={tempTrend} color="var(--media)" />
                </div>
              </div>

              <div className="card">
                <h2>CO₂ trend</h2>
                <div className="sparkline-wrap mt-2">
                  <div>
                    <div className="sparkline-value readout">
                      {readings && readings[0] ? formatNum(readings[0].co2_percent) : '—'}%
                    </div>
                    <div className="sparkline-caption">latest • target {formatNum(incubator.target_co2_percent)}%</div>
                  </div>
                  <Sparkline values={co2Trend} color="var(--culture)" />
                </div>
              </div>

              <div className="card">
                <h2>Reading history</h2>
                {readings && readings.length === 0 ? (
                  <EmptyState title="No readings logged yet" />
                ) : (
                  <div className="table-wrap mt-2">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Temp (°C)</th>
                          <th>CO₂ (%)</th>
                          <th>Humidity (%)</th>
                          <th>Recorded</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readings?.map((r) => (
                          <tr key={r.id}>
                            <td className="cell-mono">{formatNum(r.temperature_c)}</td>
                            <td className="cell-mono">{formatNum(r.co2_percent)}</td>
                            <td className="cell-mono">{formatNum(r.humidity_percent)}</td>
                            <td className="cell-muted">{formatDateTime(r.recorded_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="stack">
              <LogReadingForm
                incubatorId={incubator.id}
                onLogged={(reading) => setReadings((prev) => (prev ? [reading, ...prev] : [reading]))}
              />
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function LogReadingForm({
  incubatorId,
  onLogged,
}: {
  incubatorId: number;
  onLogged: (reading: IncubatorReading) => void;
}) {
  const [temp, setTemp] = useState('');
  const [co2, setCo2] = useState('');
  const [humidity, setHumidity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { reading } = await incubatorsApi.logReading(incubatorId, {
        temperature_c: Number(temp),
        co2_percent: Number(co2),
        humidity_percent: humidity ? Number(humidity) : null,
      });
      onLogged(reading);
      setTemp('');
      setCo2('');
      setHumidity('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log reading.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>Log a reading</h2>
      {error && (
        <div className="form-error mt-2" style={{ marginBottom: 0 }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-2">
        <div className="form-field">
          <label htmlFor="reading-temp">Temperature (°C)</label>
          <input id="reading-temp" type="number" step="0.1" required value={temp} onChange={(e) => setTemp(e.target.value)} />
        </div>
        <div className="form-field mt-1">
          <label htmlFor="reading-co2">CO₂ (%)</label>
          <input id="reading-co2" type="number" step="0.1" required value={co2} onChange={(e) => setCo2(e.target.value)} />
        </div>
        <div className="form-field mt-1">
          <label htmlFor="reading-humidity">Humidity (%, optional)</label>
          <input id="reading-humidity" type="number" step="0.1" value={humidity} onChange={(e) => setHumidity(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary mt-2" disabled={isSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
          {isSubmitting ? 'Logging…' : 'Log reading'}
        </button>
      </form>
    </div>
  );
}
