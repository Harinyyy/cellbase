import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import * as cellCulturesApi from '../../api/cellCultures';
import * as incubatorsApi from '../../api/incubators';
import * as contaminationApi from '../../api/contamination';
import { ApiError } from '../../api/client';
import type { CellCulture, CultureStatus, Incubator, PassageRecord } from '../../types';
import { formatDate, isManager, toDateInputValue } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const STATUS_OPTIONS: CultureStatus[] = ['active', 'contaminated', 'discontinued'];

export function CellCultureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const cultureId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = isManager(user?.role);

  const [culture, setCulture] = useState<CellCulture | null>(null);
  const [incubators, setIncubators] = useState<Incubator[]>([]);
  const [passages, setPassages] = useState<PassageRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassageForm, setShowPassageForm] = useState(false);
  const [showContaminationForm, setShowContaminationForm] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([
      cellCulturesApi.getCellCulture(cultureId),
      cellCulturesApi.listPassages(cultureId),
      incubatorsApi.listIncubators(),
    ])
      .then(([cultureRes, passagesRes, incubatorsRes]) => {
        setCulture(cultureRes.cellCulture);
        setPassages(passagesRes.passages);
        setIncubators(incubatorsRes.incubators);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load this culture.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [cultureId]);

  async function handleFieldUpdate(patch: Partial<{ status: CultureStatus; incubator_id: number | null }>) {
    if (!culture) return;
    try {
      const { cellCulture } = await cellCulturesApi.updateCellCulture(culture.id, patch);
      setCulture(cellCulture);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update culture.');
    }
  }

  async function handleDelete() {
    if (!culture) return;
    if (!confirm(`Delete "${culture.culture_name}"? This removes its passage history, schedule, and contamination logs.`)) return;
    try {
      await cellCulturesApi.deleteCellCulture(culture.id);
      navigate('/cultures');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete culture. It may have linked experiments.');
    }
  }

  function incubatorName(incId: number | null): string {
    if (!incId) return 'Unassigned';
    return incubators.find((i) => i.id === incId)?.name ?? `#${incId}`;
  }

  return (
    <AppShell title={culture ? culture.culture_name : 'Cell culture'} subtitle={culture ? culture.cell_line : undefined}>
      {isLoading && <LoadingState label="Loading culture…" />}
      {!isLoading && error && !culture && <ErrorState message={error} onRetry={load} />}

      {!isLoading && culture && (
        <>
          <div className="page-header">
            <div className="flex-row">
              <StatusBadge status={culture.status} />
              <span className="badge badge-neutral">Passage {culture.current_passage_number}</span>
              <span className="text-muted" style={{ fontSize: '0.84rem' }}>
                Incubator: {incubatorName(culture.incubator_id)}
              </span>
            </div>
            {canManage && (
              <div className="flex-row">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowContaminationForm(true)}>
                  Report contamination
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}
          {banner && (
            <div className="card mt-2" style={{ borderColor: 'var(--turbid)', background: 'var(--turbid-soft)', marginBottom: '1.1rem' }}>
              {banner}
            </div>
          )}

          {canManage && (
            <div className="card" style={{ marginBottom: '1.1rem' }}>
              <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="form-field" style={{ minWidth: 180 }}>
                  <label htmlFor="culture-status">Status</label>
                  <select
                    id="culture-status"
                    value={culture.status}
                    onChange={(e) => handleFieldUpdate({ status: e.target.value as CultureStatus })}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ minWidth: 200 }}>
                  <label htmlFor="culture-incubator">Incubator</label>
                  <select
                    id="culture-incubator"
                    value={culture.incubator_id ?? ''}
                    onChange={(e) => handleFieldUpdate({ incubator_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">Unassigned</option>
                    {incubators.map((inc) => (
                      <option key={inc.id} value={inc.id}>
                        {inc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="layout-grid">
            <div className="card">
              <div className="card-title-row">
                <h2>Passage history</h2>
                {canManage && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowPassageForm(true)}>
                    + Log passage
                  </button>
                )}
              </div>

              {passages && passages.length === 0 && <EmptyState title="No passages logged yet" />}

              {passages && passages.length > 0 && (
                <div className="timeline mt-2">
                  {passages.map((p) => (
                    <div className="timeline-item" key={p.id}>
                      <div className="timeline-marker">P{p.passage_number}</div>
                      <div className="timeline-body">
                        <div className="flex-between">
                          <strong style={{ fontSize: '0.88rem' }}>Passage {p.passage_number}</strong>
                          <span className="cell-muted" style={{ fontSize: '0.78rem' }}>
                            {formatDate(p.passage_date)}
                          </span>
                        </div>
                        <div className="timeline-meta">
                          {p.confluency_percent !== null && <span>Confluency: {Number(p.confluency_percent).toFixed(0)}%</span>}
                        </div>
                        {p.notes && (
                          <p className="text-muted mt-1" style={{ fontSize: '0.83rem' }}>
                            {p.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2>Culture info</h2>
              <dl className="mt-2" style={{ display: 'grid', gap: '0.7rem', margin: 0 }}>
                <Info label="Cell line" value={culture.cell_line} />
                <Info label="Started" value={formatDate(culture.started_at)} />
                <Info label="Current passage" value={String(culture.current_passage_number)} />
              </dl>
            </div>
          </div>
        </>
      )}

      {culture && showPassageForm && (
        <LogPassageModal
          culture={culture}
          suggestedNext={culture.current_passage_number + 1}
          onClose={() => setShowPassageForm(false)}
          onLogged={(passage) => {
            setPassages((prev) => (prev ? [passage, ...prev] : [passage]));
            setCulture((prev) => (prev ? { ...prev, current_passage_number: Math.max(prev.current_passage_number, passage.passage_number) } : prev));
            setShowPassageForm(false);
          }}
        />
      )}

      {culture && showContaminationForm && (
        <ReportContaminationModal
          cultureId={culture.id}
          onClose={() => setShowContaminationForm(false)}
          onReported={() => {
            setShowContaminationForm(false);
            setBanner('Contamination reported — this culture has been marked as contaminated.');
            load();
          }}
        />
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

function LogPassageModal({
  culture,
  suggestedNext,
  onClose,
  onLogged,
}: {
  culture: CellCulture;
  suggestedNext: number;
  onClose: () => void;
  onLogged: (passage: PassageRecord) => void;
}) {
  const [passageNumber, setPassageNumber] = useState(String(suggestedNext));
  const [passageDate, setPassageDate] = useState(toDateInputValue());
  const [confluency, setConfluency] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { passage } = await cellCulturesApi.logPassage(culture.id, {
        passage_number: Number(passageNumber),
        passage_date: passageDate,
        confluency_percent: confluency ? Number(confluency) : null,
        notes: notes || null,
      });
      onLogged(passage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log passage. That passage number may already exist.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={`Log a passage for ${culture.culture_name}`} onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="passage-number">Passage number</label>
            <input id="passage-number" type="number" min="0" required value={passageNumber} onChange={(e) => setPassageNumber(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="passage-date">Passage date</label>
            <input id="passage-date" type="date" required value={passageDate} onChange={(e) => setPassageDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="passage-confluency">Confluency (%, optional)</label>
            <input id="passage-confluency" type="number" min="0" max="100" value={confluency} onChange={(e) => setConfluency(e.target.value)} />
          </div>
          <div className="form-field span-2">
            <label htmlFor="passage-notes">Notes (optional)</label>
            <textarea id="passage-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Logging…' : 'Log passage'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReportContaminationModal({
  cultureId,
  onClose,
  onReported,
}: {
  cultureId: number;
  onClose: () => void;
  onReported: () => void;
}) {
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await contaminationApi.reportContamination({ cell_culture_id: cultureId, description });
      onReported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to report contamination.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Report contamination" description="This will also mark the culture's status as contaminated." onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="contamination-description">What did you observe?</label>
          <textarea
            id="contamination-description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cloudy media, visible particulate, unusual odor…"
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
            {isSubmitting ? 'Reporting…' : 'Report contamination'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
