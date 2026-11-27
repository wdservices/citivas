import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArrowRight } from '../lib/icons';
import { useAuth } from '../contexts/AuthContext';
import {
  BRAND,
  DISPLAY_FONT,
  BODY_FONT,
  SkylineIllustration,
  NigeriaMapIllustration,
  CategoriesGridIllustration,
  SplitBillIllustration,
  ReadyIllustration,
} from '../components/onboarding/OnboardingIllustrations';

export const ONBOARDING_SEEN_KEY = '@citivas/has_seen_onboarding';

interface OnboardingSlide {
  id: string;
  headline: string;
  subtext: string;
  isFinal?: boolean;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'unlock',
    headline: 'Your City. Unlocked.',
    subtext:
      'Discover the best hotels, restaurants, events and more — wherever you are in Nigeria.',
  },
  {
    id: 'cities',
    headline: 'One App. Every City.',
    subtext:
      "Land in Lagos today, Abuja tomorrow — Citivas adapts automatically to show you what's best right where you are.",
  },
  {
    id: 'all-in-one',
    headline: 'Everything You Need, In One Place',
    subtext:
      'Book hotels and short-lets, find the best restaurants, grab event tickets, and shop the marketplace — all verified, all in Citivas.',
  },
  {
    id: 'split-pay',
    headline: 'Pay Together, Hassle-Free',
    subtext:
      'Split any bill with a friend and pay securely with your Citivas Wallet — no more chasing people for their half.',
  },
  {
    id: 'ready',
    headline: 'Ready to Explore?',
    subtext: 'Create your account and start discovering Citivas today.',
    isFinal: true,
  },
];

function FlatGoogleMark() {
  return (
    <View style={styles.googleBadge}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          d="M21.8 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.49a4.69 4.69 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.48z"
          fill="#4285F4"
        />
        <Path
          d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.97-3.45.97-2.65 0-4.9-1.79-5.7-4.2H2.89v2.64A10 10 0 0 0 12 22z"
          fill="#34A853"
        />
        <Path
          d="M6.3 13.74A5.99 5.99 0 0 1 5.98 12c0-.6.11-1.19.32-1.74V7.62H2.89A10 10 0 0 0 2 12c0 1.61.39 3.14 1.09 4.49l3.21-2.75z"
          fill="#FBBC05"
        />
        <Path
          d="M12 6.06c1.5 0 2.84.51 3.9 1.52l2.92-2.92C17.05 3.01 14.74 2 12 2A10 10 0 0 0 2.89 7.62l3.41 2.64c.8-2.41 3.05-4.2 5.7-4.2z"
          fill="#EA4335"
        />
      </Svg>
    </View>
  );
}

