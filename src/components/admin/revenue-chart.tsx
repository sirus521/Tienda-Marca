type RevenueByDay = { date: string; cents: number }[];

/**
 * Gráfico de barras (SVG) de ingresos diarios. Sin librería ni cliente JS:
 * todo server-render. `days` es el rango; `cents` los ingresos de cada día.
 */
export function RevenueChart({ days, height = 120 }: { days: RevenueByDay; height?: number }) {
  const max = Math.max(...days.map((day) => day.cents), 1);
  const width = Math.max(days.length * 42, 200);
  const barWidth = 28;

  return (
    <div className="border border-line p-5">
      <h3 className="mb-4 font-mono text-sm tracking-[0.14em] text-ink uppercase">
        Ingresos últimos 7 días
      </h3>
      <svg
        viewBox={`0 0 ${width} ${height + 24}`}
        className="w-full"
        role="img"
        aria-label="Ingresos diarios"
      >
        {days.map((day, index) => {
          const barHeight = Math.round((day.cents / max) * height);
          const x = index * 42 + (index % 2 === 0 ? 6 : 8);
          const y = height - barHeight;
          const label = day.date.slice(5);
          return (
            <g key={day.date}>
              <title>{`${day.date}: ${formatCents(day.cents)}`}</title>
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} fill="#111110" />
              <text
                x={x + barWidth / 2}
                y={height + 18}
                textAnchor="middle"
                fill="#9a9a94"
                fontFamily="JetBrains Mono"
                fontSize={9}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
