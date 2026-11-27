import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sun, Moon, ChevronRight, LogOut, ArrowLeft, Shield, HelpCircle, CreditCard, Bell, Building2, ShoppingBag, Home, Wallet, BarChart2 } from '../lib/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useMainNavigation } from '../contexts/MainNavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function SettingsScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const { setActiveTab } = useMainNavigation();
  const navigation = useNavigation<any>();

  const [bizCount, setBizCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [propertyCount, SetPropertyCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [memberSince, setMemberSince] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      (async () => {
        try {
          const [bizSnap, prodSnap, propSnap, walletSnap, userSnap] = await Promise.all([
            getDocs(query(collection(db, 'businesses'), where('ownerId', '==', user.id))),
            getDocs(query(collection(db, 'marketplace'), where('ownerId', '==', user.id))),
            getDocs(query(collection(db, 'house_listings'), where('ownerId', '==', user.id))),
            getDoc(doc(db, 'wallets', user.id)),
            getDoc(doc(db, 'users', user.id)),
          ]);
          if (cancelled) return;
          setBizCount(bizSnap.size);
          setProductCount(prodSnap.size);
          SetPropertyCount(propSnap.size);
          if (walletSnap.exists()) {
            setWalletBalance(walletSnap.data().balance || 0);
          }
          if (userSnap.exists()) {
            const d = userSnap.data();
            if (d.createdAt?.toDate) {
              setMemberSince(d.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
            }
          }
        } catch (e) {
          console.error('Settings load error:', e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [user?.id])
  );

  const menuItems = [
    { icon: Bell, label: 'Notifications', desc: 'Push & in-app alerts', onPress: () => {} },
    { icon: Shield, label: 'Privacy & Safety', desc: 'Manage your data', onPress: () => {} },
    { icon: CreditCard, label: 'Payment Methods', desc: 'Manage cards & bank', onPress: () => navigation.navigate('Wallet') },
    { icon: HelpCircle, label: 'Help & Support', desc: 'FAQ & contact us', onPress: () => {} },
  ];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => setActiveTab('explore')} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Settings</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={[s.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={s.profileAvatarImg} />
          ) : (
            <View style={[s.profileAvatar, { backgroundColor: colors.primary }]}>
              <Text style={s.profileAvatarText}>
                {user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </Text>
            </View>
          )}
          <View style={s.profileInfo}>
            <Text style={[s.profileName, { color: colors.foreground }]} numberOfLines={1}>{user?.name || 'User'}</Text>
            <Text style={[s.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{user?.email || ''}</Text>
            {memberSince ? (
              <Text style={[s.profileMeta, { color: colors.mutedForeground }]}>Member since {memberSince}</Text>
            ) : null}
          </View>
        </View>

        {/* Stats */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Your Listings</Text>
        <View style={[s.statsRow, { gap: 10 }]}>
          {[
            { icon: Building2, label: 'Businesses', count: bizCount },
            { icon: ShoppingBag, label: 'Products', count: productCount },
            { icon: Home, label: 'Properties', count: propertyCount },
            { icon: Wallet, label: 'Wallet', count: walletBalance, isCurrency: true },
          ].map((stat) => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <stat.icon size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[s.statCount, { color: colors.foreground }]} numberOfLines={1}>
                {loading ? '—' : stat.isCurrency ? `₦${stat.count.toLocaleString()}` : stat.count}
              </Text>
              <Text style={[s.statLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Appearance */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Appearance</Text>
        <View style={[s.themeRow, { gap: 12 }]}>
          {(['light', 'dark'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                s.themeCard,
                { backgroundColor: colors.card, borderColor: themeMode === mode ? colors.primary : colors.border },
              ]}
              onPress={() => setThemeMode(mode)}
              activeOpacity={0.7}
            >
              {mode === 'light'
                ? <Sun size={22} color={colors.primary} strokeWidth={1.75} />
                : <Moon size={22} color={colors.mutedForeground} strokeWidth={1.75} />}
              <Text style={[s.themeLabel, { color: themeMode === mode ? colors.primary : colors.mutedForeground }]}>
                {mode === 'light' ? 'Light' : 'Dark'}
              </Text>
              {themeMode === mode && <View style={[s.themeDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Account menu */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Account</Text>
        <View style={[s.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.accountRow, i < menuItems.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
              activeOpacity={0.6}
              onPress={item.onPress}
            >
              <View style={s.accountLeft}>
                <item.icon size={18} color={colors.mutedForeground} strokeWidth={2} />
                <View>
                  <Text style={[s.accountLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[s.accountDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {isAdmin ? (
          <>
            <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Administration</Text>
            <View style={[s.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={s.accountRow}
                activeOpacity={0.6}
                onPress={() => navigation.navigate('AdminAnalytics')}
              >
                <View style={s.accountLeft}>
                  <BarChart2 size={18} color={colors.primary} strokeWidth={2} />
                  <View>
                    <Text style={[s.accountLabel, { color: colors.foreground }]}>Platform Health & Analytics</Text>
                    <Text style={[s.accountDesc, { color: colors.mutedForeground }]}>
                      Daily user growth & listing submission trends
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* Logout */}
        <TouchableOpacity
          style={[s.logoutBtn, { borderColor: `${colors.destructive}40`, backgroundColor: `${colors.destructive}08` }]}
          onPress={logout}
          activeOpacity={0.7}
        >
          <LogOut size={19} color={colors.destructive} strokeWidth={2} />
          <Text style={[s.logoutText, { color: colors.destructive }]}>Log Out</Text>
        </TouchableOpacity>

        <Text style={[s.version, { color: colors.mutedForeground }]}>Version 2.4.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 28 },
  profileAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  profileAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  profileAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  profileMeta: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },

  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 8 },

  statsRow: { flexDirection: 'row', marginBottom: 28 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  statCount: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  themeRow: { flexDirection: 'row', marginBottom: 28 },
  themeCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, paddingVertical: 20, alignItems: 'center', gap: 8, position: 'relative' },
  themeLabel: { fontSize: 14, fontWeight: '600' },
  themeDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },

  accountCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  accountLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  accountLabel: { fontSize: 15, fontWeight: '600' },
  accountDesc: { fontSize: 11, marginTop: 2 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingVertical: 15, marginTop: 28 },
  logoutText: { fontSize: 16, fontWeight: '700' },

  version: { fontSize: 12, textAlign: 'center', marginTop: 20 },
});
