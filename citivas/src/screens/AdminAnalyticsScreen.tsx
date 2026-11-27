import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, TrendingUp, BarChart2, Shield } from '../lib/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribePlatformHealthCollections,
  buildNativeDailyMetrics,
  type DailyMetricPoint,
} from '../lib/adminAnalytics';

const TIMEFRAMES = [
  { label: '7D', days: 7 },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
] as const;

const VERTICALS = [
  { key: 'property' as const, label: 'Property', color: '#1E88E5' },
  { key: 'product' as const, label: 'Product', color: '#D9891F' },
  { key: 'restaurant' as const, label: 'Restaurant', color: '#10B981' },
  { key: 'event' as const, label: 'Event', color: '#8B5CF6' },
  { key: 'business' as const, label: 'Business', color: '#64748B' },
];

export default function AdminAnalyticsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isAdmin } = useAuth();

  const [days, setDays] = useState<number>(14);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [rawData, setRawData] = useState<{
    users: any[];
    businesses: any[];
    properties: any[];
    marketplace: any[];
    events: any[];
  }>({
    users: [],
    businesses: [],
    properties: [],
    marketplace: [],
    events: [],
  });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const unsub = subscribePlatformHealthCollections(
      (snap) => {
        setRawData(snap);
        setLoading(false);
        setErrorMsg(null);
      },
      (err) => {
        setErrorMsg(err.message || 'Unable to read platform telemetry');
        setLoading(false);
      }
    );
    return unsub;
  }, [isAdmin]);

  const metrics = useMemo(
    () => buildNativeDailyMetrics({ ...rawData, days }),
    [rawData, days]
  );

  useEffect(() => {
    if (metrics.dailySeries.length > 0) {
      setSelectedIdx(metrics.dailySeries.length - 1);
    }
  }, [days, metrics.dailySeries.length]);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(screenWidth - 64, 260);
  const chartHeight = 165;
  const padLeft = 28;
  const padRight = 10;
  const padTop = 14;
  const padBottom = 26;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const activePoint: DailyMetricPoint | null =
    selectedIdx !== null && metrics.dailySeries[selectedIdx]
      ? metrics.dailySeries[selectedIdx]
      : metrics.dailySeries[metrics.dailySeries.length - 1] || null;

  if (!isAdmin) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <ArrowLeft size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Platform Health</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={s.guardCenter}>
          <Shield size={40} color={colors.mutedForeground} />
          <Text style={[s.guardTitle, { color: colors.foreground }]}>Admin Access Required</Text>
          <Text style={[s.guardDesc, { color: colors.mutedForeground }]}>
            Only verified Citivas administrators can view platform growth and submission analytics.
          </Text>
        </View>
      </View>
    );
  }

  // User growth chart calculations
  const series = metrics.dailySeries;
  const maxCum = Math.max(1, ...series.map((d) => d.cumulativeUsers));
  const minCum = Math.min(0, ...series.map((d) => d.cumulativeUsers));
  const cumRange = Math.max(1, maxCum - minCum);
  const maxDailyUsers = Math.max(1, ...series.map((d) => d.newUsers));

  const xAt = (idx: number) => {
    if (series.length <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (series.length - 1)) * plotW;
  };
  const yCumAt = (val: number) => padTop + plotH - ((val - minCum) / cumRange) * plotH;

  let linePath = '';
  let areaPath = '';
  if (series.length > 0) {
    linePath = series
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yCumAt(pt.cumulativeUsers).toFixed(1)}`)
      .join(' ');
    areaPath = `${linePath} L ${xAt(series.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;
  }

  // Listing submission stacked bars
  const maxListingsDay = Math.max(1, ...series.map((d) => d.totalListings));
  const barSlotW = series.length > 0 ? plotW / series.length : plotW;
  const barW = Math.max(4, Math.min(18, barSlotW * 0.62));

  const labelStep = series.length <= 7 ? 1 : series.length <= 14 ? 2 : 5;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Platform Health</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Timeframe filter */}
        <View style={s.topRow}>
          <View>
            <Text style={[s.pageHeading, { color: colors.foreground }]}>Growth & Submissions</Text>
            <Text style={[s.pageSub, { color: colors.mutedForeground }]}>
              Live Firestore metrics · Last {days} days
            </Text>
          </View>
          <View style={[s.tfGroup, { backgroundColor: colors.muted }]}>
            {TIMEFRAMES.map((tf) => {
              const active = days === tf.days;
              return (
                <TouchableOpacity
                  key={tf.label}
                  style={[s.tfBtn, active && { backgroundColor: colors.card }]}
                  onPress={() => setDays(tf.days)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      s.tfText,
                      { color: active ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {tf.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {errorMsg ? (
          <View style={[s.errorBanner, { borderColor: colors.destructive, backgroundColor: `${colors.destructive}12` }]}>
            <Text style={{ fontSize: 12, color: colors.destructive, fontWeight: '600' }}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* KPI Grid */}
        <View style={s.kpiGrid}>
          <View style={[s.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.kpiLabel, { color: colors.mutedForeground }]}>TOTAL USERS</Text>
            <Text style={[s.kpiValue, { color: colors.foreground }]}>
              {loading ? '—' : metrics.totalUsers.toLocaleString()}
            </Text>
            <Text style={[s.kpiMeta, { color: colors.success }]}>
              +{metrics.newUsersInWindow} ({metrics.userGrowthPct >= 0 ? '+' : ''}
              {metrics.userGrowthPct}%)
            </Text>
          </View>

          <View style={[s.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.kpiLabel, { color: colors.mutedForeground }]}>TOTAL LISTINGS</Text>
            <Text style={[s.kpiValue, { color: colors.foreground }]}>
              {loading ? '—' : metrics.totalListings.toLocaleString()}
            </Text>
            <Text style={[s.kpiMeta, { color: colors.primary }]}>
              +{metrics.newListingsInWindow} ({metrics.listingGrowthPct >= 0 ? '+' : ''}
              {metrics.listingGrowthPct}%)
            </Text>
          </View>

          <View style={[s.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.kpiLabel, { color: colors.mutedForeground }]}>AVG SIGNUPS / DAY</Text>
            <Text style={[s.kpiValue, { color: colors.foreground }]}>
              {loading ? '—' : metrics.avgDailySignups}
            </Text>
            <Text style={[s.kpiMeta, { color: colors.mutedForeground }]}>Daily acquisition pace</Text>
          </View>

          <View style={[s.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.kpiLabel, { color: colors.mutedForeground }]}>AVG LISTINGS / DAY</Text>
            <Text style={[s.kpiValue, { color: colors.foreground }]}>
              {loading ? '—' : metrics.avgDailyListings}
            </Text>
            <Text style={[s.kpiMeta, { color: colors.mutedForeground }]}>Across 5 verticals</Text>
          </View>
        </View>

        {loading ? (
          <View style={[s.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 10 }}>
              Loading live analytics...
            </Text>
          </View>
        ) : (
          <>
            {/* Chart 1: Daily User Growth */}
            <View style={[s.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.chartHeader}>
                <View style={s.chartTitleRow}>
                  <TrendingUp size={18} color={colors.primary} />
                  <View>
                    <Text style={[s.chartTitle, { color: colors.foreground }]}>Daily User Growth</Text>
                    <Text style={[s.chartSub, { color: colors.mutedForeground }]}>
                      Cumulative growth line + daily signups
                    </Text>
                  </View>
                </View>
              </View>

              {activePoint ? (
                <View style={[s.inspectorStrip, { backgroundColor: colors.muted }]}>
                  <Text style={[s.inspectorDate, { color: colors.foreground }]}>{activePoint.label}</Text>
                  <Text style={[s.inspectorVal, { color: colors.primary }]}>
                    {activePoint.cumulativeUsers} total · +{activePoint.newUsers} new
                  </Text>
                </View>
              ) : null}

              <Svg width={chartWidth} height={chartHeight}>
                <Defs>
                  <LinearGradient id="userAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#1E88E5" stopOpacity="0.28" />
                    <Stop offset="100%" stopColor="#1E88E5" stopOpacity="0.02" />
                  </LinearGradient>
                </Defs>

                {/* Horizontal gridlines */}
                {[0, 0.5, 1].map((frac, idx) => {
                  const y = padTop + plotH * (1 - frac);
                  const val = Math.round(minCum + cumRange * frac);
                  return (
                    <G key={idx}>
                      <Line
                        x1={padLeft}
                        y1={y}
                        x2={padLeft + plotW}
                        y2={y}
                        stroke={colors.border}
                        strokeDasharray="3,3"
                        strokeWidth={1}
                      />
                      <SvgText
                        x={padLeft - 4}
                        y={y + 3}
                        fontSize={9}
                        fill={colors.mutedForeground}
                        textAnchor="end"
                      >
                        {val}
                      </SvgText>
                    </G>
                  );
                })}

                {/* Daily signup mini-bars */}
                {series.map((pt, i) => {
                  const h = (pt.newUsers / maxDailyUsers) * (plotH * 0.45);
                  const cx = xAt(i);
                  const w = Math.max(3, Math.min(10, barW * 0.7));
                  return (
                    <Rect
                      key={`u-${pt.dateKey}`}
                      x={cx - w / 2}
                      y={padTop + plotH - h}
                      width={w}
                      height={Math.max(h, pt.newUsers > 0 ? 2 : 0)}
                      rx={2}
                      fill="#10B981"
                      opacity={selectedIdx === i ? 0.95 : 0.45}
                      onPress={() => setSelectedIdx(i)}
                    />
                  );
                })}

                {areaPath ? <Path d={areaPath} fill="url(#userAreaGrad)" /> : null}
                {linePath ? (
                  <Path d={linePath} fill="none" stroke="#1E88E5" strokeWidth={2.5} strokeLinecap="round" />
                ) : null}

                {series.map((pt, i) => {
                  const cx = xAt(i);
                  const cy = yCumAt(pt.cumulativeUsers);
                  const isSel = selectedIdx === i;
                  return (
                    <G key={`dot-${pt.dateKey}`}>
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={isSel ? 4.5 : 2.5}
                        fill={isSel ? '#D9891F' : '#1E88E5'}
                        stroke="#fff"
                        strokeWidth={isSel ? 1.5 : 0}
                        onPress={() => setSelectedIdx(i)}
                      />
                      {i % labelStep === 0 || i === series.length - 1 ? (
                        <SvgText
                          x={cx}
                          y={chartHeight - 6}
                          fontSize={9}
                          fill={colors.mutedForeground}
                          textAnchor="middle"
                        >
                          {pt.shortLabel}
                        </SvgText>
                      ) : null}
                    </G>
                  );
                })}
              </Svg>
            </View>

            {/* Chart 2: Daily Listing Submissions */}
            <View style={[s.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.chartHeader}>
                <View style={s.chartTitleRow}>
                  <BarChart2 size={18} color="#D9891F" />
                  <View>
                    <Text style={[s.chartTitle, { color: colors.foreground }]}>Listing Submission Trends</Text>
                    <Text style={[s.chartSub, { color: colors.mutedForeground }]}>
                      Daily submissions stacked by vertical
                    </Text>
                  </View>
                </View>
              </View>

              {activePoint ? (
                <View style={[s.inspectorStrip, { backgroundColor: colors.muted }]}>
                  <Text style={[s.inspectorDate, { color: colors.foreground }]}>{activePoint.label}</Text>
                  <Text style={[s.inspectorVal, { color: colors.foreground }]}>
                    {activePoint.totalListings} total ({activePoint.property}P · {activePoint.product}M · {activePoint.restaurant}R · {activePoint.event}E)
                  </Text>
                </View>
              ) : null}

              <Svg width={chartWidth} height={chartHeight}>
                {[0, 0.5, 1].map((frac, idx) => {
                  const y = padTop + plotH * (1 - frac);
                  const val = Math.round(maxListingsDay * frac);
                  return (
                    <G key={idx}>
                      <Line
                        x1={padLeft}
                        y1={y}
                        x2={padLeft + plotW}
                        y2={y}
                        stroke={colors.border}
                        strokeDasharray="3,3"
                        strokeWidth={1}
                      />
                      <SvgText
                        x={padLeft - 4}
                        y={y + 3}
                        fontSize={9}
                        fill={colors.mutedForeground}
                        textAnchor="end"
                      >
                        {val}
                      </SvgText>
                    </G>
                  );
                })}

                {series.map((pt, i) => {
                  const slotCenter = padLeft + barSlotW * (i + 0.5);
                  const bx = slotCenter - barW / 2;
                  let runningY = padTop + plotH;
                  const isSel = selectedIdx === i;

                  return (
                    <G key={`bar-${pt.dateKey}`} onPress={() => setSelectedIdx(i)}>
                      {VERTICALS.map((v) => {
                        const val = pt[v.key];
                        if (val <= 0) return null;
                        const segH = (val / maxListingsDay) * plotH;
                        runningY -= segH;
                        return (
                          <Rect
                            key={v.key}
                            x={bx}
                            y={runningY}
                            width={barW}
                            height={Math.max(segH, 2)}
                            fill={v.color}
                            opacity={selectedIdx === null || isSel ? 1 : 0.45}
                            rx={1.5}
                          />
                        );
                      })}
                      {i % labelStep === 0 || i === series.length - 1 ? (
                        <SvgText
                          x={slotCenter}
                          y={chartHeight - 6}
                          fontSize={9}
                          fill={colors.mutedForeground}
                          textAnchor="middle"
                        >
                          {pt.shortLabel}
                        </SvgText>
                      ) : null}
                    </G>
                  );
                })}
              </Svg>

              {/* Vertical Legend & Totals */}
              <View style={[s.legendGrid, { borderTopColor: colors.border }]}>
                {VERTICALS.map((v) => (
                  <View key={v.key} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: v.color }]} />
                    <Text style={[s.legendLabel, { color: colors.mutedForeground }]}>{v.label}</Text>
                    <Text style={[s.legendCount, { color: colors.foreground }]}>
                      {metrics.breakdown[v.key].toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 6, minWidth: 40, minHeight: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pageHeading: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  pageSub: { fontSize: 12, marginTop: 2 },
  tfGroup: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  tfBtn: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, minHeight: 32, justifyContent: 'center' },
  tfText: { fontSize: 12, fontWeight: '700' },

  errorBanner: { borderWidth: 1, borderRadius: 12, padding: 12 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  kpiLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  kpiValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  kpiMeta: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },

  loadingCard: { borderWidth: 1, borderRadius: 16, padding: 36, alignItems: 'center', justifyContent: 'center' },

  chartCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  chartSub: { fontSize: 11, marginTop: 1 },

  inspectorStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  inspectorDate: { fontSize: 12, fontWeight: '700' },
  inspectorVal: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },

  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTopWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '28%' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: '600' },
  legendCount: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },

  guardCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  guardTitle: { fontSize: 18, fontWeight: '800' },
  guardDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
