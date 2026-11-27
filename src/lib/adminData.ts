import {
  collection, collectionGroup, onSnapshot, query, orderBy,
  addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export type FirestoreTimestampLike =
  | Date
  | { toDate?: () => Date; seconds?: number }
  | string
  | number
  | null
  | undefined;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt?: FirestoreTimestampLike;
  lastSeenAt?: FirestoreTimestampLike;
}

export interface AdminBusiness {
  id: string;
  title: string;
  category: string;
  state?: string;
  city?: string;
  location?: string;
  ownerId?: string;
  organizerId?: string;
  image?: string;
  imageUrl?: string;
  isActive?: boolean;
  isOpen?: boolean;
  createdAt?: FirestoreTimestampLike;
  [key: string]: unknown;
}

export interface AdminMarketplaceItem {
  id: string;
  title: string;
  category: string;
  state?: string;
  city?: string;
  price?: string;
  ownerId?: string;
  createdAt?: FirestoreTimestampLike;
}

export interface AdminPropertyItem {
  id: string;
  title?: string;
  name?: string;
  state?: string;
  city?: string;
  propertySubType?: string;
  type?: string;
  createdAt?: FirestoreTimestampLike;
  [key: string]: unknown;
}

// ── Users ──────────────────────────────────────────────────────────────

export function listenUsers(callback: (users: AdminUser[]) => void): Unsubscribe {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminUser)));
  });
}

// ── Businesses (hotels, restaurants, business services, AND events) ────

export function listenAllBusinesses(callback: (items: AdminBusiness[]) => void): Unsubscribe {
  const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminBusiness)));
  });
}

export function splitBusinessesAndEvents(items: AdminBusiness[]) {
  const events = items.filter((i) => i.category === 'Event');
  const businesses = items.filter((i) => i.category !== 'Event');
  return { events, businesses };
}

export function groupByState(items: AdminBusiness[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = item.state || 'Unspecified';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export async function createBusinessListing(data: Record<string, unknown>, adminUserId: string) {
  return addDoc(collection(db, 'businesses'), {
    ...data,
    ownerId: data.ownerId || adminUserId,
    rating: data.rating ?? 0,
    isOpen: data.isOpen ?? true,
    createdAt: serverTimestamp(),
    createdByAdmin: true,
  });
}

export async function updateBusinessListing(id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db, 'businesses', id), data);
}

export async function deleteBusinessListing(id: string) {
  return deleteDoc(doc(db, 'businesses', id));
}

// ── Marketplace ──────────────────────────────────────────────────────────

export function listenMarketplaceItems(callback: (items: AdminMarketplaceItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminMarketplaceItem)));
  });
}

export async function createMarketplaceProduct(data: Record<string, unknown>, adminUserId: string) {
  return addDoc(collection(db, 'marketplace'), {
    ...data,
    ownerId: data.ownerId || adminUserId,
    sellerType: data.sellerType || 'business',
    rating: data.rating ?? 0,
    condition: data.condition || 'new',
    createdAt: serverTimestamp(),
    createdByAdmin: true,
  });
}

// ── House / Airbnb listings ──────────────────────────────────────────────

export function listenHouseListings(callback: (items: AdminPropertyItem[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'house_listings'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminPropertyItem)));
  });
}

export async function createHouseListing(data: Record<string, unknown>, adminUserId: string) {
  return addDoc(collection(db, 'house_listings'), {
    ...data,
    ownerId: data.ownerId || adminUserId,
    rating: data.rating ?? 0,
    status: data.status ?? 'Active',
    bedrooms: data.bedrooms ?? 0,
    bathrooms: data.bathrooms ?? 0,
    createdAt: serverTimestamp(),
    createdByAdmin: true,
  });
}

export async function updateHouseListing(id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db, 'house_listings', id), data);
}

export async function deleteHouseListing(id: string) {
  return deleteDoc(doc(db, 'house_listings', id));
}

// ── Revenue ────────────────────────────────────────────────────────────

export interface TicketRecord {
  id: string;
  eventId: string;
  price: number;
  sold: number;
  commission: number;
  ticketType?: string;
}

export function listenAllTickets(callback: (tickets: TicketRecord[]) => void): Unsubscribe {
  const q = collectionGroup(db, 'tickets');
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TicketRecord)));
  });
}

export function computeTicketRevenue(tickets: TicketRecord[]) {
  let grossFromSales = 0;
  let platformCommission = 0;
  for (const t of tickets) {
    const sold = t.sold || 0;
    grossFromSales += sold * (t.price || 0);
    platformCommission += sold * (t.commission || 0);
  }
  return { grossFromSales, platformCommission };
}

// ── Wallet activity ────────────────────────────────────────────────────

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  method?: string;
  status?: string;
  referenceNumber?: string;
  createdAt?: FirestoreTimestampLike;
}

export function listenAllWalletTransactions(callback: (transactions: WalletTransaction[]) => void): Unsubscribe {
  const q = query(collectionGroup(db, 'transactions'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WalletTransaction)));
  });
}