function StampProgressDots({
  total,
  activeIndex,
  onSelect,
}: {
  total: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.dotsRow} accessibilityRole="tablist">
      {Array.from({ length: total }).map((_, idx) => {
        const isActive = idx === activeIndex;
        return (
          <TouchableOpacity
            key={idx}
            onPress={() => onSelect(idx)}
            activeOpacity={0.7}
            style={[
              styles.dotTouchTarget,
              isActive && { transform: [{ rotate: '-8deg' }] },
            ]}
            accessibilityLabel={`Step ${idx + 1} of ${total}`}
            accessibilityState={{ selected: isActive }}
          >
            <Svg width={isActive ? 20 : 16} height={isActive ? 20 : 16} viewBox="0 0 24 24">
              <Circle
                cx={12}
                cy={12}
                r={9.5}
                fill={isActive ? BRAND.accent : 'transparent'}
                stroke={isActive ? BRAND.accent : '#94A3B8'}
                strokeWidth={2}
                strokeDasharray="3.8 2.8"
              />
              {isActive && <Circle cx={12} cy={12} r={3} fill={BRAND.background} />}
            </Svg>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const { loginWithGoogle } = useAuth();

  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isCompactHeight = height < 700;
  const illustrationSize = Math.min(Math.round(width * 0.78), isCompactHeight ? 245 : 300);
  const contentMaxWidth = Math.min(width, 440);
  const isLastSlide = activeIndex === SLIDES.length - 1;

  const markOnboardingSeen = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch (_) {}
  }, []);

  const scrollToSlide = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, index));
      setActiveIndex(clamped);
      setAuthError(null);
      flatListRef.current?.scrollToOffset({
        offset: clamped * width,
        animated: true,
      });
    },
    [width]
  );

  const handleSkip = useCallback(() => {
    scrollToSlide(SLIDES.length - 1);
  }, [scrollToSlide]);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      scrollToSlide(activeIndex + 1);
    }
  }, [activeIndex, scrollToSlide]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const nextIdx = Math.round(x / Math.max(width, 1));
      if (nextIdx >= 0 && nextIdx < SLIDES.length && nextIdx !== activeIndex) {
        setActiveIndex(nextIdx);
        setAuthError(null);
      }
    },
    [width, activeIndex]
  );

  const handleContinueWithGoogle = useCallback(async () => {
    setAuthError(null);
    setGoogleLoading(true);
    try {
      await markOnboardingSeen();
      await loginWithGoogle();
    } catch (error: any) {
      if (error?.message === 'Google sign-in was cancelled') {
        setAuthError(null);
      } else if (error?.code === 'auth/unauthorized-domain') {
        setAuthError('Domain not authorized in Firebase Console.');
      } else {
        setAuthError('Could not complete Google sign-in. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, markOnboardingSeen]);

  const handleSignUpEmail = useCallback(async () => {
    await markOnboardingSeen();
    navigation.navigate('Login', { initialMode: 'signup' });
  }, [markOnboardingSeen, navigation]);

  const handleSignInLink = useCallback(async () => {
    await markOnboardingSeen();
    navigation.navigate('Login', { initialMode: 'signin' });
  }, [markOnboardingSeen, navigation]);

  const renderIllustration = (id: string) => {
    switch (id) {
      case 'unlock':
        return <SkylineIllustration size={illustrationSize} />;
      case 'cities':
        return <NigeriaMapIllustration size={illustrationSize} />;
      case 'all-in-one':
        return <CategoriesGridIllustration size={illustrationSize} />;
      case 'split-pay':
        return <SplitBillIllustration size={illustrationSize} />;
      case 'ready':
      default:
        return (
          <ReadyIllustration
            size={Math.min(Math.round(illustrationSize * 0.88), isCompactHeight ? 210 : 255)}
          />
        );
    }
  };

  const renderSlide = ({ item }: ListRenderItemInfo<OnboardingSlide>) => {
    return (
      <View style={[styles.slidePage, { width }]}>
        <View style={[styles.slideInner, { maxWidth: contentMaxWidth }]}>
          <View style={[styles.illustrationZone, isCompactHeight && styles.illustrationZoneCompact]}>
            {renderIllustration(item.id)}
          </View>

          <View style={styles.copyZone}>
            <Text
              style={[
                styles.headline,
                isCompactHeight && styles.headlineCompact,
              ]}
            >
              {item.headline}
            </Text>
            <Text style={styles.subtext}>{item.subtext}</Text>
          </View>

          {item.isFinal && (
            <View style={styles.finalActions}>
              {authError ? (
                <Text style={styles.errorText}>{authError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
                onPress={handleContinueWithGoogle}
                disabled={googleLoading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                {googleLoading ? (
                  <ActivityIndicator color={BRAND.white} size="small" />
                ) : (
                  <>
                    <FlatGoogleMark />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emailButton}
                onPress={handleSignUpEmail}
                disabled={googleLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Sign Up with Email"
              >
                <Text style={styles.emailButtonText}>Sign Up with Email</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signInLinkRow}
                onPress={handleSignInLink}
                disabled={googleLoading}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Text style={styles.signInMuted}>
                  Already have an account?{' '}
                  <Text style={styles.signInAction}>Sign In.</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Bar: Skip link top-right on screens 1-4 */}
      <View style={[styles.topBar, { maxWidth: contentMaxWidth }]}>
        <View style={styles.brandSpacer} />
        {!isLastSlide ? (
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      {/* Horizontal 5-screen onboarding pager */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        style={styles.pager}
      />

      {/* Bottom Bar: Stamp dot progress indicator + circular blue Next button (screens 1-4) */}
      <View
        style={[
          styles.bottomBar,
          { maxWidth: contentMaxWidth },
          isLastSlide && styles.bottomBarCentered,
        ]}
      >
        <StampProgressDots
          total={SLIDES.length}
          activeIndex={activeIndex}
          onSelect={scrollToSlide}
        />

        {!isLastSlide && (
          <TouchableOpacity
            style={styles.nextCircleBtn}
            onPress={handleNext}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Next screen"
          >
            <ArrowRight size={22} color={BRAND.white} strokeWidth={2.2} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.background,
  },
  topBar: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    minHeight: 48,
  },
  brandSpacer: {
    width: 48,
  },
  skipButton: {
    minWidth: 56,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  skipPlaceholder: {
    minHeight: 44,
  },
  skipText: {
    fontFamily: BODY_FONT,
    fontSize: 15,
    fontWeight: '600',
    color: BRAND.muted,
  },
  pager: {
    flex: 1,
  },
  slidePage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  slideInner: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationZone: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  illustrationZoneCompact: {
    marginBottom: 16,
  },
  copyZone: {
    alignItems: 'center',
    paddingHorizontal: 6,
    maxWidth: 340,
  },
  headline: {
    fontFamily: DISPLAY_FONT,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.6,
    color: BRAND.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  headlineCompact: {
    fontSize: 25,
    lineHeight: 31,
    marginBottom: 8,
  },
  subtext: {
    fontFamily: BODY_FONT,
    fontSize: 15.5,
    fontWeight: '400',
    lineHeight: 23,
    color: BRAND.muted,
    textAlign: 'center',
  },
  finalActions: {
    width: '100%',
    marginTop: 28,
    gap: 12,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: BODY_FONT,
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 2,
  },
  googleButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: BRAND.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  googleBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontFamily: DISPLAY_FONT,
    fontSize: 15.5,
    fontWeight: '700',
    color: BRAND.white,
    letterSpacing: -0.2,
  },
  emailButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emailButtonText: {
    fontFamily: DISPLAY_FONT,
    fontSize: 15.5,
    fontWeight: '700',
    color: BRAND.primary,
    letterSpacing: -0.2,
  },
  signInLinkRow: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 2,
  },
  signInMuted: {
    fontFamily: BODY_FONT,
    fontSize: 14,
    color: BRAND.muted,
  },
  signInAction: {
    fontFamily: DISPLAY_FONT,
    fontWeight: '700',
    color: BRAND.primary,
  },
  bottomBar: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    minHeight: 76,
  },
  bottomBarCentered: {
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotTouchTarget: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
