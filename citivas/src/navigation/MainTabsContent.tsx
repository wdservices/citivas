import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Compass, Building2, Calendar, ShoppingBag, LayoutDashboard, Bookmark, Wallet, MessageCircle, Share2, MessageSquare, Settings, Headphones, BarChart2 } from '../lib/icons';
import { Share, Linking, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import FloatingTabBar, { TabItem } from '../components/FloatingTabBar';
import SideMenu from '../components/SideMenu';
import { MainNavigationProvider, MainTabId } from '../contexts/MainNavigationContext';

interface MainTabsContentProps {
  HomeStack: React.ComponentType<any>;
  EventsStack: React.ComponentType<any>;
  FavouritesStack: React.ComponentType<any>;
  MarketplaceStack: React.ComponentType<any>;
  ConversationsStack: React.ComponentType<any>;
  WalletStack: React.ComponentType<any>;
  SettingsScreen: React.ComponentType<any>;
}

function detectCityFromCoords(lat: number, lon: number): string {
  if (lat > 11.5 && lon > 7.5 && lon < 9.5) return 'Kano';
  if (lat > 10.0 && lon > 6.5 && lon < 8.5) return 'Kaduna';
  if (lat > 8.0 && lon > 6.5) return 'Abuja';
  if (lat > 5.0 && lat <= 6.0 && lon > 6.5 && lon < 7.5) return 'Owerri';
  if (lat > 6.0 && lon > 3.0 && lon < 4.5) return 'Lagos';
  return 'Port Harcourt';
}

function cityToBrand(city: string): string {
  switch (city) {
    case 'Lagos': return 'TourLAG';
    case 'Abuja': return 'TourABJ';
    case 'Port Harcourt': return 'TourRIV';
    case 'Kano': return 'TourKAN';
    case 'Owerri': return 'TourOWR';
    case 'Kaduna': return 'TourKAD';
    default: return 'Citivas';
  }
}

export default function MainTabsContent({
  HomeStack,
  EventsStack,
  FavouritesStack,
  MarketplaceStack,
  ConversationsStack,
  WalletStack,
  SettingsScreen,
}: MainTabsContentProps) {
  const { colors } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState('explore');
  const [menuVisible, setMenuVisible] = useState(false);
  const [brandName, setBrandName] = useState('Citivas');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setBrandName(cityToBrand(detectCityFromCoords(location.coords.latitude, location.coords.longitude)));
    })();
  }, []);

  const tabs: TabItem[] = [
    { name: 'explore', icon: 'compass', label: 'Explore' },
    { name: 'events', icon: 'calendar', label: 'Events' },
    { name: 'saved', icon: 'bookmark', label: 'Saved' },
    { name: 'messages', icon: 'message-circle', label: 'Messages' },
    { name: 'profile', icon: 'user', label: 'Profile' },
  ];

  const menuSections = useMemo(
    () => [
      {
        title: 'Discover',
        items: [
          { label: 'Explore', icon: Compass, onPress: () => { setActiveTab('explore'); setMenuVisible(false); } },
          { label: 'Businesses', icon: Building2, onPress: () => { setMenuVisible(false); navigation.navigate('BusinessesList'); } },
          { label: 'Events', icon: Calendar, onPress: () => { setActiveTab('events'); setMenuVisible(false); } },
          { label: 'Marketplace', icon: ShoppingBag, onPress: () => { setActiveTab('marketplace'); setMenuVisible(false); } },
        ],
      },
      {
        title: 'Dashboard',
        items: [
          { label: 'My Dashboard', icon: LayoutDashboard, onPress: () => { setMenuVisible(false); navigation.navigate('MyDashboard'); } },
          { label: 'Saved', icon: Bookmark, onPress: () => { setActiveTab('saved'); setMenuVisible(false); } },
          { label: 'Wallet', icon: Wallet, onPress: () => { setActiveTab('wallet'); setMenuVisible(false); } },
          { label: 'Messages', icon: MessageCircle, onPress: () => { setActiveTab('messages'); setMenuVisible(false); } },
        ],
      },
      {
        title: 'Support',
        items: [
          { label: 'Share Citivas', icon: Share2, onPress: async () => {
            setMenuVisible(false);
            try {
              await Share.share({
                message: 'Check out Citivas — discover businesses, events, and marketplace deals near you! https://citivas.ng',
              });
            } catch {}
          }},
          { label: 'Feedback', icon: MessageSquare, onPress: () => { setMenuVisible(false); navigation.navigate('Feedback'); } },
          { label: 'Settings', icon: Settings, onPress: () => { setActiveTab('settings'); setMenuVisible(false); } },
          { label: 'Contact Support', icon: Headphones, onPress: () => {
            setMenuVisible(false);
            const email = 'hello.bluewavestech@gmail.com';
            const subject = encodeURIComponent('Citivas Support');
            const body = encodeURIComponent(`Hi Citivas Support,\n\nI need help with:\n\n\nMy device: ${Platform.OS}\nApp version: 1.0.0`);
            Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
          }},
        ],
      },
      ...(isAdmin
        ? [
            {
              title: 'Admin',
              items: [
                {
                  label: 'Platform Health & Analytics',
                  icon: BarChart2,
                  onPress: () => {
                    setMenuVisible(false);
                    navigation.navigate('AdminAnalytics');
                  },
                },
              ],
            },
          ]
        : []),
    ],
    [navigation, isAdmin]
  );

  const navigateToTab = (tab: MainTabId) => {
    if (tab === 'settings') setActiveTab('profile');
    else setActiveTab(tab);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'explore': return <HomeStack />;
      case 'events': return <EventsStack />;
      case 'saved': return <FavouritesStack />;
      case 'messages': return <ConversationsStack />;
      case 'profile':
      case 'settings': return <SettingsScreen />;
      case 'marketplace': return <MarketplaceStack />;
      case 'wallet': return <WalletStack />;
      default: return <HomeStack />;
    }
  };

  return (
    <MainNavigationProvider value={{ openMenu: () => setMenuVisible(true), setActiveTab: navigateToTab }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>{renderScreen()}</View>

        <FloatingTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <SideMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          userName={user?.name || 'User'}
          userEmail={user?.email || 'user@example.com'}
          photoURL={user?.photoURL}
          brandName={brandName}
          sections={menuSections}
          onLogout={() => { setMenuVisible(false); logout(); }}
        />
      </View>
    </MainNavigationProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingBottom: 72 },
});
