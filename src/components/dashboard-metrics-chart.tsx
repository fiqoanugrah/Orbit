"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Banknote,
  BarChart3,
  CalendarRange,
  Eye,
  EyeOff,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

type ChartPoint = {
  activeStudents: number;
  attendanceRate: number;
  label: string;
  newStudents: number;
  revenue: number;
};

type SeriesKey = "newStudents" | "activeStudents" | "revenue" | "attendanceRate";
type ChartPeriod = "monthly" | "weekly";

const seriesMeta = {
  newStudents: {
    color: "#0b6ffb",
    icon: UserPlus,
    label: "New Students",
    summaryLabel: "Total new",
    strokeDasharray: "",
  },
  activeStudents: {
    color: "#00a6a6",
    icon: Users,
    label: "Active Students",
    summaryLabel: "Latest active",
    strokeDasharray: "8 6",
  },
  revenue: {
    color: "#f5a623",
    icon: Banknote,
    label: "Revenue",
    summaryLabel: "Total revenue",
    strokeDasharray: "",
  },
  attendanceRate: {
    color: "#7c5cff",
    icon: Activity,
    label: "Attendance",
    summaryLabel: "Latest rate",
    strokeDasharray: "2 7",
  },
} satisfies Record<
  SeriesKey,
  {
    color: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    summaryLabel: string;
    strokeDasharray: string;
  }
>;

const seriesKeys = Object.keys(seriesMeta) as SeriesKey[];

function formatCurrency(value: number) {
  if (value >= 1000000) {
    return `Rp${(value / 1000000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} jt`;
  }

  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatValue(key: SeriesKey, value: number) {
  if (key === "revenue") {
    return formatCurrency(value);
  }

  if (key === "attendanceRate") {
    return `${Math.round(value)}%`;
  }

  return String(value);
}

function makePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  const path = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = current.x + (next.x - current.x) / 2;

    path.push(
      `C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`,
    );
  }

  return path.join(" ");
}

