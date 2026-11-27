import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  G,
  Line,
  Polygon,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';

export const BRAND = {
  background: '#F5F7FA',
  primary: '#1E88E5',
  primarySoft: '#DBEAFE',
  primaryMid: '#60A5FA',
  primaryDark: '#1565B8',
  accent: '#D9891F',
  accentSoft: '#FEF3C7',
  accentMid: '#F59E0B',
  accentDark: '#B45309',
  success: '#10B981',
  successSoft: '#D1FAE5',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export const DISPLAY_FONT = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif-medium',
  default: '"Outfit", "Plus Jakarta Sans", system-ui, sans-serif',
});

export const BODY_FONT = Platform.select({
  ios: 'Avenir',
  android: 'sans-serif',
  default: '"Plus Jakarta Sans", system-ui, sans-serif',
});

interface IllustrationProps {
  size?: number;
}

/**
 * Reusable flat vector Citivas Mark (pin + ring + traveler silhouette)
 */
export function CitivasVectorMark({
  size = 64,
  color = BRAND.primary,
  accentColor = BRAND.accent,
}: {
  size?: number;
  color?: string;
  accentColor?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {/* Outer location pin silhouette */}
      <Path
        d="M40 6 C23.4 6 10 19.4 10 36 C10 55.5 34.5 72.5 38.6 75.2 C39.4 75.8 40.6 75.8 41.4 75.2 C45.5 72.5 70 55.5 70 36 C70 19.4 56.6 6 40 6 Z"
        fill={color}
      />
      {/* Inner orbital ring */}
      <Circle cx={40} cy={35} r={19} fill={BRAND.white} />
      <Circle cx={40} cy={35} r={15.5} fill={color} />
      {/* Stylized traveler silhouette inside pin */}
      <Circle cx={40} cy={29.5} r={5.2} fill={BRAND.white} />
      <Path
        d="M29.5 44.5 C29.5 38.8 34.2 35.8 40 35.8 C45.8 35.8 50.5 38.8 50.5 44.5 C47.7 47.4 44 49 40 49 C36 49 32.3 47.4 29.5 44.5 Z"
        fill={BRAND.white}
      />
      {/* Small marigold compass accent dot on bottom-right of ring */}
      <Circle cx={53} cy={22} r={3.5} fill={accentColor} />
    </Svg>
  );
}

/**
 * Screen 1: "Your City. Unlocked."
 * Flat two-tone (marigold + blue) skyline blending Lagos, Abuja, and Port Harcourt
 * silhouettes into one horizon, with a tilted passport-stamp badge bearing the Citivas mark.
 */
