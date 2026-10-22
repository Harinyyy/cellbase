export interface Segment {
  label: string;
  value: number;
  color: string;
}

export function SegmentedBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div>
        <div className="segmented-bar" />
        <div className="segmented-bar-legend">
          <span>No data yet</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="segmented-bar">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
      </div>
      <div className="segmented-bar-legend">
        {segments.map((s) => (
          <span key={s.label}>
            <span className="legend-dot" style={{ background: s.color }} />
            {s.label} — {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}
