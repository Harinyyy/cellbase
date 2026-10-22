export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="inline-spinner-row">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state-block">
      <span className="state-icon" aria-hidden="true">
        ○
      </span>
      <span className="state-title">{title}</span>
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-block is-error">
      <span className="state-icon" aria-hidden="true">
        !
      </span>
      <span className="state-title">Couldn't load this data</span>
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm mt-1" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
