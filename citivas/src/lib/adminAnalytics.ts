import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface DailyMetricPoint {
  dateKey: string;
  label: string;
  shortLabel: string;
  newUsers: number;
  cumulativeUsers: number;
  property: number;
  product: number;
  restaurant: number;
  event: number;
  business: number;
  totalListings: number;
}

export interface NativePlatformHealth {
  dailySeries: DailyMetricPoint[];
  totalUsers: number;
  newUsersInWindow: number;
  userGrowthPct: number;
  totalListings: number;
  newListingsInWindow: number;
  listingGrowthPct: number;
  avgDailySignups: number;
  avgDailyListings: number;
  breakdown: {
    property: number;
    product: number;
    restaurant: number;
    event: number;
    business: number;
  };
}

function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return Number.isNaN(ts.getTime()) ? null : ts;
  if (typeof ts?.toDate === 'function') {
    const d = ts.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof ts?.seconds === 'number') {
    const d = new Date(ts.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function subscribePlatformHealthCollections(
  onData: (snapshot: {
    users: any[];
    businesses: any[];
    properties: any[];
    marketplace: any[];
    events: any[];
  }) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const state = {
    users: [] as any[],
    businesses: [] as any[],
    properties: [] as any[],
    marketplace: [] as any[],
    events: [] as any[],
  };

  const emit = () => onData({ ...state });
  const handleErr = (err: Error) => {
    console.warn('[adminAnalytics] Firestore listener warning:', err.message);
    onError?.(err);
  };

  const unsubs = [
    onSnapshot(
      collection(db, 'users'),
      (snap) => {
        state.users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      handleErr
    ),
    onSnapshot(
      collection(db, 'businesses'),
      (snap) => {
        state.businesses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      handleErr
    ),
    onSnapshot(
      collection(db, 'house_listings'),
      (snap) => {
        state.properties = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      handleErr
    ),
    onSnapshot(
      collection(db, 'marketplace'),
      (snap) => {
        state.marketplace = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      handleErr
    ),
    onSnapshot(
      collection(db, 'events'),
      (snap) => {
        state.events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      handleErr
    ),
  ];

  return () => {
    unsubs.forEach((u) => u());
  };
}

export function buildNativeDailyMetrics(params: {
  users: any[];
  businesses: any[];
  properties: any[];
  marketplace: any[];
  events: any[];
  days: number;
}): NativePlatformHealth {
  const { users, businesses, properties, marketplace, events, days } = params;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowStart = new Date(todayStart);
  windowStart.setDate(windowStart.getDate() - (days - 1));
  const prevWindowStart = new Date(windowStart);
  prevWindowStart.setDate(prevWindowStart.getDate() - days);

  const map = new Map<string, DailyMetricPoint>();
  const orderedKeys: string[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    const key = toDayKey(d);
    const label = d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    const shortLabel = `${d.getDate()}/${d.getMonth() + 1}`;
    orderedKeys.push(key);
    map.set(key, {
      dateKey: key,
      label,
      shortLabel,
      newUsers: 0,
      cumulativeUsers: 0,
      property: 0,
      product: 0,
      restaurant: 0,
      event: 0,
      business: 0,
      totalListings: 0,
    });
  }

  let baselineUsers = 0;
  let prevWindowUsers = 0;
  let newUsersInWindow = 0;

  for (const u of users) {
    const dt = toDateSafe(u.createdAt);
    if (!dt) {
      baselineUsers++;
      continue;
    }
    const dayStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    if (dayStart < windowStart) {
      baselineUsers++;
      if (dayStart >= prevWindowStart) prevWindowUsers++;
    } else {
      const pt = map.get(toDayKey(dayStart));
      if (pt) {
        pt.newUsers += 1;
        newUsersInWindow += 1;
      }
    }
  }

  let running = baselineUsers;
  for (const k of orderedKeys) {
    const pt = map.get(k)!;
    running += pt.newUsers;
    pt.cumulativeUsers = running;
  }

  const seenEventIds = new Set<string>();
  const mergedEvents: any[] = [];
  for (const ev of events) {
    if (!seenEventIds.has(ev.id)) {
      seenEventIds.add(ev.id);
      mergedEvents.push(ev);
    }
  }
  for (const b of businesses) {
    if (b.category === 'Event' && !seenEventIds.has(b.id)) {
      seenEventIds.add(b.id);
      mergedEvents.push(b);
    }
  }

  const nonEventBusinesses = businesses.filter((b) => b.category !== 'Event');
  const restaurants = nonEventBusinesses.filter(
    (b) => b.category === 'Restaurant' || b.type === 'Restaurant'
  );
  const generalBiz = nonEventBusinesses.filter(
    (b) => b.category !== 'Restaurant' && b.type !== 'Restaurant'
  );

  let newListingsInWindow = 0;
  let prevWindowListings = 0;

  const tally = (
    items: any[],
    field: 'property' | 'product' | 'restaurant' | 'event' | 'business'
  ) => {
    for (const item of items) {
      const dt = toDateSafe(item.createdAt);
      if (!dt) continue;
      const dayStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (dayStart < windowStart) {
        if (dayStart >= prevWindowStart) prevWindowListings++;
      } else {
        const pt = map.get(toDayKey(dayStart));
        if (pt) {
          pt[field] += 1;
          pt.totalListings += 1;
          newListingsInWindow += 1;
        }
      }
    }
  };

  tally(properties, 'property');
  tally(marketplace, 'product');
  tally(restaurants, 'restaurant');
  tally(mergedEvents, 'event');
  tally(generalBiz, 'business');

  const calcPct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const breakdown = {
    property: properties.length,
    product: marketplace.length,
    restaurant: restaurants.length,
    event: mergedEvents.length,
    business: generalBiz.length,
  };

  return {
    dailySeries: orderedKeys.map((k) => map.get(k)!),
    totalUsers: users.length,
    newUsersInWindow,
    userGrowthPct: calcPct(newUsersInWindow, prevWindowUsers),
    totalListings:
      breakdown.property +
      breakdown.product +
      breakdown.restaurant +
      breakdown.event +
      breakdown.business,
    newListingsInWindow,
    listingGrowthPct: calcPct(newListingsInWindow, prevWindowListings),
    avgDailySignups: Number((newUsersInWindow / days).toFixed(1)),
    avgDailyListings: Number((newListingsInWindow / days).toFixed(1)),
    breakdown,
  };
}