function makeAreaPath(points: Array<{ x: number; y: number }>, baseline: number) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x - 4} ${baseline} L ${points[0].x} ${points[0].y} L ${
      points[0].x + 4
    } ${baseline} Z`;
  }

  const line = makePath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPercentChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function formatPercentChange(value: number) {
  const rounded = Math.round(value);

  if (rounded > 0) {
    return `+${rounded}%`;
  }

  return `${rounded}%`;
}

function summarizeData(data: ChartPoint[]) {
  const latest = data[data.length - 1];

  return {
    activeStudents: latest?.activeStudents ?? 0,
    attendanceRate: latest?.attendanceRate ?? 0,
    newStudents: data.reduce((total, point) => total + point.newStudents, 0),
    revenue: data.reduce((total, point) => total + point.revenue, 0),
  } satisfies Record<SeriesKey, number>;
}

export function DashboardMetricsChart({
  monthlyData,
  weeklyData,
}: {
  monthlyData: ChartPoint[];
  weeklyData: ChartPoint[];
}) {
  const [period, setPeriod] = useState<ChartPeriod>("weekly");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    activeStudents: true,
    attendanceRate: true,
    newStudents: true,
    revenue: true,
  });

  const data = period === "monthly" ? monthlyData : weeklyData;
  const toggleMetric = (key: SeriesKey) => {
    setVisible((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };
  const activeKeys = useMemo(
    () => seriesKeys.filter((key) => visible[key]),
    [visible],
  );
  const summary = useMemo(() => summarizeData(data), [data]);

  const width = 1120;
  const height = 430;
  const paddingBottom = 58;
  const paddingLeft = 62;
  const paddingRight = 36;
  const paddingTop = 38;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartBottom = paddingTop + chartHeight;
  const safeMaxIndex = Math.max(data.length - 1, 0);
  const currentWeekdayIndex = (new Date().getDay() + 6) % 7;
  const defaultIndex =
    period === "weekly" ? Math.min(currentWeekdayIndex, safeMaxIndex) : safeMaxIndex;
  const displayIndex = clamp(selectedIndex ?? defaultIndex, 0, safeMaxIndex);
  const selectedPoint = data[displayIndex];
  const previousPoint = data[Math.max(displayIndex - 1, 0)];

  const chartState = useMemo(() => {
    const xForIndex = (index: number) =>
      paddingLeft +
      (data.length <= 1 ? 0 : (index / (data.length - 1)) * chartWidth);

    const normalizedSeries = activeKeys.map((key) => {
      const values = data.map((point) => point[key]);
      const max = Math.max(...values, 1);
      const points = data.map((point, index) => {
        const normalized = (point[key] / max) * 100;

        return {
          point,
          rawValue: point[key],
          x: xForIndex(index),
          y: paddingTop + chartHeight - (normalized / 100) * chartHeight,
        };
      });

      return {
        areaPath: makeAreaPath(points, chartBottom),
        key,
        max,
        path: makePath(points),
        points,
      };
    });

    return {
      series: normalizedSeries,
      xForIndex,
    };
  }, [
    activeKeys,
    chartBottom,
    chartHeight,
    chartWidth,
    data,
    paddingLeft,
    paddingTop,
  ]);

  const selectedX = chartState.xForIndex(displayIndex);
  const periodLabel =
    period === "monthly" ? "12 bulan terakhir" : "Minggu ini";
  const revenueMax = Math.max(...data.map((point) => point.revenue), 1);

  return (
    <section className="overflow-hidden rounded-md border border-[#dfe6ef] bg-white shadow-sm">
      <div className="border-b border-[#e6edf5] bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_62%,#eef7ff_100%)] px-4 py-4 md:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-[#d7e6ff] bg-white px-2.5 py-1 text-xs font-semibold uppercase text-[#0b6ffb] shadow-sm">
              <BarChart3 className="size-3.5" aria-hidden="true" />
              Performance Graph
            </div>
            <h2 className="mt-3 text-xl font-semibold text-[#172033]">
              Growth, Revenue, dan Attendance
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7890]">
              Satu chart untuk melihat arah pertumbuhan organization. Metric
              beda unit ditampilkan sebagai trend index, sementara angka aslinya
              tetap muncul di summary dan tooltip.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-[#d7e0ea] bg-white p-1 shadow-sm">
              {(["monthly", "weekly"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setPeriod(item);
                    setSelectedIndex(null);
                  }}
                  className={`h-9 rounded-md px-4 text-xs font-semibold transition ${
                    period === item
                      ? "bg-[#0b6ffb] text-white shadow-sm"
                      : "text-[#6b7890] hover:bg-[#f1f5f9] hover:text-[#172033]"
                  }`}
                >
                  {item === "monthly" ? "Monthly" : "Weekly"}
                </button>
              ))}
            </div>
            <span className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174] shadow-sm">
              <CalendarRange className="size-3.5 text-[#0b6ffb]" aria-hidden="true" />
              {periodLabel}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {seriesKeys.map((key) => {
            const Icon = seriesMeta[key].icon;
            const latestValue = selectedPoint?.[key] ?? 0;
            const previousValue = previousPoint?.[key] ?? 0;
            const change = getPercentChange(latestValue, previousValue);
            const ChangeIcon = change < 0 ? TrendingDown : TrendingUp;

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleMetric(key)}
                className={`group rounded-md border bg-white p-3 text-left shadow-sm transition ${
                  visible[key]
                    ? "border-[#dfe6ef] hover:-translate-y-0.5 hover:shadow-md"
                    : "border-[#e6edf5] opacity-55 hover:opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="grid size-9 place-items-center rounded-md"
                    style={{
                      backgroundColor: `${seriesMeta[key].color}14`,
                      color: seriesMeta[key].color,
                    }}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b7890]">
                    {visible[key] ? (
                      <Eye className="size-3.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="size-3.5" aria-hidden="true" />
                    )}
                    {visible[key] ? "On" : "Off"}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-[#6b7890]">
                  {seriesMeta[key].label}
                </p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="text-2xl font-semibold text-[#172033]">
                    {formatValue(key, summary[key])}
                  </p>
                  <span
                    className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold ${
                      change < 0
                        ? "bg-[#ffecec] text-[#c73535]"
                        : "bg-[#e7f8ef] text-[#16834a]"
                    }`}
                  >
                    <ChangeIcon className="size-3.5" aria-hidden="true" />
                    {formatPercentChange(change)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        <div className="min-w-0 rounded-md border border-[#e6edf5] bg-[#fbfcfe]">
          <div className="flex flex-col gap-3 border-b border-[#e6edf5] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[#6b7890]">
                Trend Index
              </p>
              <p className="mt-1 text-sm font-semibold text-[#172033]">
                {selectedPoint?.label ?? "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Toggle graph metrics">
              {seriesKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMetric(key)}
                  className={`inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-semibold ring-1 transition ${
                    visible[key]
                      ? "bg-white text-[#536174] ring-[#e6edf5] hover:bg-[#f1f5f9]"
                      : "bg-[#f6f8fb] text-[#9aa7b8] ring-[#e6edf5] opacity-70 hover:opacity-100"
                  }`}
                  aria-pressed={visible[key]}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor: visible[key]
                        ? seriesMeta[key].color
                        : "#c8d2df",
                    }}
                  />
                  {seriesMeta[key].label}
                  {visible[key] ? (
                    <Eye className="size-3" aria-hidden="true" />
                  ) : (
                    <EyeOff className="size-3" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="overflow-x-auto p-3">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label="Dashboard growth graph"
                className="h-[390px] min-w-[900px] w-full"
                onMouseLeave={() => setSelectedIndex(null)}
                onMouseMove={(event) => {
                  if (data.length === 0) {
                    return;
                  }

                  const bounds = event.currentTarget.getBoundingClientRect();
                  const pointerX =
                    ((event.clientX - bounds.left) / bounds.width) * width;
                  const ratio = clamp(
                    (pointerX - paddingLeft) / chartWidth,
                    0,
                    1,
                  );

                  setSelectedIndex(Math.round(ratio * safeMaxIndex));
                }}
              >
              <defs>
                {seriesKeys.map((key) => (
                  <linearGradient
                    key={key}
                    id={`orbit-chart-${key}`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={seriesMeta[key].color}
                      stopOpacity="0.16"
                    />
                    <stop
                      offset="100%"
                      stopColor={seriesMeta[key].color}
                      stopOpacity="0"
                    />
                  </linearGradient>
                ))}
              </defs>

              <rect
                x={paddingLeft}
                y={paddingTop}
                width={chartWidth}
                height={chartHeight}
                rx="14"
                fill="#ffffff"
              />

              {[100, 75, 50, 25, 0].map((tick) => {
                const y = paddingTop + chartHeight - (tick / 100) * chartHeight;

                return (
                  <g key={tick}>
                    <line
                      x1={paddingLeft}
                      x2={width - paddingRight}
                      y1={y}
                      y2={y}
                      stroke="#edf2f7"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 14}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-[#9aa7b8] text-[11px] font-semibold"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {data.map((point, index) => {
                const x = chartState.xForIndex(index);
                const showLabel =
                  period === "weekly" ||
                  index % 2 === 0 ||
                  index === safeMaxIndex;

                return (
                  <g key={`${point.label}-${index}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={paddingTop}
                      y2={chartBottom}
                      stroke={index === displayIndex ? "#d7e0ea" : "#f3f6fa"}
                      strokeWidth={index === displayIndex ? "1.5" : "1"}
                    />
                    {showLabel ? (
                      <text
                        x={x}
                        y={height - 20}
                        textAnchor="middle"
                        className={`text-[11px] font-semibold ${
                          index === displayIndex
                            ? "fill-[#172033]"
                            : "fill-[#6b7890]"
                        }`}
                      >
                        {point.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {visible.revenue
                ? data.map((point, index) => {
                    const x = chartState.xForIndex(index);
                    const normalized = point.revenue / revenueMax;
                    const barHeight = normalized * chartHeight;

                    return (
                      <rect
                        key={`revenue-bar-${point.label}-${index}`}
                        x={x - 16}
                        y={chartBottom - barHeight}
                        width="32"
                        height={Math.max(barHeight, point.revenue > 0 ? 6 : 0)}
                        rx="8"
                        fill={seriesMeta.revenue.color}
                        opacity={index === displayIndex ? "0.2" : "0.11"}
                      />
                    );
                  })
                : null}

              {chartState.series.map(({ areaPath, key }) => (
                <path
                  key={`${key}-area`}
                  d={areaPath}
                  fill={`url(#orbit-chart-${key})`}
                  opacity={key === "revenue" ? "0.45" : "0.7"}
                />
              ))}

              {activeKeys.length > 0 ? (
                <line
                  x1={selectedX}
                  x2={selectedX}
                  y1={paddingTop}
                  y2={chartBottom}
                  stroke="#172033"
                  strokeDasharray="4 5"
                  strokeOpacity="0.28"
                  strokeWidth="1.5"
                />
              ) : null}

              {chartState.series.map(({ key, path, points }) => (
                <g key={key}>
                  <path
                    d={path}
                    fill="none"
                    stroke={seriesMeta[key].color}
                    strokeDasharray={seriesMeta[key].strokeDasharray}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={key === "attendanceRate" ? "3" : "3.5"}
                  />
                  {points.map(({ point, x, y }, index) => (
                    <circle
                      key={`${key}-${point.label}-${index}`}
                      cx={x}
                      cy={y}
                      fill={index === displayIndex ? seriesMeta[key].color : "#ffffff"}
                      r={index === displayIndex ? "5.5" : "3.5"}
                      stroke={seriesMeta[key].color}
                      strokeWidth="2"
                    >
                      <title>{`${seriesMeta[key].label}: ${formatValue(
                        key,
                        point[key],
                      )}`}</title>
                    </circle>
                  ))}
                </g>
              ))}

              {activeKeys.length > 0 && selectedPoint ? (
                <g
                  transform={`translate(${clamp(
                    selectedX + 18,
                    paddingLeft + 10,
                    width - paddingRight - 230,
                  )} ${paddingTop + 18})`}
                >
                  <rect
                    width="220"
                    height={42 + activeKeys.length * 24}
                    rx="10"
                    fill="#ffffff"
                    stroke="#dfe6ef"
                    filter="drop-shadow(0 12px 24px rgba(23, 32, 51, 0.12))"
                  />
                  <text
                    x="14"
                    y="24"
                    className="fill-[#172033] text-[13px] font-bold"
                  >
                    {selectedPoint.label}
                  </text>
                  {activeKeys.map((key, index) => (
                    <g key={key} transform={`translate(14 ${48 + index * 24})`}>
                      <circle
                        cx="0"
                        cy="-4"
                        r="4"
                        fill={seriesMeta[key].color}
                      />
                      <text
                        x="12"
                        y="0"
                        className="fill-[#536174] text-[11px] font-semibold"
                      >
                        {seriesMeta[key].label}
                      </text>
                      <text
                        x="206"
                        y="0"
                        textAnchor="end"
                        className="fill-[#172033] text-[11px] font-bold"
                      >
                        {formatValue(key, selectedPoint[key])}
                      </text>
                    </g>
                  ))}
                </g>
              ) : null}

              {activeKeys.length === 0 ? (
                <text
                  x={width / 2}
                  y={height / 2}
                  textAnchor="middle"
                  className="fill-[#6b7890] text-sm font-semibold"
                >
                  Pilih minimal satu metric untuk ditampilkan.
                </text>
              ) : null}
            </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
