import { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { Modal } from '../../components/common/Modal';
import * as mediaApi from '../../api/media';
import { ApiError } from '../../api/client';
import type { MediaBatch } from '../../types';
import { formatDate, isManager, toDateInputValue } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

export function MediaPage() {
  const { user } = useAuth();
  const canManage = isManager(user?.role);

  const [batches, setBatches] = useState<MediaBatch[] | null>(null);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<MediaBatch | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    mediaApi
      .listMediaBatches(expiringOnly || undefined)
      .then(({ mediaBatches }) => setBatches(mediaBatches))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load media batches.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [expiringOnly]);

  function isExpiringSoon(batch: MediaBatch): boolean {
    if (!batch.expiry_date) return false;
    const days = (new Date(batch.expiry_date).getTime() - Date.now()) / 86_400_000;
    return days <= 7;
  }

  return (
    <AppShell title="Media Inventory" subtitle="Prepared media batches and remaining volume.">
      <div className="page-header">
        <div />
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Log new batch
          </button>
        )}
      </div>

      <div className="filter-bar">
        <label className="flex-row" style={{ fontSize: '0.84rem' }}>
          <input type="checkbox" checked={expiringOnly} onChange={(e) => setExpiringOnly(e.target.checked)} />
          Expiring within 7 days
        </label>
      </div>

      {isLoading && <LoadingState label="Loading media batches…" />}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}
      {!isLoading && !error && batches && batches.length === 0 && (
        <EmptyState title="No media batches found" description={canManage ? 'Log your first prepared batch.' : undefined} />
      )}

      {!isLoading && !error && batches && batches.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Media</th>
                <th>Prepared</th>
                <th>Prepared vol. (mL)</th>
                <th>Remaining (mL)</th>
                <th>Expiry</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>{b.media_name}</td>
                  <td className="cell-muted">{formatDate(b.prepared_date)}</td>
                  <td className="cell-mono">{Number(b.volume_prepared_ml).toFixed(1)}</td>
                  <td className="cell-mono">{Number(b.volume_remaining_ml).toFixed(1)}</td>
                  <td>
                    {b.expiry_date ? (
                      <span className={`badge ${isExpiringSoon(b) ? 'badge-turbid' : 'badge-neutral'}`}>
                        {formatDate(b.expiry_date)}
                      </span>
                    ) : (
                      <span className="cell-muted">—</span>
                    )}
                  </td>
                  <td>
                    {canManage && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(b)}>
                        Update
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateMediaModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {editing && (
        <EditMediaModal
          batch={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </AppShell>
  );
}

function CreateMediaModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [mediaName, setMediaName] = useState('');
  const [preparedDate, setPreparedDate] = useState(toDateInputValue());
  const [volume, setVolume] = useState('500');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await mediaApi.createMediaBatch({
        media_name: mediaName,
        prepared_date: preparedDate,
        volume_prepared_ml: Number(volume),
        expiry_date: expiryDate || null,
        notes: notes || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log media batch.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Log a new media batch" description="Freshly prepared media starts with its full volume remaining." onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field span-2">
            <label htmlFor="media-name">Media name</label>
            <input id="media-name" required value={mediaName} onChange={(e) => setMediaName(e.target.value)} placeholder="DMEM + 10% FBS" />
          </div>
          <div className="form-field">
            <label htmlFor="media-prepared">Prepared date</label>
            <input id="media-prepared" type="date" required value={preparedDate} onChange={(e) => setPreparedDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="media-volume">Volume prepared (mL)</label>
            <input id="media-volume" type="number" step="0.1" required value={volume} onChange={(e) => setVolume(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="media-expiry">Expiry date (optional)</label>
            <input id="media-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div className="form-field span-2">
            <label htmlFor="media-notes">Notes (optional)</label>
            <textarea id="media-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Supplements added, recipe reference…" />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Logging…' : 'Log batch'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditMediaModal({
  batch,
  onClose,
  onUpdated,
}: {
  batch: MediaBatch;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [remaining, setRemaining] = useState(batch.volume_remaining_ml);
  const [notes, setNotes] = useState(batch.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await mediaApi.updateMediaBatch(batch.id, {
        volume_remaining_ml: Number(remaining),
        notes: notes || null,
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update batch.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={`Update ${batch.media_name}`} onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="media-remaining">Remaining volume (mL)</label>
            <input
              id="media-remaining"
              type="number"
              step="0.1"
              min="0"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
            />
          </div>
          <div className="form-field span-2">
            <label htmlFor="media-edit-notes">Notes</label>
            <textarea id="media-edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
