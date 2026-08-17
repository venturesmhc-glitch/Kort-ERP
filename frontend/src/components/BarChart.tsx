interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  color?: string;
  formatValue?: (value: number) => string;
}

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 160;
const BOTTOM_MARGIN = 24;

export function BarChart({ data, color = 'var(--color-primary)', formatValue }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const usableWidth = VIEW_WIDTH - 10;
  const barSlot = usableWidth / Math.max(data.length, 1);

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="chart-svg"
      role="img"
      aria-label="Grafico de barras"
    >
      <line
        x1={5}
        y1={VIEW_HEIGHT - BOTTOM_MARGIN}
        x2={VIEW_WIDTH - 5}
        y2={VIEW_HEIGHT - BOTTOM_MARGIN}
        stroke="var(--color-border)"
      />
      {data.map((d, i) => {
        const barHeight = (d.value / max) * (VIEW_HEIGHT - BOTTOM_MARGIN - 14);
        const x = 5 + i * barSlot + barSlot * 0.2;
        const width = barSlot * 0.6;
        const y = VIEW_HEIGHT - BOTTOM_MARGIN - barHeight;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={width} height={barHeight} fill={color} rx={2} />
            <text x={x + width / 2} y={y - 4} fontSize="8" textAnchor="middle" fill="var(--color-text)">
              {formatValue ? formatValue(d.value) : d.value}
            </text>
            <text
              x={x + width / 2}
              y={VIEW_HEIGHT - BOTTOM_MARGIN + 12}
              fontSize="8"
              textAnchor="middle"
              fill="var(--color-text-muted)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
