import { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import * as schedulesApi from '../../api/schedules';
import * as cellCulturesApi from '../../api/cellCultures';
import { ApiError } from '../../api/client';
import type { CellCulture, CultureSchedule, ScheduleStatus, TaskType } from '../../types';
import { formatDateTime, isManager, toDateTimeInputValue } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const TASK_TYPES: TaskType[] = ['feed', 'passage', 'media_change', 'check', 'other'];
const STATUS_OPTIONS: ScheduleStatus[] = ['pending', 'completed', 'missed'];

export function SchedulesPage() {
  const { user } = useAuth();
  const canManage = isManager(user?.role);

  const [schedules, setSchedules] = useState<CultureSchedule[] | null>(null);
  const [cultures, setCultures] = useState<CellCulture[]>([]);
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | ''>('');
  const [taskFilter, setTaskFilter] = useState<TaskType | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([
      schedulesApi.listSchedules({
        status: statusFilter || undefined,
        task_type: taskFilter || undefined,
      }),
      cellCulturesApi.listCellCultures(),
    ])
      .then(([schedulesRes, culturesRes]) => {
        setSchedules(schedulesRes.schedules);
        setCultures(culturesRes.cellCultures);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load the schedule.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [statusFilter, taskFilter]);

  function cultureName(id: number): string {
    return cultures.find((c) => c.id === id)?.culture_name ?? `#${id}`;
  }

  async function handleStatusChange(schedule: CultureSchedule, status: ScheduleStatus) {
    try {
      const { schedule: updated } = await schedulesApi.updateSchedule(schedule.id, { status });
      setSchedules((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update task.');
    }
  }

  async function handleDelete(schedule: CultureSchedule) {
    if (!confirm('Cancel this scheduled task?')) return;
    try {
      await schedulesApi.deleteSchedule(schedule.id);
      setSchedules((prev) => prev?.filter((s) => s.id !== schedule.id) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel task.');
    }
  }

  return (
    <AppShell title="Culture Scheduling" subtitle="Feeds, passages, media changes, and checks across every culture.">
      <div className="page-header">
        <div />
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={cultures.length === 0}>
            + Add task
          </button>
        )}
      </div>

      <div className="filter-bar">
        <span className="filter-label">Status</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ScheduleStatus | '')}>
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="filter-label">Task type</span>
        <select value={taskFilter} onChange={(e) => setTaskFilter(e.target.value as TaskType | '')}>
          <option value="">All</option>
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingState label="Loading schedule…" />}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}
      {!isLoading && !error && schedules && schedules.length === 0 && (
        <EmptyState title="Nothing scheduled" description={canManage ? 'Add a task to get started.' : undefined} />
      )}

      {!isLoading && !error && schedules && schedules.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Culture</th>
                <th>Task</th>
                <th>Scheduled for</th>
                <th>Status</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{cultureName(s.cell_culture_id)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.task_type.replace('_', ' ')}</td>
                  <td className="cell-muted">{formatDateTime(s.scheduled_date)}</td>
                  <td>
                    {canManage ? (
                      <select
                        value={s.status}
                        onChange={(e) => handleStatusChange(s, e.target.value as ScheduleStatus)}
                        style={{ border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.4rem', fontSize: '0.78rem' }}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </td>
                  {canManage && (
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(s)}>
                        Cancel
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateScheduleModal
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

function CreateScheduleModal({
  cultures,
  onClose,
  onCreated,
}: {
  cultures: CellCulture[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [cultureId, setCultureId] = useState(cultures[0] ? String(cultures[0].id) : '');
  const [taskType, setTaskType] = useState<TaskType>('feed');
  const [scheduledDate, setScheduledDate] = useState(toDateTimeInputValue());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await schedulesApi.createSchedule({
        cell_culture_id: Number(cultureId),
        task_type: taskType,
        scheduled_date: new Date(scheduledDate).toISOString(),
        notes: notes || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add task.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Add a scheduled task" onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field span-2">
            <label htmlFor="schedule-culture">Culture</label>
            <select id="schedule-culture" required value={cultureId} onChange={(e) => setCultureId(e.target.value)}>
              {cultures.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.culture_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="schedule-task">Task type</label>
            <select id="schedule-task" value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)}>
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="schedule-date">Scheduled for</label>
            <input
              id="schedule-date"
              type="datetime-local"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <div className="form-field span-2">
            <label htmlFor="schedule-notes">Notes (optional)</label>
            <textarea id="schedule-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
