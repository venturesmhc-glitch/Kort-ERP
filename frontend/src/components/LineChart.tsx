interface LineChartProps {
  series: number[];
  compareSeries?: number[];
  width?: number;
  height?: number;
  color?: string;
  compareColor?: string;
}

function toPoints(values: number[], max: number, width: number, height: number) {
  if (values.length === 0) return '';
  return values
    .map((v, i) => {
      const x = values.length > 1 ? (i / (values.length - 1)) * width : width / 2;
      const y = height - (v / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function LineChart({
  series,
  compareSeries,
  width = 300,
  height = 96,
  color = 'var(--color-accent)',
  compareColor = 'rgba(255,255,255,.28)',
}: LineChartProps) {
  const max = Math.max(1, ...series, ...(compareSeries ?? []));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height }}
      role="img"
      aria-label="Evolucion de facturacion"
    >
      {compareSeries && compareSeries.length > 0 && (
        <polyline points={toPoints(compareSeries, max, width, height)} fill="none" stroke={compareColor} strokeWidth={1.5} />
      )}
      {series.length > 0 && (
        <polyline points={toPoints(series, max, width, height)} fill="none" stroke={color} strokeWidth={2.5} />
      )}
    </svg>
  );
}
