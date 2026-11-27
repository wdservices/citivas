import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

import OnboardingScreen, { ONBOARDING_SEEN_KEY } from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import BusinessDetailScreen from '../screens/BusinessDetailScreen';
import EventsScreen from '../screens/EventsScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import WalletScreen from '../screens/WalletScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import MyDashboardScreen from '../screens/MyDashboardScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import FavouritesScreen from '../screens/FavouritesScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import BusinessesScreen from '../screens/BusinessesScreen';
import PropertyDetailScreen from '../screens/PropertyDetailScreen';
import BookingScreen from '../screens/BookingScreen';
import PaymentScreen from '../screens/PaymentScreen';
import AdminAnalyticsScreen from '../screens/AdminAnalyticsScreen';

import MainTabsContent from './MainTabsContent';

const RootStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const EventsStack = createNativeStackNavigator();
const MarketplaceStack = createNativeStackNavigator();
const WalletStack = createNativeStackNavigator();
const FavouritesStack = createNativeStackNavigator();
const ConversationsStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="BusinessesList" component={BusinessesScreen} />
      <HomeStack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
      <HomeStack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
      <HomeStack.Screen name="Booking" component={BookingScreen} />
      <HomeStack.Screen name="Payment" component={PaymentScreen} />
    </HomeStack.Navigator>
  );
}

function FavouritesStackScreen() {
  return (
    <FavouritesStack.Navigator screenOptions={{ headerShown: false }}>
      <FavouritesStack.Screen name="FavouritesMain" component={FavouritesScreen} />
    </FavouritesStack.Navigator>
  );
}

function ConversationsStackScreen() {
  return (
    <ConversationsStack.Navigator screenOptions={{ headerShown: false }}>
      <ConversationsStack.Screen name="ConversationsMain" component={ConversationsScreen} />
      <ConversationsStack.Screen name="ChatDetail" component={ChatDetailScreen} />
    </ConversationsStack.Navigator>
  );
}

function EventsStackScreen() {
  return (
    <EventsStack.Navigator screenOptions={{ headerShown: false }}>
      <EventsStack.Screen name="EventsMain" component={EventsScreen} />
      <EventsStack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
    </EventsStack.Navigator>
  );
}

function MarketplaceStackScreen() {
  return (
    <MarketplaceStack.Navigator screenOptions={{ headerShown: false }}>
      <MarketplaceStack.Screen name="MarketplaceMain" component={MarketplaceScreen} />
      <MarketplaceStack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </MarketplaceStack.Navigator>
  );
}

function WalletStackScreen() {
  return (
    <WalletStack.Navigator screenOptions={{ headerShown: false }}>
      <WalletStack.Screen name="WalletMain" component={WalletScreen} />
    </WalletStack.Navigator>
  );
}

function MainTabs() {
  return (
    <MainTabsContent
      HomeStack={HomeStackScreen}
      EventsStack={EventsStackScreen}
      FavouritesStack={FavouritesStackScreen}
      MarketplaceStack={MarketplaceStackScreen}
      ConversationsStack={ConversationsStackScreen}
      WalletStack={WalletStackScreen}
      SettingsScreen={SettingsScreen}
    />
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((val) => {
        if (!active) return;
        setHasSeenOnboarding(val === 'true');
        setOnboardingChecked(true);
      })
      .catch(() => {
        if (!active) return;
        setHasSeenOnboarding(false);
        setOnboardingChecked(true);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  if (isLoading || !onboardingChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName={isAuthenticated ? 'MainTabs' : hasSeenOnboarding ? 'Login' : 'Onboarding'}
        screenOptions={{ headerShown: false }}
      >
        {isAuthenticated ? (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabs} />
            <RootStack.Screen name="BusinessesList" component={BusinessesScreen} />
            <RootStack.Screen name="ChatDetail" component={ChatDetailScreen} />
            <RootStack.Screen name="MyDashboard" component={MyDashboardScreen} />
            <RootStack.Screen name="CreateListing" component={CreateListingScreen} />
            <RootStack.Screen name="Feedback" component={FeedbackScreen} />
            <RootStack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
            <RootStack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
            <RootStack.Screen name="Booking" component={BookingScreen} />
            <RootStack.Screen name="Payment" component={PaymentScreen} />
            <RootStack.Screen name="Favourites" component={FavouritesScreen} />
            <RootStack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
            <RootStack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
