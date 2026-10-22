import { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import * as contaminationApi from '../../api/contamination';
import * as cellCulturesApi from '../../api/cellCultures';
import { ApiError } from '../../api/client';
import type { CellCulture, ContaminationLog, ContaminationStatus } from '../../types';
import { formatDateTime, isManager } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const STATUS_OPTIONS: ContaminationStatus[] = ['open', 'resolved'];

export function ContaminationPage() {
  const { user } = useAuth();
  const canManage = isManager(user?.role);

  const [logs, setLogs] = useState<ContaminationLog[] | null>(null);
  const [cultures, setCultures] = useState<CellCulture[]>([]);
  const [statusFilter, setStatusFilter] = useState<ContaminationStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolving, setResolving] = useState<ContaminationLog | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([
      contaminationApi.listContaminationLogs(statusFilter ? { status: statusFilter } : undefined),
      cellCulturesApi.listCellCultures(),
    ])
      .then(([logsRes, culturesRes]) => {
        setLogs(logsRes.contaminationLogs);
        setCultures(culturesRes.cellCultures);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load contamination logs.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [statusFilter]);

  function cultureName(id: number): string {
    return cultures.find((c) => c.id === id)?.culture_name ?? `#${id}`;
  }

  async function handleDelete(log: ContaminationLog) {
    if (!confirm('Delete this contamination log?')) return;
    try {
      await contaminationApi.deleteContaminationLog(log.id);
      setLogs((prev) => prev?.filter((l) => l.id !== log.id) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete log.');
    }
  }

  return (
    <AppShell title="Contamination Logs" subtitle="Reported contamination incidents across all cultures.">
      <div className="page-header">
        <p>
          New reports are filed from a culture's detail page (Cell Culture Management → select a culture → Report
          contamination), so the report is always linked to the right culture.
        </p>
      </div>

      <div className="filter-bar">
        <span className="filter-label">Status</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ContaminationStatus | '')}>
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingState label="Loading contamination logs…" />}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}
      {!isLoading && !error && logs && logs.length === 0 && <EmptyState title="No contamination logs" description="Good news!" />}

      {!isLoading && !error && logs && logs.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Culture</th>
                <th>Description</th>
                <th>Detected</th>
                <th>Status</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{cultureName(log.cell_culture_id)}</td>
                  <td style={{ maxWidth: 320 }}>{log.description}</td>
                  <td className="cell-muted">{formatDateTime(log.detected_at)}</td>
                  <td>
                    <StatusBadge status={log.status} />
                  </td>
                  {canManage && (
                    <td className="flex-row">
                      {log.status === 'open' && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResolving(log)}>
                          Resolve
                        </button>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(log)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resolving && (
        <ResolveModal
          log={resolving}
          onClose={() => setResolving(null)}
          onResolved={(updated) => {
            setLogs((prev) => prev?.map((l) => (l.id === updated.id ? updated : l)) ?? prev);
            setResolving(null);
          }}
        />
      )}
    </AppShell>
  );
}

function ResolveModal({
  log,
  onClose,
  onResolved,
}: {
  log: ContaminationLog;
  onClose: () => void;
  onResolved: (log: ContaminationLog) => void;
}) {
  const [resolutionNotes, setResolutionNotes] = useState(log.resolution_notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { contaminationLog } = await contaminationApi.updateContaminationLog(log.id, {
        status: 'resolved',
        resolution_notes: resolutionNotes || null,
      });
      onResolved(contaminationLog);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve log.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="Resolve contamination report"
      description="Note: this does not automatically change the culture's own status back to active."
      onClose={onClose}
    >
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="resolution-notes">Resolution notes</label>
          <textarea
            id="resolution-notes"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Discarded flask, re-cleaned incubator, retrained staff on aseptic technique…"
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Mark resolved'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