export function SkylineIllustration({ size = 300 }: IllustrationProps) {
  const stampScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.spring(stampScale, {
      toValue: 1,
      friction: 6,
      tension: 65,
      useNativeDriver: true,
    }).start();
  }, [stampScale]);

  const height = Math.round(size * 0.78);

  return (
    <View style={[styles.canvas, { width: size, height }]}>
      <Svg width={size} height={height} viewBox="0 0 320 250">
        {/* Soft flat horizon sun disc */}
        <Circle cx={160} cy={156} r={92} fill={BRAND.accentSoft} />
        <Circle cx={160} cy={156} r={66} fill={BRAND.primarySoft} opacity={0.75} />

        {/* Back layer: Aso Rock (Abuja) monolith & distant towers in soft marigold */}
        <Path
          d="M116 196 C122 146 142 126 164 126 C188 126 204 148 212 196 Z"
          fill={BRAND.accent}
          opacity={0.28}
        />

        {/* LAGOS (Left): Marina / Victoria Island towers */}
        <Rect x={24} y={138} width={22} height={58} rx={2} fill={BRAND.primary} />
        <Rect x={29} y={146} width={4} height={6} fill={BRAND.background} />
        <Rect x={37} y={146} width={4} height={6} fill={BRAND.background} />
        <Rect x={29} y={158} width={4} height={6} fill={BRAND.background} />
        <Rect x={37} y={158} width={4} height={6} fill={BRAND.background} />

        {/* Tall Lagos skyscraper */}
        <Rect x={50} y={108} width={28} height={88} rx={2} fill={BRAND.accent} />
        <Rect x={60} y={96} width={8} height={12} fill={BRAND.accent} />
        <Line x1={64} y1={84} x2={64} y2={96} stroke={BRAND.accent} strokeWidth={2.5} strokeLinecap="round" />
        <Rect x={56} y={118} width={16} height={4} rx={1} fill={BRAND.accentSoft} />
        <Rect x={56} y={128} width={16} height={4} rx={1} fill={BRAND.accentSoft} />
        <Rect x={56} y={138} width={16} height={4} rx={1} fill={BRAND.accentSoft} />
        <Rect x={56} y={148} width={16} height={4} rx={1} fill={BRAND.accentSoft} />

        {/* Lekki-Ikoyi Cable-Stayed Bridge silhouette */}
        <Polygon points="98,196 105,112 110,112 116,196" fill={BRAND.primary} />
        <Line x1={107} y1={116} x2={78} y2={176} stroke={BRAND.primary} strokeWidth={1.6} />
        <Line x1={107} y1={128} x2={86} y2={176} stroke={BRAND.primary} strokeWidth={1.6} />
        <Line x1={107} y1={116} x2={136} y2={176} stroke={BRAND.primary} strokeWidth={1.6} />
        <Line x1={107} y1={128} x2={128} y2={176} stroke={BRAND.primary} strokeWidth={1.6} />
        <Rect x={74} y={175} width={64} height={5} rx={2} fill={BRAND.primaryDark} />

        {/* ABUJA (Center): National Mosque Dome + Minarets & City Gate Arch */}
        {/* Left & Right Minarets */}
        <Rect x={142} y={124} width={6} height={72} fill={BRAND.primary} />
        <Polygon points="142,124 145,113 148,124" fill={BRAND.accent} />
        <Rect x={182} y={124} width={6} height={72} fill={BRAND.primary} />
        <Polygon points="182,124 185,113 188,124" fill={BRAND.accent} />
        {/* Mosque Central Dome */}
        <Path
          d="M150 156 C150 139 180 139 180 156 Z"
          fill={BRAND.accent}
        />
        <Line x1={165} y1={134} x2={165} y2={141} stroke={BRAND.accent} strokeWidth={2} strokeLinecap="round" />
        <Rect x={148} y={156} width={34} height={40} fill={BRAND.primary} />
        {/* Abuja City Gate Arch cutout */}
        <Path
          d="M158 196 L158 175 C158 168 172 168 172 175 L172 196 Z"
          fill={BRAND.background}
        />

        {/* PORT HARCOURT (Right): Civic Spire, Port Crane & Garden City Palms */}
        <Rect x={200} y={142} width={26} height={54} rx={2} fill={BRAND.accent} />
        <Rect x={206} y={150} width={5} height={36} rx={1} fill={BRAND.accentSoft} />
        <Rect x={215} y={150} width={5} height={36} rx={1} fill={BRAND.accentSoft} />

        {/* Civic Waterfront Tower */}
        <Rect x={232} y={118} width={24} height={78} rx={2} fill={BRAND.primary} />
        <Polygon points="232,118 244,100 256,118" fill={BRAND.accent} />
        <Rect x={238} y={126} width={12} height={4} rx={1} fill={BRAND.primarySoft} />
        <Rect x={238} y={136} width={12} height={4} rx={1} fill={BRAND.primarySoft} />
        <Rect x={238} y={146} width={12} height={4} rx={1} fill={BRAND.primarySoft} />

        {/* Port Crane silhouette */}
        <Line x1={270} y1={196} x2={270} y2={136} stroke={BRAND.primaryDark} strokeWidth={3} />
        <Line x1={264} y1={144} x2={294} y2={130} stroke={BRAND.accent} strokeWidth={3} strokeLinecap="round" />
        <Line x1={288} y1={133} x2={288} y2={158} stroke={BRAND.primaryDark} strokeWidth={1.5} />
        <Rect x={283} y={158} width={10} height={8} rx={1} fill={BRAND.accent} />

        {/* Garden City geometric trees */}
        <Circle cx={264} cy={184} r={11} fill={BRAND.primary} />
        <Circle cx={280} cy={186} r={9} fill={BRAND.accent} />

        {/* Unified Horizon Baseline + Waterfront Ripple */}
        <Line x1={14} y1={196} x2={306} y2={196} stroke={BRAND.text} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={48} y1={206} x2={134} y2={206} stroke={BRAND.primaryMid} strokeWidth={2} strokeLinecap="round" />
        <Line x1={172} y1={206} x2={268} y2={206} stroke={BRAND.accent} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      </Svg>

      {/* Tilted Passport-Stamp Badge bearing the Citivas mark stamped over the horizon */}
      <Animated.View
        style={[
          styles.skylineStamp,
          { transform: [{ rotate: '-10deg' }, { scale: stampScale }] },
        ]}
      >
        <Svg width={94} height={94} viewBox="0 0 94 94">
          <Circle cx={47} cy={47} r={44} fill={BRAND.background} />
          <Circle
            cx={47}
            cy={47}
            r={41}
            fill="none"
            stroke={BRAND.primary}
            strokeWidth={2.5}
            strokeDasharray="6 4"
          />
          <Circle
            cx={47}
            cy={47}
            r={34}
            fill="none"
            stroke={BRAND.accent}
            strokeWidth={1.3}
          />
        </Svg>
        <View style={styles.skylineStampInner}>
          <CitivasVectorMark size={40} color={BRAND.primary} accentColor={BRAND.accent} />
          <Text style={styles.stampMicroLabel}>CITIVAS · NG</Text>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * Screen 2: "One App. Every City."
 * Simplified Nigeria map outline with a location pin traveling between
 * three passport-stamp city tags (Lagos, Abuja, Port Harcourt).
 */
export function NigeriaMapIllustration({ size = 300 }: IllustrationProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const height = Math.round(size * 0.78);
  const pinTranslateX = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-46, 0, 26] });
  const pinTranslateY = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [28, -14, 34] });

  return (
    <View style={[styles.canvas, { width: size, height }]}>
      <Svg width={size} height={height} viewBox="0 0 320 250">
        {/* Soft background circle */}
        <Circle cx={160} cy={125} r={104} fill={BRAND.primarySoft} opacity={0.45} />

        {/* Simplified recognizable Nigeria map outline */}
        <Path
          d="M58 64 L82 40 L122 36 L154 26 L192 30 L248 26 L272 42 L264 78 L250 112 L226 134 L208 158 L194 196 L166 218 L144 214 L126 190 L94 176 L58 176 L48 152 L54 114 Z"
          fill={BRAND.white}
          stroke={BRAND.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* Subtle Niger & Benue rivers confluence inside Nigeria */}
        <Path
          d="M72 78 Q120 112 162 126 Q160 165 154 212"
          fill="none"
          stroke={BRAND.primarySoft}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <Path
          d="M244 96 Q204 118 162 126"
          fill="none"
          stroke={BRAND.primarySoft}
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {/* Travel route dashed arcs connecting Lagos -> Abuja -> Port Harcourt */}
        <Path
          d="M78 164 Q108 112 158 112 Q184 148 168 192"
          fill="none"
          stroke={BRAND.accent}
          strokeWidth={2.2}
          strokeDasharray="5 5"
          strokeLinecap="round"
        />

        {/* City nodes on map */}
        <Circle cx={78} cy={164} r={5} fill={BRAND.primary} />
        <Circle cx={158} cy={112} r={5.5} fill={BRAND.accent} />
        <Circle cx={168} cy={192} r={5} fill={BRAND.success} />
      </Svg>

      {/* Passport-stamp city tag: ABUJA (top-center-right) */}
      <View style={[styles.cityStampTag, { top: 28, right: 32, transform: [{ rotate: '5deg' }] }]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} fill={BRAND.accentSoft} stroke={BRAND.accent} strokeWidth={1.8} strokeDasharray="3 2" />
          <Circle cx={12} cy={12} r={3.5} fill={BRAND.accent} />
        </Svg>
        <Text style={[styles.cityStampText, { color: BRAND.accentDark }]}>ABUJA</Text>
      </View>

      {/* Passport-stamp city tag: LAGOS (bottom-left) */}
      <View style={[styles.cityStampTag, { bottom: 38, left: 10, transform: [{ rotate: '-7deg' }] }]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} fill={BRAND.primarySoft} stroke={BRAND.primary} strokeWidth={1.8} strokeDasharray="3 2" />
          <Circle cx={12} cy={12} r={3.5} fill={BRAND.primary} />
        </Svg>
        <Text style={[styles.cityStampText, { color: BRAND.primaryDark }]}>LAGOS</Text>
      </View>

      {/* Passport-stamp city tag: PORT HARCOURT (bottom-right) */}
      <View style={[styles.cityStampTag, { bottom: 16, right: 12, transform: [{ rotate: '-4deg' }] }]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} fill={BRAND.successSoft} stroke={BRAND.success} strokeWidth={1.8} strokeDasharray="3 2" />
          <Circle cx={12} cy={12} r={3.5} fill={BRAND.success} />
        </Svg>
        <Text style={[styles.cityStampText, { color: '#047857' }]}>PORT HARCOURT</Text>
      </View>

      {/* Animated traveling location pin */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.travelingPin,
          { transform: [{ translateX: pinTranslateX }, { translateY: pinTranslateY }] },
        ]}
      >
        <Svg width={36} height={44} viewBox="0 0 36 44">
          <Path
            d="M18 2 C9.7 2 3 8.7 3 17 C3 27.2 15.8 39 17.3 40.3 C17.7 40.7 18.3 40.7 18.7 40.3 C20.2 39 33 27.2 33 17 C33 8.7 26.3 2 18 2 Z"
            fill={BRAND.accent}
            stroke={BRAND.white}
            strokeWidth={2}
          />
          <Circle cx={18} cy={16.5} r={5.5} fill={BRAND.white} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * Screen 3: "Everything You Need, In One Place"
 * Four passport-stamp circular icons in a 2x2 grid:
 * Hotels (bed), Restaurants (fork-knife), Events (ticket), Marketplace (shopping-bag),
 * each ring a different brand color.
 */
