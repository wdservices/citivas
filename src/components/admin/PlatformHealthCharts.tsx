import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart,
  Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Layers } from "lucide-react";
import {
  buildDailyPlatformTrends, type AdminBusiness,
  type AdminMarketplaceItem, type AdminPropertyItem, type AdminUser,
} from "@/lib/adminData";

interface PlatformHealthChartsProps {
  users: AdminUser[];
  businesses: AdminBusiness[];
  properties: AdminPropertyItem[];
  marketplace: AdminMarketplaceItem[];
  events: AdminBusiness[];
}

const TIMEFRAMES = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

const LISTING_SERIES = [
  { key: "property", label: "Property", color: "#1E88E5" },
  { key: "product", label: "Product", color: "#D9891F" },
  { key: "restaurant", label: "Restaurant", color: "#ea580c" },
  { key: "event", label: "Event", color: "#10B981" },
  { key: "business", label: "Business", color: "#64748B" },
] as const;

export function PlatformHealthCharts({
  users,
  businesses,
  properties,
  marketplace,
  events,
}: PlatformHealthChartsProps) {
  const [days, setDays] = useState<number>(30);
  const [submissionChartMode, setSubmissionChartMode] = useState<"stacked" | "lines">("stacked");

  const metrics = useMemo(
    () =>
      buildDailyPlatformTrends({
        users,
        businesses,
        properties,
        marketplace,
        events,
        days,
      }),
    [users, businesses, properties, marketplace, events, days]
  );

  return (
    <div className="space-y-6">
      {/* Section Header + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">
            Platform Health &amp; Growth Trends
          </h2>
          <p className="text-sm text-ink/60 mt-0.5">
            Daily user registrations and listing submissions across all four core verticals
          </p>
        </div>

        <div className="inline-flex items-center rounded-xl border border-sand-200 bg-white p-1 self-start">
          {TIMEFRAMES.map((tf) => {
            const active = days === tf.days;
            return (
              <button
                key={tf.days}
                type="button"
                onClick={() => setDays(tf.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                  active ? "bg-ink text-ivory" : "text-ink/60 hover:text-ink"
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Period Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between text-ink/60 text-xs font-semibold uppercase tracking-wider">
            <span>New Users ({days}d)</span>
            <Users className="w-4 h-4 text-[#1E88E5]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-display text-2xl font-extrabold text-ink tabular-nums">
              {metrics.newUsersInWindow.toLocaleString()}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                metrics.userGrowthPct >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {metrics.userGrowthPct >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {metrics.userGrowthPct >= 0 ? "+" : ""}
              {metrics.userGrowthPct}%
            </span>
          </div>
          <p className="text-xs text-ink/50 mt-1 tabular-nums">
            Avg {metrics.avgDailySignups} signups/day · {metrics.totalUsers.toLocaleString()} total
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between text-ink/60 text-xs font-semibold uppercase tracking-wider">
            <span>Submissions ({days}d)</span>
            <Layers className="w-4 h-4 text-[#D9891F]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-display text-2xl font-extrabold text-ink tabular-nums">
              {metrics.newListingsInWindow.toLocaleString()}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                metrics.listingGrowthPct >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {metrics.listingGrowthPct >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {metrics.listingGrowthPct >= 0 ? "+" : ""}
              {metrics.listingGrowthPct}%
            </span>
          </div>
          <p className="text-xs text-ink/50 mt-1 tabular-nums">
            Avg {metrics.avgDailyListings} listings/day · {metrics.totalListings.toLocaleString()} total
          </p>
        </div>

        <div className="card">
          <p className="text-ink/60 text-xs font-semibold uppercase tracking-wider">
            Property &amp; Product
          </p>
          <p className="font-display text-2xl font-extrabold text-ink mt-2 tabular-nums">
            {metrics.breakdown.property.toLocaleString()} · {metrics.breakdown.product.toLocaleString()}
          </p>
          <p className="text-xs text-ink/50 mt-1">
            Total properties · marketplace products
          </p>
        </div>

        <div className="card">
          <p className="text-ink/60 text-xs font-semibold uppercase tracking-wider">
            Restaurant &amp; Event
          </p>
          <p className="font-display text-2xl font-extrabold text-ink mt-2 tabular-nums">
            {metrics.breakdown.restaurant.toLocaleString()} · {metrics.breakdown.event.toLocaleString()}
          </p>
          <p className="text-xs text-ink/50 mt-1">
            Total restaurants · published events
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Daily User Growth Chart */}
        <div className="card">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Daily User Growth</h3>
              <p className="text-xs text-ink/60 mt-0.5">
                Daily new user signups vs cumulative total accounts
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink/70 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1E88E5]" />
                Daily Signups
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#146B5E]" />
                Total Users
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={290}>
            <ComposedChart data={metrics.dailySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulativeUsersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#146B5E" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#146B5E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6B6255" }}
                tickLine={false}
                axisLine={{ stroke: "#E8E0D4" }}
                minTickGap={18}
              />
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#6B6255" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#146B5E" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E0D4",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeUsers"
                name="Total Users"
                stroke="#146B5E"
                strokeWidth={2}
                fill="url(#cumulativeUsersGrad)"
              />
              <Bar
                yAxisId="left"
                dataKey="newUsers"
                name="New Signups"
                fill="#1E88E5"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Listing Submission Trends Chart */}
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">
                Listing Submission Trends
              </h3>
              <p className="text-xs text-ink/60 mt-0.5">
                Daily listings submitted by vertical across the platform
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-sand-200 p-0.5 bg-sand-50/50">
              <button
                type="button"
                onClick={() => setSubmissionChartMode("stacked")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  submissionChartMode === "stacked"
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                Stacked
              </button>
              <button
                type="button"
                onClick={() => setSubmissionChartMode("lines")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  submissionChartMode === "lines"
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                Lines
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={290}>
            {submissionChartMode === "stacked" ? (
              <BarChart data={metrics.dailySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#6B6255" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E8E0D4" }}
                  minTickGap={18}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#6B6255" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E8E0D4",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {LISTING_SERIES.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stackId="listings"
                    fill={s.color}
                    maxBarSize={20}
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart data={metrics.dailySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#6B6255" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E8E0D4" }}
                  minTickGap={18}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#6B6255" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E8E0D4",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {LISTING_SERIES.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
