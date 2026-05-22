/**
 * Derive dashboard chart datasets from live analysis samples (no mock data).
 */

export function getSampleTimestamp(sample) {
  const ar = sample.analysis_result || {};
  const report = ar.report || {};
  const result = ar.result || {};
  const raw = report.generated_at || result.created_at || sample.created_at;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildDashboardChartData(samples = []) {
  const list = Array.isArray(samples) ? samples : [];

  const highCount = list.filter((s) => s.risk_level === "HIGH").length;
  const lowCount = list.filter((s) => s.risk_level === "LOW").length;
  const total = list.length || 1;

  const riskDistribution = [
    { name: "High Risk", value: highCount, fill: "#d89090" },
    { name: "Low Risk", value: lowCount, fill: "#8ec9a8" },
  ].filter((d) => d.value > 0);

  // Breakdown UI: HIGH / LOW only (same AI risk_level as distribution chart)
  const riskBreakdown = [
    { level: "HIGH", label: "High", count: highCount, percent: (highCount / total) * 100, color: "#d89090" },
    { level: "LOW", label: "Low", count: lowCount, percent: (lowCount / total) * 100, color: "#8ec9a8" },
  ];

  const withDates = list
    .map((s) => ({
      ...s,
      _date: getSampleTimestamp(s),
      _score: Number(s.score_percent) || 0,
    }))
    .filter((s) => s._date);

  withDates.sort((a, b) => a._date - b._date);

  const recentLimit = 12;
  const recent = withDates.slice(-recentLimit);
  const riskScoreTrend = recent.map((s, i) => ({
    index: i + 1,
    label: s._date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: Math.round(s._score * 10) / 10,
    sequence_id: s.sequence_id,
  }));

  const dayMap = new Map();
  list.forEach((s) => {
    const d = getSampleTimestamp(s);
    if (!d) return;
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) || 0) + 1);
  });
  const activityDays = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({
      date,
      label: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    }));

  const monthMap = new Map();
  list.forEach((s) => {
    const d = getSampleTimestamp(s);
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  });
  const monthlyActivity = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => {
      const [y, m] = month.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return { month, label, count };
    });

  const showMonthlyChart = monthlyActivity.length >= 2;

  return {
    hasData: list.length > 0,
    riskDistribution,
    riskBreakdown,
    riskScoreTrend,
    activityDays,
    monthlyActivity,
    showMonthlyChart,
    total: list.length,
  };
}
