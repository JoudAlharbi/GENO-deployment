import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { buildDashboardChartData } from "../utils/dashboardChartData";
import { formatPercentEn } from "../utils/formatNumber";

const CHART_H = 176;
const CHART_H_MONTHLY = 100;

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(18, 18, 18, 0.96)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "8px",
  padding: "8px 12px",
  color: "#e8e8e8",
  fontSize: "0.8rem",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};

const AXIS_TICK = { fill: "#888", fontSize: 10 };
const GRID_STROKE = "rgba(255,255,255,0.07)";

function ChartTooltip({ active, payload, valueLabel }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const row = p.payload || {};
  const rowLabel = row.label || row.date || row.month;
  const suffix = valueLabel === "Risk Score" || p.dataKey === "score" ? "%" : "";
  return (
    <div style={TOOLTIP_STYLE}>
      {rowLabel && <div style={{ color: "#999", marginBottom: 4 }}>{rowLabel}</div>}
      <div style={{ color: "#fff", fontWeight: 600 }}>
        {valueLabel || p.name}: {p.value}{suffix}
      </div>
    </div>
  );
}

function ChartEmpty({ message = "No data yet" }) {
  return <p className="db-chart-empty">{message}</p>;
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <article className={`db-chart-card ${className}`.trim()}>
      <header className="db-chart-card__head">
        <h3 className="db-chart-card__title">{title}</h3>
        {subtitle && <p className="db-chart-card__subtitle">{subtitle}</p>}
      </header>
      <div className="db-chart-card__body">{children}</div>
    </article>
  );
}

export default function DashboardAnalytics({ samples, loading }) {
  const data = useMemo(() => buildDashboardChartData(samples), [samples]);
  const pieTotal = data.riskDistribution.reduce((s, d) => s + d.value, 0);

  if (loading) {
    return (
      <section className="db-charts" aria-label="Analytics">
        <div className="db-charts__loading">Loading analytics…</div>
      </section>
    );
  }

  if (!data.hasData) return null;

  return (
    <section className="db-charts" aria-label="Analytics">
      <div className="db-charts__header">
        <h2 className="db-charts__heading">Analytics Overview</h2>
        <span className="db-charts__meta">{data.total} analyses</span>
      </div>

      <div className="db-charts__grid">
        <ChartCard title="Risk Distribution" subtitle="AI classification · High vs Low">
          {data.riskDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={CHART_H}>
                <PieChart>
                  <Pie
                    data={data.riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    animationDuration={500}
                  >
                    {data.riskDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueLabel="Count" />} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="db-chart-legend" aria-label="Risk distribution legend">
                {data.riskDistribution.map((d) => (
                  <li key={d.name} className="db-chart-legend__item">
                    <span className="db-chart-legend__dot" style={{ background: d.fill }} />
                    <span>
                      {d.name}: <strong>{d.value}</strong>
                      {pieTotal > 0 && (
                        <span className="db-chart-legend__pct">
                          ({formatPercentEn((d.value / pieTotal) * 100, 0)})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>

        <ChartCard title="Risk Score Trend" subtitle="Recent analyses · AI risk %">
          {data.riskScoreTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <AreaChart data={data.riskScoreTrend} margin={{ top: 6, right: 10, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dbScoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d89090" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#d89090" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<ChartTooltip valueLabel="Risk Score" />} />
                <Area type="monotone" dataKey="score" stroke="#d89090" fill="url(#dbScoreGrad)" strokeWidth={2} animationDuration={500} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty message="Add dated analyses to see trends" />
          )}
        </ChartCard>

        <ChartCard title="Daily Activity" subtitle="Last 14 days">
          {data.activityDays.length > 0 ? (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={data.activityDays} margin={{ top: 6, right: 10, left: -12, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip valueLabel="Analyses" />} />
                <Bar dataKey="count" fill="rgba(255,255,255,0.32)" radius={[3, 3, 0, 0]} animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty message="Timestamps required for activity" />
          )}
        </ChartCard>

        <ChartCard title="Risk Breakdown" subtitle="High vs low · AI classification">
          <ul className="db-breakdown">
            {data.riskBreakdown.map((row) => (
              <li key={row.level} className="db-breakdown__row">
                <div className="db-breakdown__meta">
                  <span className="db-breakdown__label">{row.label}</span>
                  <span className="db-breakdown__value">
                    {row.count} · {formatPercentEn(row.percent, 1)}
                  </span>
                </div>
                <div className="db-breakdown__track">
                  <div className="db-breakdown__fill" style={{ width: `${Math.max(row.percent, row.count > 0 ? 4 : 0)}%`, background: row.color }} />
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>

        {data.showMonthlyChart && (
          <ChartCard
            title="Monthly Activity"
            subtitle={`${data.monthlyActivity.length} months with data`}
            className="db-chart-card--monthly"
          >
            <ResponsiveContainer width="100%" height={CHART_H_MONTHLY}>
              <BarChart data={data.monthlyActivity} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={22} />
                <Tooltip content={<ChartTooltip valueLabel="Analyses" />} />
                <Bar dataKey="count" fill="rgba(200, 160, 160, 0.45)" radius={[3, 3, 0, 0]} animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </section>
  );
}
