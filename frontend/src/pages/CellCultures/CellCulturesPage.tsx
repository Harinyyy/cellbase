import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import * as cellCulturesApi from '../../api/cellCultures';
import * as incubatorsApi from '../../api/incubators';
import { ApiError } from '../../api/client';
import type { CellCulture, CultureStatus, Incubator } from '../../types';
import { formatDate, isManager } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const STATUS_OPTIONS: CultureStatus[] = ['active', 'contaminated', 'discontinued'];

export function CellCulturesPage() {
  const { user } = useAuth();
  const canManage = isManager(user?.role);

  const [cultures, setCultures] = useState<CellCulture[] | null>(null);
  const [incubators, setIncubators] = useState<Incubator[]>([]);
  const [statusFilter, setStatusFilter] = useState<CultureStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([
      cellCulturesApi.listCellCultures(statusFilter ? { status: statusFilter } : undefined),
      incubatorsApi.listIncubators(),
    ])
      .then(([culturesRes, incubatorsRes]) => {
        setCultures(culturesRes.cellCultures);
        setIncubators(incubatorsRes.incubators);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load cell cultures.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [statusFilter]);

  function incubatorName(id: number | null): string {
    if (!id) return '—';
    return incubators.find((i) => i.id === id)?.name ?? `#${id}`;
  }

  return (
    <AppShell title="Cell Culture Management" subtitle="Active flasks, passage tracking, and culture status.">
      <div className="page-header">
        <div />
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Start new culture
          </button>
        )}
      </div>

      <div className="filter-bar">
        <span className="filter-label">Status</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CultureStatus | '')}>
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingState label="Loading cultures…" />}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}
      {!isLoading && !error && cultures && cultures.length === 0 && (
        <EmptyState title="No cultures found" description={canManage ? 'Start your first culture.' : undefined} />
      )}

      {!isLoading && !error && cultures && cultures.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Culture</th>
                <th>Cell line</th>
                <th>Incubator</th>
                <th>Passage</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {cultures.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/cultures/${c.id}`}>{c.culture_name}</Link>
                  </td>
                  <td className="cell-muted">{c.cell_line}</td>
                  <td className="cell-muted">{incubatorName(c.incubator_id)}</td>
                  <td className="cell-mono">P{c.current_passage_number}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="cell-muted">{formatDate(c.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateCultureModal
          incubators={incubators}
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

function CreateCultureModal({
  incubators,
  onClose,
  onCreated,
}: {
  incubators: Incubator[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [cultureName, setCultureName] = useState('');
  const [cellLine, setCellLine] = useState('');
  const [incubatorId, setIncubatorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await cellCulturesApi.createCellCulture({
        culture_name: cultureName,
        cell_line: cellLine,
        incubator_id: incubatorId ? Number(incubatorId) : null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start culture.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Start a new culture" onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field span-2">
            <label htmlFor="culture-name">Culture name</label>
            <input id="culture-name" required value={cultureName} onChange={(e) => setCultureName(e.target.value)} placeholder="HeLa-P3 Flask A" />
          </div>
          <div className="form-field">
            <label htmlFor="culture-line">Cell line</label>
            <input id="culture-line" required value={cellLine} onChange={(e) => setCellLine(e.target.value)} placeholder="HeLa" />
          </div>
          <div className="form-field">
            <label htmlFor="culture-incubator">Incubator (optional)</label>
            <select id="culture-incubator" value={incubatorId} onChange={(e) => setIncubatorId(e.target.value)}>
              <option value="">Unassigned</option>
              {incubators.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.name}
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
            {isSubmitting ? 'Starting…' : 'Start culture'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
