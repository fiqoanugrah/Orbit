"use client";

import { useMemo, useState } from "react";

type ChartPoint = {
  activeStudents: number;
  attendanceRate: number;
  label: string;
  newStudents: number;
  revenue: number;
};

type SeriesKey = "newStudents" | "activeStudents" | "revenue" | "attendanceRate";

const seriesMeta = {
  newStudents: {
    color: "#0b6ffb",
    label: "New Students",
    suffix: "",
  },
  activeStudents: {
    color: "#00a6a6",
    label: "Active Students",
    suffix: "",
  },
  revenue: {
    color: "#f5a623",
    label: "Revenue",
    suffix: "",
  },
  attendanceRate: {
    color: "#7c5cff",
    label: "Attendance",
    suffix: "%",
  },
} satisfies Record<SeriesKey, { color: string; label: string; suffix: string }>;

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

function makeArea(points: Array<{ x: number; y: number }>, height: number) {
  const line = makePath(points);

  if (!line) {
    return "";
  }

  const last = points[points.length - 1];
  const first = points[0];

  return `${line} L ${last.x} ${height} L ${first.x} ${height} Z`;
}

export function DashboardMetricsChart({ data }: { data: ChartPoint[] }) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    activeStudents: true,
    attendanceRate: true,
    newStudents: true,
    revenue: true,
  });

  const activeKeys = useMemo(
    () =>
      (Object.keys(seriesMeta) as SeriesKey[]).filter((key) => visible[key]),
    [visible],
  );

  const width = 960;
  const height = 320;
  const paddingBottom = 42;
  const paddingLeft = 34;
  const paddingRight = 28;
  const paddingTop = 28;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const paths = useMemo(() => {
    return activeKeys.map((key) => {
      const max = Math.max(...data.map((point) => point[key]), 1);
      const points = data.map((point, index) => {
        const x =
          paddingLeft +
          (data.length <= 1 ? 0 : (index / (data.length - 1)) * chartWidth);
        const y = paddingTop + chartHeight - (point[key] / max) * chartHeight;

        return { point, x, y };
      });

      return {
        area: makeArea(points, paddingTop + chartHeight),
        key,
        line: makePath(points),
        points,
      };
    });
  }, [activeKeys, chartHeight, chartWidth, data, paddingLeft, paddingTop]);

  const totals = useMemo(
    () => ({
      activeStudents: data.at(-1)?.activeStudents ?? 0,
      attendanceRate: data.at(-1)?.attendanceRate ?? 0,
      newStudents: data.reduce((total, point) => total + point.newStudents, 0),
      revenue: data.reduce((total, point) => total + point.revenue, 0),
    }),
    [data],
  );

  return (
    <section className="rounded-md border border-[#dfe6ef] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#e6edf5] px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[#f5a623]">
            Growth Analytics
          </p>
          <h2 className="mt-1 text-base font-semibold">
            Student, Revenue, dan Attendance
          </h2>
          <p className="mt-1 text-sm text-[#6b7890]">
            Toggle metric untuk membandingkan trend 12 bulan terakhir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(seriesMeta) as SeriesKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setVisible((current) => ({
                  ...current,
                  [key]: !current[key],
                }))
              }
              className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${
                visible[key]
                  ? "border-[#d7e0ea] bg-white text-[#172033]"
                  : "border-[#e6edf5] bg-[#f6f8fb] text-[#9aa7b8]"
              }`}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: seriesMeta[key].color }}
              />
              {seriesMeta[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 border-b border-[#e6edf5] p-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(seriesMeta) as SeriesKey[]).map((key) => (
          <div
            key={key}
            className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3"
          >
            <p className="text-xs font-semibold text-[#6b7890]">
              {seriesMeta[key].label}
            </p>
            <p className="mt-2 text-xl font-semibold text-[#172033]">
              {formatValue(key, totals[key])}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Dashboard growth graph"
          className="h-[320px] min-w-[820px] w-full"
        >
          <defs>
            {Object.entries(seriesMeta).map(([key, item]) => (
              <linearGradient
                key={key}
                id={`dashboard-gradient-${key}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {Array.from({ length: 5 }, (_, index) => {
            const y = paddingTop + (index / 4) * chartHeight;

            return (
              <line
                key={index}
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
                stroke="#edf2f7"
                strokeWidth="1"
              />
            );
          })}

          {data.map((point, index) => {
            const x =
              paddingLeft +
              (data.length <= 1 ? 0 : (index / (data.length - 1)) * chartWidth);

            return (
              <g key={point.label}>
                <line
                  x1={x}
                  x2={x}
                  y1={paddingTop}
                  y2={paddingTop + chartHeight}
                  stroke="#f3f6fa"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - 14}
                  textAnchor="middle"
                  className="fill-[#6b7890] text-[11px] font-semibold"
                >
                  {point.label}
                </text>
              </g>
            );
          })}

          {paths.map(({ area, key, line, points }) => (
            <g key={key}>
              <path
                d={area}
                fill={`url(#dashboard-gradient-${key})`}
                opacity={activeKeys.length === 1 ? 1 : 0.65}
              />
              <path
                d={line}
                fill="none"
                stroke={seriesMeta[key].color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              {points.map(({ point, x, y }) => (
                <circle
                  key={`${key}-${point.label}`}
                  cx={x}
                  cy={y}
                  fill="#ffffff"
                  r="4"
                  stroke={seriesMeta[key].color}
                  strokeWidth="2"
                >
                  <title>
                    {seriesMeta[key].label}: {formatValue(key, point[key])}
                  </title>
                </circle>
              ))}
            </g>
          ))}

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
    </section>
  );
}
