type Tone = 'culture' | 'media' | 'turbid' | 'danger' | 'focus' | 'neutral';

const STATUS_TONE: Record<string, Tone> = {
  // Incubators
  operational: 'culture',
  maintenance: 'focus',
  out_of_order: 'danger',
  // Cell cultures
  active: 'culture',
  contaminated: 'turbid',
  discontinued: 'neutral',
  // Culture schedules
  pending: 'focus',
  completed: 'culture',
  missed: 'danger',
  // Contamination logs
  open: 'turbid',
  resolved: 'culture',
  // Experiments
  ongoing: 'focus',
  aborted: 'danger',
};

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

export function StatusBadge({ status, toneOverride }: { status: string; toneOverride?: Tone }) {
  const tone = toneOverride ?? STATUS_TONE[status] ?? 'neutral';
  return <span className={`badge badge-${tone}`}>{formatLabel(status)}</span>;
}
