interface Segment {
  color: string;
  value: number;
}

interface PortfolioDonutProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
}

/** Hand-rolled SVG donut — no charting library needed for a single allocation ring. */
export function PortfolioDonut({ segments, size = 168, strokeWidth = 22 }: PortfolioDonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  let cursor = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-white/25"
        strokeWidth={strokeWidth}
      />
      {total > 0 &&
        segments.map((seg, i) => {
          if (seg.value <= 0) return null;
          const fraction = seg.value / total;
          const dash = Math.max(fraction * circumference - 2, 0);
          const gap = circumference - dash;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-cursor}
              strokeLinecap="round"
            />
          );
          cursor += fraction * circumference;
          return el;
        })}
    </svg>
  );
}
