import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import * as experimentsApi from '../../api/experiments';
import * as cellCulturesApi from '../../api/cellCultures';
import { ApiError } from '../../api/client';
import type { CellCulture, Experiment, ExperimentStatus } from '../../types';
import { formatDate, isManager, toDateInputValue } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const STATUS_OPTIONS: ExperimentStatus[] = ['ongoing', 'completed', 'aborted'];

export function ExperimentsPage() {
  const { user } = useAuth();
  const canManage = isManager(user?.role);

  const [experiments, setExperiments] = useState<Experiment[] | null>(null);
  const [cultures, setCultures] = useState<CellCulture[]>([]);
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([
      experimentsApi.listExperiments(statusFilter ? { status: statusFilter } : undefined),
      cellCulturesApi.listCellCultures(),
    ])
      .then(([experimentsRes, culturesRes]) => {
        setExperiments(experimentsRes.experiments);
        setCultures(culturesRes.cellCultures);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load experiments.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [statusFilter]);

  function cultureName(id: number): string {
    return cultures.find((c) => c.id === id)?.culture_name ?? `#${id}`;
  }

  return (
    <AppShell title="Experiment Tracking" subtitle="Experiments run against your cultures, and their observations.">
      <div className="page-header">
        <div />
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={cultures.length === 0}>
            + New experiment
          </button>
        )}
      </div>

      <div className="filter-bar">
        <span className="filter-label">Status</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ExperimentStatus | '')}>
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingState label="Loading experiments…" />}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}
      {!isLoading && !error && experiments && experiments.length === 0 && (
        <EmptyState title="No experiments yet" description={canManage ? 'Start your first experiment.' : undefined} />
      )}

      {!isLoading && !error && experiments && experiments.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Culture</th>
                <th>Start date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={`/experiments/${e.id}`}>{e.title}</Link>
                  </td>
                  <td className="cell-muted">{cultureName(e.cell_culture_id)}</td>
                  <td className="cell-muted">{formatDate(e.start_date)}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateExperimentModal
          cultures={cultures}
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

function CreateExperimentModal({
  cultures,
  onClose,
  onCreated,
}: {
  cultures: CellCulture[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [cultureId, setCultureId] = useState(cultures[0] ? String(cultures[0].id) : '');
  const [startDate, setStartDate] = useState(toDateInputValue());
  const [objective, setObjective] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await experimentsApi.createExperiment({
        title,
        cell_culture_id: Number(cultureId),
        start_date: startDate,
        objective: objective || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create experiment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Start a new experiment" onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field span-2">
            <label htmlFor="exp-title">Title</label>
            <input id="exp-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Drug response assay — compound X" />
          </div>
          <div className="form-field">
            <label htmlFor="exp-culture">Culture</label>
            <select id="exp-culture" required value={cultureId} onChange={(e) => setCultureId(e.target.value)}>
              {cultures.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.culture_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="exp-start">Start date</label>
            <input id="exp-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-field span-2">
            <label htmlFor="exp-objective">Objective (optional)</label>
            <textarea id="exp-objective" value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create experiment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