export function CategoriesGridIllustration({ size = 300 }: IllustrationProps) {
  const height = Math.round(size * 0.78);
  const stampSize = Math.round(size * 0.34);

  const items = [
    {
      key: 'hotels',
      label: 'Hotels',
      color: BRAND.primary,
      tint: BRAND.primarySoft,
      tilt: '-6deg',
      renderIcon: (c: string) => (
        <Svg width={34} height={34} viewBox="0 0 36 36">
          {/* Flat Bed icon */}
          <Rect x={4} y={19} width={28} height={7} rx={2} fill={c} />
          <Line x1={6} y1={26} x2={6} y2={30} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={30} y1={26} x2={30} y2={30} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={5} y1={11} x2={5} y2={26} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
          <Rect x={8} y={13} width={8} height={5} rx={2} fill={c} opacity={0.75} />
          <Path d="M17 18 C17 14 21 13 28 13 C30 13 31 15 31 18 Z" fill={c} />
        </Svg>
      ),
    },
    {
      key: 'restaurants',
      label: 'Restaurants',
      color: BRAND.accent,
      tint: BRAND.accentSoft,
      tilt: '5deg',
      renderIcon: (c: string) => (
        <Svg width={34} height={34} viewBox="0 0 36 36">
          {/* Flat Fork & Knife icon */}
          <Line x1={12} y1={6} x2={12} y2={15} stroke={c} strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={9} y1={6} x2={9} y2={13} stroke={c} strokeWidth={2} strokeLinecap="round" />
          <Line x1={15} y1={6} x2={15} y2={13} stroke={c} strokeWidth={2} strokeLinecap="round" />
          <Path d="M9 13 Q12 17 15 13" fill="none" stroke={c} strokeWidth={2} />
          <Line x1={12} y1={16} x2={12} y2={30} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
          {/* Knife */}
          <Path d="M24 6 C27.5 6 28 11 28 18 L24 18 Z" fill={c} />
          <Line x1={24} y1={6} x2={24} y2={30} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      ),
    },
    {
      key: 'events',
      label: 'Events',
      color: BRAND.success,
      tint: BRAND.successSoft,
      tilt: '6deg',
      renderIcon: (c: string) => (
        <Svg width={34} height={34} viewBox="0 0 36 36">
          {/* Flat Ticket icon */}
          <Path
            d="M5 12 C5 10.9 5.9 10 7 10 L29 10 C30.1 10 31 10.9 31 12 L31 15.5 C29.3 15.5 28 16.6 28 18 C28 19.4 29.3 20.5 31 20.5 L31 24 C31 25.1 30.1 26 29 26 L7 26 C5.9 26 5 25.1 5 24 L5 20.5 C6.7 20.5 8 19.4 8 18 C8 16.6 6.7 15.5 5 15.5 Z"
            fill={c}
          />
          <Line x1={14} y1={12} x2={14} y2={24} stroke={BRAND.white} strokeWidth={1.8} strokeDasharray="2.5 2.5" />
          <Circle cx={22} cy={18} r={2.5} fill={BRAND.white} />
        </Svg>
      ),
    },
    {
      key: 'marketplace',
      label: 'Marketplace',
      color: BRAND.text,
      tint: '#E2E8F0',
      tilt: '-5deg',
      renderIcon: (c: string) => (
        <Svg width={34} height={34} viewBox="0 0 36 36">
          {/* Flat Shopping Bag icon */}
          <Path
            d="M13 13 L13 10.5 C13 7.8 15.2 6 18 6 C20.8 6 23 7.8 23 10.5 L23 13"
            fill="none"
            stroke={c}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <Path
            d="M8 13 L28 13 L30 28 C30.2 29.1 29.3 30 28.2 30 L7.8 30 C6.7 30 5.8 29.1 6 28 Z"
            fill={c}
          />
          <Circle cx={14} cy={18} r={1.6} fill={BRAND.white} />
          <Circle cx={22} cy={18} r={1.6} fill={BRAND.white} />
        </Svg>
      ),
    },
  ];

  return (
    <View style={[styles.gridWrap, { width: size, height }]}>
      <View style={styles.gridRow}>
        {items.slice(0, 2).map((item) => (
          <View
            key={item.key}
            style={[
              styles.gridStampBox,
              { width: stampSize, height: stampSize, transform: [{ rotate: item.tilt }] },
            ]}
          >
            <Svg width={stampSize} height={stampSize} viewBox="0 0 110 110" style={StyleSheet.absoluteFillObject}>
              <Circle cx={55} cy={55} r={51} fill={item.tint} />
              <Circle
                cx={55}
                cy={55}
                r={48}
                fill="none"
                stroke={item.color}
                strokeWidth={2.4}
                strokeDasharray="6 4"
              />
              <Circle
                cx={55}
                cy={55}
                r={41}
                fill="none"
                stroke={item.color}
                strokeWidth={1}
                opacity={0.35}
              />
            </Svg>
            {item.renderIcon(item.color)}
            <Text style={[styles.gridStampLabel, { color: item.color }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.gridRow}>
        {items.slice(2, 4).map((item) => (
          <View
            key={item.key}
            style={[
              styles.gridStampBox,
              { width: stampSize, height: stampSize, transform: [{ rotate: item.tilt }] },
            ]}
          >
            <Svg width={stampSize} height={stampSize} viewBox="0 0 110 110" style={StyleSheet.absoluteFillObject}>
              <Circle cx={55} cy={55} r={51} fill={item.tint} />
              <Circle
                cx={55}
                cy={55}
                r={48}
                fill="none"
                stroke={item.color}
                strokeWidth={2.4}
                strokeDasharray="6 4"
              />
              <Circle
                cx={55}
                cy={55}
                r={41}
                fill="none"
                stroke={item.color}
                strokeWidth={1}
                opacity={0.35}
              />
            </Svg>
            {item.renderIcon(item.color)}
            <Text style={[styles.gridStampLabel, { color: item.color }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Screen 4: "Pay Together, Hassle-Free"
 * Two illustrated hands each holding half of a torn bill, joining into a whole,
 * with a small palm-green lock icon nearby.
 */
export function SplitBillIllustration({ size = 300 }: IllustrationProps) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const height = Math.round(size * 0.78);
  const leftShift = drift.interpolate({ inputRange: [0, 1], outputRange: [-4, 2] });
  const rightShift = drift.interpolate({ inputRange: [0, 1], outputRange: [4, -2] });

  return (
    <View style={[styles.canvas, { width: size, height }]}>
      {/* Calm circular backing stage */}
      <Svg width={size} height={height} viewBox="0 0 320 250" style={StyleSheet.absoluteFillObject}>
        <Circle cx={160} cy={130} r={96} fill={BRAND.primarySoft} opacity={0.45} />
        <Circle cx={160} cy={130} r={72} fill={BRAND.accentSoft} opacity={0.45} />
      </Svg>

      {/* Left hand + Left half of torn bill */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: leftShift }] }]}
      >
        <Svg width={size} height={height} viewBox="0 0 320 250">
          {/* Left sleeve & forearm */}
          <Path d="M0 142 L48 134 L54 176 L0 184 Z" fill={BRAND.primary} />
          {/* Left hand */}
          <Path
            d="M46 136 L82 128 C90 126 95 132 94 139 L80 144 L96 146 C101 147 101 154 96 155 L78 156 L92 160 C96 162 94 169 89 169 L54 174 Z"
            fill="#8D5524"
          />
          {/* Left torn bill half */}
          <Path
            d="M84 82 L156 82 L150 96 L159 110 L149 124 L158 138 L150 152 L156 166 L84 166 C79 166 76 162 76 158 L76 90 C76 86 79 82 84 82 Z"
            fill={BRAND.white}
            stroke={BRAND.text}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          {/* Torn Naira vector glyph on left half */}
          <Line x1={96} y1={110} x2={96} y2={136} stroke={BRAND.primary} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={96} y1={110} x2={112} y2={136} stroke={BRAND.primary} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={112} y1={110} x2={112} y2={136} stroke={BRAND.primary} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={91} y1={120} x2={117} y2={120} stroke={BRAND.primary} strokeWidth={2} strokeLinecap="round" />
          <Line x1={91} y1={126} x2={117} y2={126} stroke={BRAND.primary} strokeWidth={2} strokeLinecap="round" />
          <Rect x={94} y={146} width={36} height={5} rx={2.5} fill={BRAND.border} />
          {/* Thumb gripping front of bill */}
          <Path
            d="M68 134 C78 130 92 134 94 142 C95 148 86 151 74 148 Z"
            fill="#A0622D"
          />
        </Svg>
      </Animated.View>

      {/* Right hand + Right half of torn bill */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: rightShift }] }]}
      >
        <Svg width={size} height={height} viewBox="0 0 320 250">
          {/* Right sleeve & forearm */}
          <Path d="M320 142 L272 134 L266 176 L320 184 Z" fill={BRAND.accent} />
          {/* Right hand */}
          <Path
            d="M274 136 L238 128 C230 126 225 132 226 139 L240 144 L224 146 C219 147 219 154 224 155 L242 156 L228 160 C224 162 226 169 231 169 L266 174 Z"
            fill="#C68642"
          />
          {/* Right torn bill half (matching interlocking seam) */}
          <Path
            d="M164 82 L236 82 C241 82 244 86 244 90 L244 158 C244 162 241 166 236 166 L164 166 L158 152 L166 138 L157 124 L167 110 L158 96 Z"
            fill={BRAND.white}
            stroke={BRAND.text}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          {/* Receipt lines & split checkmark on right half */}
          <Rect x={178} y={102} width={46} height={6} rx={3} fill={BRAND.accentSoft} />
          <Rect x={178} y={116} width={38} height={5} rx={2.5} fill={BRAND.border} />
          <Rect x={178} y={128} width={44} height={5} rx={2.5} fill={BRAND.border} />
          <Circle cx={214} cy={148} r={8} fill={BRAND.successSoft} />
          <Path
            d="M210 148 L213 151 L219 145"
            fill="none"
            stroke={BRAND.success}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right thumb gripping front of bill */}
          <Path
            d="M252 134 C242 130 228 134 226 142 C225 148 234 151 246 148 Z"
            fill="#D49552"
          />
        </Svg>
      </Animated.View>

      {/* Small palm-green lock passport-stamp badge nearby (top-right) */}
      <View style={styles.lockStamp}>
        <Svg width={56} height={56} viewBox="0 0 56 56">
          <Circle cx={28} cy={28} r={25} fill={BRAND.successSoft} />
          <Circle
            cx={28}
            cy={28}
            r={23}
            fill="none"
            stroke={BRAND.success}
            strokeWidth={2}
            strokeDasharray="4 3"
          />
          {/* Palm-green lock icon */}
          <Path
            d="M22 25 L22 21 C22 17.7 24.7 15 28 15 C31.3 15 34 17.7 34 21 L34 25"
            fill="none"
            stroke={BRAND.success}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <Rect x={19} y={24} width={18} height={14} rx={3} fill={BRAND.success} />
          <Circle cx={28} cy={30.5} r={2} fill={BRAND.white} />
          <Line x1={28} y1={31.5} x2={28} y2={34.5} stroke={BRAND.white} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      </View>

      {/* Subtle marigold spark lines at top & bottom of the joining bill seam */}
      <View style={styles.joinTicksTop}>
        <Svg width={36} height={18} viewBox="0 0 36 18">
          <Line x1={18} y1={2} x2={18} y2={12} stroke={BRAND.accent} strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={8} y1={6} x2={13} y2={14} stroke={BRAND.accent} strokeWidth={2} strokeLinecap="round" />
          <Line x1={28} y1={6} x2={23} y2={14} stroke={BRAND.accent} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </View>
    </View>
  );
}

/**
 * Screen 5: "Ready to Explore?"
 * Citivas logo mark centered on a soft ivory-to-pale-marigold color wash,
 * calmer than the previous screens.
 */
export function ReadyIllustration({ size = 250 }: IllustrationProps) {
  const height = Math.round(size * 0.78);

  return (
    <View style={[styles.canvas, { width: size, height }]}>
      <Svg width={size} height={height} viewBox="0 0 260 205">
        <Defs>
          <RadialGradient id="ivoryMarigoldWash" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FDE68A" stopOpacity="0.65" />
            <Stop offset="55%" stopColor="#FEF3C7" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#F5F7FA" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Soft ivory-to-pale-marigold color wash */}
        <Circle cx={130} cy={102} r={96} fill="url(#ivoryMarigoldWash)" />

        {/* Calm outer passport-stamp dashed ring */}
        <G transform="rotate(-5 130 102)">
          <Circle
            cx={130}
            cy={102}
            r={64}
            fill={BRAND.background}
            fillOpacity={0.65}
            stroke={BRAND.accent}
            strokeWidth={2}
            strokeDasharray="6 5"
            strokeOpacity={0.75}
          />
          <Circle
            cx={130}
            cy={102}
            r={54}
            fill="none"
            stroke={BRAND.primary}
            strokeWidth={1.2}
            strokeOpacity={0.28}
          />
        </G>
      </Svg>

      <View style={styles.readyCenterMark}>
        <CitivasVectorMark size={74} color={BRAND.primary} accentColor={BRAND.accent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  skylineStamp: {
    position: 'absolute',
    top: 8,
    right: 14,
    width: 94,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skylineStampInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampMicroLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: BRAND.accentDark,
    marginTop: 2,
  },
  cityStampTag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BRAND.white,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: BRAND.border,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  cityStampText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  travelingPin: {
    position: 'absolute',
    top: '42%',
    left: '44%',
  },
  gridWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 18,
  },
  gridStampBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gridStampLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  lockStamp: {
    position: 'absolute',
    top: 26,
    right: 26,
    transform: [{ rotate: '9deg' }],
  },
  joinTicksTop: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
  },
  readyCenterMark: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
