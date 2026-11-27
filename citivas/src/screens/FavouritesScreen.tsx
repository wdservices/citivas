import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { DashboardListSkeleton } from '../components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, MapPin, Bookmark, ArrowLeft } from '../lib/icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useMainNavigation } from '../contexts/MainNavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getMockImage } from '../lib/mockImages';

interface FavouriteItem {
  id: string;
  title: string;
  category: string;
  location: string;
  image: string;
  businessId?: string;
}

export default function FavouritesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { setActiveTab } = useMainNavigation();
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      (async () => {
        setLoading(true);
        try {
          const q = query(collection(db, 'favourites'), where('userId', '==', user.id));
          const snap = await getDocs(q);
          const items = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || data.name || 'Saved Place',
              category: data.category || 'Business',
              location: data.location || data.city || '',
              image: data.image || (Array.isArray(data.images) && data.images[0]) || '',
              businessId: data.businessId || '',
            } as FavouriteItem;
          });
          setFavourites(items);
        } catch (e) {
          setFavourites([]);
        } finally {
          setLoading(false);
        }
      })();
    }, [user?.id])
  );

  const removeFavourite = async (id: string) => {
    setFavourites((prev) => prev.filter((f) => f.id !== id));
    try { await deleteDoc(doc(db, 'favourites', id)); } catch {}
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => setActiveTab('explore')} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: colors.foreground }]}>Saved</Text>
            <Text style={[s.headerSub, { color: colors.mutedForeground }]}>Your bookmarks</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <DashboardListSkeleton count={5} />
        </View>
      ) : favourites.length === 0 ? (
        <View style={s.emptyState}>
          <Bookmark size={40} color={colors.mutedForeground} strokeWidth={1.5} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>No favourites yet</Text>
          <Text style={[s.emptyDesc, { color: colors.mutedForeground }]}>
            Start exploring and save your favourite places
          </Text>
        </View>
      ) : (
        <FlatList
          data={favourites}
          keyExtractor={(i) => i.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[s.favCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={s.cardBody}
                activeOpacity={0.85}
                onPress={() => item.businessId && navigation.navigate('BusinessDetail', { businessId: item.businessId, businessName: item.title })}
              >
                <View style={[s.favImage, { backgroundColor: colors.muted }]}>
                  <Image
                    source={{ uri: item.image || getMockImage(item.category) }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                </View>
                <View style={s.favContent}>
                  <Text style={[s.favCat, { color: colors.primary }]}>{item.category.toUpperCase()}</Text>
                  <Text style={[s.favTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                  {item.location ? (
                    <View style={s.favLocRow}>
                      <MapPin size={11} color={colors.mutedForeground} strokeWidth={2} />
                      <Text style={[s.favLoc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => removeFavourite(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={18} color={colors.destructive} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <View style={{ height: insets.bottom + 80 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, gap: 10 },
  favCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  favImage: { width: 72, height: 72 },
  favContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  favCat: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  favTitle: { fontSize: 14, fontWeight: '700', marginTop: 3 },
  favLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  favLoc: { fontSize: 12 },
  removeBtn: { padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center' },
});
