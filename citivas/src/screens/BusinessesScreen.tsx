import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, MapPin, Star, Heart } from '../lib/icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useExploreData, ExploreListing } from '../lib/useExploreData';
import { getMockImage } from '../lib/mockImages';
import { TwoColumnGridSkeleton } from '../components/SkeletonLoader';

const CATEGORIES = ['All', 'Restaurant', 'Hotel', 'Shopping', 'Attraction', 'Fun Places', 'Lifestyle'];

export default function BusinessesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { businesses, loading } = useExploreData();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let items = businesses;
    if (activeCategory !== 'All') {
      items = items.filter((b) => b.category.toLowerCase().includes(activeCategory.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          (b.location?.toLowerCase().includes(q) ?? false),
      );
    }
    return items;
  }, [businesses, activeCategory, searchQuery]);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = ({ item }: { item: ExploreListing }) => {
    const liked = likedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id, businessName: item.title })}
      >
        <View style={[s.cardImage, { backgroundColor: colors.muted }]}>
          <Image
            source={{ uri: item.image || getMockImage(item.category) }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          {item.rating > 0 ? (
            <View style={[s.ratingBadge, { backgroundColor: colors.card }]}>
              <Star size={11} color={colors.warning} fill={colors.warning} strokeWidth={0} />
              <Text style={[s.ratingText, { color: colors.foreground }]}>{item.rating.toFixed(1)}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={s.heartBtn}
            onPress={() => toggleLike(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Heart
              size={15}
              color={liked ? colors.destructive : '#fff'}
              fill={liked ? colors.destructive : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
        <View style={s.cardContent}>
          <Text style={[s.cardCategory, { color: colors.mutedForeground }]}>
            {(item.category || 'Business').toUpperCase()}
          </Text>
          <Text style={[s.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
          {item.description ? (
            <Text style={[s.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
          ) : null}
          {item.location ? (
            <View style={s.locRow}>
              <MapPin size={10} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={[s.locText, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: colors.foreground }]}>Businesses</Text>
            <Text style={[s.headerSub, { color: colors.mutedForeground }]}>Explore local businesses</Text>
          </View>
        </View>
        {/* Search */}
        <View style={[s.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.mutedForeground} strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search businesses..."
            placeholderTextColor={colors.mutedForeground}
            style={[s.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Category filters */}
      <View style={s.filterRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.filterChip, {
              backgroundColor: activeCategory === cat ? colors.primary : 'transparent',
              borderColor: activeCategory === cat ? colors.primary : colors.border,
            }]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[s.filterText, {
              color: activeCategory === cat ? '#fff' : colors.mutedForeground,
            }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results count */}
      <Text style={[s.resultCount, { color: colors.mutedForeground }]}>
        {filtered.length} business{filtered.length !== 1 ? 'es' : ''} found
      </Text>

      {/* Business grid */}
      {loading ? (
        <TwoColumnGridSkeleton rows={3} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerStyle={s.gridContent}
          columnWrapperStyle={s.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No businesses found</Text>
              <Text style={[s.emptyDesc, { color: colors.mutedForeground }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', height: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '600' },

  resultCount: { fontSize: 12, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },

  gridContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  gridRow: { gap: 10 },

  card: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, marginBottom: 10 },
  cardImage: { height: 120, position: 'relative' },
  ratingBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  ratingText: { fontSize: 11, fontWeight: '700' },
  heartBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: 10 },
  cardCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  cardDesc: { fontSize: 11, lineHeight: 15, marginTop: 3 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locText: { fontSize: 11, flex: 1 },

  emptyState: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center' },
});