export function computeWalletStats(transactions: WalletTransaction[]) {
  let totalFunded = 0;
  let totalSpentOrWithdrawn = 0;
  let totalWithdrawn = 0;
  for (const t of transactions) {
    if (t.type === 'credit') {
      totalFunded += t.amount || 0;
    } else if (t.type === 'debit') {
      totalSpentOrWithdrawn += t.amount || 0;
      if (t.description === 'Wallet Withdrawal') totalWithdrawn += t.amount || 0;
    }
  }
  return { totalFunded, totalSpentOrWithdrawn, totalWithdrawn };
}

// ── Events (top-level `events` collection) ─────────────────────────────

export function listenAllEvents(callback: (items: AdminBusiness[]) => void): Unsubscribe {
  const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminBusiness)));
  });
}

// ── Daily Platform Health & Growth Aggregations ────────────────────────

export function toDateSafe(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return Number.isNaN(ts.getTime()) ? null : ts;
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as { toDate?: () => Date; seconds?: number };
    if (typeof obj.toDate === 'function') {
      const d = obj.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof obj.seconds === 'number') {
      const d = new Date(obj.seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
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

export interface DailyPlatformPoint {
  dateKey: string;
  label: string;
  newUsers: number;
  cumulativeUsers: number;
  property: number;
  product: number;
  restaurant: number;
  event: number;
  business: number;
  totalListings: number;
}

export interface PlatformHealthSummary {
  dailySeries: DailyPlatformPoint[];
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

export function buildDailyPlatformTrends(params: {
  users: AdminUser[];
  businesses: AdminBusiness[];
  properties: AdminPropertyItem[];
  marketplace: AdminMarketplaceItem[];
  events: AdminBusiness[];
  days: number;
}): PlatformHealthSummary {
  const { users, businesses, properties, marketplace, events, days } = params;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowStart = new Date(todayStart);
  windowStart.setDate(windowStart.getDate() - (days - 1));

  const prevWindowStart = new Date(windowStart);
  prevWindowStart.setDate(prevWindowStart.getDate() - days);

  // Build day buckets map
  const bucketMap = new Map<string, DailyPlatformPoint>();
  const orderedKeys: string[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    const key = toDayKey(d);
    const label = d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    orderedKeys.push(key);
    bucketMap.set(key, {
      dateKey: key,
      label,
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

  // Track baseline users created before windowStart for accurate cumulative curve
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
      const key = toDayKey(dayStart);
      const pt = bucketMap.get(key);
      if (pt) {
        pt.newUsers += 1;
        newUsersInWindow += 1;
      }
    }
  }

  // Cumulative sum across window
  let runningUsers = baselineUsers;
  for (const key of orderedKeys) {
    const pt = bucketMap.get(key)!;
    runningUsers += pt.newUsers;
    pt.cumulativeUsers = runningUsers;
  }

  // Dedupe events across top-level `events` and `businesses` where category === 'Event'
  const seenEventIds = new Set<string>();
  const mergedEvents: AdminBusiness[] = [];
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

  const breakdown = {
    property: properties.length,
    product: marketplace.length,
    restaurant: nonEventBusinesses.filter(
      (b) => b.category === 'Restaurant' || b.type === 'Restaurant'
    ).length,
    event: mergedEvents.length,
    business: nonEventBusinesses.filter(
      (b) => b.category !== 'Restaurant' && b.type !== 'Restaurant'
    ).length,
  };

  let newListingsInWindow = 0;
  let prevWindowListings = 0;

  const tallyListing = (
    items: Array<{ createdAt?: FirestoreTimestampLike }>,
    field: 'property' | 'product' | 'restaurant' | 'event' | 'business'
  ) => {
    for (const item of items) {
      const dt = toDateSafe(item.createdAt);
      if (!dt) continue;
      const dayStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (dayStart < windowStart) {
        if (dayStart >= prevWindowStart) prevWindowListings++;
      } else {
        const key = toDayKey(dayStart);
        const pt = bucketMap.get(key);
        if (pt) {
          pt[field] += 1;
          pt.totalListings += 1;
          newListingsInWindow += 1;
        }
      }
    }
  };

  tallyListing(properties, 'property');
  tallyListing(marketplace, 'product');
  tallyListing(
    nonEventBusinesses.filter((b) => b.category === 'Restaurant' || b.type === 'Restaurant'),
    'restaurant'
  );
  tallyListing(mergedEvents, 'event');
  tallyListing(
    nonEventBusinesses.filter((b) => b.category !== 'Restaurant' && b.type !== 'Restaurant'),
    'business'
  );

  const calcPct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const totalListings =
    breakdown.property +
    breakdown.product +
    breakdown.restaurant +
    breakdown.event +
    breakdown.business;

  return {
    dailySeries: orderedKeys.map((k) => bucketMap.get(k)!),
    totalUsers: users.length,
    newUsersInWindow,
    userGrowthPct: calcPct(newUsersInWindow, prevWindowUsers),
    totalListings,
    newListingsInWindow,
    listingGrowthPct: calcPct(newListingsInWindow, prevWindowListings),
    avgDailySignups: Number((newUsersInWindow / days).toFixed(1)),
    avgDailyListings: Number((newListingsInWindow / days).toFixed(1)),
    breakdown,
  };
}

