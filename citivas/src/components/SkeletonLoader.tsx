import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { LISTING_CARD_WIDTH } from './ListingCarousel';

interface SkeletonBoxProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBox({
  width = '100%',
  height,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#1F2633' : colors.muted,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Matches ListingCarousel horizontal card row on HomeScreen.
 */
export function ListingCarouselSkeleton() {
  const { colors } = useTheme();
  const imageH = Math.round((LISTING_CARD_WIDTH * 2) / 3);

  return (
    <View style={s.carouselRow}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            s.carouselCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SkeletonBox width="100%" height={imageH} borderRadius={0} />
          <View style={s.carouselBody}>
            <SkeletonBox width="82%" height={13} borderRadius={6} />
            <SkeletonBox width="58%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
            <SkeletonBox width="45%" height={11} borderRadius={5} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Matches 2-column grids in BusinessesScreen & MarketplaceScreen.
 */
export function TwoColumnGridSkeleton({ rows = 3 }: { rows?: number }) {
  const { colors } = useTheme();

  return (
    <View style={s.gridWrap}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={s.gridRow}>
          {[0, 1].map((c) => (
            <View
              key={c}
              style={[
                s.gridCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <SkeletonBox width="100%" height={120} borderRadius={0} />
              <View style={s.gridBody}>
                <SkeletonBox width="78%" height={13} borderRadius={6} />
                <SkeletonBox width="52%" height={10} borderRadius={5} style={{ marginTop: 7 }} />
                <SkeletonBox width="40%" height={12} borderRadius={5} style={{ marginTop: 8 }} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Matches vertical event cards in EventsScreen.
 */
export function EventsListSkeleton({ count = 3 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={s.eventsWrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            s.eventCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SkeletonBox width="100%" height={160} borderRadius={0} />
          <View style={s.eventBody}>
            <SkeletonBox width="72%" height={16} borderRadius={6} />
            <SkeletonBox width="48%" height={12} borderRadius={5} style={{ marginTop: 8 }} />
            <SkeletonBox width="55%" height={12} borderRadius={5} style={{ marginTop: 6 }} />
            <SkeletonBox width="100%" height={40} borderRadius={10} style={{ marginTop: 14 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Matches MyDashboardScreen horizontal listing rows.
 */
export function DashboardListSkeleton({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={s.dashboardList}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dashboardCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SkeletonBox width={76} height={76} borderRadius={12} />
          <View style={s.dashboardContent}>
            <SkeletonBox width="36%" height={10} borderRadius={4} />
            <SkeletonBox width="74%" height={14} borderRadius={6} style={{ marginTop: 7 }} />
            <SkeletonBox width="52%" height={11} borderRadius={5} style={{ marginTop: 7 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Matches PropertyDetailScreen layout.
 */
export function DetailScreenSkeleton() {
  return (
    <View style={s.detailWrap}>
      <SkeletonBox width="100%" height={270} borderRadius={0} />
      <View style={s.detailBody}>
        <SkeletonBox width="30%" height={20} borderRadius={999} />
        <SkeletonBox width="80%" height={24} borderRadius={8} style={{ marginTop: 12 }} />
        <SkeletonBox width="55%" height={14} borderRadius={6} style={{ marginTop: 10 }} />
        <View style={s.detailBtnRow}>
          <SkeletonBox width="48%" height={46} borderRadius={12} />
          <SkeletonBox width="48%" height={46} borderRadius={12} />
        </View>
        <SkeletonBox width="100%" height={14} borderRadius={6} style={{ marginTop: 20 }} />
        <SkeletonBox width="92%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
        <SkeletonBox width="70%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/**
 * Matches WalletScreen transaction rows.
 */
export function WalletTransactionsSkeleton({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={s.txWrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[s.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <SkeletonBox width={36} height={36} borderRadius={18} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width="62%" height={13} borderRadius={6} />
            <SkeletonBox width="35%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
          </View>
          <SkeletonBox width={64} height={14} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

/**
 * Matches ConversationsScreen row layout.
 */
export function ConversationsListSkeleton({ count = 5 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={[s.txWrap, { paddingHorizontal: 16, paddingTop: 14 }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[s.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <SkeletonBox width={48} height={48} borderRadius={24} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width="55%" height={14} borderRadius={6} />
            <SkeletonBox width="78%" height={12} borderRadius={5} style={{ marginTop: 7 }} />
          </View>
          <SkeletonBox width={42} height={10} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  carouselRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  carouselCard: {
    width: LISTING_CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  carouselBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  gridWrap: {
    paddingHorizontal: 16,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridBody: {
    padding: 10,
  },
  eventsWrap: {
    paddingHorizontal: 16,
    gap: 14,
  },
  eventCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventBody: {
    padding: 14,
  },
  dashboardList: {
    gap: 12,
  },
  dashboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 12,
  },
  dashboardContent: {
    flex: 1,
  },
  detailWrap: {
    flex: 1,
  },
  detailBody: {
    padding: 16,
  },
  detailBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  txWrap: {
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
});
