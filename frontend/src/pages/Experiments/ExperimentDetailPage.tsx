import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { StatusBadge } from '../../components/common/StatusBadge';
import * as experimentsApi from '../../api/experiments';
import * as cellCulturesApi from '../../api/cellCultures';
import { ApiError } from '../../api/client';
import type { CellCulture, ExperimentDetail, ExperimentObservation, ExperimentStatus } from '../../types';
import { formatDate, formatDateTime, isManager } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const STATUS_OPTIONS: ExperimentStatus[] = ['ongoing', 'completed', 'aborted'];

export function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const experimentId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = isManager(user?.role);

  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [culture, setCulture] = useState<CellCulture | null>(null);
  const [observations, setObservations] = useState<ExperimentObservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    setError(null);
    experimentsApi
      .getExperiment(experimentId)
      .then(async ({ experiment: exp }) => {
        setExperiment(exp);
        const [obsRes, cultureRes] = await Promise.all([
          experimentsApi.listObservations(experimentId),
          cellCulturesApi.getCellCulture(exp.cell_culture_id),
        ]);
        setObservations(obsRes.observations);
        setCulture(cultureRes.cellCulture);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load this experiment.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [experimentId]);

  async function handleFieldUpdate(patch: Partial<{ status: ExperimentStatus; end_date: string | null }>) {
    if (!experiment) return;
    try {
      const { experiment: updated } = await experimentsApi.updateExperiment(experiment.id, patch);
      setExperiment((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update experiment.');
    }
  }

  async function handleDelete() {
    if (!experiment) return;
    if (!confirm(`Delete "${experiment.title}"? This also removes its observations.`)) return;
    try {
      await experimentsApi.deleteExperiment(experiment.id);
      navigate('/experiments');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete experiment.');
    }
  }

  async function handleDeleteObservation(obs: ExperimentObservation) {
    if (!confirm('Delete this observation?')) return;
    try {
      await experimentsApi.deleteObservation(obs.id);
      setObservations((prev) => prev?.filter((o) => o.id !== obs.id) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete observation.');
    }
  }

  return (
    <AppShell title={experiment ? experiment.title : 'Experiment'} subtitle={culture ? `Culture: ${culture.culture_name}` : undefined}>
      {isLoading && <LoadingState label="Loading experiment…" />}
      {!isLoading && error && !experiment && <ErrorState message={error} onRetry={load} />}

      {!isLoading && experiment && (
        <>
          <div className="page-header">
            <div className="flex-row">
              <StatusBadge status={experiment.status} />
              <span className="text-muted" style={{ fontSize: '0.84rem' }}>
                {experiment.observation_count} observation{experiment.observation_count === 1 ? '' : 's'}
              </span>
            </div>
            {canManage && (
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                Delete experiment
              </button>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="layout-grid">
            <div className="stack">
              <div className="card">
                <h2>Objective</h2>
                <p className="mt-2" style={{ fontSize: '0.9rem' }}>
                  {experiment.objective || <span className="text-muted">No objective recorded.</span>}
                </p>
              </div>

              <div className="card">
                <div className="card-title-row">
                  <h2>Observations</h2>
                </div>
                {observations && observations.length === 0 && <EmptyState title="No observations logged yet" />}
                {observations && observations.length > 0 && (
                  <div className="timeline mt-2">
                    {observations.map((obs) => (
                      <div className="timeline-item" key={obs.id}>
                        <div className="timeline-marker">◉</div>
                        <div className="timeline-body">
                          <div className="flex-between">
                            <span className="cell-muted" style={{ fontSize: '0.78rem' }}>
                              {formatDateTime(obs.observation_date)}
                            </span>
                            {canManage && (
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDeleteObservation(obs)}>
                                Delete
                              </button>
                            )}
                          </div>
                          <p style={{ fontSize: '0.88rem', margin: '0.3rem 0 0' }}>{obs.description}</p>
                          {obs.measurement_value !== null && (
                            <div className="timeline-meta">
                              <span className="readout">
                                {Number(obs.measurement_value).toFixed(2)} {obs.measurement_unit ?? ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="stack">
              {canManage && (
                <div className="card">
                  <h2>Experiment status</h2>
                  <div className="form-field mt-2">
                    <label htmlFor="exp-status">Status</label>
                    <select
                      id="exp-status"
                      value={experiment.status}
                      onChange={(e) => handleFieldUpdate({ status: e.target.value as ExperimentStatus })}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field mt-1">
                    <label htmlFor="exp-end-date">End date</label>
                    <input
                      id="exp-end-date"
                      type="date"
                      value={experiment.end_date ?? ''}
                      onChange={(e) => handleFieldUpdate({ end_date: e.target.value || null })}
                    />
                  </div>
                </div>
              )}

              <div className="card">
                <dl style={{ display: 'grid', gap: '0.7rem', margin: 0 }}>
                  <Info label="Start date" value={formatDate(experiment.start_date)} />
                  <Info label="End date" value={experiment.end_date ? formatDate(experiment.end_date) : 'Not set'} />
                </dl>
              </div>

              {canManage && (
                <AddObservationForm
                  experimentId={experiment.id}
                  onAdded={(obs) => {
                    setObservations((prev) => (prev ? [obs, ...prev] : [obs]));
                    setExperiment((prev) => (prev ? { ...prev, observation_count: prev.observation_count + 1 } : prev));
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted" style={{ fontSize: '0.76rem' }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: '0.9rem' }}>{value}</dd>
    </div>
  );
}

function AddObservationForm({
  experimentId,
  onAdded,
}: {
  experimentId: number;
  onAdded: (observation: ExperimentObservation) => void;
}) {
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { observation } = await experimentsApi.createObservation(experimentId, {
        description,
        measurement_value: value ? Number(value) : null,
        measurement_unit: unit || null,
      });
      onAdded(observation);
      setDescription('');
      setValue('');
      setUnit('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add observation.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>Add observation</h2>
      {error && (
        <div className="form-error mt-2" style={{ marginBottom: 0 }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-2">
        <div className="form-field">
          <label htmlFor="obs-description">Description</label>
          <textarea id="obs-description" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cell viability appears reduced at 48h…" />
        </div>
        <div className="form-field mt-1">
          <label htmlFor="obs-value">Measurement value (optional)</label>
          <input id="obs-value" type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="form-field mt-1">
          <label htmlFor="obs-unit">Unit (optional)</label>
          <input id="obs-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="% viability, µM, cells/mL…" />
        </div>
        <button type="submit" className="btn btn-primary mt-2" disabled={isSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
          {isSubmitting ? 'Adding…' : 'Add observation'}
        </button>
      </form>
    </div>
  );
}
