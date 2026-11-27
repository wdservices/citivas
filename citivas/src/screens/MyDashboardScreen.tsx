import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, MapPin, Edit3, Trash2, Package, ArrowLeft } from '../lib/icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getMockImage } from '../lib/mockImages';
import { DashboardListSkeleton, SkeletonBox } from '../components/SkeletonLoader';

interface OwnerListing {
  id: string;
  title: string;
  category: string;
  location: string;
  image: string;
  status: string;
  collection: 'businesses' | 'marketplace' | 'house_listings' | 'events';
  raw: Record<string, any>;
}

type Tab = 'businesses' | 'properties' | 'products' | 'events';

export default function MyDashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('businesses');
  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<OwnerListing | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  const loadListings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const results: OwnerListing[] = [];

      const [bizSnap, propSnap, prodSnap, evSnap] = await Promise.all([
        getDocs(query(collection(db, 'businesses'), where('ownerId', '==', user.id))),
        getDocs(query(collection(db, 'house_listings'), where('ownerId', '==', user.id))),
        getDocs(query(collection(db, 'marketplace'), where('ownerId', '==', user.id))),
        getDocs(query(collection(db, 'events'), where('ownerId', '==', user.id))),
      ]);

      for (const d of bizSnap.docs) {
        const data = d.data();
        results.push({
          id: d.id,
          title: data.name || data.title || 'Untitled',
          category: data.category || 'Business',
          location: data.city || data.location || '',
          image: data.image || (Array.isArray(data.images) && data.images[0]) || '',
          status: data.status || 'Active',
          collection: 'businesses',
          raw: data,
        });
      }

      for (const d of propSnap.docs) {
        const data = d.data();
        results.push({
          id: d.id,
          title: data.title || data.name || 'Untitled Property',
          category: data.type || 'Property',
          location: data.city || data.state || data.location || '',
          image: data.image || (Array.isArray(data.images) && data.images[0]) || '',
          status: data.status || 'Active',
          collection: 'house_listings',
          raw: data,
        });
      }

      for (const d of prodSnap.docs) {
        const data = d.data();
        results.push({
          id: d.id,
          title: data.name || data.title || 'Untitled',
          category: data.category || 'Product',
          location: data.city || data.state || '',
          image: data.image || (Array.isArray(data.images) && data.images[0]) || '',
          status: data.status || 'Active',
          collection: 'marketplace',
          raw: data,
        });
      }

      for (const d of evSnap.docs) {
        const data = d.data();
        results.push({
          id: d.id,
          title: data.name || data.title || 'Untitled',
          category: data.category || 'Event',
          location: data.city || data.state || '',
          image: data.image || (Array.isArray(data.images) && data.images[0]) || '',
          status: data.status || 'Active',
          collection: 'events',
          raw: data,
        });
      }

      setListings(results);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadListings(); }, [loadListings]));

  const filteredListings = listings.filter((l) => {
    if (tab === 'businesses') return l.collection === 'businesses';
    if (tab === 'properties') return l.collection === 'house_listings';
    if (tab === 'products') return l.collection === 'marketplace';
    if (tab === 'events') return l.collection === 'events';
    return false;
  });

  const handleEdit = (item: OwnerListing) => {
    let editType: 'business' | 'restaurant' | 'property' | 'product' | 'event' = 'business';
    if (item.collection === 'house_listings') {
      editType = 'property';
    } else if (item.collection === 'marketplace') {
      editType = 'product';
    } else if (item.collection === 'events') {
      editType = 'event';
    } else if (item.raw.category === 'Restaurant' || item.raw.type === 'Restaurant') {
      editType = 'restaurant';
    }

    navigation.navigate('CreateListing', {
      editType,
      editData: { id: item.id, ...item.raw },
    });
  };

  const initiateDelete = (item: OwnerListing) => {
    setDeleteTarget(item);
    setDeleteStep(1);
  };

  const confirmDeleteStep1 = () => setDeleteStep(2);

  const confirmDeleteStep2 = async () => {
    if (!deleteTarget) return;
    const collectionName = deleteTarget.collection;
    setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
    setDeleteStep(0);
    setDeleteTarget(null);
    try {
      await deleteDoc(doc(db, collectionName, deleteTarget.id));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete');
      loadListings();
    }
  };

  const cancelDelete = () => {
    setDeleteStep(0);
    setDeleteTarget(null);
  };

  const handleCreate = (defaultType?: 'property' | 'product' | 'restaurant' | 'event' | 'business') => {
    navigation.navigate('CreateListing', defaultType ? { defaultType } : undefined);
  };

  const bizCount = listings.filter((l) => l.collection === 'businesses').length;
  const propCount = listings.filter((l) => l.collection === 'house_listings').length;
  const prodCount = listings.filter((l) => l.collection === 'marketplace').length;
  const eventCount = listings.filter((l) => l.collection === 'events').length;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>My Dashboard</Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
          onPress={() => handleCreate()}
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadListings} tintColor={colors.primary} />}
        contentContainerStyle={s.scrollContent}
      >
        {/* Stats */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {loading ? <SkeletonBox width={30} height={22} borderRadius={6} /> : <Text style={[s.statValue, { color: colors.primary }]}>{bizCount}</Text>}
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Places</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {loading ? <SkeletonBox width={30} height={22} borderRadius={6} /> : <Text style={[s.statValue, { color: '#1E88E5' }]}>{propCount}</Text>}
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Properties</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {loading ? <SkeletonBox width={30} height={22} borderRadius={6} /> : <Text style={[s.statValue, { color: colors.accent }]}>{prodCount}</Text>}
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Products</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {loading ? <SkeletonBox width={30} height={22} borderRadius={6} /> : <Text style={[s.statValue, { color: colors.success }]}>{eventCount}</Text>}
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Events</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[s.tabRow, { backgroundColor: colors.muted }]}>
          {(['businesses', 'properties', 'products', 'events'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.tab, tab === t && { backgroundColor: colors.card }]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, { color: colors.mutedForeground }, tab === t && { color: colors.primary }]} numberOfLines={1}>
                {t === 'businesses' ? 'Places' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Listings */}
        {loading ? (
          <DashboardListSkeleton count={4} />
        ) : filteredListings.length === 0 ? (
          <View style={[s.emptyState, { borderColor: colors.border, backgroundColor: colors.muted }]}>
            <Package size={36} color={colors.mutedForeground} strokeWidth={1.5} />
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>No {tab === 'businesses' ? 'restaurants or businesses' : tab} yet</Text>
            <Text style={[s.emptyDesc, { color: colors.mutedForeground }]}>
              {tab === 'businesses' && 'Add a restaurant or local business to get discovered'}
              {tab === 'properties' && 'List a rental, shortlet, hotel, land, or commercial space'}
              {tab === 'products' && 'Post a product or service straight to the Citivas Marketplace'}
              {tab === 'events' && 'Create an event and start selling tickets'}
            </Text>
            <TouchableOpacity
              style={[s.emptyBtn, { borderColor: colors.primary }]}
              onPress={() =>
                handleCreate(
                  tab === 'properties'
                    ? 'property'
                    : tab === 'products'
                    ? 'product'
                    : tab === 'events'
                    ? 'event'
                    : 'restaurant'
                )
              }
            >
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                {tab === 'businesses' ? 'Create Listing' : `Add ${tab.slice(0, -1)}`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.listingsList}>
            {filteredListings.map((item) => (
              <View key={item.id} style={[s.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.listingImage, { backgroundColor: colors.muted }]}>
                  <Image
                    source={{ uri: item.image || getMockImage(item.category) }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                </View>
                <View style={s.listingContent}>
                  <Text style={[s.listingCat, { color: colors.primary }]}>{item.category.toUpperCase()}</Text>
                  <Text style={[s.listingTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                  {item.location ? (
                    <View style={s.listingLocRow}>
                      <MapPin size={11} color={colors.mutedForeground} strokeWidth={2} />
                      <Text style={[s.listingLoc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={s.listingActions}>
                  <TouchableOpacity style={s.actionIcon} onPress={() => handleEdit(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Edit3 size={16} color={colors.mutedForeground} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionIcon} onPress={() => initiateDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Trash2 size={16} color={colors.destructive} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>

      {/* Delete Confirmation: Step 1 */}
      <Modal visible={deleteStep === 1} transparent animationType="fade" onRequestClose={cancelDelete}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={cancelDelete}>
          <View style={[s.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>Delete "{deleteTarget?.title}"?</Text>
            <Text style={[s.modalDesc, { color: colors.mutedForeground }]}>
              This listing will be removed from public view immediately.
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.muted }]} onPress={cancelDelete}>
                <Text style={[s.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.destructive }]} onPress={confirmDeleteStep1}>
                <Text style={[s.modalBtnText, { color: '#fff' }]}>Yes, Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation: Step 2 */}
      <Modal visible={deleteStep === 2} transparent animationType="fade" onRequestClose={cancelDelete}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={cancelDelete}>
          <View style={[s.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.destructive }]}>Final Confirmation</Text>
            <Text style={[s.modalDesc, { color: colors.mutedForeground }]}>
              Are you absolutely sure? This will permanently delete <Text style={{ fontWeight: '700', color: colors.foreground }}>"{deleteTarget?.title}"</Text>. This cannot be undone.
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.muted }]} onPress={cancelDelete}>
                <Text style={[s.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.destructive }]} onPress={confirmDeleteStep2}>
                <Text style={[s.modalBtnText, { color: '#fff' }]}>Delete Permanently</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  tabRow: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabText: { fontSize: 12, fontWeight: '700' },

  listingsList: { gap: 10 },
  listingCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  listingImage: { width: 64, height: 64 },
  listingContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  listingCat: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  listingTitle: { fontSize: 14, fontWeight: '700', marginTop: 3 },
  listingLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  listingLoc: { fontSize: 12 },
  listingActions: { flexDirection: 'row', paddingRight: 14, gap: 12 },
  actionIcon: { padding: 6 },

  emptyState: { borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 16, padding: 24, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalDesc: { fontSize: 14, lineHeight: 20 },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});
