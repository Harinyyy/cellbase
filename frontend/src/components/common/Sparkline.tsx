interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

/** A minimal SVG line chart — deliberately dependency-free for this MVP. */
export function Sparkline({ values, color, width = 220, height = 56 }: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} role="img" aria-label="Not enough data yet">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="var(--line)" strokeDasharray="4 4" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg width={width} height={height} role="img" aria-label="Recent readings trend">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3.2} fill={color} />
    </svg>
  );
}
