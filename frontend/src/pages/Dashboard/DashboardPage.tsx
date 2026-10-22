import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SegmentedBar } from '../../components/common/SegmentedBar';
import { Sparkline } from '../../components/common/Sparkline';
import { fetchDashboard } from '../../api/dashboard';
import { ApiError } from '../../api/client';
import { formatDate, formatDateTime, formatNum } from '../../utils/format';
import type { DashboardSummary } from '../../types';
import { useAuth } from '../../auth/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    setError(null);
    fetchDashboard()
      .then(({ dashboard: d }) => setDashboard(d))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load the dashboard.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  const firstName = user?.full_name?.split(' ')[0];

  return (
    <AppShell
      title={firstName ? `Good to see you, ${firstName}` : 'Dashboard'}
      subtitle={dashboard ? `Updated ${formatDateTime(dashboard.generatedAt)}` : 'Lab-wide snapshot'}
    >
      {isLoading && <LoadingState label="Loading dashboard…" />}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && dashboard && (
        <>
          <div className="stat-grid">
            <StatCard label="Active cultures" value={dashboard.cellCultures.active} tone="var(--culture)" />
            <StatCard label="Contaminated cultures" value={dashboard.cellCultures.contaminated} tone="var(--turbid)" />
            <StatCard label="Pending scheduled tasks" value={dashboard.pendingSchedules} tone="var(--focus)" />
            <StatCard label="Open contamination reports" value={dashboard.openContaminations} tone="var(--danger)" />
            <StatCard label="Ongoing experiments" value={dashboard.ongoingExperiments} tone="var(--media)" />
            <StatCard label="Media expiring within 7 days" value={dashboard.mediaExpiringSoonCount} tone="var(--turbid)" />
          </div>

          <div className="layout-grid">
            <div className="stack">
              <div className="card">
                <div className="card-title-row">
                  <h2>Recent incubator readings</h2>
                  <Link to="/incubators" className="btn btn-ghost btn-sm">
                    View incubators
                  </Link>
                </div>
                {dashboard.recentIncubatorReadings.length === 0 ? (
                  <EmptyState title="No readings logged yet" description="Log a reading from an incubator's detail page." />
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Incubator</th>
                          <th>Temp (°C)</th>
                          <th>CO₂ (%)</th>
                          <th>Humidity (%)</th>
                          <th>Recorded</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.recentIncubatorReadings.map((r) => (
                          <tr key={r.id}>
                            <td>{r.incubator_name}</td>
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

              <div className="card">
                <div className="card-title-row">
                  <h2>Upcoming culture tasks</h2>
                  <Link to="/schedule" className="btn btn-ghost btn-sm">
                    View schedule
                  </Link>
                </div>
                {dashboard.upcomingCultureSchedules.length === 0 ? (
                  <EmptyState title="Nothing scheduled" description="Add a task from the Culture Schedule page." />
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Culture</th>
                          <th>Task</th>
                          <th>Scheduled for</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.upcomingCultureSchedules.map((s) => (
                          <tr key={s.id}>
                            <td>{s.culture_name}</td>
                            <td style={{ textTransform: 'capitalize' }}>{s.task_type.replace('_', ' ')}</td>
                            <td className="cell-muted">{formatDateTime(s.scheduled_date)}</td>
                            <td>
                              <StatusBadge status={s.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title-row">
                  <h2>Active experiments</h2>
                  <Link to="/experiments" className="btn btn-ghost btn-sm">
                    View experiments
                  </Link>
                </div>
                {dashboard.activeExperiments.length === 0 ? (
                  <EmptyState title="No ongoing experiments" />
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Culture</th>
                          <th>Started</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.activeExperiments.map((e) => (
                          <tr key={e.id}>
                            <td>{e.title}</td>
                            <td className="cell-muted">{e.culture_name}</td>
                            <td className="cell-muted">{formatDate(e.start_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="stack">
              <div className="card">
                <h2>Incubator fleet status</h2>
                <div className="mt-2">
                  <SegmentedBar
                    segments={[
                      { label: 'Operational', value: dashboard.incubators.operational, color: 'var(--culture)' },
                      { label: 'Maintenance', value: dashboard.incubators.maintenance, color: 'var(--focus)' },
                      { label: 'Out of order', value: dashboard.incubators.outOfOrder, color: 'var(--danger)' },
                    ]}
                  />
                </div>
                <p className="text-muted mt-2" style={{ fontSize: '0.82rem' }}>
                  {dashboard.incubators.total} incubator{dashboard.incubators.total === 1 ? '' : 's'} total
                </p>
              </div>

              <div className="card">
                <h2>Culture status mix</h2>
                <div className="sparkline-wrap mt-2">
                  <div>
                    <div className="sparkline-value">{dashboard.cellCultures.total}</div>
                    <div className="sparkline-caption">total cultures tracked</div>
                  </div>
                  <Sparkline
                    values={[
                      dashboard.cellCultures.discontinued,
                      dashboard.cellCultures.contaminated,
                      dashboard.cellCultures.active,
                    ]}
                    color="var(--culture-deep)"
                  />
                </div>
                <div className="segmented-bar-legend mt-2">
                  <span>
                    <span className="legend-dot" style={{ background: 'var(--culture)' }} /> Active —{' '}
                    {dashboard.cellCultures.active}
                  </span>
                  <span>
                    <span className="legend-dot" style={{ background: 'var(--turbid)' }} /> Contaminated —{' '}
                    {dashboard.cellCultures.contaminated}
                  </span>
                  <span>
                    <span className="legend-dot" style={{ background: 'var(--ink-faint)' }} /> Discontinued —{' '}
                    {dashboard.cellCultures.discontinued}
                  </span>
                </div>
              </div>

              <div className="card">
                <div className="card-title-row">
                  <h2>Media expiring soon</h2>
                  <Link to="/media" className="btn btn-ghost btn-sm">
                    View inventory
                  </Link>
                </div>
                {dashboard.mediaExpiringSoon.length === 0 ? (
                  <EmptyState title="Nothing expiring in the next 7 days" />
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.6rem' }}>
                    {dashboard.mediaExpiringSoon.map((m) => (
                      <li key={m.id} className="flex-between">
                        <span>{m.media_name}</span>
                        <span className="badge badge-turbid">expires {formatDate(m.expiry_date)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card">
                <div className="card-title-row">
                  <h2>Open contamination reports</h2>
                  <Link to="/contamination" className="btn btn-ghost btn-sm">
                    View logs
                  </Link>
                </div>
                {dashboard.recentOpenContaminations.length === 0 ? (
                  <EmptyState title="No open contamination reports" />
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.7rem' }}>
                    {dashboard.recentOpenContaminations.map((c) => (
                      <li key={c.id}>
                        <div className="flex-between">
                          <strong style={{ fontSize: '0.86rem' }}>{c.culture_name}</strong>
                          <span className="cell-muted" style={{ fontSize: '0.76rem' }}>
                            {formatDateTime(c.detected_at)}
                          </span>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                          {c.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="stat-card" style={{ '--stripe': tone } as CSSProperties}>
      <div className="stat-value readout">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
