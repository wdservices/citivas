import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Pressable,
} from 'react-native';
import { MapPin, Star, Heart, ChevronRight, ArrowRight } from '../lib/icons';
import { useTheme } from '../contexts/ThemeContext';
import { ExploreListing } from '../lib/useExploreData';
import { getMockImage } from '../lib/mockImages';
import { isRecentlyListed } from '../lib/formatPrice';
import { ListingCarouselSkeleton } from './SkeletonLoader';

export const LISTING_CARD_WIDTH = 156;
const IMAGE_H = Math.round((LISTING_CARD_WIDTH * 2) / 3);

interface ListingCarouselProps {
  title: string;
  items: ExploreListing[];
  loading?: boolean;
  viewAllLabel: string;
  onViewAll: () => void;
  onPressItem: (item: ExploreListing) => void;
  likedIds: Set<string>;
  onToggleLike: (id: string) => void;
  subtitle?: (item: ExploreListing) => string;
  emptyLabel?: string;
}

export default function ListingCarousel({
  title, items, loading, viewAllLabel, onViewAll, onPressItem, likedIds, onToggleLike,
  subtitle, emptyLabel = 'Nothing here yet',
}: ListingCarouselProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {items.length > 0 && (
          <Pressable style={styles.viewAll} onPress={onViewAll}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>{viewAllLabel}</Text>
            <ArrowRight size={14} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ListingCarouselSkeleton />
      ) : items.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{emptyLabel}</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            New listings drop regularly — check back soon.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {items.map((item) => {
            const img = item.image || getMockImage(item.category);
            const sub = subtitle ? subtitle(item) : item.category;
            const liked = likedIds.has(item.id);
            return (
              <TouchableOpacity
                key={`${item.kind}-${item.id}`}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.88}
                onPress={() => onPressItem(item)}
              >
                <View style={[styles.imageWrap, { backgroundColor: colors.muted }]}>
                  <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
                  {isRecentlyListed(item.createdAt) ? (
                    <View style={styles.justListedBadge}>
                      <Text style={styles.justListedText}>Just Listed</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => onToggleLike(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Heart
                      size={14}
                      color={liked ? colors.destructive : '#fff'}
                      fill={liked ? colors.destructive : 'transparent'}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                  {item.rating != null && item.rating > 0 && (
                    <View style={[styles.rating, { backgroundColor: colors.card }]}>
                      <Star size={10} color={colors.warning} fill={colors.warning} strokeWidth={0} />
                      <Text style={[styles.ratingText, { color: colors.foreground }]}>{item.rating}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.body}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.location ? (
                    <View style={styles.locRow}>
                      <MapPin size={10} color={colors.mutedForeground} strokeWidth={2} />
                      <Text style={[styles.loc, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[styles.sub, { color: colors.primary }]} numberOfLines={1}>
                    {sub}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {items.length >= 3 && (
            <TouchableOpacity
              style={[styles.viewMoreCard, { borderColor: colors.border }]}
              onPress={onViewAll}
              activeOpacity={0.8}
            >
              <View style={[styles.viewMoreIcon, { backgroundColor: `${colors.primary}12` }]}>
                <ChevronRight size={22} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={[styles.viewMoreText, { color: colors.mutedForeground }]}>{viewAllLabel}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 13, fontWeight: '700' },
  row: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  card: { width: LISTING_CARD_WIDTH, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  imageWrap: { height: IMAGE_H },
  image: { width: '100%', height: '100%' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  justListedBadge: {
    position: 'absolute', top: 8, left: 8, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#10B981',
  },
  justListedText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  rating: {
    position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999,
  },
  ratingText: { fontSize: 10, fontWeight: '700' },
  body: { paddingHorizontal: 10, paddingVertical: 9 },
  name: { fontSize: 13, fontWeight: '600' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  loc: { fontSize: 11, flex: 1 },
  sub: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  viewMoreCard: {
    width: LISTING_CARD_WIDTH, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', padding: 12, minHeight: IMAGE_H + 52,
  },
  viewMoreIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  viewMoreText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  empty: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptySub: { fontSize: 12, marginTop: 4, textAlign: 'center' },
});
